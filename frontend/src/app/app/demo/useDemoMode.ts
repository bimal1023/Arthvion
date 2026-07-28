"use client";

import { useEffect, useState } from "react";

/**
 * Demo mode — presentation tooling for launch videos and live walkthroughs.
 *
 * `/app?demo=1` makes the dashboard run a scripted ~18s pipeline against
 * hand-authored sample data instead of dispatching a real report. It is
 * strictly client-side: no request is sent, no memo credit is spent, and no
 * server state changes. It does NOT bypass authentication — you still sign in
 * normally, so this cannot be used to view the product without an account.
 *
 * Query params:
 *   ?demo=1        enable (persists for the browser tab)
 *   ?demo=0        disable and clear
 *   &speed=1.5     timeline multiplier; >1 is faster. Clamped to 0.25–4.
 *   &badge=0       hide the "Demo data" badge — for clean video capture only.
 *
 * The badge is shown by default on purpose: sample figures should be labelled
 * as sample figures unless someone has deliberately opted out for a recording.
 */
export interface DemoConfig {
  demo: boolean;
  speed: number;
  badge: boolean;
}

const KEY = "arthvion_demo";
const OFF: DemoConfig = { demo: false, speed: 1, badge: true };

export function useDemoMode(): DemoConfig {
  const [cfg, setCfg] = useState<DemoConfig>(OFF);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("demo");

    if (raw === "0" || raw === "false") {
      sessionStorage.removeItem(KEY);
      setCfg(OFF);
      return;
    }

    let next: DemoConfig | null = null;

    if (raw === "1" || raw === "true") {
      const speed = Number(params.get("speed"));
      next = {
        demo: true,
        speed: Number.isFinite(speed) && speed > 0 ? Math.min(4, Math.max(0.25, speed)) : 1,
        badge: params.get("badge") !== "0",
      };
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } else {
      // No param this navigation — fall back to whatever the tab already had,
      // so switching dashboard tabs mid-recording doesn't drop demo mode.
      try {
        const stored = sessionStorage.getItem(KEY);
        if (stored) next = JSON.parse(stored) as DemoConfig;
      } catch {
        /* corrupt value — stay off */
      }
    }

    if (next?.demo) setCfg(next);
  }, []);

  return cfg;
}
