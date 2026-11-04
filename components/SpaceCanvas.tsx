"use client";

import { useEffect, useRef } from "react";

/**
 * Koinot panoramasi: Yer orbitasidan atrofga 360° qarash. Butun osmon (yulduzlar, Somon yo'li, tumanliklar,
 * sayyoralar) bir marta keng panoramaga chiziladi; har kadrda faqat ko'rinadigan qismi siljitiladi — arzon.
 * 30 kadr/s, yashirin oynada va "Sodda" mavzuda to'xtaydi; "harakatni kamaytirish"da qotib turadi.
 */

const ROTATION_SECONDS = 260; // to'liq aylanish

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function gauss(r: () => number) {
  return (r() + r() + r() + r() - 2) / 2; // ~[-1, 1], o'rtaga to'plangan
}

type Ctx = CanvasRenderingContext2D;

/** Chegaradan o'tsa, panoramaning narigi chetida ham chiziladi (uzluksiz aylanish uchun). */
function wrap(P: number, x: number, margin: number, draw: (x: number) => void) {
  draw(x);
  if (x < margin) draw(x + P);
  if (x > P - margin) draw(x - P);
}

function drawPanorama(ctx: Ctx, P: number, H: number, small: boolean) {
  const r = rng(20261104);
  // fon
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#03040c");
  bg.addColorStop(1, "#070a1d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, P, H);

  // Somon yo'li: qiya tekislik panoramada sinusoida bo'lib ko'rinadi
  const band = (x: number) => H * 0.5 + H * 0.3 * Math.sin((2 * Math.PI * x) / P + 0.7);
  const width = H * 0.13;
  const core = P * 0.58; // galaktika markazi (eng yorug' joy)
  const coreBoost = (x: number) => {
    const d = Math.min(Math.abs(x - core), P - Math.abs(x - core)) / P;
    return Math.exp(-(d * d) / 0.006);
  };

  // tumanliklar (yumshoq rangli bulutlar)
  for (let i = 0; i < 7; i++) {
    const x = r() * P;
    const y = band(x) + gauss(r) * H * 0.35;
    const rad = H * (0.18 + r() * 0.25);
    const hue = [330, 200, 280, 20, 190][Math.floor(r() * 5)];
    wrap(P, x, rad, (cx) => {
      const g = ctx.createRadialGradient(cx, y, 0, cx, y, rad);
      g.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.10)`);
      g.addColorStop(0.5, `hsla(${hue}, 70%, 45%, 0.04)`);
      g.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, y - rad, rad * 2, rad * 2);
    });
  }

  // Somon yo'li yorug'ligi va chang yo'laklari alohida qatlamda chiziladi va bir marta xiralashtiriladi —
  // alohida doirachalar emas, tekis bulutsimon tuzilish ko'rinadi
  const layer = document.createElement("canvas");
  const scale = ctx.getTransform().a || 1;
  layer.width = Math.round(P * scale);
  layer.height = Math.round(H * scale);
  const lc = layer.getContext("2d")!;
  lc.scale(scale, scale);
  const glowCount = small ? 7000 : 16000;
  for (let i = 0; i < glowCount; i++) {
    const x = r() * P;
    const boost = coreBoost(x);
    const y = band(x) + gauss(r) * width * (0.8 + boost * 0.6);
    const s = 1.5 + r() * (5 + boost * 7);
    const a = 0.02 + r() * 0.035 + boost * 0.025;
    const warm = r() < 0.35 + boost * 0.4;
    lc.fillStyle = warm ? `rgba(255, 226, 196, ${a})` : `rgba(200, 212, 255, ${a})`;
    wrap(P, x, s, (cx) => {
      lc.beginPath();
      lc.arc(cx, y, s, 0, Math.PI * 2);
      lc.fill();
    });
  }
  // qorong'i chang yo'laklari (tasma o'rtasidan to'lqinsimon o'tadi)
  lc.globalCompositeOperation = "destination-out";
  for (let i = 0; i < (small ? 2200 : 4800); i++) {
    const x = r() * P;
    const y = band(x) + H * 0.014 * Math.sin(x / 70) + gauss(r) * width * 0.25;
    const s = 1.5 + r() * 5;
    lc.fillStyle = `rgba(0, 0, 0, ${0.08 + r() * 0.12})`;
    wrap(P, x, s, (cx) => {
      lc.beginPath();
      lc.arc(cx, y, s, 0, Math.PI * 2);
      lc.fill();
    });
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // brauzer qo'llasa — yumshatish (Safari'da filter bo'lmasa ham yaxshi ko'rinadi)
  ctx.filter = `blur(${Math.round(5 * scale)}px)`;
  ctx.drawImage(layer, 0, 0);
  ctx.globalAlpha = 0.7;
  ctx.drawImage(layer, 0, 0); // ikkinchi qatlam — yorqinroq, baribir xira (tekis)
  ctx.filter = "none";
  ctx.restore();
  // Somon yo'lidagi zich yulduzlar
  for (let i = 0; i < (small ? 6000 : 14000); i++) {
    const x = r() * P;
    const y = band(x) + gauss(r) * width * 1.1;
    const a = 0.25 + r() * 0.6;
    ctx.fillStyle = r() < 0.3 ? `rgba(255, 232, 210, ${a})` : `rgba(225, 232, 255, ${a})`;
    ctx.fillRect(x, y, r() < 0.9 ? 1 : 1.6, r() < 0.9 ? 1 : 1.6);
  }

  // butun osmon bo'ylab yulduzlar (tiniq, turli rang va yorqinlik)
  const starCount = Math.round((P * H) / (small ? 900 : 650));
  for (let i = 0; i < starCount; i++) {
    const x = r() * P;
    const y = r() * H;
    const m = r();
    const size = m > 0.985 ? 2.2 : m > 0.93 ? 1.5 : 1;
    const a = m > 0.93 ? 0.9 : 0.35 + r() * 0.5;
    const t = r();
    ctx.fillStyle = t < 0.12 ? `rgba(255, 200, 160, ${a})` : t < 0.25 ? `rgba(170, 200, 255, ${a})` : `rgba(255, 255, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // yorqin yulduzlar: nur halqasi va xoch nurlar
  for (let i = 0; i < (small ? 24 : 40); i++) {
    const x = r() * P;
    const y = r() * H;
    const rad = 6 + r() * 10;
    const col = r() < 0.5 ? "190, 215, 255" : "255, 236, 210";
    wrap(P, x, rad * 3, (cx) => {
      const g = ctx.createRadialGradient(cx, y, 0, cx, y, rad);
      g.addColorStop(0, `rgba(${col}, 0.9)`);
      g.addColorStop(0.15, `rgba(${col}, 0.35)`);
      g.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, y - rad, rad * 2, rad * 2);
      if (i < 12) {
        ctx.strokeStyle = `rgba(${col}, 0.35)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - rad * 2.6, y);
        ctx.lineTo(cx + rad * 2.6, y);
        ctx.moveTo(cx, y - rad * 2.6);
        ctx.lineTo(cx, y + rad * 2.6);
        ctx.stroke();
      }
    });
  }

  // sayyoralar (osmon bilan birga aylanadi)
  const R = Math.min(H * 0.16, 150);
  drawGiant(ctx, P * 0.3, H * 0.3, R);
  drawRocky(ctx, P * 0.78, H * 0.72, R * 0.32, ["#f3a072", "#b9512c", "#5e1f10"], "255, 120, 70");
  drawRocky(ctx, P * 0.36, H * 0.62, R * 0.2, ["#ecebf3", "#9a98aa", "#4a4858"], "200, 200, 230");
  drawRocky(ctx, P * 0.93, H * 0.22, R * 0.14, ["#9fd6ff", "#3b78c8", "#14305e"], "120, 180, 255");
}

/** Halqali gaz giganti: chiziqli yuza, sharsimon soya, oldi va orqa halqa. */
function drawGiant(ctx: Ctx, x: number, y: number, R: number) {
  const ring = (front: boolean) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.28);
    ctx.scale(1, 0.26);
    ctx.beginPath();
    if (front) ctx.rect(-R * 3, 0, R * 6, R * 3);
    else ctx.rect(-R * 3, -R * 3, R * 6, R * 3);
    ctx.clip();
    for (const [rr, w, a] of [
      [1.42, 0.12, 0.5],
      [1.6, 0.18, 0.35],
      [1.86, 0.08, 0.3],
      [2.02, 0.16, 0.18],
    ] as const) {
      ctx.strokeStyle = `rgba(232, 210, 175, ${a})`;
      ctx.lineWidth = R * w;
      ctx.beginPath();
      ctx.arc(0, 0, R * rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };
  ring(false);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-0.28);
  const bands = ["#c98a52", "#e4b27a", "#a8673b", "#d9a06a", "#b9784a", "#e8c08a", "#9c5f36"];
  const step = (R * 2) / 18;
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = bands[i % bands.length];
    ctx.fillRect(-R * 1.2, -R + i * step, R * 2.4, step + 1);
  }
  ctx.rotate(0.28);
  const hl = ctx.createRadialGradient(-R * 0.35, -R * 0.35, 0, -R * 0.35, -R * 0.35, R * 0.9);
  hl.addColorStop(0, "rgba(255, 244, 220, 0.45)");
  hl.addColorStop(1, "rgba(255, 244, 220, 0)");
  ctx.fillStyle = hl;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  const sh = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.4, -R * 0.1, -R * 0.1, R * 1.25);
  sh.addColorStop(0, "rgba(0, 0, 0, 0)");
  sh.addColorStop(1, "rgba(0, 0, 0, 0.88)");
  ctx.fillStyle = sh;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
  ring(true);
}

/** Toshli sayyora yoki oy: rangli shar, kraterlar, soya va atmosfera nuri. */
function drawRocky(ctx: Ctx, x: number, y: number, R: number, [light, mid, dark]: string[], glow: string) {
  const halo = ctx.createRadialGradient(x, y, R * 0.9, x, y, R * 1.6);
  halo.addColorStop(0, `rgba(${glow}, 0.25)`);
  halo.addColorStop(1, `rgba(${glow}, 0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(x - R * 2, y - R * 2, R * 4, R * 4);
  const body = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R);
  body.addColorStop(0, light);
  body.addColorStop(0.55, mid);
  body.addColorStop(1, dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  const r = rng(Math.round(x + y));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.beginPath();
    ctx.arc(x + gauss(r) * R * 0.7, y + gauss(r) * R * 0.7, R * (0.06 + r() * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  const sh = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.45, x - R * 0.1, y - R * 0.1, R * 1.3);
  sh.addColorStop(0, "rgba(0, 0, 0, 0)");
  sh.addColorStop(1, "rgba(0, 0, 0, 0.85)");
  ctx.fillStyle = sh;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
}

export function SpaceCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pano: HTMLCanvasElement | null = null;
    let P = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let offset = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const isKoinot = () => document.documentElement.dataset.theme === "koinot";

    const build = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const small = w < 700;
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      P = Math.max(w * 3, small ? 1800 : 2600);
      const old = P ? offset / P : 0;
      pano = document.createElement("canvas");
      pano.width = Math.round(P * dpr);
      pano.height = Math.round(h * dpr);
      const pctx = pano.getContext("2d")!;
      pctx.scale(dpr, dpr);
      drawPanorama(pctx, P, h, small);
      offset = old * P;
      draw();
    };

    const draw = () => {
      if (!pano) return;
      const vw = canvas.width;
      const pw = pano.width;
      const sx = Math.round(offset * dpr) % pw;
      const first = Math.min(vw, pw - sx);
      ctx.drawImage(pano, sx, 0, first, canvas.height, 0, 0, first, canvas.height);
      if (first < vw) ctx.drawImage(pano, 0, 0, vw - first, canvas.height, first, 0, vw - first, canvas.height);
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!isKoinot() || document.hidden) {
        last = t;
        return;
      }
      if (t - last < 33) return; // ~30 kadr/s
      const dt = last ? Math.min(t - last, 100) : 0;
      last = t;
      offset = (offset + (P / ROTATION_SECONDS) * (dt / 1000)) % P;
      draw();
    };

    build();
    if (!reduce) raf = requestAnimationFrame(tick);
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(build, 250);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="space-canvas" aria-hidden="true" />;
}
