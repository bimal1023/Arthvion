/* 270° arc gauge shared by the hero and output mockups. Same sweep as the
   product's <ScoreGauge>, but opening at the bottom (135°→45°) so it reads
   as a speedometer at small sizes — the product gauge opens on the left,
   which only stays legible at its full 190px with tick marks. */

const SIZE = 96;
const VB_H = 88;
const PATH = "M 19.01 76.99 A 41 41 0 1 1 76.99 76.99";
const ARC_LEN = 193.21;

export function MiniGauge({ score, size = 96 }: { score: number; size?: number }) {
  return (
    <svg width={size} height={(VB_H / SIZE) * size} viewBox={`0 0 ${SIZE} ${VB_H}`}>
      <path d={PATH} fill="none" stroke="var(--n20)" strokeWidth="10" strokeLinecap="round" />
      <path
        d={PATH} fill="none" stroke="var(--g500)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${ARC_LEN * (score / 10)} ${ARC_LEN}`}
      />
      <text x="48" y="50" textAnchor="middle" className="viz-gauge-num tnum">{score.toFixed(1)}</text>
      <text x="48" y="64" textAnchor="middle" className="viz-gauge-cap">OVERALL</text>
    </svg>
  );
}
