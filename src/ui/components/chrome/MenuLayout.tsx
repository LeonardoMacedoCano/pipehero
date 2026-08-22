import type { ReactNode } from "react";
import styled from "styled-components";
import { RailTabsNav, type RailTabsNavItem } from "lcano-react-ui";
import type { MenuScreenName } from "./navigation.js";
import AppFooter from "./AppFooter.js";
import PlayerStatusControl from "./PlayerStatusControl.js";
import { DESKTOP_LAYOUT_MEDIA_QUERY, MOBILE_LAYOUT_MEDIA_QUERY } from "../../responsive.js";

const RAIL_WIDTH = 76;
const TAB_BAR_HEIGHT = 64;

const NAV_SCREENS: { screen: MenuScreenName; icon: string; label: string }[] = [
  { screen: "menu", icon: "🏠", label: "Home" },
  { screen: "profile", icon: "🪪", label: "Profile" },
  { screen: "achievements", icon: "🏆", label: "Achievements" },
  { screen: "missions", icon: "🎯", label: "Missions" },
  { screen: "shop", icon: "🛍️", label: "Shop" },
  { screen: "friends", icon: "🤝", label: "Friends" },
  { screen: "options", icon: "⚙️", label: "Options" },
];

export default function MenuLayout({
  children,
  current,
  onNavigate,
}: {
  children: ReactNode;
  current: MenuScreenName;
  onNavigate: (screen: MenuScreenName) => void;
}) {
  const items: RailTabsNavItem[] = NAV_SCREENS.map((entry) => ({
    id: entry.screen,
    icon: entry.icon,
    label: entry.label,
    active: current === entry.screen || (entry.screen === "menu" && current === "songs"),
    onClick: () => onNavigate(entry.screen),
  }));

  return (
    <Root>
      <RailTabsNav items={items} ariaLabel="Main navigation" />

      <PlayerStatusSlot>
        <PlayerStatusControl />
      </PlayerStatusSlot>

      <Screen>
        <ContentArea>{children}</ContentArea>
      </Screen>

      <AppFooter />
    </Root>
  );
}

const Root = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;

  @media ${DESKTOP_LAYOUT_MEDIA_QUERY} {
    padding-left: ${RAIL_WIDTH}px;
  }

  @media ${MOBILE_LAYOUT_MEDIA_QUERY} {
    padding-bottom: ${TAB_BAR_HEIGHT}px;
  }
`;

const PlayerStatusSlot = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 20;
`;

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(12px, 3vh, 24px);
  padding: clamp(10px, 2vh, 18px) clamp(12px, 4vw, 32px);
  background:
    radial-gradient(circle at 50% -10%, ${({ theme }) => theme.colors.secondary} 0%, ${({ theme }) => theme.colors.primary} 55%, ${({ theme }) => theme.colors.black} 100%),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0px, rgba(255, 255, 255, 0.025) 2px, transparent 2px, transparent 8px);
`;

const ContentArea = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex: 1;
`;
