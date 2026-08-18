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

      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </Footer>
  );
}

const Footer = styled.footer`
  width: 100%;
  display: flex;
  justify-content: center;
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
