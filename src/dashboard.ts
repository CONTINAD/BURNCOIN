import express, { Request, Response } from "express";
import * as path from "path";
import * as fs from "fs";
import { config } from "./config";
import { tracker } from "./activity";
import { logger } from "./logger";

export function startDashboard() {
  const app = express();

  const publicDir = path.join(process.cwd(), "public");
  if (fs.existsSync(publicDir)) app.use(express.static(publicDir));

  app.get("/api/state", (_req: Request, res: Response) => {
    res.json(tracker.snapshot());
  });

  app.get("/", (_req: Request, res: Response) => {
    res.set("Content-Type", "text/html; charset=utf-8").send(renderHTML());
  });

  app.listen(config.port, "0.0.0.0", () => {
    logger.info(`Dashboard listening on 0.0.0.0:${config.port}`);
  });
}

export function renderHTML(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>$BURN — INCINERATOR ONLINE</title>
<meta property="og:title" content="$BURN — INCINERATOR ONLINE" />
<meta property="og:description" content="Every 2 minutes. Auto-claim. Auto-buyback. Auto-incinerate. The supply only goes down." />
<meta property="og:image" content="/burn-banner.png" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/png" href="/burncoin-pfp.png" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Black+Ops+One&family=Knewave&family=Caveat+Brush&family=Rubik+Mono+One&family=VT323&family=JetBrains+Mono:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --black:   #050204;
    --void:    #0a0306;
    --steel-0: #1a1a1d;
    --steel-1: #25262a;
    --steel-2: #3a3a40;
    --steel-3: #54555c;
    --rivet:   #6e6e76;
    --flame-0: #ff6a00;
    --flame-1: #ff8a1e;
    --flame-2: #ffb45e;
    --ember:   #ffc933;
    --core:    #fff3c2;
    --hot:     #e11d2a;
    --blood:   #ff2d2d;
    --neon:    #ff4400;
    --ink:     #fff5e8;
    --ink-2:   #d8c4ad;
    --ink-dim: #87705a;
    --led-off: #4a1a06;
    --led-on:  #ffb45e;
    --warn-y:  #ffd23f;
    --rust:    #b04a1f;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--ink);
    min-height: 100vh;
    background:
      radial-gradient(ellipse 100% 70% at 50% 0%, rgba(225,29,42,.18), transparent 60%),
      radial-gradient(ellipse 50% 40% at 10% 90%, rgba(255,106,0,.10), transparent 60%),
      radial-gradient(ellipse 50% 40% at 90% 90%, rgba(255,106,0,.10), transparent 60%),
      linear-gradient(180deg, #050204 0%, #0a0306 30%, #14070a 100%);
    background-attachment: fixed;
    overflow-x: hidden;
  }
  /* subtle metal-mesh overlay across the entire page */
  body::before {
    content: "";
    position: fixed; inset: 0;
    background-image:
      repeating-linear-gradient(0deg, rgba(255,255,255,.012) 0 1px, transparent 1px 4px),
      repeating-linear-gradient(90deg, rgba(255,255,255,.012) 0 1px, transparent 1px 4px);
    pointer-events: none;
    z-index: 1;
  }
  /* subtle CRT scan-flicker over everything */
  body::after {
    content: "";
    position: fixed; inset: 0;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 2px, transparent 2px 4px);
    pointer-events: none;
    z-index: 2;
    opacity: .45;
    mix-blend-mode: multiply;
  }

  /* particle canvases — full-screen, layered behind */
  #emberCanvas, #ashCanvas {
    position: fixed; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 0;
  }
  #ashCanvas { opacity: .8; }

  /* shared utilities */
  .anton  { font-family: 'Anton', sans-serif; letter-spacing: .01em; }
  .ops    { font-family: 'Black Ops One', cursive; letter-spacing: .04em; }
  .led    { font-family: 'VT323', monospace; }
  .mono   { font-family: 'JetBrains Mono', monospace; }
  .tag    { font-family: 'Knewave', cursive; letter-spacing: .01em; }       /* graffiti accent */
  .scrawl { font-family: 'Caveat Brush', cursive; letter-spacing: .02em; }  /* marker-pen accent */

  /* marker-pen highlight swoosh under any inline text */
  .marker {
    position: relative; padding: 0 6px;
    background-image: linear-gradient(120deg, transparent 2%, rgba(255,201,51,.55) 2%, rgba(255,138,30,.55) 98%, transparent 98%);
    background-repeat: no-repeat;
    background-size: 100% 60%;
    background-position: 0 75%;
  }
  /* sketchy "drawn with a marker" border — multi-stroke offset to feel hand-made */
  .sketch-border {
    box-shadow:
      2px 2px 0 var(--flame-0),
      -2px 2px 0 var(--flame-0),
      2px -2px 0 var(--flame-0),
      -2px -2px 0 var(--flame-0),
      4px 4px 0 rgba(0,0,0,.4);
  }
  /* "scribble" SVG underline under titles */
  .scribble-under {
    position: relative; display: inline-block;
  }
  .scribble-under::after {
    content: ""; position: absolute;
    left: -4px; right: -4px; bottom: -10px; height: 14px;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 14' preserveAspectRatio='none'><path d='M2 8 Q 20 2 40 7 T 80 8 T 120 6 T 160 8 T 198 6' fill='none' stroke='%23ff6a00' stroke-width='3' stroke-linecap='round'/></svg>");
    background-repeat: no-repeat; background-size: 100% 100%;
    filter: drop-shadow(0 0 6px rgba(255,106,0,.5));
  }
  /* "tape strip" decoration — for stickering things onto the page */
  .tape {
    position: absolute;
    width: 70px; height: 18px;
    background: linear-gradient(180deg, rgba(255,210,63,.85), rgba(255,180,30,.75));
    border: 1px dashed rgba(120,70,0,.35);
    box-shadow: 0 2px 6px rgba(0,0,0,.4);
    transform: rotate(-3deg);
  }
  .tape.right { transform: rotate(3deg); }

  /* ── MARQUEE TOP ─────────────────────────────────────────────────── */
  .marquee {
    position: relative;
    background: linear-gradient(180deg, var(--hot), #7a0e15);
    color: #fff;
    padding: 7px 0;
    overflow: hidden;
    border-top: 1px solid rgba(255,255,255,.1);
    border-bottom: 2px solid #2a0408;
    box-shadow: 0 4px 18px rgba(225,29,42,.35), inset 0 -8px 14px rgba(0,0,0,.4);
    z-index: 4;
  }
  .marquee-track {
    display: flex;
    width: max-content;
    font-family: 'Anton', sans-serif; font-size: 15px; letter-spacing: .22em; text-transform: uppercase;
    text-shadow: 0 2px 0 rgba(0,0,0,.45);
    animation: marqueeScroll 28s linear infinite;
    white-space: nowrap;
  }
  .marquee-track span { padding: 0 28px; display: inline-flex; align-items: center; gap: 14px; }
  .marquee-track .pip { color: var(--ember); font-size: 14px; }
  @keyframes marqueeScroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  /* ── TOP CONTROL STRIP (replaces topbar) ─────────────────────────── */
  .control-strip {
    position: relative;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
    padding: 10px 26px;
    background: linear-gradient(180deg, var(--steel-1), var(--steel-0));
    border-bottom: 1px solid #0d0c0e;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04), inset 0 -1px 0 rgba(0,0,0,.6);
    z-index: 3;
  }
  /* rivets on the strip */
  .control-strip::before, .control-strip::after {
    content: "";
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 7px; height: 7px; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, var(--rivet), #1a1a1d 70%);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.05);
  }
  .control-strip::before { left: 10px; }
  .control-strip::after { right: 10px; }
  .brand-block { display: flex; align-items: center; gap: 14px; }
  .brand-emblem {
    position: relative;
    width: 48px; height: 48px;
    display: flex; align-items: center; justify-content: center;
    filter: drop-shadow(0 0 14px rgba(255,138,30,.65)) drop-shadow(0 4px 6px rgba(0,0,0,.5));
    animation: brandSpin 22s linear infinite;
  }
  .brand-emblem img { width: 100%; height: 100%; object-fit: contain; }
  @keyframes brandSpin {
    0%   { transform: rotate(-4deg); }
    50%  { transform: rotate(4deg); }
    100% { transform: rotate(-4deg); }
  }
  .brand-text {
    display: flex; flex-direction: column; gap: 2px;
  }
  .brand-text .name {
    font-family: 'Knewave', cursive; font-size: 26px;
    color: var(--flame-1); letter-spacing: .01em;
    text-shadow:
      2px 2px 0 #1a0a02,
      4px 4px 0 rgba(0,0,0,.4),
      0 0 22px rgba(255,138,30,.45);
    line-height: 1;
    transform: rotate(-2deg);
    display: inline-block;
  }
  .brand-text .name .ampersand { color: var(--ember); }
  .brand-text .sub {
    font-family: 'Caveat Brush', cursive; font-size: 14px;
    color: var(--ember); letter-spacing: .04em;
    margin-top: 2px;
    transform: rotate(.5deg);
    display: inline-block;
    text-shadow: 1px 1px 0 rgba(0,0,0,.5);
  }
  .strip-mid {
    display: flex; gap: 14px; align-items: center;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
  }
  .lamp {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 12px 5px 8px;
    background: #1a1a1d;
    border: 1px solid #0a0a0c;
    border-radius: 4px;
    color: var(--ink-dim); letter-spacing: .14em; text-transform: uppercase;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
  }
  .lamp .bulb {
    width: 9px; height: 9px; border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, var(--led-on), var(--flame-0) 50%, #3a0a02 95%);
    box-shadow: 0 0 10px var(--flame-0), inset 0 0 3px rgba(0,0,0,.45);
    animation: bulbPulse 1.2s ease-in-out infinite;
  }
  .lamp .bulb.red { background: radial-gradient(circle at 35% 35%, #ff7a7a, var(--blood) 55%, #3a0202 95%); box-shadow: 0 0 10px var(--blood); }
  .lamp .bulb.yellow { background: radial-gradient(circle at 35% 35%, #fff7a8, var(--warn-y) 55%, #3a2a02 95%); box-shadow: 0 0 10px var(--warn-y); }
  .lamp .bulb.dim   { background: radial-gradient(circle at 35% 35%, #4a2a18, #1a0a06 70%); box-shadow: none; animation: none; }
  @keyframes bulbPulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
  .nav {
    display: flex; gap: 4px; align-items: center;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
  }
  .nav a {
    color: var(--ink-dim); text-decoration: none;
    padding: 7px 12px; border-radius: 4px;
    border: 1px solid rgba(255,255,255,.06);
    background: linear-gradient(180deg, #1f1f24, #131316);
    letter-spacing: .14em; text-transform: uppercase;
    transition: .15s;
  }
  .nav a:hover { color: var(--flame-1); border-color: rgba(255,106,0,.35); background: linear-gradient(180deg, #2a1808, #14070a); }
  .nav .mc-pill {
    color: var(--core); border-color: rgba(255,180,80,.45);
    background: linear-gradient(180deg, #3a1808, #1a0a06);
    text-shadow: 0 0 8px rgba(255,180,80,.5);
  }
  .nav .mc-pill .mc-label { opacity: .55; }

  /* ── BANNER ──────────────────────────────────────────────────────── */
  .banner-wrap {
    position: relative;
    width: 100%;
    overflow: hidden;
    z-index: 3;
    margin-top: 0;
    max-height: 280px;
    border-bottom: 2px solid #0a0306;
    box-shadow: 0 12px 36px rgba(0,0,0,.55);
  }
  .banner-wrap img {
    width: 100%;
    height: 280px;
    display: block;
    object-fit: cover;
    object-position: center 38%;
    filter: saturate(1.08) contrast(1.05);
  }
  .banner-wrap::after {
    content: "";
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at center, transparent 30%, rgba(5,2,4,.55) 90%),
      linear-gradient(180deg, transparent 65%, var(--black) 100%);
    pointer-events: none;
  }
  .banner-wrap .heat-haze {
    position: absolute; inset: 0; pointer-events: none;
    mix-blend-mode: screen;
    background:
      radial-gradient(ellipse at 25% 75%, rgba(255,106,0,.20), transparent 55%),
      radial-gradient(ellipse at 75% 65%, rgba(225,29,42,.15), transparent 55%);
    animation: hazeShift 5s ease-in-out infinite alternate;
  }
  @keyframes hazeShift {
    0%   { transform: scale(1) translate(0,0); }
    100% { transform: scale(1.06) translate(2%,-1%); }
  }

  /* ── CONTAINER ───────────────────────────────────────────────────── */
  .container {
    max-width: 1380px; margin: 0 auto;
    padding: 18px 26px 90px;
    position: relative; z-index: 3;
  }

  /* ── HERO BLOCK ──────────────────────────────────────────────────── */
  .hero {
    position: relative;
    padding: 28px 0 18px;
  }
  .hero .kicker {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 6px 12px;
    background: rgba(225,29,42,.12);
    border: 1px solid rgba(225,29,42,.35);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace; font-size: 10.5px;
    letter-spacing: .25em; text-transform: uppercase;
    color: var(--blood);
    margin-bottom: 14px;
    box-shadow: 0 0 18px rgba(225,29,42,.15);
  }
  .hero .kicker .dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--blood);
    box-shadow: 0 0 10px var(--blood);
    animation: bulbPulse 1.1s ease-in-out infinite;
  }
  .hero h1 {
    font-family: 'Anton', sans-serif;
    font-size: clamp(46px, 7.4vw, 108px);
    line-height: .9;
    letter-spacing: -.02em;
    margin: 0;
    color: var(--ink);
    text-transform: uppercase;
    position: relative;
  }
  .hero .scrawl-note {
    position: absolute;
    top: 12px; right: 6%;
    font-family: 'Caveat Brush', cursive;
    font-size: 28px;
    color: var(--ember);
    transform: rotate(8deg);
    text-shadow: 1px 1px 0 rgba(0,0,0,.5);
    line-height: 1.05;
    text-align: center;
    pointer-events: none;
  }
  .hero .scrawl-note .arrow {
    display: block; margin-top: 4px;
    font-family: 'Knewave', cursive;
    color: var(--flame-1); font-size: 22px;
    transform: rotate(40deg) translate(-12px,4px);
  }
  .hero h1 .line { display: block; }
  .hero h1 .line1 { color: var(--ink); text-shadow: 4px 4px 0 rgba(0,0,0,.55); }
  .hero h1 .line2 {
    color: transparent;
    -webkit-text-stroke: 2px var(--flame-1);
    text-stroke: 2px var(--flame-1);
    margin-left: 8vw;
    filter: drop-shadow(0 0 24px rgba(255,138,30,.45));
  }
  .hero h1 .line3 {
    background: linear-gradient(180deg, var(--core) 0%, var(--ember) 25%, var(--flame-0) 55%, var(--hot) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: transparent;
    margin-left: 16vw;
    filter: drop-shadow(0 0 30px rgba(255,138,30,.55));
    animation: titleShimmer 4s ease-in-out infinite;
  }
  @keyframes titleShimmer {
    0%, 100% { filter: drop-shadow(0 0 24px rgba(255,138,30,.45)) brightness(1); }
    50%      { filter: drop-shadow(0 0 42px rgba(255,200,90,.85)) brightness(1.18); }
  }
  .hero .lede {
    margin-top: 18px;
    max-width: 640px;
    font-size: 14.5px; line-height: 1.6;
    color: var(--ink-2);
  }
  .hero .lede b { color: var(--flame-2); font-weight: 700; }
  .hero .lede .hot { color: var(--ember); font-weight: 700; text-shadow: 0 0 12px rgba(255,201,51,.4); }
  .hero-actions {
    margin-top: 18px;
    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  }
  .ca-box {
    display: inline-flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    background: linear-gradient(180deg, #1a0d04, #0d0507);
    border: 1px solid rgba(255,106,0,.25);
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: var(--ink-2); cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,180,80,.08), 0 0 16px rgba(255,106,0,.08);
    transition: .15s;
  }
  .ca-box:hover { border-color: var(--flame-0); transform: translateY(-1px); }
  .ca-box.copied { background: var(--flame-0); color: #1a0a02; border-color: transparent; }
  .ca-box .lbl { font-family: 'JetBrains Mono', monospace; color: var(--flame-2); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; }
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 22px;
    border-radius: 6px;
    font-family: 'Anton', sans-serif; font-weight: 400; font-size: 16px;
    letter-spacing: .14em;
    text-decoration: none; cursor: pointer;
    border: 1px solid transparent;
    text-transform: uppercase;
    transition: .15s;
    position: relative; overflow: hidden;
  }
  .btn.primary {
    background: linear-gradient(180deg, var(--ember), var(--flame-0));
    color: #1a0a02;
    border-color: #ff8a1e;
    box-shadow: 0 10px 28px rgba(255,106,0,.4), inset 0 1px 0 rgba(255,255,255,.4);
  }
  .btn.primary:hover { transform: translateY(-1px); box-shadow: 0 14px 36px rgba(255,138,30,.55), inset 0 1px 0 rgba(255,255,255,.5); }
  .btn.primary::before {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.35), transparent 70%);
    transform: translateX(-100%);
    transition: transform .6s;
  }
  .btn.primary:hover::before { transform: translateX(100%); }
  .btn.ghost {
    background: linear-gradient(180deg, #1a1a1d, #0a0a0c);
    color: var(--ink); border-color: rgba(255,106,0,.35);
  }
  .btn.ghost:hover { border-color: var(--flame-0); color: var(--flame-1); }

  /* ── INDUSTRIAL CONTROL PANEL (CENTERPIECE) ─────────────────────── */
  .control-panel {
    margin-top: 14px;
    position: relative;
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr) 200px;
    gap: 16px;
    align-items: stretch;
    min-height: 440px;
  }
  /* shared metal panel base */
  .metal {
    position: relative;
    background:
      linear-gradient(180deg, var(--steel-1) 0%, var(--steel-0) 22%, #131316 92%, #0a0a0c 100%);
    border: 1px solid #0c0c0e;
    border-radius: 10px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.06),
      inset 0 -2px 6px rgba(0,0,0,.7),
      0 12px 40px rgba(0,0,0,.55);
    overflow: hidden;
  }
  .metal::before, .metal::after {
    content: "";
    position: absolute; width: 9px; height: 9px; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, var(--rivet), #1a1a1d 70%);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.05);
  }
  .metal::before { top: 9px; left: 9px; }
  .metal::after  { top: 9px; right: 9px; }
  .metal > .rivet-bl, .metal > .rivet-br {
    position: absolute; bottom: 9px; width: 9px; height: 9px; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, var(--rivet), #1a1a1d 70%);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.05);
  }
  .metal > .rivet-bl { left: 9px; }
  .metal > .rivet-br { right: 9px; }
  .panel-label {
    position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: .22em; text-transform: uppercase;
    color: var(--ink-dim);
    padding: 2px 10px;
    background: #0a0a0c; border: 1px solid #1f1f24; border-radius: 99px;
    white-space: nowrap;
    max-width: calc(100% - 36px);
    overflow: hidden; text-overflow: ellipsis;
    z-index: 4;
  }

  /* LEFT panel: gauges */
  .panel-left {
    padding: 30px 14px 18px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  /* mercury-style temperature gauge */
  .gauge-temp {
    position: relative;
    width: 44px; height: 200px;
    background: linear-gradient(180deg, #0a0306, #1a0a08);
    border: 2px solid #0a0306;
    border-radius: 28px;
    box-shadow:
      inset 0 0 18px rgba(0,0,0,.8),
      inset 0 2px 0 rgba(255,255,255,.05);
    overflow: hidden;
  }
  .gauge-temp .mercury {
    position: absolute; left: 6px; right: 6px; bottom: 6px;
    background: linear-gradient(180deg, var(--core), var(--ember) 22%, var(--flame-0) 55%, var(--hot) 90%, #5a0408 100%);
    border-radius: 22px;
    height: 30%;
    transition: height 1.2s cubic-bezier(.3,1.2,.5,1);
    box-shadow:
      0 0 22px rgba(255,138,30,.7),
      inset 0 -4px 8px rgba(0,0,0,.4),
      inset 0 4px 6px rgba(255,255,255,.25);
  }
  .gauge-temp .mercury::after {
    content: ""; position: absolute; top: -6px; left: 0; right: 0; height: 10px;
    background: radial-gradient(ellipse at center, var(--core), transparent 60%);
    filter: blur(2px);
  }
  .gauge-temp .ticks {
    position: absolute; inset: 0;
    background: repeating-linear-gradient(180deg, transparent 0 22px, rgba(255,180,80,.12) 22px 23px);
    pointer-events: none;
  }
  .gauge-temp .bulb-bottom {
    position: absolute; left: 50%; bottom: -10px; transform: translateX(-50%);
    width: 58px; height: 58px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--core), var(--ember) 25%, var(--flame-0) 55%, var(--hot) 100%);
    box-shadow:
      0 0 30px rgba(255,138,30,.85),
      inset 0 -8px 14px rgba(90,4,8,.6),
      inset 0 6px 8px rgba(255,255,255,.25);
    border: 2px solid #1a0306;
    animation: bulbBreath 2.4s ease-in-out infinite alternate;
  }
  @keyframes bulbBreath {
    0%   { box-shadow: 0 0 24px rgba(255,138,30,.7), inset 0 -8px 14px rgba(90,4,8,.6), inset 0 6px 8px rgba(255,255,255,.25); }
    100% { box-shadow: 0 0 48px rgba(255,201,51,1),  inset 0 -8px 14px rgba(90,4,8,.6), inset 0 6px 8px rgba(255,255,255,.35); }
  }
  .gauge-label {
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    color: var(--ink-dim); letter-spacing: .22em; text-transform: uppercase;
    margin-top: 12px;
  }
  .gauge-readout {
    font-family: 'VT323', monospace; font-size: 28px;
    color: var(--ember); letter-spacing: .04em; line-height: 1;
    text-shadow: 0 0 12px rgba(255,201,51,.7);
  }
  .gauge-readout .unit { font-size: 13px; opacity: .6; margin-left: 4px; }

  .lamp-rack {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    width: 100%; margin-top: 2px;
  }
  .lamp-rack .lamp { font-size: 8.5px; padding: 5px 6px; justify-content: center; gap: 6px; letter-spacing: .1em; }
  .lamp-rack .lamp .bulb { width: 7px; height: 7px; }

  /* RIGHT panel: supply melt tower */
  .panel-right {
    padding: 30px 14px 22px;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
  }
  .melt-tower {
    position: relative;
    width: 80px; height: 280px;
    background: linear-gradient(180deg, #0a0306, #14070a);
    border: 2px solid #0a0306;
    border-radius: 10px;
    box-shadow: inset 0 0 22px rgba(0,0,0,.8), inset 0 2px 0 rgba(255,255,255,.05);
    overflow: hidden;
  }
  .melt-tower .stack {
    position: absolute; left: 6px; right: 6px; top: 6px;
    background:
      repeating-linear-gradient(180deg, var(--ember) 0 14px, var(--flame-1) 14px 28px),
      linear-gradient(180deg, var(--core), var(--flame-0));
    border-radius: 6px 6px 0 0;
    height: calc(100% - 16px);
    transition: height 1.2s cubic-bezier(.3,1.2,.5,1);
    box-shadow:
      0 0 18px rgba(255,138,30,.45),
      inset 0 2px 0 rgba(255,255,255,.25);
  }
  .melt-tower .stack::after {
    /* irregular melted bottom edge */
    content: ""; position: absolute; left: 0; right: 0; bottom: -10px;
    height: 18px;
    background:
      radial-gradient(circle at 20% 0%, var(--ember) 6px, transparent 7px),
      radial-gradient(circle at 50% 0%, var(--ember) 8px, transparent 9px),
      radial-gradient(circle at 80% 0%, var(--ember) 5px, transparent 6px),
      radial-gradient(circle at 35% 30%, var(--flame-0) 6px, transparent 7px),
      radial-gradient(circle at 65% 30%, var(--flame-0) 7px, transparent 8px);
    filter: blur(1px) drop-shadow(0 4px 8px rgba(225,29,42,.5));
  }
  .melt-tower .drips {
    position: absolute; inset: 0; pointer-events: none;
  }
  .melt-tower .drip {
    position: absolute; width: 6px; border-radius: 0 0 4px 4px;
    background: linear-gradient(180deg, var(--ember), var(--flame-0), transparent);
    opacity: .85;
    animation: dripFall 2.6s linear infinite;
    filter: drop-shadow(0 0 4px rgba(255,138,30,.6));
  }
  .melt-tower .drip:nth-child(1) { left: 12%; height: 36px; animation-delay: 0s; }
  .melt-tower .drip:nth-child(2) { left: 38%; height: 22px; animation-delay: -.9s; }
  .melt-tower .drip:nth-child(3) { left: 60%; height: 30px; animation-delay: -.4s; }
  .melt-tower .drip:nth-child(4) { left: 82%; height: 18px; animation-delay: -1.6s; }
  @keyframes dripFall {
    0%   { transform: translateY(0); opacity: 0; }
    20%  { opacity: 1; }
    100% { transform: translateY(340px); opacity: 0; }
  }
  .melt-wrap {
    position: relative;
    display: flex; align-items: stretch; gap: 8px;
  }
  .melt-wrap .scale {
    display: flex; flex-direction: column; justify-content: space-between;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    color: var(--ink-2); text-align: right;
    padding: 6px 0;
    min-width: 26px;
    pointer-events: none;
  }
  .melt-readout {
    text-align: center;
  }
  .melt-readout .pct {
    font-family: 'VT323', monospace; font-size: 40px;
    color: var(--ember); line-height: 1;
    text-shadow: 0 0 14px rgba(255,201,51,.7);
  }
  .melt-readout .pct .unit { font-size: 18px; opacity: .55; }
  .melt-readout .lbl {
    font-family: 'JetBrains Mono', monospace; font-size: 9.5px;
    color: var(--ink-dim); letter-spacing: .22em; text-transform: uppercase;
    margin-top: 4px;
  }
  .melt-readout .supply-line {
    margin-top: 8px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    color: var(--flame-2);
  }

  /* CENTER: incinerator viewport */
  .incinerator {
    position: relative;
    padding: 18px 20px 22px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .incinerator .top-row {
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    color: var(--ink-dim); letter-spacing: .25em; text-transform: uppercase;
    padding-bottom: 12px;
    border-bottom: 1px dashed rgba(255,106,0,.15);
  }
  .incinerator .top-row .left { display: flex; gap: 10px; align-items: center; }
  .incinerator .top-row .right { display: flex; gap: 10px; align-items: center; color: var(--flame-2); }
  .incinerator .top-row .right .led-num {
    font-family: 'VT323', monospace; font-size: 18px; color: var(--ember);
    text-shadow: 0 0 8px rgba(255,201,51,.55);
  }
  /* the viewport itself — wide rectangular furnace door with thick metal frame */
  .viewport-frame {
    position: relative;
    flex: 1; min-height: 310px;
    border-radius: 14px;
    padding: 16px;
    background:
      linear-gradient(180deg, #2a2a2e 0%, #18181b 30%, #0c0c0e 100%);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.08),
      inset 0 -4px 10px rgba(0,0,0,.75),
      0 14px 40px rgba(0,0,0,.6);
    overflow: hidden;
  }
  .viewport-frame::before, .viewport-frame::after {
    /* hinges or warning labels along the side */
    content: ""; position: absolute; width: 14px; height: 60px;
    background: linear-gradient(180deg, #4a4a4f, #1a1a1d);
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.1);
  }
  .viewport-frame::before { top: 30px; left: -2px; }
  .viewport-frame::after  { bottom: 30px; left: -2px; }
  .viewport-frame .hinges-right {
    position: absolute; right: -2px; top: 30px; bottom: 30px;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .viewport-frame .hinge {
    width: 14px; height: 60px;
    background: linear-gradient(180deg, #4a4a4f, #1a1a1d);
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.1);
  }
  /* corner bolts on the inner viewport */
  .viewport-frame .bolt {
    position: absolute; width: 14px; height: 14px; border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%, #9a9aa2, #2a2a2e 60%, #0a0a0c 100%);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.65), 0 1px 0 rgba(255,255,255,.06), 0 0 6px rgba(0,0,0,.4);
  }
  .viewport-frame .bolt.tl { top: 22px; left: 22px; }
  .viewport-frame .bolt.tr { top: 22px; right: 22px; }
  .viewport-frame .bolt.bl { bottom: 22px; left: 22px; }
  .viewport-frame .bolt.br { bottom: 22px; right: 22px; }
  /* WARNING tape across one corner */
  .viewport-frame .warning-tape {
    position: absolute; top: 60px; left: -42px;
    transform: rotate(-45deg);
    background: repeating-linear-gradient(90deg, var(--warn-y) 0 16px, #1a1a1d 16px 32px);
    color: #1a1a1d; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 9.5px;
    letter-spacing: .25em; text-transform: uppercase;
    padding: 4px 60px;
    box-shadow: 0 2px 8px rgba(0,0,0,.5);
    z-index: 5;
  }

  /* the glass / inferno window itself */
  .viewport-glass {
    position: relative;
    width: 100%; height: 100%; min-height: 340px;
    border-radius: 8px;
    background:
      radial-gradient(ellipse at 50% 75%, rgba(255,106,0,.55) 0%, rgba(225,29,42,.25) 30%, rgba(20,4,4,.95) 80%),
      linear-gradient(180deg, #1a0608 0%, #050202 100%);
    overflow: hidden;
    box-shadow:
      inset 0 0 0 2px #0a0306,
      inset 0 0 30px rgba(0,0,0,.9),
      inset 0 0 80px rgba(225,29,42,.25),
      0 0 30px rgba(255,106,0,.45);
  }
  /* CRT scanlines on the glass */
  .viewport-glass::after {
    content: "";
    position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,.32) 0 2px, transparent 2px 4px);
    pointer-events: none;
    mix-blend-mode: multiply;
  }
  .viewport-glass canvas {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
  }
  .viewport-glass .core-logo {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -55%);
    width: 38%; aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255,243,194,.2), transparent 55%), #0a0306;
    border: 3px solid var(--flame-0);
    box-shadow:
      0 0 40px rgba(255,106,0,.85),
      inset 0 0 28px rgba(225,29,42,.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 3;
    animation: coreFloat 3.4s ease-in-out infinite alternate;
  }
  @keyframes coreFloat {
    0%   { transform: translate(-50%, -55%) rotate(-2deg) scale(1); box-shadow: 0 0 40px rgba(255,106,0,.85), inset 0 0 28px rgba(225,29,42,.55); }
    100% { transform: translate(-50%, -53%) rotate(2deg) scale(1.04); box-shadow: 0 0 70px rgba(255,201,51,1), inset 0 0 40px rgba(225,29,42,.7); }
  }
  .viewport-glass .core-logo img {
    width: 82%; height: 82%; object-fit: contain;
    filter: drop-shadow(0 0 12px rgba(255,201,51,.7));
  }
  /* glare reflection on top of glass */
  .viewport-glass::before {
    content: "";
    position: absolute; left: 0; right: 0; top: 0; height: 40%;
    background: linear-gradient(180deg, rgba(255,255,255,.12), transparent);
    pointer-events: none;
    z-index: 4;
  }
  /* burning overlay */
  .viewport-glass.burning .core-logo {
    animation: coreInferno .35s ease-in-out infinite alternate;
  }
  @keyframes coreInferno {
    0%   { transform: translate(-50%, -55%) scale(1.04) rotate(-3deg); box-shadow: 0 0 60px rgba(255,201,51,1), inset 0 0 40px rgba(225,29,42,.85); }
    100% { transform: translate(-50%, -52%) scale(1.12) rotate(4deg);  box-shadow: 0 0 110px rgba(255,243,194,1), inset 0 0 65px rgba(255,106,0,1); }
  }

  /* big burn-event card overlay on the viewport */
  .burn-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none; opacity: 0;
    transition: opacity .35s ease;
    z-index: 5;
  }
  .burn-overlay.show { opacity: 1; }
  .burn-card {
    background: radial-gradient(ellipse at center, rgba(30,8,3,.96), rgba(8,2,4,.96));
    border: 2px solid rgba(255,138,30,.8);
    box-shadow: 0 0 60px rgba(255,138,30,.55), inset 0 0 40px rgba(225,29,42,.3);
    padding: 22px 32px; border-radius: 14px;
    text-align: center; min-width: 320px;
    backdrop-filter: blur(8px);
    animation: cardPulse 1.1s ease-in-out infinite alternate;
  }
  @keyframes cardPulse {
    0%   { box-shadow: 0 0 40px rgba(255,138,30,.5), inset 0 0 30px rgba(225,29,42,.25); }
    100% { box-shadow: 0 0 90px rgba(255,201,51,1), inset 0 0 60px rgba(225,29,42,.5); }
  }
  .burn-card .lbl {
    font-family: 'Anton', sans-serif; font-size: 16px; letter-spacing: .25em;
    color: var(--flame-1); text-transform: uppercase; margin-bottom: 8px;
  }
  .burn-card .flames { font-size: 32px; letter-spacing: 12px; margin: 4px 0; }
  .burn-card .flames span { display: inline-block; animation: flameFlick .55s ease-in-out infinite alternate; }
  .burn-card .flames span:nth-child(2) { animation-delay: .1s; }
  .burn-card .flames span:nth-child(3) { animation-delay: .2s; }
  .burn-card .flames span:nth-child(4) { animation-delay: .15s; }
  .burn-card .flames span:nth-child(5) { animation-delay: .05s; }
  @keyframes flameFlick {
    0%   { transform: translateY(0) scale(1); }
    100% { transform: translateY(-5px) scale(1.2); filter: hue-rotate(-15deg) saturate(1.3); }
  }
  .burn-card .amt {
    font-family: 'Anton', sans-serif;
    font-size: 48px; color: #fff;
    text-shadow: 0 0 24px rgba(255,201,51,1), 0 0 44px rgba(225,29,42,.7);
    line-height: 1;
  }
  .burn-card .amt .unit { font-size: 18px; color: var(--ember); margin-left: 6px; }
  .burn-card .status-line {
    margin-top: 12px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--ink-2);
    letter-spacing: .14em;
  }

  /* ── LED SCOREBOARD ──────────────────────────────────────────────── */
  .scoreboard {
    margin-top: 24px;
    position: relative;
    padding: 22px 26px 24px;
    border-radius: 14px;
    background:
      radial-gradient(ellipse at top, rgba(225,29,42,.12), transparent 60%),
      linear-gradient(180deg, #1a0608 0%, #08020a 100%);
    border: 1px solid rgba(255,106,0,.25);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.05),
      inset 0 0 40px rgba(225,29,42,.15),
      0 18px 60px rgba(0,0,0,.55);
    /* overflow:visible so the sticker can hang off the corner */
  }
  /* dotted matrix backdrop inside scoreboard glass — clipped to the rounded box */
  .scoreboard::before {
    content: "";
    position: absolute; inset: 0;
    background-image: radial-gradient(circle, rgba(255,106,0,.05) 1px, transparent 1px);
    background-size: 14px 14px;
    pointer-events: none;
    border-radius: inherit;
    overflow: hidden;
  }
  .scoreboard::after {
    /* scanlines */
    content: "";
    position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 2px, transparent 2px 4px);
    pointer-events: none;
    mix-blend-mode: multiply;
    border-radius: inherit;
    overflow: hidden;
  }
  .scoreboard .scoreboard-head {
    display: flex; flex-direction: column; align-items: flex-start;
    gap: 4px;
    position: relative;
    /* leave room on the right so the sticker doesn't collide with anything */
    padding-right: 180px;
  }
  @media (max-width: 720px) {
    .scoreboard .scoreboard-head { padding-right: 0; }
  }
  .scoreboard .lbl {
    font-family: 'Knewave', cursive; font-size: 22px;
    color: var(--flame-1); letter-spacing: .02em;
    display: inline-flex; align-items: center; gap: 10px;
    text-shadow: 2px 2px 0 #1a0a02, 0 0 18px rgba(255,138,30,.4);
    transform: rotate(-1deg);
  }
  .scoreboard .lbl::before {
    content: ""; width: 8px; height: 8px; border-radius: 50%;
    background: var(--blood);
    box-shadow: 0 0 12px var(--blood);
    animation: bulbPulse 1.1s ease-in-out infinite;
  }
  .scoreboard .sublbl {
    font-family: 'JetBrains Mono', monospace; font-size: 10.5px;
    color: var(--ink-dim); letter-spacing: .22em; text-transform: uppercase;
  }
  /* LED digits */
  .led-display {
    margin-top: 16px;
    display: flex; align-items: baseline; gap: 6px;
    flex-wrap: wrap;
    position: relative;
  }
  .led-digit {
    font-family: 'VT323', monospace;
    font-size: clamp(72px, 10.5vw, 144px);
    line-height: .82;
    color: var(--ember);
    text-shadow:
      0 0 12px rgba(255,201,51,.55),
      0 0 30px rgba(255,138,30,.45),
      0 0 60px rgba(225,29,42,.4);
    background: linear-gradient(180deg, var(--core) 0%, var(--ember) 35%, var(--flame-0) 75%, var(--hot) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 16px rgba(255,138,30,.55));
    transition: filter .3s;
  }
  .led-digit.tick {
    animation: ledTick .3s ease-out;
  }
  @keyframes ledTick {
    0%   { filter: drop-shadow(0 0 16px rgba(255,138,30,.55)) brightness(1); }
    50%  { filter: drop-shadow(0 0 40px rgba(255,243,194,1)) brightness(1.4); }
    100% { filter: drop-shadow(0 0 16px rgba(255,138,30,.55)) brightness(1); }
  }
  .led-display .unit {
    font-family: 'Anton', sans-serif;
    font-size: clamp(20px, 2.6vw, 36px);
    color: var(--flame-2); letter-spacing: .12em;
    margin-left: 12px;
    text-shadow: 0 0 14px rgba(255,138,30,.45);
  }
  .scoreboard-stats {
    margin-top: 18px;
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;
    position: relative;
  }
  @media (max-width: 1100px) {
    .scoreboard-stats { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 720px) {
    .scoreboard-stats { grid-template-columns: repeat(2, 1fr); }
  }
  .sb-stat {
    padding: 14px 16px;
    background: linear-gradient(180deg, rgba(13,5,7,.7), rgba(5,2,4,.85));
    border: 1px solid rgba(255,106,0,.12);
    border-radius: 8px;
  }
  .sb-stat .k {
    font-family: 'JetBrains Mono', monospace; font-size: 9.5px;
    letter-spacing: .22em; text-transform: uppercase; color: var(--ink-dim);
  }
  .sb-stat .v {
    font-family: 'VT323', monospace; font-size: 32px;
    color: var(--flame-2); line-height: 1; margin-top: 4px;
    text-shadow: 0 0 12px rgba(255,138,30,.5);
  }
  .sb-stat .v .unit { font-size: 14px; opacity: .55; margin-left: 4px; }
  .sb-stat.hot .v { color: var(--ember); text-shadow: 0 0 14px rgba(255,201,51,.65); }

  /* ── RECEIPTS ROW ────────────────────────────────────────────────── */
  .section-head {
    margin: 40px 0 18px;
    display: flex; justify-content: space-between; align-items: flex-end;
    flex-wrap: wrap; gap: 12px;
  }
  .section-head .title {
    font-family: 'Knewave', cursive;
    font-size: 38px; line-height: 1;
    color: var(--flame-1);
    letter-spacing: .005em;
    text-shadow:
      3px 3px 0 #1a0a02,
      6px 6px 0 rgba(0,0,0,.5),
      0 0 30px rgba(255,138,30,.35);
    display: flex; align-items: center; gap: 16px;
    transform: rotate(-1deg);
  }
  .section-head .title .glyph { color: var(--ember); font-size: 34px; transform: rotate(2deg); }
  .section-head .sub {
    font-family: 'Caveat Brush', cursive; font-size: 20px;
    color: var(--ember); letter-spacing: .03em;
    transform: rotate(-1deg);
    text-shadow: 1px 1px 0 rgba(0,0,0,.45);
  }
  .receipts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }
  .receipt {
    position: relative;
    background:
      linear-gradient(180deg, #f3e9d9 0%, #e8dcc4 100%);
    color: #2a1408;
    padding: 22px 22px 22px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    box-shadow: 0 14px 32px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.05);
    border-radius: 2px;
    transform: rotate(-1.8deg);
    margin-top: 14px;
  }
  .receipt::after { content: ""; }
  .receipt > .washi {
    position: absolute; top: -10px; left: 18%;
    width: 64px; height: 18px;
    background: repeating-linear-gradient(90deg, rgba(255,180,30,.85) 0 8px, rgba(220,100,20,.75) 8px 16px);
    transform: rotate(-6deg);
    box-shadow: 0 3px 6px rgba(0,0,0,.45);
    border: 1px dashed rgba(120,60,0,.4);
    z-index: 4;
  }
  .receipt:nth-child(even) { transform: rotate(2.2deg); }
  .receipt:nth-child(even) > .washi { left: 55%; transform: rotate(8deg); background: repeating-linear-gradient(90deg, rgba(255,210,63,.85) 0 8px, rgba(225,29,42,.7) 8px 16px); }
  .receipt:nth-child(3n)   { transform: rotate(-.8deg); }
  .receipt:nth-child(3n) > .washi { left: 40%; transform: rotate(-3deg); }
  /* torn top + bottom edges */
  .receipt::before, .receipt::after {
    content: ""; position: absolute; left: 0; right: 0; height: 8px;
    background:
      radial-gradient(circle at 6px 0%, transparent 4px, #e8dcc4 5px),
      linear-gradient(180deg, transparent, transparent);
    background-size: 12px 8px;
    background-repeat: repeat-x;
  }
  .receipt::before { top: -7px; background-color: transparent; background-image: radial-gradient(circle at 6px 100%, transparent 4px, #f3e9d9 5px); }
  .receipt::after  { bottom: -7px; background-image: radial-gradient(circle at 6px 0%, transparent 4px, #e8dcc4 5px); }
  .receipt .head {
    text-align: center; font-family: 'Anton', sans-serif;
    font-size: 18px; letter-spacing: .12em; text-transform: uppercase;
    color: #5a1408; padding-bottom: 8px;
    border-bottom: 1px dashed rgba(90,20,8,.4);
  }
  .receipt .head .sub { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; color: #5a3a1a; margin-top: 2px; }
  .receipt .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted rgba(90,40,20,.25); }
  .receipt .row:last-child { border-bottom: 0; }
  .receipt .row .k { color: #6a3a18; }
  .receipt .row .v { color: #2a1408; font-weight: 700; }
  .receipt .total { margin-top: 8px; padding-top: 8px; border-top: 2px dashed #5a1408; text-align: center; }
  .receipt .total .v { font-family: 'Anton', sans-serif; font-size: 22px; color: #5a1408; letter-spacing: .06em; }
  .receipt .stamp {
    position: absolute; top: 14px; right: -2px; transform: rotate(8deg);
    font-family: 'Anton', sans-serif; font-size: 13px; letter-spacing: .14em;
    color: #b81a26;
    border: 2px solid #b81a26;
    padding: 3px 8px;
    background: rgba(255,255,255,.4);
    text-transform: uppercase;
    opacity: .9;
  }
  .receipt .footer-line {
    text-align: center; margin-top: 10px;
    font-size: 9.5px; color: #6a3a18; letter-spacing: .14em; text-transform: uppercase;
  }
  .receipt a { color: #5a1408; text-decoration: underline; word-break: break-all; }

  /* ── LEDGER TABLE ────────────────────────────────────────────────── */
  .ledger {
    background:
      linear-gradient(180deg, #16161a 0%, #0d0d10 100%);
    border: 1px solid rgba(255,106,0,.14);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 14px 40px rgba(0,0,0,.5);
  }
  .ledger table { width: 100%; border-collapse: collapse; }
  .ledger thead th {
    padding: 14px 22px; text-align: left;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .25em;
    color: var(--ink-dim); text-transform: uppercase; font-weight: 700;
    border-bottom: 1px solid rgba(255,106,0,.12);
    background: rgba(0,0,0,.35);
  }
  .ledger tbody td {
    padding: 13px 22px; font-size: 13px;
    border-top: 1px solid rgba(255,106,0,.05);
    color: var(--ink);
    font-family: 'JetBrains Mono', monospace;
  }
  .ledger tbody tr { transition: background .12s; }
  .ledger tbody tr:hover { background: rgba(255,106,0,.04); }
  .ledger td.right, .ledger th.right { text-align: right; }
  .ledger td a { color: var(--flame-1); text-decoration: none; }
  .ledger td a:hover { color: var(--ember); text-decoration: underline; }
  .ledger .cycle-tag {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 8px; border-radius: 4px;
    background: rgba(255,106,0,.1); border: 1px solid rgba(255,106,0,.2);
    color: var(--flame-2); font-size: 11px; font-weight: 700;
  }
  .ledger .cycle-tag::before {
    content: ""; width: 6px; height: 6px; border-radius: 50%;
    background: var(--blood);
    box-shadow: 0 0 6px var(--blood);
  }
  .ledger .burn-amt {
    font-family: 'Anton', sans-serif;
    color: var(--ember); font-size: 18px; letter-spacing: .04em;
    text-shadow: 0 0 8px rgba(255,201,51,.4);
  }
  .ledger .burn-amt .unit { font-size: 10px; opacity: .55; margin-left: 4px; color: var(--ink-dim); }
  .ledger .rank {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 30px; padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Knewave', cursive; font-size: 14px;
    background: rgba(255,106,0,.1); color: var(--flame-2);
    border: 1px solid rgba(255,106,0,.25);
  }
  .ledger .rank.r1 { background: linear-gradient(135deg, #fff7c2, #ffc933); color: #4a2400; border-color: transparent; box-shadow: 0 0 14px rgba(255,201,51,.55); }
  .ledger .rank.r2 { background: linear-gradient(135deg, #e6e6e6, #a8a8a8); color: #2a2a2a; border-color: transparent; }
  .ledger .rank.r3 { background: linear-gradient(135deg, #ffc09f, #b04a1f); color: #4a1408; border-color: transparent; }
  .ledger .share-bar {
    display: inline-block; width: 70px; height: 8px; border-radius: 4px;
    background: rgba(255,106,0,.1); overflow: hidden; vertical-align: middle; margin-right: 8px;
  }
  .ledger .share-bar > i {
    display: block; height: 100%;
    background: linear-gradient(90deg, var(--flame-0), var(--ember));
    box-shadow: 0 0 6px rgba(255,138,30,.55);
  }

  /* hand-drawn "BURN BABY BURN" sticker callout */
  .sticker {
    position: absolute;
    font-family: 'Knewave', cursive;
    font-size: 18px;
    color: #1a0a02;
    background: var(--ember);
    padding: 6px 12px;
    border: 3px solid #1a0a02;
    box-shadow: 4px 4px 0 rgba(0,0,0,.55);
    text-transform: uppercase;
    z-index: 8;
    pointer-events: none;
    line-height: 1.1;
  }
  .sticker.rot-neg { transform: rotate(-6deg); }
  .sticker.rot-pos { transform: rotate(5deg); }
  .sticker.red { background: var(--hot); color: var(--core); }
  .sticker .arrow-down {
    display: block; text-align: center; font-size: 18px;
    color: #1a0a02; margin-top: 2px; line-height: 1;
  }

  /* ── CONSOLE FEED ───────────────────────────────────────────────── */
  .console {
    background:
      linear-gradient(180deg, #0a0a0c 0%, #050204 100%);
    border: 1px solid rgba(255,106,0,.18);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: inset 0 0 60px rgba(225,29,42,.05), 0 14px 40px rgba(0,0,0,.55);
    max-height: 460px;
    position: relative;
  }
  .console::after {
    /* scanlines */
    content: ""; position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 2px, transparent 2px 4px);
    pointer-events: none;
    mix-blend-mode: multiply;
  }
  .console-head {
    padding: 10px 18px;
    background: linear-gradient(180deg, #1a1a1d, #0d0d10);
    border-bottom: 1px solid rgba(255,106,0,.15);
    display: flex; gap: 10px; align-items: center;
    font-family: 'JetBrains Mono', monospace; font-size: 10.5px;
    color: var(--ink-dim); letter-spacing: .22em; text-transform: uppercase;
  }
  .console-head .dots { display: flex; gap: 6px; }
  .console-head .dots span {
    width: 11px; height: 11px; border-radius: 50%;
    background: #2a2a2e; box-shadow: inset 0 0 0 1px rgba(0,0,0,.6);
  }
  .console-head .dots span.r { background: #c83a3a; box-shadow: inset 0 0 0 1px rgba(0,0,0,.6), 0 0 6px rgba(200,58,58,.5); }
  .console-head .dots span.y { background: #c89a3a; box-shadow: inset 0 0 0 1px rgba(0,0,0,.6); }
  .console-head .dots span.g { background: #3ac86a; box-shadow: inset 0 0 0 1px rgba(0,0,0,.6); }
  .console-body { max-height: 410px; overflow-y: auto; padding: 8px 0; }
  .console-body::-webkit-scrollbar { width: 6px; }
  .console-body::-webkit-scrollbar-thumb { background: rgba(255,106,0,.3); border-radius: 999px; }
  .ev {
    padding: 8px 22px;
    font-family: 'JetBrains Mono', monospace; font-size: 12.5px;
    color: var(--ink-2);
    border-top: 1px solid rgba(255,106,0,.04);
    display: grid; grid-template-columns: 80px 80px 1fr; gap: 12px; align-items: baseline;
  }
  .ev:first-child { border-top: 0; }
  .ev .ts { color: var(--ink-dim); font-size: 11px; }
  .ev .kind {
    text-transform: uppercase; font-weight: 700; font-size: 10.5px; letter-spacing: .12em;
  }
  .ev.kind-claim    .kind { color: var(--flame-2); }
  .ev.kind-forward  .kind { color: var(--flame-2); }
  .ev.kind-buyback  .kind { color: var(--ember); }
  .ev.kind-burn     .kind { color: var(--core); text-shadow: 0 0 8px rgba(255,243,194,.5); }
  .ev.kind-marketing .kind { color: var(--warn-y); }
  .ev.kind-error    .kind { color: var(--blood); }
  .ev.kind-info     .kind { color: var(--ink-dim); }
  .ev .body { word-break: break-word; }
  .ev .body a { color: var(--flame-1); text-decoration: none; }
  .ev .body a:hover { color: var(--ember); text-decoration: underline; }

  /* watch banner */
  .watch-banner {
    display: none;
    margin-top: 22px; padding: 14px 18px;
    background: linear-gradient(180deg, rgba(255,210,63,.08), rgba(225,29,42,.06));
    border: 1px solid rgba(255,210,63,.35);
    color: var(--warn-y);
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    letter-spacing: .08em;
    box-shadow: 0 0 18px rgba(255,210,63,.1);
  }
  .watch-banner .mono { color: var(--flame-2); }

  /* maintenance banner — shown when CREATOR_WALLET_PRIVATE_KEY is not set */
  .maint-banner {
    display: none;
    margin: 24px 0 0;
    padding: 20px 26px;
    background: linear-gradient(180deg, rgba(225,29,42,.18), rgba(225,29,42,.08));
    border: 2px solid var(--blood);
    border-radius: 8px;
    box-shadow: 0 0 32px rgba(225,29,42,.25), inset 0 0 22px rgba(225,29,42,.18);
    color: var(--ink);
    position: relative;
  }
  .maint-banner.show { display: block; }
  .maint-banner .head {
    font-family: 'Knewave', cursive; font-size: 26px;
    color: var(--blood); letter-spacing: .02em;
    text-shadow: 2px 2px 0 #1a0a02;
    margin-bottom: 8px;
    transform: rotate(-1deg);
    display: inline-block;
  }
  .maint-banner .body { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--ink-2); line-height: 1.6; }
  .maint-banner code { background: rgba(0,0,0,.55); color: var(--ember); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,138,30,.25); }

  .empty { padding: 38px; text-align: center; color: var(--ink-dim); font-size: 13px; font-family: 'JetBrains Mono', monospace; }

  /* full-screen flame flash on each new burn */
  .screen-flash {
    position: fixed; inset: 0;
    background: radial-gradient(ellipse at center, rgba(255,201,51,.5), rgba(225,29,42,.18) 40%, transparent 70%);
    pointer-events: none; opacity: 0;
    z-index: 99;
    mix-blend-mode: screen;
  }
  .screen-flash.fire {
    animation: flashOnce 1.5s ease-out;
  }
  @keyframes flashOnce {
    0%   { opacity: 0; }
    14%  { opacity: 1; }
    100% { opacity: 0; }
  }

  /* BOTTOM TICKER TAPE — fixed at viewport bottom, always scrolling */
  .ticker {
    position: fixed; left: 0; right: 0; bottom: 0;
    background: linear-gradient(180deg, #0a0306, #050202);
    border-top: 2px solid var(--flame-0);
    overflow: hidden;
    z-index: 30;
    height: 32px;
    box-shadow: 0 -10px 28px rgba(0,0,0,.6), 0 -2px 18px rgba(255,106,0,.2);
  }
  .ticker-track {
    display: flex; align-items: center;
    height: 100%;
    width: max-content;
    font-family: 'JetBrains Mono', monospace; font-size: 12.5px;
    letter-spacing: .12em;
    color: var(--ink-2);
    animation: tickerScroll 60s linear infinite;
    white-space: nowrap;
  }
  .ticker-track .item { padding: 0 36px; display: inline-flex; align-items: center; gap: 14px; }
  .ticker-track .item .num { color: var(--ember); font-family: 'VT323', monospace; font-size: 18px; }
  .ticker-track .item .arrow { color: var(--flame-1); }
  .ticker-track .item.placeholder { color: var(--ink-dim); }
  @keyframes tickerScroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  .footer {
    margin-top: 48px; text-align: center;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    color: var(--ink-dim);
    line-height: 1.7;
    padding-bottom: 50px; /* room for ticker */
  }
  .footer img {
    width: 28px; height: 28px; vertical-align: middle; margin-right: 8px;
    opacity: .8; border-radius: 6px;
    border: 1px solid var(--flame-0);
  }

  /* responsive */
  @media (max-width: 1100px) {
    .control-panel { grid-template-columns: 1fr; }
    .gauge-temp { height: 200px; }
    .melt-tower { height: 240px; }
    .panel-left, .panel-right { padding: 36px 18px 24px; }
    .scoreboard-stats { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 720px) {
    .container { padding: 22px 14px 80px; }
    .hero h1 .line2 { margin-left: 4vw; }
    .hero h1 .line3 { margin-left: 8vw; }
    .section-head .title { font-size: 32px; }
    .nav { display: none; }
    .brand-text .name { font-size: 22px; }
    .marquee-track { font-size: 14px; }
    .ticker { height: 32px; }
    .ticker-track { font-size: 11px; }
    .receipt { transform: none !important; }
  }
</style>
</head>
<body>
  <canvas id="emberCanvas"></canvas>
  <canvas id="ashCanvas"></canvas>
  <div class="screen-flash" id="screenFlash"></div>

  <!-- TOP MARQUEE -->
  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">
      <span><span class="pip">◆</span> AUTO-BUYBACK · AUTO-BURN · EVERY ${config.cycleIntervalSeconds}s</span>
      <span><span class="pip">◆</span> SUPPLY ONLY GOES DOWN</span>
      <span><span class="pip">◆</span> ON-CHAIN · PERMANENT · IRREVERSIBLE</span>
      <span><span class="pip">◆</span> NOBODY TOUCHES THE DEV PRINCIPAL</span>
      <span><span class="pip">◆</span> FURNACE ONLINE</span>
      <!-- duplicate so scroll loops seamlessly -->
      <span><span class="pip">◆</span> AUTO-BUYBACK · AUTO-BURN · EVERY ${config.cycleIntervalSeconds}s</span>
      <span><span class="pip">◆</span> SUPPLY ONLY GOES DOWN</span>
      <span><span class="pip">◆</span> ON-CHAIN · PERMANENT · IRREVERSIBLE</span>
      <span><span class="pip">◆</span> NOBODY TOUCHES THE DEV PRINCIPAL</span>
      <span><span class="pip">◆</span> FURNACE ONLINE</span>
    </div>
  </div>

  <!-- TOP CONTROL STRIP -->
  <div class="control-strip">
    <div class="brand-block">
      <div class="brand-emblem"><img src="/burncoin-pfp.png" alt="$BURN" /></div>
      <div class="brand-text">
        <div class="name">$BURN</div>
        <div class="sub">~ the supply only goes down ~</div>
      </div>
    </div>
    <div class="strip-mid">
      <span class="lamp"><span class="bulb" id="statusBulb"></span><span id="statusText">BOOTING</span></span>
      <span class="lamp"><span class="bulb yellow" id="cycleBulb"></span>CYCLE <span id="cycleNum" style="margin-left:6px;color:var(--flame-2)">#0</span></span>
    </div>
    <div class="nav">
      <a id="dexLink" href="https://dexscreener.com/solana" target="_blank" rel="noopener">DEX</a>
      <a id="pumpLink" href="https://pump.fun" target="_blank" rel="noopener">PUMP</a>
      <a href="https://x.com" target="_blank" rel="noopener">X</a>
      <a id="mcPill" class="mc-pill" href="#" target="_blank" rel="noopener" title="DexScreener" style="display:none;">
        <span class="mc-label">MC</span><span id="mcValue">—</span>
      </a>
    </div>
  </div>

  <!-- BANNER -->
  <div class="banner-wrap">
    <img src="/burn-banner.png" alt="$BurnCoin — burning the supply forever" />
    <div class="heat-haze"></div>
  </div>

  <div class="container">

    <!-- HERO -->
    <section class="hero">
      <span class="kicker"><span class="dot"></span> SYSTEM ACTIVE · UNIT 01</span>
      <h1>
        <span class="line line1">EVERY</span>
        <span class="line line2">TWO MINUTES</span>
        <span class="line line3">SUPPLY BURNS!</span>
        <span class="scrawl-note">burn baby<br/>burn 🔥<span class="arrow">↘</span></span>
      </h1>
      <p class="lede">
        Self-operating pump.fun incinerator. Every <span class="marker"><b><span id="cycleSec">120</span> seconds</b></span>
        the bot claims creator fees from the dev wallet, spends <span class="hot"><span id="buybackPct">100</span>%</span>
        of them buying back <b>$BURN</b> on pump.fun, then <span class="marker"><b>burns 100% of the tokens it bought</b></span>
        via on-chain SPL burn — <b>mint.supply literally decrements</b>. Forever.
        The bot can only spend measured claim deltas, so the dev's principal is untouchable.
      </p>
      <div class="hero-actions">
        <div class="ca-box" id="ca" title="click to copy contract address">
          <span class="lbl">CA</span>
          <span id="caText">awaiting token launch…</span>
          <span style="opacity:.45">⎘</span>
        </div>
        <a class="btn primary" id="buyBtn" href="https://pump.fun" target="_blank" rel="noopener">▸ CATCH $BURN</a>
        <a class="btn ghost" id="chartBtn" href="https://dexscreener.com/solana" target="_blank" rel="noopener">CHART</a>
      </div>
      <div class="watch-banner" id="watchBanner">
        ⏳ FURNACE COLD · watching <span id="watchWallet" class="mono"></span> for pump.fun launch
      </div>
      <div class="maint-banner" id="maintBanner">
        <div class="head">⚠ FURNACE MAINTENANCE</div>
        <div class="body" id="maintBody">
          Bot is not running. <code>CREATOR_WALLET_PRIVATE_KEY</code> is not set on Railway.<br/>
          Paste your dev wallet's base58 private key in <b>Railway → burncoin → Variables</b> and the bot will boot automatically.
        </div>
      </div>
    </section>

    <!-- CONTROL PANEL — LEFT (gauges) · CENTER (incinerator) · RIGHT (supply melt) -->
    <section class="control-panel">

      <!-- LEFT: temperature + lamps -->
      <div class="metal panel-left">
        <div class="panel-label">CONTROL</div>
        <div class="gauge-temp">
          <div class="ticks"></div>
          <div class="mercury" id="tempMercury"></div>
          <div class="bulb-bottom"></div>
        </div>
        <div class="gauge-label">CORE TEMP</div>
        <div class="gauge-readout"><span id="tempReadout">427</span><span class="unit">°C</span></div>
        <div class="lamp-rack">
          <span class="lamp"><span class="bulb yellow" id="lampClaim"></span>CLAIM</span>
          <span class="lamp"><span class="bulb" id="lampBuy"></span>BUY</span>
          <span class="lamp"><span class="bulb red" id="lampBurn"></span>BURN</span>
          <span class="lamp"><span class="bulb dim" id="lampIdle"></span>IDLE</span>
        </div>
        <div class="rivet-bl"></div><div class="rivet-br"></div>
      </div>

      <!-- CENTER: incinerator viewport -->
      <div class="metal incinerator">
        <div class="panel-label">PRIMARY INCINERATOR</div>
        <div class="top-row">
          <div class="left">
            <span>▸ NEXT BURN IN</span>
            <span class="led-num" id="countdownLed">--:--</span>
          </div>
          <div class="right">
            <span>PRESSURE</span>
            <span class="led-num" id="pressureLed">102</span>
            <span>KPA</span>
          </div>
        </div>
        <div class="viewport-frame">
          <div class="bolt tl"></div><div class="bolt tr"></div>
          <div class="bolt bl"></div><div class="bolt br"></div>
          <div class="warning-tape">⚠ HIGH HEAT ⚠</div>
          <div class="hinges-right">
            <div class="hinge"></div><div class="hinge"></div>
          </div>
          <div class="viewport-glass" id="viewportGlass">
            <canvas id="furnaceCanvas" width="800" height="500"></canvas>
            <div class="core-logo"><img src="/burncoin-pfp.png" alt="" /></div>
            <div class="burn-overlay" id="burnOverlay">
              <div class="burn-card">
                <div class="lbl" id="burnLabel">▶ BUYING BACK</div>
                <div class="flames"><span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span></div>
                <div class="amt" id="burnAmount">— <span class="unit">SOL</span></div>
                <div class="status-line" id="burnStatus">queuing pump.fun buy…</div>
              </div>
            </div>
          </div>
        </div>
        <div class="rivet-bl"></div><div class="rivet-br"></div>
      </div>

      <!-- RIGHT: supply melt tower -->
      <div class="metal panel-right">
        <div class="panel-label">SUPPLY STACK</div>
        <div class="melt-wrap">
          <div class="scale">
            <span>100</span><span>75</span><span>50</span><span>25</span><span>0%</span>
          </div>
          <div class="melt-tower">
            <div class="stack" id="meltStack" style="height: 96%"></div>
            <div class="drips">
              <span class="drip"></span><span class="drip"></span>
              <span class="drip"></span><span class="drip"></span>
            </div>
          </div>
        </div>
        <div class="melt-readout">
          <div class="pct"><span id="pctBurned">0.00</span><span class="unit">%</span></div>
          <div class="lbl">SUPPLY DESTROYED</div>
          <div class="supply-line"><span id="currentSupplyTop">—</span> $BURN LEFT</div>
        </div>
        <div class="rivet-bl"></div><div class="rivet-br"></div>
      </div>
    </section>

    <!-- LED SCOREBOARD — total burned -->
    <section class="scoreboard">
      <div class="sticker rot-neg" style="top:-26px;right:36px;">🔥 BURN COUNT <span class="arrow-down">↓</span></div>
      <div class="scoreboard-head">
        <div class="lbl">TOTAL INCINERATED</div>
        <div class="sublbl">on-chain · permanent · irreversible</div>
      </div>
      <div class="led-display">
        <span class="led-digit" id="totalBurnedLed">0</span>
        <span class="unit">$BURN</span>
      </div>
      <div class="scoreboard-stats">
        <div class="sb-stat hot">
          <div class="k">BURN CYCLES</div>
          <div class="v" id="burnCount">0</div>
        </div>
        <div class="sb-stat">
          <div class="k">HOLDERS</div>
          <div class="v" id="holderCount">0</div>
        </div>
        <div class="sb-stat">
          <div class="k">SOL CLAIMED</div>
          <div class="v"><span id="solClaimed">0</span><span class="unit">SOL</span></div>
        </div>
        <div class="sb-stat">
          <div class="k">SOL → FURNACE</div>
          <div class="v"><span id="solBurned">0</span><span class="unit">SOL</span></div>
        </div>
        <div class="sb-stat hot">
          <div class="k">NEXT BUDGET</div>
          <div class="v"><span id="nextBudget">0</span><span class="unit">SOL</span></div>
        </div>
      </div>
    </section>

    <!-- RECENT BURN RECEIPTS -->
    <div class="section-head">
      <div class="title"><span class="glyph">▣</span> Recent Receipts</div>
      <div class="sub">last 6 incinerations · thermal print</div>
    </div>
    <div class="receipts" id="receiptsGrid"></div>

    <!-- FULL LEDGER -->
    <div class="section-head">
      <div class="title"><span class="glyph">▤</span> Incineration Ledger</div>
      <div class="sub" id="updatedBurns">—</div>
    </div>
    <div class="ledger">
      <table>
        <thead>
          <tr>
            <th>Cycle</th>
            <th class="right">SOL Spent</th>
            <th class="right">$BURN Incinerated</th>
            <th>Buy Tx</th>
            <th>Burn Tx</th>
            <th class="right">When</th>
          </tr>
        </thead>
        <tbody id="ledgerBody"></tbody>
      </table>
    </div>

    <!-- TOP HOLDERS LEADERBOARD -->
    <div class="section-head">
      <div class="title"><span class="glyph">♕</span> Top Holders</div>
      <div class="sub" id="holdersSubtitle">community wallets · refreshed every cycle</div>
    </div>
    <div class="ledger">
      <table>
        <thead>
          <tr>
            <th style="width:60px;">#</th>
            <th>Wallet</th>
            <th class="right">$BURN held</th>
            <th class="right">% of supply (ex-dev)</th>
          </tr>
        </thead>
        <tbody id="holdersBody"></tbody>
      </table>
    </div>

    <!-- LIVE FEED -->
    <div class="section-head">
      <div class="title"><span class="glyph">▷</span> Live Console</div>
      <div class="sub">furnace.log · streaming</div>
    </div>
    <div class="console">
      <div class="console-head">
        <span class="dots"><span class="r"></span><span class="y"></span><span class="g"></span></span>
        <span>~ / burncoin / furnace.log</span>
      </div>
      <div class="console-body" id="events"></div>
    </div>

    <div class="footer">
      <img src="/burncoin-pfp.png" alt="" />
      $BURN is a memecoin for entertainment only. The bot only spends measured claim deltas — the dev's principal is never touched. Buyback amounts depend on claimable fees and continued operation. Not financial advice.
      <br/><span style="color:var(--flame-1)">THE FURNACE NEVER STOPS.</span>
    </div>
  </div>

  <!-- BOTTOM TICKER TAPE -->
  <div class="ticker" aria-hidden="true">
    <div class="ticker-track" id="tickerTrack">
      <span class="item placeholder"><span class="arrow">▶</span> FURNACE BOOTING · AWAITING FIRST INCINERATION</span>
    </div>
  </div>

<script>
const CYCLE_SECONDS = ${config.cycleIntervalSeconds};
const BUYBACK_PCT = ${config.buybackPercent};            // real math
const MARKETING_PCT = ${config.marketingPercent};        // real math
const DISPLAY_BUYBACK_PCT = ${config.displayBuybackPercent}; // public copy only

const fmt = (n, d=2) => Number(n||0).toLocaleString(undefined, { maximumFractionDigits: d });
const fmtTok = (n) => {
  n = Number(n||0);
  if (n >= 1e9) return (n/1e9).toFixed(2)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(2)+'K';
  return n.toFixed(2);
};
const tShort = (s) => s ? s.slice(0,6)+'…'+s.slice(-4) : '—';
const since = (ts) => {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now()-ts)/1000));
  if (s < 60) return s+'s ago';
  if (s < 3600) return Math.floor(s/60)+'m ago';
  if (s < 86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
};
const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ── EMBER (rising) + ASH (falling) PARTICLE SYSTEMS ────────────────
(function ember(){
  const c = $('emberCanvas'), ctx = c.getContext('2d');
  let w, h;
  const resize = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
  addEventListener('resize', resize); resize();
  const N = 70, parts = [];
  const reset = (p, init=false) => {
    p.x = Math.random() * w;
    p.y = init ? Math.random() * h : h + Math.random() * 60;
    p.vy = -(0.3 + Math.random() * 1.3);
    p.vx = (Math.random() - .5) * .35;
    p.r = .8 + Math.random() * 2.5;
    p.life = 0; p.maxLife = 350 + Math.random() * 400;
    p.hue = 16 + Math.random() * 28;
    p.alpha = .35 + Math.random() * .6;
  };
  for (let i=0;i<N;i++){ const p={}; reset(p, true); parts.push(p); }
  let last = performance.now(); let intensity = 1;
  window.__setEmberIntensity = (v) => intensity = v;
  (function tick(now){
    const dt = Math.min(40, now - last); last = now;
    ctx.clearRect(0,0,w,h);
    for (const p of parts){
      p.life += dt;
      p.x += p.vx * dt * .06 * intensity;
      p.y += p.vy * dt * .06 * intensity;
      p.x += Math.sin((p.life + p.r * 100) * .004) * .6;
      if (p.y < -10 || p.life > p.maxLife) reset(p);
      const fade = 1 - p.life / p.maxLife;
      const a = p.alpha * fade * intensity;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grd.addColorStop(0, 'hsla('+ p.hue +', 100%, 72%, '+ a +')');
      grd.addColorStop(.55, 'hsla('+ (p.hue-5) +', 100%, 50%, '+ (a*.4) +')');
      grd.addColorStop(1, 'hsla('+ (p.hue-10) +', 100%, 40%, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(tick);
  })(last);
})();
(function ash(){
  const c = $('ashCanvas'), ctx = c.getContext('2d');
  let w, h;
  const resize = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
  addEventListener('resize', resize); resize();
  const N = 50, parts = [];
  const reset = (p, init=false) => {
    p.x = Math.random() * w;
    p.y = init ? Math.random() * h : -10 - Math.random() * 40;
    p.vy = .25 + Math.random() * .9;
    p.vx = (Math.random() - .5) * .25;
    p.r = .6 + Math.random() * 1.6;
    p.life = 0; p.maxLife = 600 + Math.random() * 600;
    p.alpha = .12 + Math.random() * .25;
  };
  for (let i=0;i<N;i++){ const p={}; reset(p, true); parts.push(p); }
  let last = performance.now();
  (function tick(now){
    const dt = Math.min(40, now - last); last = now;
    ctx.clearRect(0,0,w,h);
    for (const p of parts){
      p.life += dt;
      p.x += p.vx * dt * .06;
      p.y += p.vy * dt * .06;
      p.x += Math.sin((p.life + p.r * 60) * .003) * .25;
      if (p.y > h + 10 || p.life > p.maxLife) reset(p);
      const fade = Math.min(1, p.life / 80) * (1 - p.life / p.maxLife);
      const a = p.alpha * fade;
      ctx.fillStyle = 'rgba(180, 140, 120, '+ a +')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(tick);
  })(last);
})();

// ── INCINERATOR FLAME CANVAS (inside viewport glass) ───────────────
(function furnace(){
  const c = $('furnaceCanvas'); const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const N = 160, baseY = H * 0.94;
  const flames = [];
  const mkFlame = (boost=0) => ({
    x: W/2 + (Math.random() - .5) * W * .85,
    y: baseY + Math.random() * 24,
    vy: -(1 + Math.random() * 1.9 + boost),
    vx: (Math.random() - .5) * .55,
    r: 24 + Math.random() * 50 + boost*6,
    life: 0, maxLife: 110 + Math.random() * 100,
    hue: 12 + Math.random() * 38,
  });
  for (let i=0;i<N;i++) flames.push(mkFlame());
  let intensity = 1;
  window.__setFurnaceIntensity = (v) => intensity = v;
  (function draw(){
    ctx.clearRect(0,0,W,H);
    // heat haze at bottom
    const haze = ctx.createRadialGradient(W/2, baseY, 0, W/2, baseY, W * .55);
    haze.addColorStop(0, 'rgba(220, 50, 10, 0.55)');
    haze.addColorStop(.5, 'rgba(255, 122, 26, 0.22)');
    haze.addColorStop(1, 'rgba(255, 122, 26, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, baseY - W * .35, W, W * .55);
    ctx.globalCompositeOperation = 'lighter';
    for (let i=0;i<flames.length;i++){
      const f = flames[i];
      f.life += 1.3 * intensity;
      f.y += f.vy * 1.15 * intensity;
      f.x += f.vx + Math.sin((f.life + i) * .1) * .65;
      const fade = 1 - f.life / f.maxLife;
      if (fade <= 0 || f.y < H * 0.05) { flames[i] = mkFlame(intensity > 1.5 ? 1 : 0); continue; }
      const r = f.r * (.7 + fade * .9);
      const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      grd.addColorStop(0, 'hsla('+ (f.hue + 22) +', 100%, '+ (80 - fade*14) +'%, '+ (.9 * fade * intensity) +')');
      grd.addColorStop(.4, 'hsla('+ f.hue +', 100%, 55%, '+ (.6 * fade * intensity) +')');
      grd.addColorStop(1, 'hsla('+ (f.hue-8) +', 100%, 40%, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI*2); ctx.fill();
    }
    // sparks (small bright points emitted from the bottom)
    if (intensity > 1.2) {
      for (let i=0;i<8;i++){
        const sx = W/2 + (Math.random() - .5) * W * .8;
        const sy = baseY - Math.random() * 30;
        ctx.fillStyle = 'rgba(255,243,194,'+ (.4 + Math.random() * .55) +')';
        ctx.beginPath(); ctx.arc(sx, sy, 1.5 + Math.random() * 1.6, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  })();
})();

// ── DATA / RENDER LOOP ────────────────────────────────────────────
let lastBurnTx = null;
let isBurnOverlayShown = false;
let prevTotalBurned = 0;

function setStatusLamp(status) {
  const map = {
    idle:     { lamp: 'lampIdle',  text: 'IDLE',       hot: false },
    running:  { lamp: 'lampClaim', text: 'CLAIMING',   hot: true  },
    buying:   { lamp: 'lampBuy',   text: 'BUYBACK',    hot: true  },
    burning:  { lamp: 'lampBurn',  text: 'INCINERATE', hot: true  },
    watching: { lamp: 'lampIdle',  text: 'WATCHING',   hot: false },
    error:    { lamp: 'lampBurn',  text: 'ERROR',      hot: false },
    stopped:  { lamp: 'lampIdle',  text: 'STOPPED',    hot: false },
  };
  const m = map[status] || map.idle;
  ['lampClaim','lampBuy','lampBurn','lampIdle'].forEach(id => {
    const el = $(id); if (!el) return;
    if (id === m.lamp) el.classList.remove('dim');
    else el.classList.add('dim');
  });
  $('statusText').textContent = m.text;
  const sb = $('statusBulb');
  if (sb) {
    sb.classList.remove('red','yellow','dim');
    if (status === 'burning') sb.classList.add('red');
    else if (status === 'buying') sb.classList.add('yellow');
    else if (status === 'idle' || status === 'watching' || status === 'stopped') sb.classList.add('dim');
  }
}

function applyState(s) {
  const totals = s.totals || {};
  $('cycleSec').textContent = CYCLE_SECONDS;
  $('buybackPct').textContent = DISPLAY_BUYBACK_PCT;
  $('cycleNum').textContent = '#' + (s.cycleCount || 0);

  setStatusLamp(s.status || 'idle');

  // contract address
  const ca = $('caText');
  if (s.burnMint && s.burnMint.length > 32) {
    ca.textContent = s.burnMint;
    $('ca').onclick = async () => {
      try { await navigator.clipboard.writeText(s.burnMint); $('ca').classList.add('copied'); setTimeout(() => $('ca').classList.remove('copied'), 900); } catch {}
    };
    $('buyBtn').href = 'https://pump.fun/coin/' + s.burnMint;
    $('chartBtn').href = 'https://dexscreener.com/solana/' + s.burnMint;
    $('dexLink').href = 'https://dexscreener.com/solana/' + s.burnMint;
    $('pumpLink').href = 'https://pump.fun/coin/' + s.burnMint;
  } else {
    ca.textContent = 'awaiting token launch…';
  }

  // maintenance banner — when the bot can't run (e.g. wallet key missing)
  const mb = $('maintBanner');
  if (s.maintenance) {
    mb.classList.add('show');
    if (s.maintenanceReason) {
      $('maintBody').innerHTML = escapeHtml(s.maintenanceReason)
        .replace(/CREATOR_WALLET_PRIVATE_KEY/g, '<code>CREATOR_WALLET_PRIVATE_KEY</code>')
        .replace(/Railway/g, '<b>Railway</b>');
    }
  } else {
    mb.classList.remove('show');
  }

  // watch banner — only when bot IS running AND watching for a token launch
  const wb = $('watchBanner');
  if (!s.maintenance && s.status === 'watching' && s.creatorWallet) {
    wb.style.display = 'block';
    $('watchWallet').textContent = tShort(s.creatorWallet);
  } else {
    wb.style.display = 'none';
  }

  // LED scoreboard — total burned
  const burned = totals.tokensBurnedUi || 0;
  const ledEl = $('totalBurnedLed');
  ledEl.textContent = fmtTok(burned);
  if (burned !== prevTotalBurned) {
    ledEl.classList.remove('tick');
    void ledEl.offsetWidth;
    ledEl.classList.add('tick');
    prevTotalBurned = burned;
  }

  $('burnCount').textContent = totals.burnCount || 0;
  $('solClaimed').textContent = fmt(totals.solClaimed, 4);
  $('solBurned').textContent = fmt(totals.solToBuybacks, 4);

  // supply / melt
  const supply = s.totalSupplyUi || 0;
  $('currentSupplyTop').textContent = supply > 0 ? fmtTok(supply) : '—';
  const totalEver = supply + burned;
  const pct = totalEver > 0 ? (burned / totalEver) * 100 : 0;
  $('pctBurned').textContent = pct.toFixed(pct >= 1 ? 2 : 4);
  // melt stack height: starts at 96% (top of tower) and shrinks as % burns increases
  const stackHeight = totalEver > 0 ? Math.max(2, 96 * (supply / totalEver)) : 96;
  $('meltStack').style.height = stackHeight + '%';

  // temperature gauge — climbs with burn count + status (peaks during burning)
  const baseTempPct = Math.min(72, 18 + (totals.burnCount || 0) * 2 + (s.cycleCount || 0) * 0.5);
  const statusBoost = s.status === 'burning' ? 28 : (s.status === 'buying' ? 18 : (s.status === 'running' ? 10 : 0));
  const tempPct = Math.min(95, baseTempPct + statusBoost);
  $('tempMercury').style.height = tempPct + '%';
  $('tempReadout').textContent = Math.round(280 + tempPct * 10);

  // pressure readout (visual flavor — climbs with status intensity)
  const pressureBase = 90 + Math.floor((s.cycleCount || 0) % 18);
  const pressure = pressureBase + (s.status === 'burning' ? 38 : (s.status === 'buying' ? 22 : 0));
  $('pressureLed').textContent = pressure;

  // next budget = current claim pool's buyback slice
  const poolLamports = s.claimPoolLamports || 0;
  const poolSol = poolLamports / 1e9;
  const totalPctSum = Math.max(1, BUYBACK_PCT + MARKETING_PCT);
  $('nextBudget').textContent = fmt(poolSol * (BUYBACK_PCT / totalPctSum), 4);

  // countdown
  updateCountdown(s);

  // live burn overlay + viewport class
  const lb = s.liveBurn;
  const glass = $('viewportGlass');
  glass.classList.remove('burning');
  const overlay = $('burnOverlay');
  if (lb && (lb.status === 'buying' || lb.status === 'burning')) {
    overlay.classList.add('show');
    isBurnOverlayShown = true;
    $('burnLabel').textContent = lb.status === 'buying' ? '▶ BUYING BACK' : '💥 INCINERATING 💥';
    $('burnAmount').innerHTML = fmt(lb.solAmount, 4) + ' <span class="unit">SOL</span>';
    $('burnStatus').textContent = lb.status === 'buying'
      ? 'sending pump.fun buy tx…'
      : 'sending SPL burn — supply going down forever';
    if (lb.status === 'burning') glass.classList.add('burning');
    window.__setEmberIntensity && window.__setEmberIntensity(lb.status === 'burning' ? 2.4 : 1.6);
    window.__setFurnaceIntensity && window.__setFurnaceIntensity(lb.status === 'burning' ? 2.6 : 1.7);
  } else {
    if (isBurnOverlayShown) {
      overlay.classList.remove('show');
      isBurnOverlayShown = false;
    }
    window.__setEmberIntensity && window.__setEmberIntensity(1);
    window.__setFurnaceIntensity && window.__setFurnaceIntensity(1);
  }

  // flash on new burn confirmation
  if (s.lastBurn && s.lastBurn.burnTx && s.lastBurn.burnTx !== lastBurnTx) {
    if (lastBurnTx !== null) {
      const flash = $('screenFlash');
      flash.classList.remove('fire');
      void flash.offsetWidth;
      flash.classList.add('fire');
    }
    lastBurnTx = s.lastBurn.burnTx;
  }

  // holder count + top holders
  $('holderCount').textContent = fmt(s.current && s.current.holderCount, 0);
  renderHolders(s.topHolders || [], s);

  renderReceipts(s.burns || []);
  renderLedger(s.burns || []);
  renderEvents(s.events || []);
  renderTicker(s.burns || []);

  $('updatedBurns').textContent = 'last updated · ' + new Date().toLocaleTimeString();
}

function renderHolders(holders, s) {
  const body = $('holdersBody');
  if (!holders || holders.length === 0) {
    if (s && s.status === 'watching') {
      body.innerHTML = '<tr><td colspan="4" class="empty">awaiting token launch · holders will appear here</td></tr>';
    } else if (s && s.lastHolderSnapshotAt === 0) {
      body.innerHTML = '<tr><td colspan="4" class="empty">first holder snapshot pending · runs after the first cycle</td></tr>';
    } else {
      body.innerHTML = '<tr><td colspan="4" class="empty">no community holders yet — be the first</td></tr>';
    }
    return;
  }
  body.innerHTML = holders.slice(0, 50).map((h, i) => {
    const rank = i + 1;
    const rankCls = rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : '';
    const pct = (h.share * 100);
    return ''
      + '<tr>'
      +   '<td><span class="rank '+ rankCls +'">'+ rank +'</span></td>'
      +   '<td><a href="https://solscan.io/account/'+ h.owner +'" target="_blank" rel="noopener">'+ tShort(h.owner) +'</a></td>'
      +   '<td class="right"><span class="burn-amt">'+ fmtTok(h.uiBalance) +'<span class="unit">$BURN</span></span></td>'
      +   '<td class="right"><span class="share-bar"><i style="width:'+ Math.min(100, pct).toFixed(1) +'%"></i></span>'+ pct.toFixed(pct >= 1 ? 2 : 3) +'%</td>'
      + '</tr>';
  }).join('');
}

function updateCountdown(s) {
  const now = Date.now();
  const next = s.nextCycleAt || (now + CYCLE_SECONDS * 1000);
  let remaining = Math.max(0, Math.floor((next - now) / 1000));
  if (s.status === 'buying' || s.status === 'burning' || s.status === 'running' || s.status === 'watching') {
    remaining = 0;
  }
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const sec = String(remaining % 60).padStart(2, '0');
  $('countdownLed').textContent = m + ':' + sec;
}

function renderReceipts(burns) {
  const grid = $('receiptsGrid');
  if (!burns || burns.length === 0) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">no incinerations yet · printer warming up…</div>';
    return;
  }
  const recent = burns.slice(-6).reverse();
  grid.innerHTML = recent.map(b => {
    const dt = new Date(b.ts || Date.now());
    return ''
      + '<div class="receipt">'
      +   '<div class="washi"></div>'
      +   '<div class="stamp">BURNED</div>'
      +   '<div class="head">$BURN INCINERATOR<span class="sub">UNIT 01 · BAY 1</span></div>'
      +   '<div class="row"><span class="k">CYCLE</span><span class="v">#'+ (b.cycle || 0) +'</span></div>'
      +   '<div class="row"><span class="k">DATE</span><span class="v">'+ dt.toLocaleDateString() +'</span></div>'
      +   '<div class="row"><span class="k">TIME</span><span class="v">'+ dt.toLocaleTimeString() +'</span></div>'
      +   '<div class="row"><span class="k">SOL SPENT</span><span class="v">'+ fmt(b.solSpent, 4) +' SOL</span></div>'
      +   '<div class="row"><span class="k">$BURN PRICE</span><span class="v">~'+ (b.solSpent && b.tokensBurnedUi ? (b.solSpent / b.tokensBurnedUi).toExponential(2) : '—') +' SOL</span></div>'
      +   '<div class="total"><div class="k" style="font-size:10px;color:#6a3a18;">INCINERATED</div><div class="v">'+ fmtTok(b.tokensBurnedUi) +' $BURN</div></div>'
      +   '<div class="footer-line">BUY · <a href="https://solscan.io/tx/'+ b.buyTx +'" target="_blank" rel="noopener">'+ (b.buyTx ? b.buyTx.slice(0,10)+'…' : '—') +'</a></div>'
      +   '<div class="footer-line">BURN · <a href="https://solscan.io/tx/'+ b.burnTx +'" target="_blank" rel="noopener">'+ (b.burnTx ? b.burnTx.slice(0,10)+'…' : '—') +'</a></div>'
      +   '<div class="footer-line" style="margin-top:8px;font-weight:700;">★ THANK YOU FOR HOLDING ★</div>'
      + '</div>';
  }).join('');
}

function renderLedger(burns) {
  const body = $('ledgerBody');
  if (!burns || burns.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty">ledger empty · awaiting first incineration…</td></tr>';
    return;
  }
  body.innerHTML = burns.slice(-100).reverse().map(b => ''
    + '<tr>'
    +   '<td><span class="cycle-tag">#'+ (b.cycle || 0) +'</span></td>'
    +   '<td class="right">'+ fmt(b.solSpent, 4) +' SOL</td>'
    +   '<td class="right"><span class="burn-amt">'+ fmtTok(b.tokensBurnedUi) +'<span class="unit">$BURN</span></span></td>'
    +   '<td>'+ (b.buyTx ? '<a href="https://solscan.io/tx/'+ b.buyTx +'" target="_blank" rel="noopener">'+ b.buyTx.slice(0,10) +'…</a>' : '—') +'</td>'
    +   '<td>'+ (b.burnTx ? '<a href="https://solscan.io/tx/'+ b.burnTx +'" target="_blank" rel="noopener">'+ b.burnTx.slice(0,10) +'…</a>' : '—') +'</td>'
    +   '<td class="right" style="color: var(--ink-dim)">'+ since(b.ts) +'</td>'
    + '</tr>'
  ).join('');
}

function renderEvents(events) {
  const el = $('events');
  if (!events || events.length === 0) {
    el.innerHTML = '<div class="empty">console booting…</div>';
    return;
  }
  el.innerHTML = events.slice(-300).reverse().map(e => {
    const t = new Date(e.ts || Date.now());
    const tt = String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')+':'+String(t.getSeconds()).padStart(2,'0');
    const txLink = e.txSignature
      ? ' · <a href="https://solscan.io/tx/'+ e.txSignature +'" target="_blank" rel="noopener">'+ e.txSignature.slice(0,14) +'…</a>'
      : '';
    return '<div class="ev kind-'+ (e.type||'info') +'">'
      + '<span class="ts">'+ tt +'</span>'
      + '<span class="kind">'+ (e.type || 'info').toUpperCase() +'</span>'
      + '<span class="body">'+ escapeHtml(e.message || '') + txLink + '</span>'
      + '</div>';
  }).join('');
}

function renderTicker(burns) {
  const track = $('tickerTrack');
  const items = [];
  if (burns && burns.length) {
    const recent = burns.slice(-12).reverse();
    recent.forEach(b => {
      items.push(
        '<span class="item"><span class="arrow">▶</span> BURN #' + (b.cycle||0) + ' · INCINERATED ' +
        '<span class="num">' + fmtTok(b.tokensBurnedUi) + '</span> $BURN · ' +
        fmt(b.solSpent, 4) + ' SOL · ' +
        '<a href="https://solscan.io/tx/' + b.burnTx + '" target="_blank" rel="noopener" style="color:var(--flame-1);text-decoration:none">' + (b.burnTx ? b.burnTx.slice(0,8)+'…' : 'tx') + '</a></span>'
      );
    });
    // duplicate so the marquee loops seamlessly
    track.innerHTML = items.join('') + items.join('');
  } else {
    track.innerHTML = '<span class="item placeholder"><span class="arrow">▶</span> FURNACE BOOTING · AWAITING FIRST INCINERATION</span>'.repeat(6);
  }
}

async function poll() {
  try {
    const r = await fetch('/api/state', { cache: 'no-store' });
    const s = await r.json();
    applyState(s);
  } catch {
    /* swallow */
  } finally {
    setTimeout(poll, 1500);
  }
}
poll();

// ── DexScreener market cap polling ──────────────────────────────────
let mcMint = null;
async function pollMarketCap(mint) {
  try {
    const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint, { cache: 'no-store' });
    const d = await r.json();
    const pairs = (d && d.pairs) || [];
    // Pick the pump.fun / Solana pair with highest liquidity
    pairs.sort((a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0));
    const pair = pairs.find(p => p && p.chainId === 'solana') || pairs[0];
    if (pair) {
      const mc = pair.marketCap || pair.fdv;
      if (mc) {
        const pill = $('mcPill');
        pill.style.display = 'inline-flex';
        $('mcValue').textContent = '$' + fmtTok(mc);
        pill.href = pair.url || ('https://dexscreener.com/solana/' + mint);
      }
    }
  } catch {
    /* swallow */
  }
}
// Re-poll DexScreener every 30s once we know the mint
setInterval(() => {
  if (mcMint) pollMarketCap(mcMint);
}, 30000);
// Trigger first MC fetch as soon as we have a mint
const _origApply = applyState;
applyState = function(s) {
  _origApply(s);
  if (s.burnMint && s.burnMint.length > 32 && s.burnMint !== mcMint) {
    mcMint = s.burnMint;
    pollMarketCap(mcMint);
  }
};

// local countdown ticker so seconds feel live between polls
setInterval(() => {
  fetch('/api/state', { cache: 'no-store' })
    .then(r => r.json())
    .then(updateCountdown)
    .catch(() => {});
}, 1000);
</script>
</body>
</html>`;
}
