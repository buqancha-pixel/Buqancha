// Koinot foni: Somon yo'li, tumanliklar, sayyoralar va yulduzlar — sof CSS/SVG (rasm fayllarisiz),
// faqat transform/opacity animatsiyalari (GPU'da yengil). "Sodda" mavzuda ko'rinmaydi.

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function layer(count: number, seed: number, color: string): string {
  const r = rng(seed);
  const pts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(r() * 2400);
    const y = Math.round(r() * 1200);
    // ikki marta: uzluksiz aylanish uchun (translateY -1200px)
    pts.push(`${x}px ${y}px ${color}`, `${x}px ${y + 1200}px ${color}`);
  }
  return pts.join(",");
}

/** Somon yo'li ichidagi zich yulduzlar: tasma o'rtasiga yaqinroq to'planadi. */
function bandStars(count: number, seed: number): string {
  const r = rng(seed);
  const pts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(r() * 1600);
    // ikki tasodifiy son o'rtachasi — o'rtaga yaqin taqsimot
    const y = Math.round(((r() + r() + r()) / 3) * 320);
    const a = (0.35 + r() * 0.6).toFixed(2);
    const warm = r() > 0.7;
    pts.push(`${x}px ${y}px rgb(${warm ? "255 225 200" : "220 228 255"} / ${a})`);
  }
  return pts.join(",");
}

const L1 = layer(140, 7, "rgb(255 255 255 / 0.55)");
const L2 = layer(50, 21, "rgb(200 210 255 / 0.8)");
const L3 = layer(22, 99, "rgb(255 230 170 / 0.95)");
const BAND = bandStars(420, 1234);

export function StarField() {
  return (
    <div className="space-bg" aria-hidden="true">
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      <div className="milky-way">
        <div className="mw-glow" />
        <div className="mw-dust" />
        <div className="mw-stars" style={{ boxShadow: BAND }} />
      </div>
      <div className="stars stars-1" style={{ boxShadow: L1 }} />
      <div className="stars stars-2" style={{ boxShadow: L2 }} />
      <div className="stars stars-3" style={{ boxShadow: L3 }} />
      <div className="shooting shooting-1" />
      <div className="shooting shooting-2" />
      <div className="planet giant">
        <span className="ring ring-back" />
        <span className="giant-body" />
        <span className="ring ring-front" />
      </div>
      <div className="planet moon" />
      <div className="planet mars" />
      <div className="space-vignette" />
    </div>
  );
}
