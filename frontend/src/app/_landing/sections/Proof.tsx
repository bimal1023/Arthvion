import { Reveal } from "../Reveal";

const STATS = [
  {
    num: <>2<span className="serif">:</span>47</>,
    cap: "Median wall-clock time from brief to finished memo — four agents running in parallel.",
  },
  {
    num: <>38<span className="serif">+</span></>,
    cap: "Average citations per memo. Every claim traceable to the filing paragraph it came from.",
  },
  {
    num: <>16<span className="serif">h</span></>,
    cap: "Analyst hours saved per memo versus a manual first-pass diligence workup.",
  },
];

const QUOTES = [
  {
    quote: (
      <>
        We used to lose two days to a first-pass workup. Now the memo is waiting
        before the kickoff call ends — <em>and the citations actually check out.</em>
      </>
    ),
    initials: "MR",
    name: "Managing Director",
    role: "Mid-market PE fund · New York",
  },
  {
    quote: (
      <>
        The risk agent flagged a customer-concentration clause buried in an 8-K that
        our own checklist missed. <em>That single catch paid for the year.</em>
      </>
    ),
    initials: "VP",
    name: "VP, Diligence",
    role: "Growth equity firm · San Francisco",
  },
  {
    quote: (
      <>
        I treat it like a junior analyst who never sleeps: brief it, let it run,
        redline the output. <em>The conviction score is a genuinely useful prior.</em>
      </>
    ),
    initials: "SA",
    name: "Senior Analyst",
    role: "Long/short equity desk · London",
  },
];

export function Proof() {
  return (
    <section className="proof" id="proof">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="eyebrow">Why teams switch</span>
            <h2>The numbers a diligence desk actually cares about.</h2>
            <p className="lead">
              Speed is the headline, but sourcing is the point — a memo you can defend
              in an IC meeting, produced before the coffee is cold.
            </p>
          </div>
        </Reveal>

        <div className="proof-stats">
          {STATS.map((s, i) => (
            <Reveal key={i} delay={i * 90}>
              <div className="proof-stat">
                <span className="num tnum">{s.num}</span>
                <span className="cap">{s.cap}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="quote-grid">
          {QUOTES.map((q, i) => (
            <Reveal key={i} delay={i * 90}>
              <div className="quote-card" style={{ height: "100%" }}>
                <span className="quote-mark">&ldquo;</span>
                <blockquote>{q.quote}</blockquote>
                <div className="quote-who">
                  <span className="quote-avatar">{q.initials}</span>
                  <span>
                    <span className="name">{q.name}</span>
                    <span className="role">{q.role}</span>
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
