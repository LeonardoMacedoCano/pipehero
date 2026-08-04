import { useState } from "react";
import styled from "styled-components";
import PrivacyPolicyModal from "./PrivacyPolicyModal.js";

export default function AppFooter() {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <Footer>
      <LinkButton type="button" onClick={() => setPrivacyOpen(true)}>
        Privacy Policy
      </LinkButton>
      <Disclaimer>Fan-made project, not affiliated with or endorsed by Harmonix, Guitar Hero, or Clone Hero.</Disclaimer>

      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </Footer>
  );
}

const Footer = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 16px;
  text-align: center;
`;

const LinkButton = styled.button`
  color: ${({ theme }) => theme.colors.tertiary};
  text-decoration: underline;
  font-size: 0.85em;

  &:hover {
    color: ${({ theme }) => theme.colors.white};
  }
`;

const Disclaimer = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.tertiary};
  font-size: 0.75em;
  opacity: 0.7;
  max-width: 480px;
`;
