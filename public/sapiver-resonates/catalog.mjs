export const sounds = {
  chapel: { name: 'Chapel Choir', detail: 'The Tudor Consort', description: 'Palestrina sung by The Tudor Consort', icon: '✧', hue: 43 },
  piano: { name: 'Soft Piano', detail: 'Kimiko Ishizaka', description: 'Bach’s Goldberg Aria, played by Kimiko Ishizaka', icon: '♩', hue: 32 },
  rain: { name: 'Window Rain', detail: 'Gentle droplets', description: 'A soft wash of rain against the window', icon: '⋮', hue: 177 },
  coast: { name: 'Quiet Coast', detail: 'Slow shore waves', description: 'Rolling surf with space between the waves', icon: '≈', hue: 191 },
  strings: { name: 'Soft Cello', detail: 'Darrell Jacobi', description: 'Bach’s Sarabande in G, played by Darrell Jacobi', icon: '∿', hue: 53 },
  woodland: { name: 'Woodland Hearth', detail: 'Forest and embers', description: 'Woodland air with a quiet fire crackle', icon: '♧', hue: 103 },
};

export const experiences = [
  { id: 'chapel', name: 'Chapel Stillness', scene: 'chapel', duration: 600, rhythm: 'off' },
  { id: 'rain', name: 'Breathe with Rain', scene: 'rain', duration: 600, rhythm: 'breath', pace: 6 },
  { id: 'coast', name: 'Coast at Dusk', scene: 'coast', duration: 1200, rhythm: 'off' },
  { id: 'piano', name: 'Piano Pause', scene: 'piano', duration: 300, rhythm: 'off' },
  { id: 'evening', name: 'Evening Drift', scene: 'strings', duration: 1800, rhythm: 'breath', pace: 5.5 },
];

export const defaultLayerLevel = 75;
export const defaultMix = Object.freeze({
  layers: Object.freeze({ chapel: defaultLayerLevel }), duration: 600, volume: 45, space: 0, bells: 'off',
  rhythm: 'off', pace: 6, pulse: 40, tone: 'off', pitch: 180, beat: 6, toneLevel: 30,
});

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normaliseMix(source = {}) {
  if (!source || typeof source !== 'object') source = defaultMix;
  const levels = source.layers && typeof source.layers === 'object' && !Array.isArray(source.layers)
    ? source.layers
    : Object.hasOwn(sounds, source.scene) ? { [source.scene]: defaultLayerLevel } : defaultMix.layers;
  const layers = {};
  for (const key of Object.keys(sounds)) {
    const level = Number.isFinite(levels[key]) ? Math.round(clamp(levels[key], 0, 100)) : 0;
    if (level > 0) layers[key] = level;
  }
  const choice = (key, values) => values.includes(source[key]) ? source[key] : defaultMix[key];
  const number = (key, min, max, decimals = 0) => {
    const value = typeof source[key] === 'number' && Number.isFinite(source[key]) ? source[key] : defaultMix[key];
    return Number(clamp(value, min, max).toFixed(decimals));
  };
  return {
    layers,
    duration: choice('duration', [0, 300, 600, 900, 1200, 1800]),
    volume: number('volume', 0, 100),
    space: number('space', 0, 100),
    bells: choice('bells', ['off', 'gentle', 'frequent']),
    rhythm: choice('rhythm', ['off', 'breath', 'gamma']),
    pace: number('pace', 4.5, 7.5, 1),
    pulse: number('pulse', 30, 60),
    tone: choice('tone', ['off', 'pure', 'binaural']),
    pitch: number('pitch', 20, 1000, 1),
    beat: number('beat', 1, 20, 1),
    toneLevel: number('toneLevel', 0, 100),
  };
}

