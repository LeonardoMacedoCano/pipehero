import styled from "styled-components";

const LANE_COLORS = ["lane1", "lane2", "lane3", "lane4", "lane5"] as const;

export function NoteLaneThumbnail() {
  return (
    <Highway>
      {LANE_COLORS.map((lane, i) => (
        <Lane key={lane} $lane={lane} style={{ left: `${12 + i * 18}%` }} />
      ))}
      <Note style={{ left: "12%", top: "20%" }} $lane="lane1" />
      <Note style={{ left: "48%", top: "45%" }} $lane="lane3" />
      <Note style={{ left: "84%", top: "30%" }} $lane="lane5" />
      <HitLine />
    </Highway>
  );
}

export function FriendsThumbnail() {
  return (
    <Highway>
      <Avatar style={{ left: "30%", top: "35%" }} />
      <Avatar style={{ left: "55%", top: "50%" }} />
    </Highway>
  );
}

const Highway = styled.div`
  position: absolute;
  inset: 0;
`;

const Lane = styled.div<{ $lane: (typeof LANE_COLORS)[number] }>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: ${({ theme, $lane }) => theme.colors[$lane]};
  opacity: 0.25;
`;

const Note = styled.div<{ $lane: (typeof LANE_COLORS)[number] }>`
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: ${({ theme, $lane }) => theme.colors[$lane]};
  box-shadow: 0 0 8px ${({ theme, $lane }) => theme.colors[$lane]};
`;

const HitLine = styled.div`
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 18%;
  height: 2px;
  background-color: ${({ theme }) => theme.colors.hitLine};
  opacity: 0.6;
`;

const Avatar = styled.div`
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.quaternary};
  border: 2px solid ${({ theme }) => theme.colors.tertiary};
  opacity: 0.6;
`;
