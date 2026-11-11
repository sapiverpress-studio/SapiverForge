// Original sound design. Each bed is rebuilt by the same engine for live and offline playback.
const PITCH = midi => 440 * 2 ** ((midi - 69) / 12);
const CHAPEL = [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62]];
const PIANO = [[50, 57, 64, 65, 69], [46, 53, 60, 62, 65], [53, 60, 65, 67, 69], [48, 55, 62, 64, 67]];
const STRINGS = [[48, 55, 60, 63, 67], [44, 51, 56, 60, 63], [51, 58, 63, 67, 70], [46, 53, 58, 62, 65]];

export function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function gain(context, target, level = 1) {
  const node = context.createGain();
  node.gain.value = level;
  node.connect(target);
  return node;
}

function filter(context, target, type, frequency, q = 0.7) {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  node.connect(target);
  return node;
}

function pan(context, target, amount) {
  const node = context.createStereoPanner();
  node.pan.value = amount;
  node.connect(target);
  return node;
}

function shaped(context, target, start, level, attack, hold, release) {
  const node = gain(context, target, 0);
  node.gain.setValueAtTime(0, start);
  node.gain.linearRampToValueAtTime(level, start + attack);
  node.gain.setValueAtTime(level, start + attack + hold);
  node.gain.linearRampToValueAtTime(0, start + attack + hold + release);
  return node;
}

function vocalWave(context, base, dark) {
  const real = new Float32Array(31);
  const imaginary = new Float32Array(31);
  const formants = dark ? [[300, 165, 1], [850, 270, .32], [2200, 420, .09]]
    : [[460, 210, 1], [1020, 360, .43], [2520, 430, .12]];
  for (let harmonic = 1; harmonic < imaginary.length; harmonic++) {
    const tone = base * harmonic;
    const colour = formants.reduce((sum, [center, width, amount]) =>
      sum + amount * Math.exp(-0.5 * ((tone - center) / width) ** 2), .16);
    imaginary[harmonic] = colour / harmonic ** .94;
  }
  return context.createPeriodicWave(real, imaginary);
}

function makeVoice(context, target, frequency, start, length, index, kind, playOscillator) {
  const choir = kind === 'chapel';
  const attack = choir ? 2.25 : 2.6;
  const release = choir ? 3.15 : 3.4;
  const volume = [0.096, 0.086, 0.075, 0.065, 0.045][index];
  const positioned = pan(context, target, [-.48, .43, -.21, .31, .01][index]);
  const envelope = shaped(context, positioned, start, volume, attack, length - attack, release);
  const colour = filter(context, envelope, 'lowpass', choir ? 2350 : 1540 + index * 80);
  const wave = choir ? vocalWave(context, frequency, index < 2) : null;
  const finish = start + length + release + .06;
  const voice = playOscillator(frequency, start, finish, colour, choir ? 'custom' : 'sawtooth', wave);
  const double = playOscillator(frequency, start + .12, finish, gain(context, colour, .38), choir ? 'custom' : 'triangle', wave);
  double.detune.value = index % 2 === 0 ? -5 : 6;
  const vibrato = gain(context, voice.detune, choir ? 5.2 : 8.2);
  playOscillator((choir ? 3.7 : 4.2) + index * .29, start, finish, vibrato);
}

function makePianoNote(context, target, midi, start, strength, position, playOscillator) {
  const base = PITCH(midi);
  const stereo = pan(context, target, position);
  const partials = [[1, 1, 6.1], [2.0015, .27, 4.9], [3.006, .11, 3.3],
    [4.016, .055, 2.4], [5.034, .02, 1.3]];
  for (const [ratio, loudness, decay] of partials) {
    const envelope = gain(context, stereo, 0);
    envelope.gain.setValueAtTime(.00001, start);
    envelope.gain.exponentialRampToValueAtTime(strength * loudness, start + .016);
    envelope.gain.exponentialRampToValueAtTime(strength * loudness * .5, start + .33);
    envelope.gain.exponentialRampToValueAtTime(.00001, start + decay);
    playOscillator(base * ratio, start, start + decay + .03, envelope);
    if (ratio === 1) playOscillator(base * 1.0013, start + .01, start + decay + .03, gain(context, envelope, .23));
  }
}

function noiseBuffer(context) {
  const buffer = context.createBuffer(2, Math.round(context.sampleRate * 4), context.sampleRate);
  for (let c = 0; c < 2; c++) {
    const random = randomFrom(4736 + c * 719);
    const data = buffer.getChannelData(c);
    let smooth = 0;
    for (let i = 0; i < data.length; i++) {
      const white = random() * 2 - 1;
      smooth = smooth * .86 + white * .14;
      data[i] = .65 * smooth + .35 * white;
    }
    const edge = Math.min(280, data.length / 2);
    for (let i = 0; i < edge; i++) {
      const weight = i / edge;
      data[i] *= weight;
      data[data.length - i - 1] *= weight;
    }
  }
  return buffer;
}

const musicBeds = new Set(['chapel', 'piano', 'strings']);

export function makeBed(context, target, scene, tracks, start) {
  const sources = new Set();
  const stopAt = (node, end) => {
    try { node.stop(end); } catch { /* Already ended. */ }
  };
  function track(node) {
    sources.add(node);
    node.addEventListener('ended', () => sources.delete(node), { once: true });
    return node;
  }
  function playOscillator(frequency, when, end, to, type = 'sine', wave) {
    const node = track(context.createOscillator());
    if (wave) node.setPeriodicWave(wave);
    else node.type = type;
    node.frequency.setValueAtTime(frequency, when);
    node.connect(to);
    node.start(when);
    if (Number.isFinite(end)) node.stop(end);
    return node;
  }
  function playLoop(buffer, to, when) {
    const node = track(context.createBufferSource());
    node.buffer = buffer;
    node.loop = true;
    node.connect(to);
    node.start(when);
    return node;
  }
  function addNaturalFallback() {
    const buffer = noiseBuffer(context);
    if (scene === 'coast') {
      const surf = gain(context, target, .36);
      playLoop(buffer, filter(context, surf, 'lowpass', 770), start);
      playOscillator(.125, start, Infinity, gain(context, surf.gain, .23));
      playOscillator(.19, start, Infinity, gain(context, surf.gain, .055));
    } else if (scene === 'rain') {
      const patter = filter(context, gain(context, target, .68), 'highpass', 330);
      playLoop(buffer, filter(context, patter, 'lowpass', 3800), start);
    } else {
      const air = gain(context, target, .25);
      playLoop(buffer, filter(context, air, 'lowpass', 1300), start);
      playOscillator(.087, start, Infinity, gain(context, air.gain, .11));
    }
  }
  for (const { buffer, level } of tracks) playLoop(buffer, gain(context, target, level), start);
  if (!tracks.length && !musicBeds.has(scene)) addNaturalFallback();

  let sequence = 0;
  const spacing = scene === 'piano' ? 8.6 : 11.8;
  const random = randomFrom(scene === 'woodland' ? 259 : 654);

  return {
    schedule(horizon) {
      if (!musicBeds.has(scene) && (scene !== 'woodland' || tracks.length)) return;
      const earliest = context.currentTime;
      if (start + sequence * spacing < earliest - spacing) {
        sequence = Math.floor((earliest - start) / spacing);
      }
      while (start + sequence * spacing < horizon) {
        const chordTime = Math.max(earliest, start + sequence * spacing);
        const index = sequence % 4;
        if (scene === 'piano') {
          const arpeggio = [0, 1, 3, 2, 4];
          const delays = [.2, 1.25, 2.55, 4.5, 6.15];
          arpeggio.forEach((note, i) => makePianoNote(context, target, PIANO[index][note],
            chordTime + delays[i], [.284, .23, .213, .186, .14][i], (note - 2) * .17, playOscillator));
        } else if (scene === 'woodland') {
          for (let i = 0; i < 3; i++) {
            const when = chordTime + i * 2.3 + random();
            const tick = shaped(context, pan(context, target, random() - .5), when, .006, .009, 0, .085);
            playOscillator(310 + random() * 390, when, when + .1, tick, 'triangle');
          }
        } else {
          const chord = (scene === 'chapel' ? CHAPEL : STRINGS)[index];
          chord.forEach((midi, voice) => makeVoice(context, target, PITCH(midi), chordTime + voice * .1,
            spacing, voice, scene, playOscillator));
        }
        sequence++;
      }
    },
    stop(when) { for (const node of sources) stopAt(node, when); },
  };
}

