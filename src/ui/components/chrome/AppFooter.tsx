import { useState } from "react";
import styled from "styled-components";
import PrivacyPolicyModal from "./PrivacyPolicyModal.js";

export default function AppFooter() {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <Footer>
      <Disclaimer>
        <FullText>Fan-made project, not affiliated with or endorsed by Harmonix, Guitar Hero, or Clone Hero. &middot; </FullText>
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
  color: ${({ theme }) => theme.colors.quaternary};
  font-size: 0.7em;
  white-space: nowrap;
`;

const FullText = styled.span`
  display: none;

  @media (min-width: 700px) {
    display: inline;
  }
`;

const LinkButton = styled.button`
  color: ${({ theme }) => theme.colors.quaternary};
  text-decoration: underline;
  font-size: inherit;

  &:hover {
    color: ${({ theme }) => theme.colors.white};
  }
`;
