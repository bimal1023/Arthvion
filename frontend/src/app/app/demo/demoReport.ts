/**
 * Hand-authored sample report used by demo mode (`/app?demo=1`).
 *
 * This is STATIC MARKETING DATA, not agent output. It exists so a launch video
 * or a live walkthrough can show the full pipeline → memo flow in ~20 seconds
 * without a real 3-minute run, without burning memo credits, and without
 * depending on the network holding up mid-take.
 *
 * Figures are Apple's FY2024 10-K as filed (FY ended 28 Sep 2024). Verify them
 * against the source filing before publishing anything built on this file —
 * they are transcribed here for presentation, not pulled live.
 *
 * @see ./demoTimeline.ts for the scripted event sequence that lands this.
 */
import type {
  Citation, Report, FinancialSection, RiskSection, MarketSection, LegalSection,
} from "@/lib/types";

const TENK = "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm";

const cite = (source: string, excerpt?: string): Citation => ({
  source,
  url: TENK,
  filing_date: "2024-11-01",
  accession_number: "0000320193-24-000123",
  excerpt,
});

/** Builds a FinancialMetric series from [year, value, growth] triples. */
const series = (rows: [number, number, number | undefined][], source: string, period: string) =>
  rows.map(([year, value, growth_rate]) => ({
    value, year, period, growth_rate, citation: cite(source),
  }));

const financial: FinancialSection = {
  company: "Apple Inc.",
  ticker: "AAPL",
  period_of_report: "FY2024 (ended 28 Sep 2024)",
  filing_type: "10-K",

  revenue: series(
    [[2024, 391_035_000_000, 0.0202], [2023, 383_285_000_000, -0.0280], [2022, 394_328_000_000, 0.0782]],
    "10-K FY2024 · Consolidated Statements of Operations", "FY2024",
  ),
  gross_profit: series(
    [[2024, 180_683_000_000, 0.0682], [2023, 169_148_000_000, -0.0096], [2022, 170_782_000_000, 0.1174]],
    "10-K FY2024 · Consolidated Statements of Operations", "FY2024",
  ),
  operating_income: series(
    [[2024, 123_216_000_000, 0.0780], [2023, 114_301_000_000, -0.0430], [2022, 119_437_000_000, 0.0937]],
    "10-K FY2024 · Consolidated Statements of Operations", "FY2024",
  ),
  ebitda: series(
    [[2024, 134_661_000_000, 0.0723], [2023, 125_820_000_000, -0.0344], [2022, 130_308_000_000, 0.0886]],
    "10-K FY2024 · Computed from operating income + D&A", "FY2024",
  ),
  net_income: series(
    [[2024, 93_736_000_000, -0.0336], [2023, 96_995_000_000, -0.0281], [2022, 99_803_000_000, 0.0545]],
    "10-K FY2024 · Consolidated Statements of Operations", "FY2024",
  ),
  eps_diluted: series(
    [[2024, 6.08, -0.0082], [2023, 6.13, 0.0033], [2022, 6.11, 0.0888]],
    "10-K FY2024 · Consolidated Statements of Operations", "FY2024",
  ),
  total_debt: series(
    [[2024, 106_629_000_000, -0.0402], [2023, 111_088_000_000, -0.0870], [2022, 120_069_000_000, 0.0043]],
    "10-K FY2024 · Consolidated Balance Sheets", "FY2024",
  ),
  cash_and_equivalents: series(
    [[2024, 29_943_000_000, -0.0007], [2023, 29_965_000_000, 0.2312], [2022, 23_646_000_000, -0.3221]],
    "10-K FY2024 · Consolidated Balance Sheets", "FY2024",
  ),

  segments: [
    { name: "iPhone", revenue: 201_183_000_000, growth_rate: 0.0030,
      notes: "52% of revenue. Unit growth flat; ASP carried the segment." },
    { name: "Services", revenue: 96_169_000_000, growth_rate: 0.1287,
      notes: "Highest-margin segment and the primary driver of gross-margin expansion." },
    { name: "Wearables, Home & Accessories", revenue: 37_005_000_000, growth_rate: -0.0705,
      notes: "Second consecutive year of decline." },
    { name: "Mac", revenue: 29_984_000_000, growth_rate: 0.0212,
      notes: "Returned to growth on the M3/M4 refresh cycle." },
    { name: "iPad", revenue: 26_694_000_000, growth_rate: -0.0567,
      notes: "Comparison distorted by prior-year launch timing." },
  ],

  cash_flow: {
    operating_cash_flow: 118_254_000_000,
    capital_expenditure: 9_447_000_000,
    free_cash_flow: 108_807_000_000,
    dividends_paid: 15_234_000_000,
    share_repurchases: 94_949_000_000,
    fcf_margin: 0.2783,
    period: "FY2024",
    citation: cite("10-K FY2024 · Consolidated Statements of Cash Flows"),
  },

  balance_sheet: {
    current_ratio: 0.87,
    debt_to_equity: 1.87,
    net_debt: 76_686_000_000,
    interest_coverage: 39.5,
    total_assets: 364_980_000_000,
    stockholders_equity: 56_950_000_000,
    period: "FY2024",
    citation: cite("10-K FY2024 · Consolidated Balance Sheets"),
  },

  margins: {
    gross_margin: 0.4621,
    operating_margin: 0.3151,
    net_margin: 0.2397,
    fcf_margin: 0.2783,
    rnd_intensity: 0.0802,
    sga_ratio: 0.0667,
    period: "FY2024",
  },

  capital_allocation: "Apple returned $110.2B to shareholders in FY2024 — $94.9B in buybacks and "
    + "$15.2B in dividends — against $108.8B of free cash flow, a ~101% payout of FCF. Net debt of "
    + "$76.7B is serviced 39.5× over by operating income, so the negative working-capital position "
    + "reads as deliberate balance-sheet efficiency rather than liquidity stress.",

  management_notes: "No CEO or CFO transition during the period. The FY2024 net income decline is "
    + "attributable to a one-time $10.2B charge from the European Commission State Aid decision, not "
    + "to operating deterioration — operating income grew 7.8% year over year.",

  investment_highlights: [
    "Services reached $96.2B (+12.9%), now 24.6% of revenue at materially higher margin than hardware.",
    "Free cash flow of $108.8B on a 27.8% FCF margin funds the full buyback programme internally.",
    "Gross margin expanded 200 bps to 46.2% on favourable mix shift toward Services.",
    "Operating income grew 7.8% despite roughly flat total revenue — evidence of real operating leverage.",
  ],
  key_concerns: [
    "iPhone remains 51.4% of revenue; the concentration has not meaningfully diminished.",
    "Greater China revenue declined year over year and carries unhedged geopolitical exposure.",
    "Reported net income fell 3.4% on the $10.2B EU State Aid charge.",
    "Wearables declined 7.1% — the segment positioned as the next growth pillar is contracting.",
  ],

  key_ratios: {
    gross_margin: 0.4621,
    operating_margin: 0.3151,
    net_margin: 0.2397,
    roe: 164.6,
    roic: 0.61,
    debt_to_equity: 1.87,
    current_ratio: 0.87,
    interest_coverage: 39.5,
  },

  summary: "Apple closed FY2024 with $391.0B of revenue (+2.0%) and record operating income of "
    + "$123.2B (+7.8%), expanding gross margin 200 bps to 46.2% on a decisive mix shift toward "
    + "Services. Reported net income fell 3.4% to $93.7B solely on a one-time $10.2B EU State Aid "
    + "charge; adjusted for it, earnings grew. The business converts 27.8% of revenue to free cash "
    + "flow and returns essentially all of it. The durable question is not profitability but "
    + "concentration — iPhone is still over half of revenue.",

  citations: [
    cite("10-K FY2024 · Consolidated Statements of Operations", "Total net sales of $391,035 million for fiscal 2024."),
    cite("10-K FY2024 · Segment Operating Performance", "Services net sales of $96,169 million, an increase of 13%."),
    cite("10-K FY2024 · Consolidated Statements of Cash Flows", "Cash generated by operating activities of $118,254 million."),
    cite("10-K FY2024 · Note 7 — Income Taxes", "One-time charge of $10.2 billion related to the State Aid Decision."),
  ],
  confidence_score: 0.94,
};

const risk: RiskSection = {
  company: "Apple Inc.",
  risks: [
    {
      title: "iPhone revenue concentration",
      description: "iPhone accounted for $201.2B of $391.0B in FY2024 — 51.4% of total revenue. A "
        + "single-digit decline in iPhone units flows straight to consolidated results with no "
        + "segment large enough to offset it.",
      severity: "high",
      citation: cite("10-K FY2024 · Segment Operating Performance"),
    },
    {
      title: "Greater China exposure and geopolitical concentration",
      description: "Greater China contributed $66.9B of revenue and declined year over year. The "
        + "region is simultaneously a major market and, through contract manufacturing, a "
        + "single-jurisdiction dependency in the supply chain.",
      severity: "high",
      citation: cite("10-K FY2024 · Item 1A Risk Factors — International Operations"),
    },
    {
      title: "App Store regulatory remedy risk",
      description: "DOJ antitrust litigation and the EU Digital Markets Act both target App Store "
        + "distribution and payment economics. Adverse remedies would compress the highest-margin "
        + "line in the Services segment.",
      severity: "high",
      citation: cite("10-K FY2024 · Item 1A Risk Factors — Legal and Regulatory"),
    },
    {
      title: "Supply-chain concentration in single-source components",
      description: "Certain custom silicon and display components are sourced from a single supplier "
        + "with limited qualified alternatives. Requalification lead times are measured in quarters.",
      severity: "medium",
      citation: cite("10-K FY2024 · Item 1A Risk Factors — Supply Chain"),
    },
    {
      title: "Negative working capital position",
      description: "Current ratio of 0.87 means current liabilities exceed current assets. Comfortably "
        + "serviced by $118.3B of operating cash flow, but it removes balance-sheet slack in a demand shock.",
      severity: "medium",
      citation: cite("10-K FY2024 · Consolidated Balance Sheets"),
    },
    {
      title: "Wearables segment contraction",
      description: "Wearables, Home & Accessories fell 7.1% to $37.0B, a second consecutive annual "
        + "decline in the segment previously positioned as the next growth pillar.",
      severity: "low",
      citation: cite("10-K FY2024 · Segment Operating Performance"),
    },
  ],
  summary: "Six material risks, three high-severity. All three high-severity items are concentration "
    + "risks rather than solvency or governance risks — revenue concentration in iPhone, geographic "
    + "concentration in Greater China, and margin concentration in a Services business now under "
    + "simultaneous DOJ and EU regulatory pressure. The balance sheet is not a source of risk.",
  citations: [
    cite("10-K FY2024 · Item 1A Risk Factors"),
    cite("10-K FY2024 · Segment Operating Performance"),
    cite("8-K filed 2024-08-01 · Q3 FY2024 results"),
  ],
  confidence_score: 0.91,
};

const market: MarketSection = {
  company: "Apple Inc.",
  market_size_usd: 520_000_000_000,
  market_share: 0.187,
  competitors: [
    { name: "Samsung Electronics", estimated_market_share: 0.192,
      notes: "Leads global smartphone units; competes on volume rather than ASP." },
    { name: "Alphabet (Google)", estimated_market_share: 0.041,
      notes: "Controls the competing mobile OS; also Apple's largest Services partner via the TAC arrangement." },
    { name: "Xiaomi", estimated_market_share: 0.135,
      notes: "Primary share threat in emerging markets at the value tier." },
    { name: "Microsoft", estimated_market_share: 0.083,
      notes: "Competes in personal computing and services rather than smartphones." },
  ],
  growth_drivers: [
    "Services attach on a ~2.4B active device installed base — growth decoupled from hardware unit sales.",
    "On-device AI features driving an upgrade cycle among an ageing iPhone base.",
    "India and Southeast Asia expansion, where share is in the single digits against a growing middle class.",
    "Wearables and health positioned as a regulated-adjacent category with high switching costs.",
  ],
  headwinds: [
    "Smartphone replacement cycles have lengthened to roughly four years in developed markets.",
    "Domestic-champion competition and procurement restrictions in Greater China.",
    "Regulatory unbundling of App Store distribution reduces the monetisation rate on the installed base.",
    "Search-placement revenue is exposed to the outcome of US antitrust action against Alphabet.",
  ],
  summary: "Apple holds roughly 18.7% of a ~$520B premium-devices market while capturing a "
    + "disproportionate share of industry profit — the moat is pricing power and ecosystem lock-in, "
    + "not unit share. The strategically important shift is that Services growth (+12.9%) now runs "
    + "well ahead of hardware, moving the business toward installed-base monetisation. That is also "
    + "precisely the revenue that regulators are targeting.",
  citations: [
    cite("10-K FY2024 · Item 1 Business — Competition"),
    { source: "IDC Worldwide Quarterly Mobile Phone Tracker", url: "https://www.idc.com/tracker/showproductinfo.jsp?prod_id=37",
      filing_date: "2024-10-15", excerpt: "Global smartphone shipments and vendor share, Q3 2024." },
    { source: "Counterpoint Research — Global Handset Revenue Share", url: "https://www.counterpointresearch.com/",
      filing_date: "2024-09-30" },
  ],
  confidence_score: 0.83,
};

const legal: LegalSection = {
  company: "Apple Inc.",
  litigations: [
    {
      case_name: "United States v. Apple Inc., No. 2:24-cv-04055 (D.N.J.)",
      status: "Active — motion to dismiss denied, in discovery",
      description: "DOJ Antitrust Division alleges monopolisation of the performance smartphone market "
        + "through App Store restrictions, super-app suppression, and messaging interoperability. Structural "
        + "remedies are on the table; the realistic exposure is to Services economics rather than damages.",
      citation: { source: "DOJ Complaint · United States v. Apple Inc.",
        url: "https://www.justice.gov/opa/pr/justice-department-sues-apple-monopolizing-smartphone-markets",
        filing_date: "2024-03-21" },
    },
    {
      case_name: "Epic Games, Inc. v. Apple Inc., No. 4:20-cv-05640 (N.D. Cal.)",
      status: "Judgment entered — compliance and contempt proceedings ongoing",
      description: "Anti-steering injunction requires Apple to permit developers to link to external "
        + "purchase mechanisms. Subsequent enforcement proceedings addressed the commission Apple applies "
        + "to those external transactions.",
      citation: { source: "N.D. Cal. Docket · Epic Games v. Apple",
        url: "https://www.courtlistener.com/docket/17442392/epic-games-inc-v-apple-inc/",
        filing_date: "2025-04-30" },
    },
    {
      case_name: "European Commission — State Aid Decision (C-465/20 P)",
      status: "Resolved — CJEU ruled against Apple",
      description: "Court of Justice set aside the General Court judgment and restored the Commission's "
        + "original decision, resulting in a one-time charge of approximately $10.2B recognised in FY2024.",
      potential_liability_usd: 10_200_000_000,
      citation: cite("10-K FY2024 · Note 7 — Income Taxes"),
    },
  ],
  regulatory_issues: [
    { agency: "European Commission",
      description: "Digital Markets Act gatekeeper obligations — third-party app stores, default browser "
        + "choice, and interoperability requirements. Non-compliance is penalised at up to 10% of global turnover.",
      status: "Ongoing compliance and specification proceedings", potential_fine_usd: null },
    { agency: "U.S. Department of Justice",
      description: "Civil antitrust action seeking structural and behavioural remedies in the "
        + "performance smartphone market.",
      status: "In discovery", potential_fine_usd: null },
    { agency: "U.K. Competition and Markets Authority",
      description: "Mobile browser and cloud-gaming market investigation covering WebKit engine requirements.",
      status: "Remedies consultation", potential_fine_usd: null },
  ],
  summary: "Legal exposure is regulatory, not financial. The only crystallised liability is the $10.2B "
    + "EU State Aid charge, already recognised in FY2024 and non-recurring. The unresolved matters — DOJ, "
    + "DMA, CMA — converge on the same question of whether Apple may set the terms of app distribution and "
    + "payment on its own platform. None threatens solvency; all three bear directly on the margin "
    + "structure of the fastest-growing segment.",
  citations: [
    { source: "DOJ Complaint · United States v. Apple Inc.",
      url: "https://www.justice.gov/opa/pr/justice-department-sues-apple-monopolizing-smartphone-markets",
      filing_date: "2024-03-21" },
    cite("10-K FY2024 · Item 3 Legal Proceedings"),
    { source: "European Commission · DMA compliance proceedings",
      url: "https://digital-markets-act.ec.europa.eu/", filing_date: "2024-06-24" },
  ],
  confidence_score: 0.88,
};

/**
 * The landed demo report. `generated_at` is stamped at call time so the memo
 * never shows a stale date on camera.
 */
export function buildDemoReport(focusAreas: string[]): Report {
  const want = (k: string) => focusAreas.length === 0 || focusAreas.includes(k);
  return {
    id: "demo-aapl-fy2024",
    company: "Apple Inc.",
    ticker: "AAPL",
    financial: want("financial") ? financial : undefined,
    risk:      want("risk")      ? risk      : undefined,
    market:    want("market")    ? market    : undefined,
    legal:     want("legal")     ? legal     : undefined,
    executive_summary:
      "Apple presents as a premium compounder with an intact moat and a concentration problem it has "
      + "not yet solved. FY2024 revenue of $391.0B (+2.0%) understates the operating result: gross margin "
      + "expanded 200 bps to 46.2% and operating income grew 7.8% to a record $123.2B, as a decisive mix "
      + "shift toward Services (+12.9%, now 24.6% of revenue) did the work that hardware units did not. "
      + "Reported net income fell 3.4%, entirely on a one-time $10.2B EU State Aid charge.\n\n"
      + "Two things carry the risk. iPhone is still 51.4% of revenue, and Greater China — $66.9B and "
      + "declining — is both a major market and a supply-chain single point of failure. Layered on top, "
      + "DOJ antitrust action and EU DMA obligations target App Store distribution economics specifically, "
      + "which means the regulatory exposure and the growth engine are the same line item.\n\n"
      + "The balance sheet is not a source of concern: $118.3B of operating cash flow, 27.8% FCF margin, "
      + "and interest coverage of 39.5×. Conviction 7.4/10 — high-quality compounder, priced for "
      + "continuation, with the principal downside concentrated in regulatory outcomes on Services rather "
      + "than in operating execution.",
    overall_score: 7.4,
    status: "complete",
    generated_at: new Date().toISOString(),
  };
}
