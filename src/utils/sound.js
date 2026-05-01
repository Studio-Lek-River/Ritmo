let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(ctx, { freq, duration, type = 'sine', attack = 0.005, freqEnd = null, volume }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  }
  const peakVol = volume * 0.3;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(peakVol, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration + 0.05);
}

export function playSound(name, { enabled = true, volume = 80 } = {}) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  const vol = Math.max(0, Math.min(100, volume)) / 100;
  if (vol === 0) return;

  switch (name) {
    case 'tick':
      playTone(ctx, { freq: 1200, duration: 0.1, type: 'sine', volume: vol });
      break;
    case 'pop':
      playTone(ctx, { freq: 600, freqEnd: 900, duration: 0.12, type: 'sine', volume: vol });
      break;
    case 'chime':
      playTone(ctx, { freq: 660, duration: 0.2, type: 'sine', volume: vol });
      setTimeout(() => playTone(ctx, { freq: 880, duration: 0.2, type: 'sine', volume: vol }), 120);
      setTimeout(() => playTone(ctx, { freq: 1320, duration: 0.4, type: 'sine', volume: vol }), 240);
      break;
    default:
      break;
  }
}
