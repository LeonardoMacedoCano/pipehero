# Economy

Coins require being **logged in with Google** — see
[`SETTINGS.md`](./SETTINGS.md#account). Everything below is tracked per
account; playing while logged out doesn't earn anything.

Spend coins in the **🛍️ Shop** page (how the page itself works — categories, pagination,
preview — is in [`SETTINGS.md`](./SETTINGS.md#shop)) on paid themes and effects — see
[`SETTINGS.md`](./SETTINGS.md#appearance-themes) for what's free vs. paid and how much each
costs — plus profile cosmetics (avatar, border, background, player tag, achievement frame,
achievement effect) — see [`PROFILE.md`](./PROFILE.md).

The Shop also sells one novelty item that isn't a cosmetic at all: **Nepo Baby**, 2000 coins —
by far the priciest thing in the Shop. It doesn't equip anywhere; buying it is the entire
point, since it directly unlocks the "Nepo Baby" achievement (see
[`ACHIEVEMENTS.md`](./ACHIEVEMENTS.md#special)) — the one achievement in the game you can just
buy instead of earning.

Open the **🎯 Missions** page (same rail/drawer as Achievements) to see
your coin balance and two tabs — **Daily** and **Weekly** — each with
its own list of missions and an all-clear bonus for finishing every one
of them. Click any mission for a details popup with the full
description, reward, tier (weekly), progress, and time left before it
resets.

## Daily login streak

Opening the game credits your account **once per calendar day** (server
time — see below) with a small coin reward, and shows up as the first
entry in the Daily tab — it's always already "done" for the day the
moment you open the app, since just opening it is what completes it.
Reward for logging in day after day scales with how long your streak is:

| Streak day | Coins |
|---|---|
| Any day | 5 (base) |
| Day 3 | 5 + 15 = 20 |
| Day 7 | 5 + 30 = 35 |
| Day 14 | 5 + 60 = 65 |
| Day 30 | 5 + 150 = 155 |
| Every 30 days after that (60, 90, ...) | 5 + 150 = 155 |

The streak is forgiving: missing **exactly one day** doesn't reset it,
as long as you still have your grace available. The grace recharges
every time you check in on a consecutive day and is spent the moment it
saves a streak — so it protects against one accidental miss, not a
habit of logging in every other day. Missing two or more days in a row
always resets the streak back to day 1.

The first time you open the game each day, a popup shows the coins you
just earned, your current streak, your best streak, and a reminder of
how the streak/grace mechanic above works — it only appears once per
day, on that first login.

## Daily missions

Alongside the login, 3 more missions are available every day, drawn
from a larger pool of 7 possible gameplay missions. Which 3 show up is
picked deterministically from your account and the current date — the
same 3 all day, different (usually) from yesterday's, and different
from other players' — so the game doesn't ask the same easy thing every
single day. "Day" and "week" for every mission and the login streak
follow a single server time zone — `TIME_ZONE` in `.env`, `UTC` if
unset — the same for every player regardless of where they connect
from; it's **not** each player's own local time zone. Both the Daily
and Weekly tab show a live countdown to the next reset (also visible
per-mission in its details popup). Completing everything — the login
plus the 3 missions drawn for the day — pays out an all-clear bonus of
**20 coins**.

| | Mission | How to complete | Coins |
|---|---|---|---|
| 🔥 | Daily Login | Open the game today. | Scales with your streak (see above) |
| 🎵 | Warm Up | Finish a song today without failing. | 10 |
| ⭐ | Solid Performance | Score at least 4 stars on a song today. | 15 |
| 🆕 | New Territory | Star a song/difficulty you'd never starred before. | 20 |
| 🔥 | Step It Up | Finish a song on Hard or Expert difficulty without failing. | 20 |
| 🎼 | Triple Session | Play 3 different songs today. | 20 |
| 🌟 | Perfectionist | Score a perfect 5 stars on a song today. | 25 |
| 💯 | Flawless Run | Full combo a song today without failing. | 25 |

Triple Session shows an X/Y progress readout under its description
until it's complete. Completing a mission pops up a toast immediately,
the same way unlocking an achievement does.

## Weekly missions

Alongside the daily set, 5 missions reset every Sunday (same server
time zone as above) and stay available all week, across three tiers,
fixed (no draw — unlike the daily pool above, everyone sees the same 5
every week). The small tier can be cleared either way — show up on a
second day, or land one great session — while medium raises the bar on
each of those paths separately, and the large mission pushes the days-
played ladder to its top. Completing all 5 in the same week also pays
out an all-clear bonus of **70 coins**.

| | Mission | Tier | How to complete | Coins |
|---|---|---|---|---|
| 🗓️ | Stopping By | Small | Play on 2 different days this week. | 30 |
| 💯 | One Clean Take | Small | Full combo any song, at some point this week. | 30 |
| 📅 | Regular Visitor | Medium | Play on 4 different days this week. | 60 |
| 🔥 | Raising The Bar | Medium | Finish a song on Hard or Expert difficulty without failing, at some point this week. | 60 |
| 🏅 | Weekly Dedication | Large | Play on 6 different days this week. | 120 |

The missions above that count days played show an X/Y progress readout
under their description until they're complete.

Same as daily missions: a toast pops up when you complete one.
