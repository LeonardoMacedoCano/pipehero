import { useState } from "react";
import { ContextMessageProvider } from "lcano-react-ui";
import { ThemeControlProvider } from "./contexts/theme/ThemeControlProvider.js";
import { GlobalStyles } from "./GlobalStyles.js";
import SongMenuPage from "./pages/SongMenuPage.js";
import GamePage from "./pages/GamePage.js";
import type { StartGameParams } from "./components/SongOptionsModal.js";

export default function App() {
  const [activeGame, setActiveGame] = useState<StartGameParams | null>(null);

  return (
    <ThemeControlProvider>
      <GlobalStyles />
      <ContextMessageProvider>
        {activeGame ? (
          <GamePage
            song={activeGame.song}
            chart={activeGame.chart}
            difficulty={activeGame.difficulty}
            onBack={() => setActiveGame(null)}
          />
        ) : (
          <SongMenuPage onStartGame={setActiveGame} />
        )}
      </ContextMessageProvider>
    </ThemeControlProvider>
  );
}
