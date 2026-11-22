// Tiny synthesised sound effects: everything is generated with WebAudio,
// so the game ships no audio files and makes no network request.

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.12, when = 0) {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + when;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function sfx(name) {
  try {
    if (name === 'play') tone(660, 0.09, 'triangle');
    else if (name === 'attack') tone(170, 0.14, 'sawtooth', 0.14);
    else if (name === 'click') tone(440, 0.05, 'sine', 0.08);
    else if (name === 'draw') tone(880, 0.06, 'sine', 0.08);
    else if (name === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.11));
    else if (name === 'lose') [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.14));
  } catch (_) {
    // Sound is garnish; a silent game is still a game.
  }
}
