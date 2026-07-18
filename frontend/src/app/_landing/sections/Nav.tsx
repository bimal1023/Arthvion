"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { IconSearch, IconMenu, IconClose } from "../icons";

const LINKS = [
  { href: "#components", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#output", label: "The output" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // ⌘K / Ctrl-K jumps to the docs page (matches the badge in the search pill).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/docs");
      }
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a href="#" className="nav-brand" onClick={() => setMenuOpen(false)}>
          <span className="nav-brand-mark"><Logo variant="onDark" size={16} /></span>
          Arthvion
        </a>

        {/* Desktop links */}
        <div className="nav-links">
          {LINKS.map((l, i) => (
            <a key={l.href} href={l.href} className={`nav-link${i === 0 ? " active" : ""}`}>
              {l.label}
            </a>
          ))}
          <Link href="/docs" className="nav-link">Docs</Link>

          <Link
            href="/docs"
            className="nav-search"
            style={{ marginLeft: 12, textDecoration: "none" }}
            aria-label="Search the docs"
          >
            <IconSearch />
            <span style={{ flex: 1, color: "var(--n200)" }}>Search docs…</span>
            <span className="kbd">⌘K</span>
          </Link>

          <Link href="/login" className="btn btn-subtle">Sign in</Link>
          <a href="#cta" className="btn btn-primary">Get started</a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-burger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {/* Mobile menu panel */}
      <div className={`nav-mobile${menuOpen ? " open" : ""}`}>
        <div className="nav-mobile-inner">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="nav-mobile-link" onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/docs" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Docs</Link>
          <div className="nav-mobile-actions">
            <Link href="/login" className="btn btn-outline btn-md" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
            <a href="#cta" className="btn btn-primary btn-md" onClick={() => setMenuOpen(false)}>
              Get started
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
