import { useState } from "react";
import { Panel, Stack, Loading } from "lcano-react-ui";
import type { Song } from "../../types.js";
import { useSongs } from "../hooks/useSongs.js";
import SongListItem from "../components/SongListItem.js";
import SongOptionsModal, { type StartGameParams } from "../components/SongOptionsModal.js";

export default function SongMenuPage({ onStartGame }: { onStartGame: (params: StartGameParams) => void }) {
  const { songs, error, isLoading } = useSongs();
  const [modalSong, setModalSong] = useState<Song | null>(null);

  return (
    <>
      <Panel title="PipeHero" maxWidth="800px">
        <Loading isLoading={isLoading} />
        {error && <p>Error loading song list: {error.message}</p>}
        {songs && songs.length === 0 && <p>No songs found in the songs folder.</p>}
        {songs && songs.length > 0 && (
          <Stack direction="column" gap="8px" style={{ padding: "12px 0" }}>
            {songs.map((song) => (
              <SongListItem key={song.id} song={song} onSelect={setModalSong} />
            ))}
          </Stack>
        )}
      </Panel>

      <SongOptionsModal
        song={modalSong}
        onClose={() => setModalSong(null)}
        onStart={(params) => {
          setModalSong(null);
          onStartGame(params);
        }}
      />
    </>
  );
}
