import { useState } from "react";
import { Panel, Stack, Loading, Button } from "lcano-react-ui";
import type { Song } from "../../types.js";
import { useSongs } from "../hooks/useSongs.js";
import { useScores } from "../hooks/useScores.js";
import SongListItem from "../components/SongListItem.js";
import SongOptionsModal, { type StartGameParams } from "../components/SongOptionsModal.js";

export default function SongMenuPage({
  onStartGame,
  onBack,
}: {
  onStartGame: (params: StartGameParams) => void;
  onBack: () => void;
}) {
  const { songs, error, isLoading } = useSongs();
  const { scoresBySong } = useScores();
  const [modalSong, setModalSong] = useState<Song | null>(null);

  return (
    <>
      <Panel title="PipeHero" maxWidth="800px" actionButton={<Button description="« Menu" variant="secondary" onClick={onBack} />}>
        <Loading isLoading={isLoading} />
        {error && <p>Error loading song list: {error.message}</p>}
        {songs && songs.length === 0 && <p>No songs found in the songs folder.</p>}
        {songs && songs.length > 0 && (
          <Stack direction="column" gap="8px" style={{ padding: "12px 0" }}>
            {songs.map((song) => (
              <SongListItem key={song.id} song={song} stars={scoresBySong.get(song.id)} onSelect={setModalSong} />
            ))}
          </Stack>
        )}
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
