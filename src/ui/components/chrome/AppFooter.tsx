import { useState } from "react";
import styled from "styled-components";
import PrivacyPolicyModal from "./PrivacyPolicyModal.js";
import SupportModal from "./SupportModal.js";
import CreditsModal from "./CreditsModal.js";

export default function AppFooter() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);

  return (
    <Footer>
      <LinkButton type="button" onClick={() => setPrivacyOpen(true)}>
        Privacy Policy
      </LinkButton>
      <Dot aria-hidden>&middot;</Dot>
      <LinkButton type="button" onClick={() => setSupportOpen(true)}>
        Support
      </LinkButton>
      <Dot aria-hidden>&middot;</Dot>
      <LinkButton type="button" onClick={() => setCreditsOpen(true)}>
        Credits
      </LinkButton>

      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
      <CreditsModal isOpen={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </Footer>
  );
}

const Footer = styled.footer`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 12px 4px;
  background-color: ${({ theme }) => theme.colors.black};
  border-top: 1px solid ${({ theme }) => theme.colors.gray};
  text-align: center;
`;

const LinkButton = styled.button`
  color: ${({ theme }) => theme.colors.gray};
  font-style: italic;
  font-size: 0.7em;

  &:hover {
    color: ${({ theme }) => theme.colors.white};
  }
`;

const Dot = styled.span`
  color: ${({ theme }) => theme.colors.gray};
  font-size: 0.7em;
`;
