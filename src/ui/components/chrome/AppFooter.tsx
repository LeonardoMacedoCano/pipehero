import { useState } from "react";
import styled from "styled-components";
import PrivacyPolicyModal from "./PrivacyPolicyModal.js";

export default function AppFooter() {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <Footer>
      <Disclaimer>
        Fan-made project, not affiliated with or endorsed by Harmonix, Guitar Hero, or Clone Hero. &middot;{" "}
        <LinkButton type="button" onClick={() => setPrivacyOpen(true)}>
          Privacy Policy
        </LinkButton>
      </Disclaimer>

      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </Footer>
  );
}

const Footer = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  padding: 4px 12px;
  background-color: ${({ theme }) => theme.colors.black};
  text-align: center;
`;

const Disclaimer = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.tertiary};
  font-size: 0.7em;
  opacity: 0.7;
  white-space: nowrap;
  overflow-x: auto;
  max-width: 100%;
`;

const LinkButton = styled.button`
  color: ${({ theme }) => theme.colors.tertiary};
  text-decoration: underline;
  font-size: inherit;

  &:hover {
    color: ${({ theme }) => theme.colors.white};
  }
`;
