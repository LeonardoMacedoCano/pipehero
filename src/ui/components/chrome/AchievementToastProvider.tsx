import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styled, { keyframes } from "styled-components";

export interface UnlockedAchievement {
  code: string;
  name: string;
  description: string;
  icon: string;
}

interface QueuedToast extends UnlockedAchievement {
  id: number;
}

interface AchievementToastContextValue {
  toasts: QueuedToast[];
  notify: (achievements: UnlockedAchievement[]) => void;
  dismiss: (id: number) => void;
}

const AchievementToastContext = createContext<AchievementToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 6000;

export function AchievementToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const nextIdRef = useRef(0);

  const notify = useCallback((achievements: UnlockedAchievement[]) => {
    if (achievements.length === 0) return;
    setToasts((current) => [...current, ...achievements.map((achievement) => ({ ...achievement, id: nextIdRef.current++ }))]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);

  return <AchievementToastContext.Provider value={value}>{children}</AchievementToastContext.Provider>;
}

function useAchievementToastContext(): AchievementToastContextValue {
  const context = useContext(AchievementToastContext);
  if (!context) throw new Error("useAchievementToast must be used within an <AchievementToastProvider>");
  return context;
}

export function useAchievementToast(): { notify: (achievements: UnlockedAchievement[]) => void } {
  const { notify } = useAchievementToastContext();
  return { notify };
}

export function AchievementToastStack({ onView }: { onView: () => void }) {
  const { toasts, dismiss } = useAchievementToastContext();

  return (
    <Stack>
      {toasts.map((toast) => (
        <AchievementToastCard key={toast.id} toast={toast} onView={onView} onDismiss={dismiss} />
      ))}
    </Stack>
  );
}

function AchievementToastCard({
  toast,
  onView,
  onDismiss,
}: {
  toast: QueuedToast;
  onView: () => void;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss, toast.id]);

  function handleActivate() {
    onView();
    onDismiss(toast.id);
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") handleActivate();
      }}
    >
      <Icon>{toast.icon}</Icon>
      <Body>
        <Eyebrow>Achievement Unlocked</Eyebrow>
        <Name>{toast.name}</Name>
        <Description>{toast.description}</Description>
      </Body>
      <CloseButton
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss(toast.id);
        }}
        aria-label="Dismiss"
      >
        ✕
      </CloseButton>
    </Card>
  );
}

const slideIn = keyframes`
  from { transform: translateX(24px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const Stack = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(340px, calc(100vw - 32px));
`;

const Card = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  text-align: left;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.quaternary};
  background-color: ${({ theme }) => theme.colors.tertiary};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  animation: ${slideIn} 0.2s ease-out;

  &:hover {
    filter: brightness(1.1);
  }
`;

const Icon = styled.div`
  font-size: 1.8em;
  line-height: 1;
  flex-shrink: 0;
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Eyebrow = styled.div`
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.quaternary};
  font-weight: bold;
`;

const Name = styled.div`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.white};
  margin-top: 2px;
`;

const Description = styled.div`
  font-size: 0.85em;
  color: ${({ theme }) => theme.colors.white};
  opacity: 0.8;
  margin-top: 2px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.white};
  opacity: 0.6;
  cursor: pointer;
  font-size: 0.8em;
  padding: 2px;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
  }
`;
