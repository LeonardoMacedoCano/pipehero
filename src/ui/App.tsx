import { useState } from "react";
import { ContextMessageProvider } from "lcano-react-ui";
import { ThemeControlProvider } from "./contexts/theme/ThemeControlProvider.js";
import { GlobalStyles } from "./GlobalStyles.js";
import MainMenuPage from "./pages/MainMenuPage.js";
import SongMenuPage from "./pages/SongMenuPage.js";
import OptionsPage from "./pages/OptionsPage.js";
import AchievementsPage from "./pages/AchievementsPage.js";
import GamePage from "./pages/GamePage.js";
import type { StartGameParams } from "./components/SongOptionsModal.js";

type Screen =
  | { name: "menu" }
  | { name: "songs" }
  | { name: "options" }
  | { name: "achievements" }
  | { name: "game"; params: StartGameParams };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "menu" });

  return (
    <ThemeControlProvider>
      <GlobalStyles />
      <ContextMessageProvider>
        {screen.name === "game" && (
          <GamePage
            song={screen.params.song}
            chart={screen.params.chart}
            difficulty={screen.params.difficulty}
            onBack={() => setScreen({ name: "songs" })}
          />
        )}
        {screen.name === "songs" && (
          <SongMenuPage
            onStartGame={(params) => setScreen({ name: "game", params })}
            onBack={() => setScreen({ name: "menu" })}
          />
        )}
        {screen.name === "options" && <OptionsPage onBack={() => setScreen({ name: "menu" })} />}
        {screen.name === "achievements" && <AchievementsPage onBack={() => setScreen({ name: "menu" })} />}
        {screen.name === "menu" && (
          <MainMenuPage
            onPlaySingleplayer={() => setScreen({ name: "songs" })}
            onOpenOptions={() => setScreen({ name: "options" })}
            onOpenAchievements={() => setScreen({ name: "achievements" })}
          />
        )}
      </ContextMessageProvider>
    </ThemeControlProvider>
  );
}
