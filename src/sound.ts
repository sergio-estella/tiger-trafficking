/**
 * Gunshot, synthesised with the Web Audio API (no audio file, no licence).
 *
 * Browsers only allow sound after the reader has interacted with the page
 * (click, tap or key). Scrolling with a mouse wheel or trackpad does not count,
 * so the first time the shot comes without any prior click, it is silent.
 */
let ctx: AudioContext | null = null;

function unlock() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}
for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { passive: true });

export function gunshot() {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);

  // Crack: a burst of white noise, high-passed, with a very fast decay
  const len = Math.floor(ctx.sampleRate * 1.2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const crack = ctx.createBufferSource();
  crack.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 900;
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(1, t);
  crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
  crack.connect(hp).connect(crackGain).connect(out);

  // Body: the same noise, low-passed, longer tail (the shot echoing)
  const body = ctx.createBufferSource();
  body.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.9);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.8, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  body.connect(lp).connect(bodyGain).connect(out);

  // Thump: a short low sine drop
  const thump = ctx.createOscillator();
  thump.frequency.setValueAtTime(140, t);
  thump.frequency.exponentialRampToValueAtTime(40, t + 0.2);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.9, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  thump.connect(thumpGain).connect(out);

  crack.start(t); body.start(t); thump.start(t);
  crack.stop(t + 0.3); body.stop(t + 1.2); thump.stop(t + 0.3);
}
