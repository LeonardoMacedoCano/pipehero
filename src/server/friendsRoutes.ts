import type { IncomingMessage, ServerResponse } from "node:http";
import { query } from "./db.js";
import { readJsonBody, sendJson } from "./authRoutes.js";
import { getRequestUser } from "./requestUser.js";
import {
  ACHIEVEMENTS,
  computeGlobalUnlockPercents,
  evaluateCompareUnlocks,
  evaluateFriendAcceptedUnlocks,
  unlockMany,
} from "./achievements.js";
import { buildCompareRows, buildStarDistribution, computeWeightedScore, countWins, type ScoreEntry } from "./friendsCompare.js";
import type { Difficulty } from "../types.js";

const FRIEND_SEARCH_MIN_QUERY_LENGTH = 2;
const FRIEND_SEARCH_LIMIT = 10;
const FRIEND_FEED_LIMIT = 50;

const WEIGHT_CASE_SQL = "CASE ss.difficulty WHEN 'Expert' THEN 4 WHEN 'Hard' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Easy' THEN 1 END";

interface PublicUserRow {
  id: number;
  name: string;
  avatar_url: string | null;
}

function toPublicFriend(row: PublicUserRow): { id: number; name: string; avatarUrl: string | null } {
  return { id: row.id, name: row.name, avatarUrl: row.avatar_url };
}

async function getAcceptedFriendIds(userId: number): Promise<number[]> {
  const rows = await query<{ friend_id: number }>(
    `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS friend_id
     FROM friendships WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)`,
    [userId]
  );
  return rows.map((row) => row.friend_id);
}

async function isAcceptedFriend(userId: number, otherUserId: number): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT true AS exists FROM friendships
     WHERE status = 'accepted' AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [userId, otherUserId]
  );
  return rows.length > 0;
}

async function fetchUserScores(userId: number): Promise<ScoreEntry[]> {
  const rows = await query<{ song_id: string; difficulty: Difficulty; stars: number }>(
    "SELECT song_id, difficulty, stars FROM song_scores WHERE user_id = $1",
    [userId]
  );
  return rows.map((row) => ({ songId: row.song_id, difficulty: row.difficulty, stars: row.stars }));
}

async function fetchUserScoresWithTimestamp(
  userId: number
): Promise<{ songId: string; difficulty: Difficulty; stars: number; achievedAt: string }[]> {
  const rows = await query<{ song_id: string; difficulty: Difficulty; stars: number; achieved_at: string }>(
    "SELECT song_id, difficulty, stars, achieved_at FROM song_scores WHERE user_id = $1 ORDER BY achieved_at DESC",
    [userId]
  );
  return rows.map((row) => ({ songId: row.song_id, difficulty: row.difficulty, stars: row.stars, achievedAt: row.achieved_at }));
}

export async function handleFriendsRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url ?? "").split("?")[0];
  const method = req.method ?? "GET";

  if (url === "/api/leaderboard/global" && method === "GET") {
    const user = await getRequestUser(req);
    const rows = await query<{ user_id: number; name: string; avatar_url: string | null; weighted_score: string; rank: string }>(
      `SELECT u.id AS user_id, u.name, u.avatar_url,
         SUM(ss.stars * ${WEIGHT_CASE_SQL}) AS weighted_score,
         RANK() OVER (ORDER BY SUM(ss.stars * ${WEIGHT_CASE_SQL}) DESC) AS rank
       FROM song_scores ss JOIN users u ON u.id = ss.user_id
       GROUP BY u.id, u.name, u.avatar_url
       ORDER BY rank, u.name`
    );
    sendJson(
      res,
      200,
      rows.map((row) => ({
        userId: row.user_id,
        name: row.name,
        avatarUrl: row.avatar_url,
        weightedScore: Number(row.weighted_score),
        rank: Number(row.rank),
        isMe: user?.id === row.user_id,
      }))
    );
    return true;
  }

  if (url === "/api/leaderboard/friends" && method === "GET") {
    const user = await getRequestUser(req);
    if (!user) {
      sendJson(res, 200, []);
      return true;
    }
    const rows = await query<{ user_id: number; name: string; avatar_url: string | null; weighted_score: string; rank: string }>(
      `WITH friend_ids AS (
         SELECT $1::int AS user_id
         UNION
         SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
         FROM friendships WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)
       )
       SELECT fi.user_id, u.name, u.avatar_url, COALESCE(s.weighted_score, 0) AS weighted_score,
         RANK() OVER (ORDER BY COALESCE(s.weighted_score, 0) DESC) AS rank
       FROM friend_ids fi
       JOIN users u ON u.id = fi.user_id
       LEFT JOIN (
         SELECT ss.user_id, SUM(ss.stars * ${WEIGHT_CASE_SQL}) AS weighted_score
         FROM song_scores ss WHERE ss.user_id IN (SELECT user_id FROM friend_ids)
         GROUP BY ss.user_id
       ) s ON s.user_id = fi.user_id
       ORDER BY rank, u.name`,
      [user.id]
    );
    sendJson(
      res,
      200,
      rows.map((row) => ({
        userId: row.user_id,
        name: row.name,
        avatarUrl: row.avatar_url,
        weightedScore: Number(row.weighted_score),
        rank: Number(row.rank),
        isMe: user.id === row.user_id,
      }))
    );
    return true;
  }

  if (!url.startsWith("/api/friends")) return false;

  const user = await getRequestUser(req);

  if (url === "/api/friends/search" && method === "GET") {
    if (!user) {
      sendJson(res, 200, []);
      return true;
    }
    const term = new URL(req.url ?? "", "http://localhost").searchParams.get("q") ?? "";
    if (term.trim().length < FRIEND_SEARCH_MIN_QUERY_LENGTH) {
      sendJson(res, 200, []);
      return true;
    }
    const rows = await query<{ id: number; name: string; avatar_url: string | null; status: string | null; requester_id: number | null }>(
      `SELECT u.id, u.name, u.avatar_url, f.status, f.requester_id
       FROM users u
       LEFT JOIN friendships f ON (f.requester_id = $1 AND f.addressee_id = u.id) OR (f.requester_id = u.id AND f.addressee_id = $1)
       WHERE u.id <> $1 AND (u.name ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%')
       ORDER BY u.name
       LIMIT ${FRIEND_SEARCH_LIMIT}`,
      [user.id, term.trim()]
    );
    sendJson(
      res,
      200,
      rows.map((row) => ({
        userId: row.id,
        name: row.name,
        avatarUrl: row.avatar_url,
        friendStatus:
          row.status === "accepted"
            ? "friends"
            : row.status === "pending"
              ? row.requester_id === user.id
                ? "pending_outgoing"
                : "pending_incoming"
              : "none",
      }))
    );
    return true;
  }

  if (url === "/api/friends/requests" && method === "GET") {
    if (!user) {
      sendJson(res, 200, { incoming: [], outgoing: [] });
      return true;
    }
    const incoming = await query<{ id: number; friend_id: number; name: string; avatar_url: string | null; created_at: string }>(
      `SELECT f.id, f.requester_id AS friend_id, u.name, u.avatar_url, f.created_at
       FROM friendships f JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = $1 AND f.status = 'pending' ORDER BY f.created_at DESC`,
      [user.id]
    );
    const outgoing = await query<{ id: number; friend_id: number; name: string; avatar_url: string | null; created_at: string }>(
      `SELECT f.id, f.addressee_id AS friend_id, u.name, u.avatar_url, f.created_at
       FROM friendships f JOIN users u ON u.id = f.addressee_id
       WHERE f.requester_id = $1 AND f.status = 'pending' ORDER BY f.created_at DESC`,
      [user.id]
    );
    const toEntry = (row: { id: number; friend_id: number; name: string; avatar_url: string | null; created_at: string }) => ({
      requestId: row.id,
      friendId: row.friend_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
    });
    sendJson(res, 200, { incoming: incoming.map(toEntry), outgoing: outgoing.map(toEntry) });
    return true;
  }

  if (url === "/api/friends/requests" && method === "POST") {
    if (!user) {
      sendJson(res, 200, { ok: false });
      return true;
    }
    const { friendUserId } = await readJsonBody<{ friendUserId?: number }>(req);
    if (!Number.isInteger(friendUserId) || friendUserId === user.id) {
      sendJson(res, 400, { error: "Invalid friendUserId" });
      return true;
    }
    const target = await query<{ id: number }>("SELECT id FROM users WHERE id = $1", [friendUserId]);
    if (target.length === 0) {
      sendJson(res, 404, { error: "User not found" });
      return true;
    }

    const upserted = await query<{ id: number; status: string; requester_id: number; addressee_id: number }>(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
       DO UPDATE SET status = 'accepted', responded_at = now()
       WHERE friendships.status = 'pending' AND friendships.requester_id <> EXCLUDED.requester_id
       RETURNING id, status, requester_id, addressee_id`,
      [user.id, friendUserId]
    );

    let status = upserted[0]?.status;
    if (!status) {
      const existing = await query<{ status: string }>(
        `SELECT status FROM friendships
         WHERE LEAST(requester_id, addressee_id) = LEAST($1, $2) AND GREATEST(requester_id, addressee_id) = GREATEST($1, $2)`,
        [user.id, friendUserId]
      );
      status = existing[0]?.status;
    }

    let unlockedAchievements: Awaited<ReturnType<typeof unlockMany>> = [];
    if (status === "accepted") {
      unlockedAchievements = await unlockMany(user.id, evaluateFriendAcceptedUnlocks());
      await unlockMany(friendUserId!, evaluateFriendAcceptedUnlocks());
    }

    sendJson(res, 200, { ok: true, status: status ?? "pending", unlockedAchievements });
    return true;
  }

  const acceptMatch = url.match(/^\/api\/friends\/requests\/(\d+)\/accept$/);
  if (acceptMatch && method === "POST") {
    if (!user) {
      sendJson(res, 200, { ok: false });
      return true;
    }
    const updated = await query<{ requester_id: number; addressee_id: number }>(
      `UPDATE friendships SET status = 'accepted', responded_at = now()
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
       RETURNING requester_id, addressee_id`,
      [Number(acceptMatch[1]), user.id]
    );
    if (updated.length === 0) {
      sendJson(res, 404, { ok: false });
      return true;
    }
    const unlockedAchievements = await unlockMany(user.id, evaluateFriendAcceptedUnlocks());
    await unlockMany(updated[0].requester_id, evaluateFriendAcceptedUnlocks());
    sendJson(res, 200, { ok: true, unlockedAchievements });
    return true;
  }

  const declineMatch = url.match(/^\/api\/friends\/requests\/(\d+)\/decline$/);
  if (declineMatch && method === "POST") {
    if (!user) {
      sendJson(res, 200, { ok: false });
      return true;
    }
    await query("DELETE FROM friendships WHERE id = $1 AND status = 'pending' AND (addressee_id = $2 OR requester_id = $2)", [
      Number(declineMatch[1]),
      user.id,
    ]);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (url === "/api/friends/feed" && method === "GET") {
    if (!user) {
      sendJson(res, 200, []);
      return true;
    }
    const friendIds = await getAcceptedFriendIds(user.id);
    if (friendIds.length === 0) {
      sendJson(res, 200, []);
      return true;
    }
    const rows = await query<{ user_id: number; name: string; avatar_url: string | null; song_id: string; difficulty: Difficulty; stars: number; achieved_at: string }>(
      `SELECT ss.user_id, u.name, u.avatar_url, ss.song_id, ss.difficulty, ss.stars, ss.achieved_at
       FROM song_scores ss JOIN users u ON u.id = ss.user_id
       WHERE ss.user_id = ANY($1::int[])
       ORDER BY ss.achieved_at DESC LIMIT ${FRIEND_FEED_LIMIT}`,
      [friendIds]
    );
    sendJson(
      res,
      200,
      rows.map((row) => ({
        userId: row.user_id,
        name: row.name,
        avatarUrl: row.avatar_url,
        songId: row.song_id,
        difficulty: row.difficulty,
        stars: row.stars,
        achievedAt: row.achieved_at,
      }))
    );
    return true;
  }

  if (url === "/api/friends" && method === "GET") {
    if (!user) {
      sendJson(res, 200, []);
      return true;
    }
    const rows = await query<{ friend_id: number; name: string; avatar_url: string | null; friends_since: string }>(
      `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS friend_id,
              u.name, u.avatar_url, f.responded_at AS friends_since
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)
       ORDER BY u.name`,
      [user.id]
    );
    sendJson(
      res,
      200,
      rows.map((row) => ({ friendId: row.friend_id, name: row.name, avatarUrl: row.avatar_url, friendsSince: row.friends_since }))
    );
    return true;
  }

  const profileMatch = url.match(/^\/api\/friends\/(\d+)\/profile$/);
  if (profileMatch && method === "GET") {
    if (!user) {
      sendJson(res, 403, { error: "Not logged in" });
      return true;
    }
    const friendId = Number(profileMatch[1]);
    if (!(await isAcceptedFriend(user.id, friendId))) {
      sendJson(res, 403, { error: "Not friends with this user" });
      return true;
    }
    const friendRows = await query<PublicUserRow>("SELECT id, name, avatar_url FROM users WHERE id = $1", [friendId]);
    if (friendRows.length === 0) {
      sendJson(res, 404, { error: "User not found" });
      return true;
    }
    const scores = await fetchUserScoresWithTimestamp(friendId);
    const unlocked = await query<{ code: string; unlocked_at: string }>(
      "SELECT code, unlocked_at FROM user_achievements WHERE user_id = $1",
      [friendId]
    );
    const unlockedByCode = new Map(unlocked.map((row) => [row.code, row.unlocked_at]));
    const globalUnlockPercents = await computeGlobalUnlockPercents();

    sendJson(res, 200, {
      friend: toPublicFriend(friendRows[0]),
      scores,
      achievements: ACHIEVEMENTS.map((achievement) => ({
        ...achievement,
        unlocked: unlockedByCode.has(achievement.code),
        unlockedAt: unlockedByCode.get(achievement.code) ?? null,
        globalUnlockPercent: globalUnlockPercents.get(achievement.code) ?? 0,
      })),
    });
    return true;
  }

  const compareMatch = url.match(/^\/api\/friends\/(\d+)\/compare$/);
  if (compareMatch && method === "GET") {
    if (!user) {
      sendJson(res, 403, { error: "Not logged in" });
      return true;
    }
    const friendId = Number(compareMatch[1]);
    if (!(await isAcceptedFriend(user.id, friendId))) {
      sendJson(res, 403, { error: "Not friends with this user" });
      return true;
    }
    const friendRows = await query<PublicUserRow>("SELECT id, name, avatar_url FROM users WHERE id = $1", [friendId]);
    if (friendRows.length === 0) {
      sendJson(res, 404, { error: "User not found" });
      return true;
    }

    const [myScores, friendScores] = await Promise.all([fetchUserScores(user.id), fetchUserScores(friendId)]);
    const rows = buildCompareRows(myScores, friendScores);
    const { myWins, friendWins } = countWins(rows);
    const totalComparedRows = rows.filter((row) => row.myStars !== null && row.friendStars !== null).length;

    const unlockedAchievements = await unlockMany(user.id, evaluateCompareUnlocks(myWins, friendWins, totalComparedRows));

    sendJson(res, 200, {
      friend: toPublicFriend(friendRows[0]),
      myWeightedScore: computeWeightedScore(myScores),
      friendWeightedScore: computeWeightedScore(friendScores),
      rows,
      distribution: { me: buildStarDistribution(myScores), friend: buildStarDistribution(friendScores) },
      unlockedAchievements,
    });
    return true;
  }

  const unfriendMatch = url.match(/^\/api\/friends\/(\d+)$/);
  if (unfriendMatch && method === "DELETE") {
    if (!user) {
      sendJson(res, 200, { ok: false });
      return true;
    }
    await query(
      `DELETE FROM friendships WHERE status = 'accepted'
       AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
      [user.id, Number(unfriendMatch[1])]
    );
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}
