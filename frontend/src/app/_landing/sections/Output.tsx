import { IconInfo } from "../icons";
import { MiniGauge } from "../MiniGauge";
import { Reveal } from "../Reveal";

const OUTPUT_KEYS = [
  { n: "01", text: <><b>Every claim is citable.</b> Hover any superscript to jump to the source paragraph in the underlying filing.</> },
  { n: "02", text: <><b>Conviction, not vibes.</b> The 0–10 score is the synthesis agent&rsquo;s calibrated output, and every section carries its own confidence score.</> },
  { n: "03", text: <><b>Written by specialists.</b> Financial, risk, market, and legal are each researched by a dedicated agent against its own sources — SEC filings, court dockets, market data.</> },
  { n: "04", text: <><b>Board-ready export.</b> Print to a formatted PDF in-app — cover page, numbered sections, and full source list included.</> },
];

const SEGMENT_ROWS: [string, string, string, string, string, boolean][] = [
  ["iPhone",            "200.6", "201.9", "+0.6%",  "52%", false],
  ["Services",          "85.2",  "99.1",  "+16.3%", "26%", false],
  ["Mac",               "29.4",  "29.9",  "+1.7%",  "8%",  false],
  ["iPad",              "28.3",  "25.1",  "−11.3%", "7%",  true],
  ["Wearables & Other", "39.8",  "37.0",  "−7.0%",  "7%",  true],
];

const RISK_ROWS = [
  {
    title: "DOJ antitrust action targets the App Store model",
    body: <>Remedy outcomes could compress services margin by 200–400 bps in the bear case<sup>24</sup>.</>,
  },
  {
    title: "Greater China concentration",
    body: <>Still 17% of revenue<sup>30</sup>; iPhone unit softness only partially offset by services growth<sup>33</sup>.</>,
  },
];

const SOURCES = ["10-K FY2024 · Item 1A", "10-Q Q3 · Item 1", "DOJ v. Apple, No. 2:24-cv-04055", "FY24 Q3 earnings call"];

export function Output() {
  return (
    <section className="output" id="output">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="eyebrow">The output</span>
            <h2>An analyst-grade memo, every time.</h2>
            <p className="lead">
              Not a summary. Not a bulleted blob. A real investment memo with structure, evidence, and a single defensible conclusion.
            </p>
          </div>
        </Reveal>

        <div className="output-grid">
          <aside className="output-side">
            <div className="output-tabs">
              {["Memo", "PDF"].map((t) => (
                <button key={t} className={`output-tab${t === "Memo" ? " active" : ""}`}>
                  {t}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "var(--fs-small)", color: "var(--n300)", lineHeight: 1.6, margin: "0 0 var(--s-300)" }}>
              The default deliverable, structured like an IC memo: executive summary, financial analysis,
              a severity-weighted risk register, market position, legal exposure — and a defended conviction score.
            </p>
            <div className="output-keys">
              {OUTPUT_KEYS.map((k) => (
                <div className="output-key" key={k.n}>
                  <span className="output-key-num">{k.n}</span>
                  <div className="output-key-text">{k.text}</div>
                </div>
              ))}
            </div>
          </aside>

          <article className="doc">
            {/* Cover strip — mirrors the real print memo's header */}
            <div className="doc-cover">
              <div className="doc-cover-main">
                <div className="doc-cover-eyebrow">Due Diligence Investment Memo</div>
                <h3>Apple Inc.</h3>
                <div className="sub">
                  <span className="ticker">AAPL</span>
                  <span>Generated 20 Jul 2026 · 4 sections · 38 citations</span>
                </div>
              </div>
              <MiniGauge score={7.4} size={88} />
            </div>

            {/* Executive summary */}
            <div className="doc-section">
              <div className="doc-eyebrow">Executive Summary</div>
              <p className="doc-p">
                Apple presents as a premium compounder: services growth and expanding gross margins
                offset a maturing iPhone cycle, with best-in-class capital returns. Antitrust remedy
                risk and Greater China exposure are the two material watch items.
              </p>
            </div>

            {/* § 1 · Financial Analysis */}
            <div className="doc-section">
              <div className="doc-sechead">
                <span className="doc-secnum" style={{ background: "var(--b500)" }}>1</span>
                <span className="doc-seclabel">Financial Analysis</span>
                <span className="doc-conf"><i style={{ width: "85%" }} />Confidence 0.85</span>
              </div>
              <h4 className="doc-h">Services moat continues to compound on a healthy hardware base.</h4>
              <p className="doc-p">
                Apple&apos;s services segment grew 16.3% YoY to $24.2B, now 28% of total revenue<sup>3</sup>,
                with gross margin expanding 280 basis points to 74.0%<sup>4</sup>. The services flywheel is
                increasingly compounding on the installed base rather than on net-new hardware units<sup>7</sup>.
              </p>
              <div className="doc-callout">
                <IconInfo />
                <div>
                  <b>Source trace:</b> The 16.3% YoY services figure reconciles to{" "}
                  <a href="#">10-Q § Item 1</a>, and is corroborated by the{" "}
                  <a href="#">FY24 Q3 earnings transcript</a>.
                </div>
              </div>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Segment</th><th>FY23</th><th>FY24</th>
                    <th className="mono">YoY</th><th className="mono">Mix</th>
                  </tr>
                </thead>
                <tbody>
                  {SEGMENT_ROWS.map(([seg, fy23, fy24, yoy, mix, neg]) => (
                    <tr key={seg}>
                      <td>{seg}</td>
                      <td className="mono">{fy23}</td>
                      <td className="mono">{fy24}</td>
                      <td className={`ch${neg ? " neg" : ""}`}>{yoy}</td>
                      <td className="mono">{mix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* § 2 · Risk Assessment — severity-grouped, like the real Risk tab */}
            <div className="doc-section">
              <div className="doc-sechead">
                <span className="doc-secnum" style={{ background: "var(--y500)" }}>2</span>
                <span className="doc-seclabel">Risk Assessment</span>
                <span className="doc-conf"><i style={{ width: "92%" }} />Confidence 0.92</span>
              </div>
              <div className="doc-sev">
                <span className="doc-sev-label">High severity</span>
                <span className="doc-sev-count">2</span>
              </div>
              {RISK_ROWS.map((r) => (
                <div className="doc-risk" key={r.title}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <path d="M12 9v4" /><path d="M12 17h.01" />
                  </svg>
                  <div>
                    <b>{r.title}.</b> {r.body}
                  </div>
                </div>
              ))}
            </div>

            {/* Sources — mirrors the CitationFooter chip row */}
            <div className="doc-sources">
              <span className="doc-sources-label">Sources</span>
              {SOURCES.map((s) => (
                <span className="doc-source-chip" key={s}>{s}</span>
              ))}
              <span className="doc-sources-more">+12 more</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
