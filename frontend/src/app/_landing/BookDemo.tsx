"use client";

import { useEffect } from "react";

/**
 * "Book a demo" CTA wired to Cal.com's element-click embed: clicking opens
 * the booking calendar in a popup over the page (no redirect).
 *
 * CAL_LINK is the path part of the cal.com booking URL, e.g. "bimal/arthvion-demo".
 * While it's empty the button degrades to a mailto so the CTA is never dead.
 */
const CAL_LINK = "arthvion/30min";
const FALLBACK_MAILTO =
  "mailto:bkumal@arthvion.com" +
  `?subject=${encodeURIComponent("Arthvion — demo request")}` +
  `&body=${encodeURIComponent(
    "Hi Bimal,\n\nI'd like a demo of Arthvion.\n\n" +
    "A few times that work for me (with timezone):\n• \n• \n\nThanks,\n",
  )}`;

declare global {
  interface Window {
    Cal?: { (...args: unknown[]): void; loaded?: boolean; ns?: Record<string, unknown>; q?: unknown[] };
  }
}

/** Official Cal.com embed loader (their vanilla snippet, formatted). */
function loadCalEmbed() {
  if (window.Cal?.loaded) return;
  const script = "https://app.cal.com/embed/embed.js";
  const w = window;
  const cal = (w.Cal =
    w.Cal ||
    function (...args: unknown[]) {
      const c = w.Cal!;
      if (!c.loaded) {
        c.ns = {};
        c.q = c.q || [];
        const d = document;
        const s = d.createElement("script");
        s.src = script;
        d.head.appendChild(s);
        c.loaded = true;
      }
      c.q!.push(args);
    });
  cal("init", { origin: "https://cal.com" });
  cal("ui", {
    theme: "light",
    styles: { branding: { brandColor: "#0C66E4" } },
    hideEventTypeDetails: false,
  });
}

export function BookDemo({ className = "btn btn-outline btn-lg" }: { className?: string }) {
  useEffect(() => {
    if (CAL_LINK) loadCalEmbed();
  }, []);

  if (!CAL_LINK) {
    return (
      <a href={FALLBACK_MAILTO} className={className}>
        Book a 30-min demo
      </a>
    );
  }

  return (
    <button type="button" className={className} data-cal-link={CAL_LINK}>
      Book a 30-min demo
    </button>
  );
}
