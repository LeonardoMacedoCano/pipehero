import { useEffect, useMemo, useState } from "react";
import { Panel, Stack, Loading, SearchFilterRSQL, Table, Column, type Field, type PagedResponse } from "lcano-react-ui";
import styled from "styled-components";
import type { Difficulty, Song } from "../../types.js";
import { DIFFICULTY_ORDER } from "../../engine/availableTracks.js";
import { useSongs } from "../hooks/useSongs.js";
import { useScores } from "../hooks/useScores.js";
import SongOptionsModal, { type StartGameParams } from "../components/SongOptionsModal.js";

interface RsqlFilter {
  field: string;
  operator: string;
  value: string;
}

const RSQL_TERM_PATTERN = /^([a-zA-Z0-9_.]+)(==|!=|=ilike=)(.*)$/;

function parseRsqlFilters(rsql: string): RsqlFilter[] {
  const filters: RsqlFilter[] = [];
  for (const term of rsql.split(";")) {
    const match = term.match(RSQL_TERM_PATTERN);
    if (match) filters.push({ field: match[1], operator: match[2], value: match[3] });
  }
  return filters;
}

function matchesFilter(song: Song, filter: RsqlFilter): boolean {
  const raw = String((song as unknown as Record<string, unknown>)[filter.field] ?? "").toLowerCase();
  const value = filter.value.toLowerCase();
  if (filter.operator === "=ilike=") return raw.includes(value);
  if (filter.operator === "!=") return raw !== value;
  return raw === value;
}

function toPage<T>(items: T[], pageIndex: number, pageSize: number): PagedResponse<T> {
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const number = Math.min(pageIndex, totalPages - 1);
  const start = number * pageSize;
  const content = items.slice(start, start + pageSize);
  return {
    content,
    totalElements,
    totalPages,
    size: pageSize,
    number,
    first: number === 0,
    last: number >= totalPages - 1,
    numberOfElements: content.length,
  };
}

const TABLE_ROW_HEIGHT = "104px";
const SONGS_PER_PAGE = 5;

function AllScores({ stars }: { stars: Partial<Record<Difficulty, number>> | undefined }) {
  const played = DIFFICULTY_ORDER.filter((difficulty) => stars?.[difficulty] !== undefined);
  if (played.length === 0) return <Muted>—</Muted>;
  return (
    <ScoreRows>
      {played.map((difficulty) => {
        const value = stars![difficulty]!;
        return (
          <ScoreRow key={difficulty}>
            <ScoreDifficulty>{difficulty}</ScoreDifficulty>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} $filled={i < value}>
                ★
              </Star>
            ))}
          </ScoreRow>
        );
      })}
    </ScoreRows>
  );
}

export default function SongMenuPage({ onStartGame }: { onStartGame: (params: StartGameParams) => void }) {
  const { songs, error, isLoading } = useSongs();
  const { scoresBySong } = useScores();
  const [modalSong, setModalSong] = useState<Song | null>(null);
  const [filters, setFilters] = useState<RsqlFilter[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [filters]);

  const searchFields: Field[] = useMemo(() => {
    const genres = Array.from(new Set((songs ?? []).map((song) => song.genre).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    return [
      { name: "name", label: "Song", type: "STRING" },
      { name: "artist", label: "Artist", type: "STRING" },
      { name: "album", label: "Album", type: "STRING" },
      { name: "genre", label: "Genre", type: "SELECT", options: genres.map((genre) => ({ key: genre, value: genre })) },
    ];
  }, [songs]);

  const filteredSongs = useMemo(() => {
    if (!songs) return null;
    return filters.length === 0 ? songs : songs.filter((song) => filters.every((filter) => matchesFilter(song, filter)));
  }, [songs, filters]);

  const pagedSongs = useMemo(
    () => (filteredSongs ? toPage(filteredSongs, pageIndex, SONGS_PER_PAGE) : null),
    [filteredSongs, pageIndex]
  );

  return (
    <>
      <Panel title="Choose a Song" maxWidth="1100px">
        <Stack direction="column" divider="top">
          <SearchFilterRSQL fields={searchFields} onSearch={(rsql) => setFilters(parseRsqlFilters(rsql))} />

          <Loading isLoading={isLoading} />
          {error && <p>Error loading song list: {error.message}</p>}

          {pagedSongs && (
            <Table<Song>
              values={pagedSongs}
              keyExtractor={(song) => song.id}
              onClickRow={(song) => setModalSong(song)}
              loadPage={(nextPageIndex) => setPageIndex(nextPageIndex)}
              rowHeight={TABLE_ROW_HEIGHT}
              clickableRows
              rowClickHint="Click to choose a difficulty"
              messageEmpty={songs && songs.length === 0 ? "No songs found in the songs folder." : "No songs match the current filters."}
              columns={[
                <Column<Song>
                  header="Cover"
                  width="80px"
                  align="center"
                  value={(song) => (song.coverUrl ? <Cover src={song.coverUrl} alt="" /> : <CoverPlaceholder />)}
                />,
                <Column<Song> header="Song" value={(song) => <SongName>{song.name}</SongName>} />,
                <Column<Song> header="Artist" width="160px" value={(song) => song.artist} />,
                <Column<Song> header="Genre" width="120px" value={(song) => song.genre} />,
                <Column<Song> header="Album" width="160px" value={(song) => song.album || "—"} />,
                <Column<Song>
                  header="Best score"
                  width="160px"
                  align="center"
                  value={(song) => <AllScores stars={scoresBySong.get(song.id)} />}
                />,
              ]}
            />
          )}
        </Stack>
      </Panel>

      <SongOptionsModal
        song={modalSong}
        stars={modalSong ? scoresBySong.get(modalSong.id) : undefined}
        onClose={() => setModalSong(null)}
        onStart={(params) => {
          setModalSong(null);
          onStartGame(params);
        }}
      />
    </>
  );
}

const Cover = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 6px;
  object-fit: cover;
  background-color: ${({ theme }) => theme.colors.black};
`;

const CoverPlaceholder = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.colors.black};
`;

const SongName = styled.span`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
`;

const ScoreRows = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const ScoreRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 1px;
  white-space: nowrap;
`;

const ScoreDifficulty = styled.span`
  font-size: 0.78em;
  min-width: 3.8em;
  text-align: right;
  opacity: 0.75;
`;

const Star = styled.span<{ $filled: boolean }>`
  opacity: ${({ $filled }) => ($filled ? 1 : 0.3)};
`;

const Muted = styled.span`
  opacity: 0.6;
`;
