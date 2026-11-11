export const sounds = {
  chapel: { name: 'Chapel Choir', detail: 'Wordless harmonies', description: 'Slow choral chords with a spacious chapel tail', icon: '✧', hue: 43, pitch: 130.8, reverb: 1.1 },
  piano: { name: 'Soft Piano', detail: 'Felt-like notes', description: 'Sparse, soft piano notes and a warm room', icon: '♩', hue: 32, pitch: 146.8, reverb: 0.78 },
  rain: { name: 'Window Rain', detail: 'Gentle droplets', description: 'A soft wash of rain against the window', icon: '⋮', hue: 177, reverb: 0.15 },
  coast: { name: 'Quiet Coast', detail: 'Slow shore waves', description: 'Rolling surf with space between the waves', icon: '≈', hue: 191, reverb: 0.15 },
  strings: { name: 'Soft Strings', detail: 'Warm ensemble', description: 'Unhurried cello and string-like harmonies', icon: '∿', hue: 53, pitch: 130.8, reverb: 0.8 },
  woodland: { name: 'Woodland Hearth', detail: 'Forest and embers', description: 'Woodland air with a quiet fire crackle', icon: '♧', hue: 103, reverb: 0.18 },
};

export const experiences = [
  { id: 'chapel', name: 'Chapel Stillness', scene: 'chapel', duration: 600, rhythm: 'off', tone: 'off', space: 68, bells: 'off' },
  { id: 'rain', name: 'Breathe with Rain', scene: 'rain', duration: 600, rhythm: 'breath', pace: 6, tone: 'off', space: 25, bells: 'off' },
  { id: 'coast', name: 'Coast at Dusk', scene: 'coast', duration: 1200, rhythm: 'off', tone: 'off', space: 20, bells: 'off' },
  { id: 'piano', name: 'Piano Pause', scene: 'piano', duration: 300, rhythm: 'off', tone: 'off', space: 45, bells: 'off' },
  { id: 'evening', name: 'Evening Drift', scene: 'strings', duration: 1800, rhythm: 'breath', pace: 5.5, tone: 'off', space: 52, bells: 'off' },
];

export const defaultMix = Object.freeze({
  scene: 'chapel', duration: 600, volume: 45, space: 68, bells: 'off',
  rhythm: 'off', pace: 6, pulse: 40, tone: 'off', pitch: 180, beat: 6, toneLevel: 30,
});

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normaliseMix(source = {}) {
  const choice = (key, values) => values.includes(source[key]) ? source[key] : defaultMix[key];
  const number = (key, min, max, decimals = 0) => {
    const value = typeof source[key] === 'number' && Number.isFinite(source[key]) ? source[key] : defaultMix[key];
    return Number(clamp(value, min, max).toFixed(decimals));
  };
  return {
    scene: choice('scene', Object.keys(sounds)),
    duration: choice('duration', [0, 300, 600, 900, 1200, 1800]),
    volume: number('volume', 0, 100),
    space: number('space', 0, 100),
    bells: choice('bells', ['off', 'gentle', 'frequent']),
    rhythm: choice('rhythm', ['off', 'breath', 'gamma']),
    pace: number('pace', 4.5, 7.5, 1),
    pulse: number('pulse', 30, 60),
    tone: choice('tone', ['off', 'pure', 'binaural']),
    pitch: number('pitch', 80, 1000, 1),
    beat: number('beat', 1, 20, 1),
    toneLevel: number('toneLevel', 0, 100),
  };
}

