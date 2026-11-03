// Yulduzli fon: sof CSS (box-shadow), JavaScript'siz va GPU'da yengil harakatlanadi.

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

const L1 = layer(140, 7, "rgb(255 255 255 / 0.55)");
const L2 = layer(50, 21, "rgb(200 210 255 / 0.8)");
const L3 = layer(22, 99, "rgb(255 230 170 / 0.95)");

export function StarField() {
  return (
    <div className="space-bg" aria-hidden="true">
      <div className="stars stars-1" style={{ boxShadow: L1 }} />
      <div className="stars stars-2" style={{ boxShadow: L2 }} />
      <div className="stars stars-3" style={{ boxShadow: L3 }} />
    </div>
  );
}
