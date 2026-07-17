import { Reveal } from "../Reveal";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Where does the data actually come from?",
    a: (
      <>
        Primary sources, not summaries of summaries: SEC EDGAR filings (10-K, 10-Q, 8-K,
        XBRL company facts), live web research, court dockets via RECAP, sanctions and PEP
        screens, and macro series from FRED. Every claim in a memo is cited back to the
        specific source it came from.
      </>
    ),
  },
  {
    q: "How is this different from asking ChatGPT about a company?",
    a: (
      <>
        A chat model answers from memory and can invent numbers. Arthvion dispatches four
        specialist agents that pull the underlying documents at run time, compute figures
        from the filings themselves, and refuse to state anything they can&rsquo;t cite. The
        synthesis step then cross-checks the four outputs against each other before scoring.
      </>
    ),
  },
  {
    q: "Does it work on private companies?",
    a: (
      <>
        Yes — with honest limits. Public-filing agents contribute less, while the market,
        risk, and legal agents lean on web research and court records. Upload a data room on
        the Firm plan and the agents cite your private documents alongside public sources.
      </>
    ),
  },
  {
    q: "Can my team review and edit before anything ships?",
    a: (
      <>
        Always. Memos land in-app first, with inline comments for the team, full citation
        trails for verification, and PDF/JSON export only when you say so. Think of the
        agents as a first-pass analyst, not a final sign-off.
      </>
    ),
  },
  {
    q: "What about security and confidentiality?",
    a: (
      <>
        Workspaces are tenant-isolated, uploaded documents are scoped to your workspace and
        never used to train models, and Firm plans add SSO, dedicated tenancy, and BYOK.
        Watchlists and memo history stay inside your workspace.
      </>
    ),
  },
  {
    q: "How does pricing work when I run out of memos?",
    a: (
      <>
        Solo includes 3 free memos to evaluate the product. Desk includes 50 per month and
        lets you buy top-up credits mid-cycle if a sprint runs hot — no plan change, no
        seat games. Firm is volume-priced to your desk.
      </>
    ),
  },
];

export function Faq() {
  return (
    <section className="section" id="faq" style={{ background: "var(--n10)", borderTop: "1px solid var(--n30)" }}>
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Asked in every pilot. Answered here.</h2>
          </div>
        </Reveal>

        <div className="faq-list">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={Math.min(i * 60, 240)}>
              <details className="faq-item" {...(i === 0 ? { open: true } : {})}>
                <summary>
                  {f.q}
                  <span className="faq-q-icon" aria-hidden>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <div className="faq-a">{f.a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
