"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";

/**
 * OAuth landing page. The backend redirects here after a successful SSO sign-in
 * with the JWT in the URL fragment: /auth/callback#token=<jwt>&next=<path>.
 * The fragment never reaches the server (no logs / referrer leakage). We parse
 * it client-side, store the token, and forward to the intended destination.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    let next = params.get("next") || "/app";
    if (!next.startsWith("/") || next.startsWith("//")) next = "/app";

    if (!token) {
      setFailed(true);
      const t = setTimeout(() => router.replace("/login?error=Sign-in%20did%20not%20complete."), 1400);
      return () => clearTimeout(t);
    }

    setToken(token);
    // Strip the fragment so the token isn't left in the address bar / history.
    window.history.replaceState(null, "", "/auth/callback");
    router.replace(next);
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        fontFamily: "'Inter', system-ui, sans-serif", background: "#F5F2ED", color: "#18130E",
      }}
    >
      {!failed ? (
        <>
          <div
            aria-hidden
            style={{
              width: 30, height: 30, borderRadius: "50%",
              border: "3px solid #D6CFC5", borderTopColor: "#1B3A6B",
              animation: "authspin 0.8s linear infinite",
            }}
          />
          <p style={{ fontSize: 14, color: "#5C5248" }}>Signing you in…</p>
        </>
      ) : (
        <p style={{ fontSize: 14, color: "#B41C2A" }}>Sign-in didn&rsquo;t complete. Redirecting…</p>
      )}
      <style dangerouslySetInnerHTML={{ __html: "@keyframes authspin{to{transform:rotate(360deg)}}" }} />
    </main>
  );
}
