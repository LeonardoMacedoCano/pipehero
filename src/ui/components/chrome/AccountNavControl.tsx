import { useEffect, useRef, useState } from "react";
import { IconButton } from "lcano-react-ui";
import styled from "styled-components";
import AccountPopover from "./AccountPopover.js";

export default function AccountNavControl() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <Root ref={rootRef}>
      <IconButton icon="👤" label="Account" onClick={() => setOpen((current) => !current)} active={open} />
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

const PopoverAnchor = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 280px;
  max-width: calc(100vw - 32px);
`;
