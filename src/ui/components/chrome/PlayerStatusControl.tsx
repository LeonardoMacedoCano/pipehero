import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "lcano-react-ui";
import styled from "styled-components";
import { useAuth } from "../../hooks/useAuth.js";
import { useEconomy } from "../../hooks/useEconomy.js";
import { useShop } from "../../hooks/useShop.js";
import { LANDSCAPE_MEDIA_QUERY, MOBILE_LAYOUT_MEDIA_QUERY } from "../../responsive.js";
import AvatarBadge from "./AvatarBadge.js";
import AccountPopover from "./AccountPopover.js";

export default function PlayerStatusControl() {
  const { user, isLoading } = useAuth();
  const { coins } = useEconomy();
  const { equipped } = useShop();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isLandscapePhone = useMediaQuery(LANDSCAPE_MEDIA_QUERY);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (isLoading) return null;

  return (
    <Root ref={rootRef}>
      <Trigger type="button" onClick={() => setOpen((current) => !current)} $active={open}>
        {user ? (
          <>
            <AvatarBadge
              equippedAvatarId={equipped.avatarId}
              equippedBorderId={equipped.borderId}
              size={isLandscapePhone ? 20 : 28}
            />
            <Name>{user.name}</Name>
            <Coins>
              <span aria-hidden>🪙</span>
              {coins}
            </Coins>
          </>
        ) : (
          <span aria-hidden>👤</span>
        )}
      </Trigger>
      {open && (
        <PopoverAnchor>
          <AccountPopover />
        </PopoverAnchor>
      )}
    </Root>
  );
}

const Root = styled.div`
  position: relative;
`;

const Trigger = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  white-space: nowrap;
  opacity: ${({ $active }) => ($active ? 0.85 : 1)};

  @media ${LANDSCAPE_MEDIA_QUERY} {
    padding: 3px 8px;
    font-size: 0.8em;
  }
`;

const Name = styled.span`
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media ${MOBILE_LAYOUT_MEDIA_QUERY} {
    display: none;
  }
`;

const Coins = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const PopoverAnchor = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  max-width: calc(100vw - 32px);
`;
