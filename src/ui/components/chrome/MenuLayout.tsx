import type { ReactNode } from "react";
import styled from "styled-components";
import type { MenuScreenName } from "./navigation.js";
import PipeBeam from "./PipeBeam.js";
import SideDrawer from "./SideDrawer.js";
import IconRail from "./IconRail.js";
import AppFooter from "./AppFooter.js";

export default function MenuLayout({
  children,
  current,
  onNavigate,
}: {
  children: ReactNode;
  current: MenuScreenName;
  onNavigate: (screen: MenuScreenName) => void;
}) {
  return (
    <Screen>
      <SideDrawer current={current} onNavigate={onNavigate} />
      <IconRail current={current} onNavigate={onNavigate} />

      <Header as={current === "menu" ? "div" : "button"} type={current === "menu" ? undefined : "button"} onClick={current === "menu" ? undefined : () => onNavigate("menu")} $clickable={current !== "menu"}>
        <LogoRow>
          <Logo src="/pipehero-icon.png" alt="" width={56} height={56} />
          <Wordmark>PipeHero</Wordmark>
        </LogoRow>
        <VersionTag>
          <Dash />
          Rhythm game &middot; v{__APP_VERSION__}
          <Dash />
        </VersionTag>
        <PipeBeam width="clamp(200px, 60vw, 420px)" />
      </Header>

      <ContentArea>{children}</ContentArea>

      <AppFooter />
    </Screen>
  );
}

const Screen = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(12px, 3vh, 24px);
  padding: clamp(56px, 8vh, 64px) clamp(12px, 4vw, 32px) clamp(24px, 6vh, 56px);
  background:
    radial-gradient(circle at 50% -10%, ${({ theme }) => theme.colors.secondary} 0%, ${({ theme }) => theme.colors.primary} 55%, ${({ theme }) => theme.colors.black} 100%),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0px, rgba(255, 255, 255, 0.025) 2px, transparent 2px, transparent 8px);
`;

const Header = styled.div<{ $clickable: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 0;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: opacity 0.2s ease;

  &:hover {
    opacity: ${({ $clickable }) => ($clickable ? 0.85 : 1)};
  }
`;

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Logo = styled.img`
  width: clamp(36px, 7vw, 52px);
  height: clamp(36px, 7vw, 52px);
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
`;

const Wordmark = styled.span`
  font-size: clamp(1.3rem, 4.5vw, 1.9rem);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.white};
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
`;

const VersionTag = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.75em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.tertiary};
`;

const Dash = styled.span`
  width: 22px;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.gray};
`;

const ContentArea = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex: 1;
`;
