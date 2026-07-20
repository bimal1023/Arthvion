import {
  IconArrow, IconEye,
  IconFinancial, IconLegal, IconMarket, IconRisk,
} from "../icons";
import { MiniGauge } from "../MiniGauge";

const HERO_META = [
  { num: "2:47",  label: "Median run time" },
  { num: "38",    label: "Avg. citations per memo" },
  { num: "94%",   label: "Analyst-grade pass rate" },
  { num: "SOC 2", label: "Type II · tenant-isolated" },
];

/* Section tabs — mirrors the real ReportViewer tab bar (same order, same accents). */
const VIZ_SECTIONS = [
  { icon: <IconFinancial size={12} />, name: "Financial", accent: "var(--b500)" },
  { icon: <IconRisk size={12} />,      name: "Risk",      accent: "var(--y500)" },
  { icon: <IconMarket size={12} />,    name: "Market",    accent: "var(--g500)" },
  { icon: <IconLegal size={12} />,     name: "Legal",     accent: "var(--t500)" },
];

/* Key-metrics strip — mirrors the real report header's 4-column summary. */
const VIZ_METRICS = [
  { label: "Revenue (TTM)", value: "$416.2B", delta: "+8.4%",  tone: "up" as const },
  { label: "Net Income",    value: "$103.9B", delta: "+12.1%", tone: "up" as const },
  { label: "Market Share",  value: "23.4%",   delta: "",       tone: "flat" as const },
  { label: "Active Risks",  value: "7",       delta: "2 high severity", tone: "warn" as const },
];


const LOGO_ROW = [
  "Northbridge Capital", "Sequoia Heritage", "Generation IM",
  "Glenview & Co.", "Atlas Pacific", "Carlyle MAS",
];

export function Hero() {
  return (
    <header className="hero">
      <div className="container">
        <div className="hero-grid">

          {/* ── Left: copy ── */}
          <div>
            <h1 className="rise rise-2">
              Institutional diligence,<br />
              <span className="serif">on demand.</span>
            </h1>

            <p className="lead rise rise-3">
              Four specialist agents pull SEC filings, market intelligence, and litigation records
              in parallel — then synthesise a single sourced memo. The work that used to take a junior
              analyst two days finishes in about three minutes.
            </p>

            <div className="hero-actions rise rise-3">
              <a href="#cta" className="btn btn-primary btn-lg">
                Start free <IconArrow />
              </a>
              <a href="#output" className="btn btn-outline btn-lg">
                <IconEye /> See a live memo
              </a>
            </div>

            <div className="hero-meta rise rise-4">
              {HERO_META.map((m) => (
                <div className="hero-meta-item" key={m.label}>
                  <span className="hero-meta-num tnum">{m.num}</span>
                  <span className="hero-meta-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: live report mockup ── */}
          <div style={{ position: "relative" }} className="rise rise-5">
            <div className="viz-card">
              <div className="viz-head">
                <div className="viz-head-dots"><span /><span /><span /></div>
                <div className="viz-tabs">
                  <span className="viz-tab active">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                      <path d="M14 3v5h5" />
                    </svg>
                    AAPL · Memo
                  </span>
                  <span className="viz-tab">NVDA</span>
                  <span className="viz-tab">+ New</span>
                </div>
              </div>

              {/* Header — meta, title, score gauge (mirrors the report header card) */}
              <div className="viz-top">
                <div className="viz-top-main">
                  <div className="viz-meta">
                    <span className="viz-pill"><i />Due Diligence Report</span>
                    <span className="viz-cites">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                        <path d="M3 12a9 3 0 0 0 18 0" />
                      </svg>
                      38 citations
                    </span>
                    <span className="viz-time">· 2m 47s</span>
                  </div>

                  <div className="viz-title">
                    <h4>Apple Inc.</h4>
                    <span className="viz-ticker">AAPL</span>
                  </div>
                </div>

                <div className="viz-gauge">
                  <MiniGauge score={7.4} />
                </div>
              </div>

              {/* Key metrics strip */}
              <div className="viz-metrics">
                {VIZ_METRICS.map((m) => (
                  <div className="viz-metric" key={m.label}>
                    <span className="viz-metric-label">{m.label}</span>
                    <span className="viz-metric-val tnum">{m.value}</span>
                    {m.delta && (
                      <span className={`viz-metric-delta viz-metric-delta-${m.tone}`}>{m.delta}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Section tabs */}
              <div className="viz-sections">
                {VIZ_SECTIONS.map((s, i) => (
                  <span className={`viz-section${i === 0 ? " active" : ""}`} key={s.name}>
                    <span style={{ color: s.accent, display: "inline-flex" }}>{s.icon}</span>
                    {s.name}
                  </span>
                ))}
              </div>

              <div className="viz-body">
                <div className="viz-finding">
                  <b>Services moat continues to compound:</b> revenue up 16% YoY to $24.2B,
                  now 28% of total revenue<sup>3</sup>. Gross margin expanded 280 bps<sup>4</sup>,
                  offsetting iPhone unit softness in Greater China<sup>11</sup>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo marquee */}
        <div className="marquee">
          <span className="marquee-label">Trusted by analysts at</span>
          <div className="marquee-track">
            {[...LOGO_ROW, ...LOGO_ROW].map((l, i) => (
              <span className="logo-mark" key={`${l}-${i}`}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
