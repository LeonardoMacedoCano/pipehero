import { useEffect, useRef, useState } from "react";
import { IconButton } from "lcano-react-ui";
import styled from "styled-components";
import type { MenuScreenName } from "./navigation.js";
import AccountPopover from "./AccountPopover.js";
import CoinBalanceBadge from "./CoinBalanceBadge.js";
import CreditsModal from "./CreditsModal.js";
import SupportModal from "./SupportModal.js";

const NAV_ITEMS: { screen: MenuScreenName; label: string }[] = [
  { screen: "menu", label: "Home" },
  { screen: "profile", label: "Profile" },
  { screen: "achievements", label: "Achievements" },
  { screen: "missions", label: "Missions" },
  { screen: "shop", label: "Shop" },
  { screen: "friends", label: "Friends" },
  { screen: "options", label: "Options" },
];

export default function SideDrawer({
  current,
  onNavigate,
}: {
  current: MenuScreenName;
  onNavigate: (screen: MenuScreenName) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    drawerRef.current?.toggleAttribute("inert", !isOpen);
  }, [isOpen]);

  function navigate(screen: MenuScreenName) {
    setIsOpen(false);
    onNavigate(screen);
  }

  return (
    <>
      <ToggleWrapper>
        <IconButton icon="☰" label="Menu" onClick={() => setIsOpen(true)} />
      </ToggleWrapper>

      {isOpen && <Overlay onClick={() => setIsOpen(false)} />}

      <Drawer ref={drawerRef} $open={isOpen}>
        <DrawerHeader>
          <img src="/pipehero-icon.png" alt="" width={32} height={32} />
          <DrawerTitle>PipeHero</DrawerTitle>
          <CoinBalanceBadge />
          <CloseButton type="button" onClick={() => setIsOpen(false)} aria-label="Close menu">
            ✕
          </CloseButton>
        </DrawerHeader>

        <NavList>
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.screen}
              type="button"
              $active={current === item.screen || (item.screen === "menu" && current === "songs")}
              onClick={() => navigate(item.screen)}
            >
              {item.label}
            </NavButton>
          ))}
          <NavButton type="button" onClick={() => setSupportOpen(true)}>
            Support
          </NavButton>
          <NavButton type="button" onClick={() => setCreditsOpen(true)}>
            Credits
          </NavButton>
        </NavList>

        <AccountSection>
          <AccountPopover />
        </AccountSection>
      </Drawer>

      <CreditsModal isOpen={creditsOpen} onClose={() => setCreditsOpen(false)} />
      <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}

const ToggleWrapper = styled.div`
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 20;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 29;
`;

const Drawer = styled.nav<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 30;
  width: min(280px, 85vw);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 16px;
  overflow-y: auto;
  background-color: ${({ theme }) => theme.colors.primary};
  border-right: 1px solid ${({ theme }) => theme.colors.gray};
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.6);
  transform: translateX(${({ $open }) => ($open ? "0" : "-100%")});
  transition: transform 0.25s ease;
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DrawerTitle = styled.span`
  flex: 1;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.white};
`;

const CloseButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.tertiary};

  &:hover {
    color: ${({ theme }) => theme.colors.white};
  }
`;

const NavList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const NavButton = styled.button<{ $active?: boolean }>`
  text-align: left;
  padding: 10px 12px;
  border-radius: 6px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme, $active }) => ($active ? theme.colors.quaternary : "transparent")};

  &:hover {
    background-color: ${({ theme }) => theme.colors.secondary};
  }
`;

const AccountSection = styled.div`
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.gray};
`;
