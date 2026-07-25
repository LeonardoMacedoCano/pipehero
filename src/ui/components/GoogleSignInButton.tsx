import { useEffect, useRef } from "react";

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (!gisScriptPromise) {
    gisScriptPromise = new Promise((resolvePromise, reject) => {
      if (document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`)) {
        resolvePromise();
        return;
      }
      const script = document.createElement("script");
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolvePromise();
      script.onerror = () => reject(new Error("Failed to load Google Identity Services script"));
      document.head.appendChild(script);
    });
  }
  return gisScriptPromise;
}

export default function GoogleSignInButton({
  clientId,
  onCredential,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    loadGisScript().then(() => {
      if (cancelled || !containerRef.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, { theme: "outline", size: "large", width: 260 });
    });

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  return <div ref={containerRef} />;
}
