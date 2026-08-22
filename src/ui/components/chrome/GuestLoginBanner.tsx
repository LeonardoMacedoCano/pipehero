import { GoogleSignInButton } from "lcano-react-ui";
import styled from "styled-components";

export default function GuestLoginBanner({
  message,
  googleClientId,
  onLogin,
}: {
  message: string;
  googleClientId: string | null;
  onLogin: (credential: string) => void;
}) {
  return (
    <Banner>
      <span>{message}</span>
      {googleClientId && <GoogleSignInButton clientId={googleClientId} onCredential={onLogin} />}
    </Banner>
  );
}

const Banner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  color: ${({ theme }) => theme.colors.white};
`;
