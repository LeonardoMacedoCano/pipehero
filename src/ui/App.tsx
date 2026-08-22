import { useState } from "react";
import { ContextMessageProvider, type ToastStackItem } from "lcano-react-ui";
import { ThemeControlProvider, useThemeControl } from "./contexts/theme/ThemeControlProvider.js";
import { AuthProvider } from "./hooks/useAuth.js";
import { EconomyProvider } from "./hooks/useEconomy.js";
import { ShopProvider } from "./hooks/useShop.js";
import { AchievementToastProvider, AchievementToastStack } from "./components/chrome/AchievementToastProvider.js";
import { GlobalStyles } from "./GlobalStyles.js";
import MenuLayout from "./components/chrome/MenuLayout.js";
import type { MenuScreenName } from "./components/chrome/navigation.js";
import MainMenuPage from "./pages/MainMenuPage.js";
import SongMenuPage from "./pages/SongMenuPage.js";
import OptionsPage from "./pages/OptionsPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import AchievementsPage from "./pages/AchievementsPage.js";
import MissionsPage from "./pages/MissionsPage.js";
import ShopPage from "./pages/ShopPage.js";
import FriendsPage from "./pages/FriendsPage.js";
import GamePage from "./pages/GamePage.js";
import type { StartGameParams } from "./components/SongOptionsModal.js";

type Screen = { name: MenuScreenName } | { name: "game"; params: StartGameParams };

function AppGlobalStyles() {
  const { themeEffectId } = useThemeControl();
  return <GlobalStyles $themeEffectId={themeEffectId} />;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "menu" });

  function navigate(name: MenuScreenName) {
    setScreen({ name });
  }

  function handleToastClick(item: ToastStackItem) {
    navigate(item.eyebrow === "Achievement Unlocked" ? "achievements" : "missions");
  }

  return (
    <AchievementToastProvider>
      <AuthProvider>
        <EconomyProvider>
          <ShopProvider>
            <ThemeControlProvider>
              <AppGlobalStyles />
              <AchievementToastStack onView={handleToastClick} />
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
                {screen.name === "profile" && (
                  <MenuLayout current="profile" onNavigate={navigate}>
                    <ProfilePage />
                  </MenuLayout>
                )}
                {screen.name === "achievements" && (
                  <MenuLayout current="achievements" onNavigate={navigate}>
                    <AchievementsPage />
                  </MenuLayout>
                )}
                {screen.name === "missions" && (
                  <MenuLayout current="missions" onNavigate={navigate}>
                    <MissionsPage />
                  </MenuLayout>
                )}
                {screen.name === "shop" && (
                  <MenuLayout current="shop" onNavigate={navigate}>
                    <ShopPage />
                  </MenuLayout>
                )}
                {screen.name === "friends" && (
                  <MenuLayout current="friends" onNavigate={navigate}>
                    <FriendsPage />
                  </MenuLayout>
                )}
                {screen.name === "menu" && (
                  <MenuLayout current="menu" onNavigate={navigate}>
                    <MainMenuPage
                      onPlaySingleplayer={() => navigate("songs")}
                      onViewFriends={() => navigate("friends")}
                      onViewMissions={() => navigate("missions")}
                      onViewAchievements={() => navigate("achievements")}
                    />
                  </MenuLayout>
                )}
              </ContextMessageProvider>
            </ThemeControlProvider>
          </ShopProvider>
        </EconomyProvider>
      </AuthProvider>
    </AchievementToastProvider>
  );
}
