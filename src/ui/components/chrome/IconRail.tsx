import { useEffect, useRef, useState } from "react";
import { IconButton, useFullscreen } from "lcano-react-ui";
import styled from "styled-components";
import type { MenuScreenName } from "./navigation.js";
import AccountPopover from "./AccountPopover.js";
import CoinBalanceBadge from "./CoinBalanceBadge.js";

export default function IconRail({
  current,
  onNavigate,
}: {
  current: MenuScreenName;
  onNavigate: (screen: MenuScreenName) => void;
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const { isFullscreen, toggle, isSupported: fullscreenSupported } = useFullscreen();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [accountOpen]);

  return (
    <Rail ref={rootRef}>
      <CoinBalanceBadge />
      <AccountWrapper>
        <IconButton icon="👤" label="Account" onClick={() => setAccountOpen((open) => !open)} active={accountOpen} />
        {accountOpen && (
          <PopoverAnchor>
            <AccountPopover />
          </PopoverAnchor>
        )}
      </AccountWrapper>
      <IconButton icon="🏆" label="Achievements" onClick={() => onNavigate("achievements")} active={current === "achievements"} />
      <IconButton icon="🎯" label="Missions" onClick={() => onNavigate("missions")} active={current === "missions"} />
      <IconButton icon="🛍️" label="Shop" onClick={() => onNavigate("shop")} active={current === "shop"} />
      <IconButton icon="🤝" label="Friends" onClick={() => onNavigate("friends")} active={current === "friends"} />
      <IconButton icon="⚙️" label="Options" onClick={() => onNavigate("options")} active={current === "options"} />
      {fullscreenSupported && (
        <IconButton icon={isFullscreen ? "⤡" : "⤢"} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggle} />
      )}
    </Rail>
  );
}

const Rail = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 20;
  display: none;
  flex-direction: column;
  gap: 10px;

  @media (min-width: 700px) {
    display: flex;
  }
`;

const AccountWrapper = styled.div`
  position: relative;
`;

const PopoverAnchor = styled.div`
  position: absolute;
  top: 0;
  right: 52px;
  width: 280px;
  max-width: calc(100vw - 32px);
`;
