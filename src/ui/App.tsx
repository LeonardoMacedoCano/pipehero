import { useState } from "react";
import { ContextMessageProvider } from "lcano-react-ui";
import { ThemeControlProvider } from "./contexts/theme/ThemeControlProvider.js";
import { AuthProvider } from "./hooks/useAuth.js";
import { GlobalStyles } from "./GlobalStyles.js";
import MenuLayout from "./components/chrome/MenuLayout.js";
import type { MenuScreenName } from "./components/chrome/navigation.js";
import MainMenuPage from "./pages/MainMenuPage.js";
import SongMenuPage from "./pages/SongMenuPage.js";
import OptionsPage from "./pages/OptionsPage.js";
import AchievementsPage from "./pages/AchievementsPage.js";
import GamePage from "./pages/GamePage.js";
import type { StartGameParams } from "./components/SongOptionsModal.js";

type Screen = { name: MenuScreenName } | { name: "game"; params: StartGameParams };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "menu" });

  function navigate(name: MenuScreenName) {
    setScreen({ name });
  }

  return (
    <AuthProvider>
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
            <MenuLayout current="songs" onNavigate={navigate}>
              <SongMenuPage onStartGame={(params) => setScreen({ name: "game", params })} />
            </MenuLayout>
          )}
          {screen.name === "options" && (
            <MenuLayout current="options" onNavigate={navigate}>
              <OptionsPage />
            </MenuLayout>
          )}
          {screen.name === "achievements" && (
            <MenuLayout current="achievements" onNavigate={navigate}>
              <AchievementsPage />
            </MenuLayout>
          )}
          {screen.name === "menu" && (
            <MenuLayout current="menu" onNavigate={navigate}>
              <MainMenuPage onPlaySingleplayer={() => navigate("songs")} />
            </MenuLayout>
          )}
        </ContextMessageProvider>
      </ThemeControlProvider>
    </AuthProvider>
  );
}
