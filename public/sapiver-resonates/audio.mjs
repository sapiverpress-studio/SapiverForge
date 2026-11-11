import { sounds } from './catalog.mjs';
import { gain, makeBed, randomFrom } from './soundscapes.mjs';

const sources = {
  rain: [{ file: 'rain.mp3', level: 0.86 }],
  coast: [{ file: 'coast.mp3', level: 0.93 }],
  woodland: [{ file: 'forest.mp3', level: 0.67 }, { file: 'fire.mp3', level: 0.26 }],
};

const encoded = new Map();
const decoded = new Map();
const fadeOutSeconds = 1.6;
const scheduleLead = 28;

function loopBuffer(context, audio) {
  const overlap = Math.min(Math.floor(audio.sampleRate * 0.8), Math.floor(audio.length / 6));
  const length = audio.length - overlap;
  const buffer = context.createBuffer(audio.numberOfChannels, length, audio.sampleRate);
  for (let channel = 0; channel < audio.numberOfChannels; channel++) {
    const input = audio.getChannelData(channel);
    const output = buffer.getChannelData(channel);
    output.set(input.subarray(0, length));
    for (let i = 0; i < overlap; i++) {
      const weight = (1 - Math.cos(Math.PI * i / overlap)) / 2;
      output[i] = input[length + i] * (1 - weight) + input[i] * weight;
    }
  }
  return buffer;
}

async function loadTexture(context, file) {
  const key = context.sampleRate + '/' + file;
  if (!encoded.has(file)) {
    const url = new URL('./audio/' + file, import.meta.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const data = fetch(url, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Audio source unavailable.');
      return response.arrayBuffer();
    }).catch(error => {
      encoded.delete(file);
      throw error;
    }).finally(() => clearTimeout(timeout));
    encoded.set(file, data);
  }
  if (!decoded.has(key)) {
    const data = await encoded.get(file);
    // Decoding consumes its ArrayBuffer. Retain the original bytes for offline renders.
    if (!decoded.has(key)) {
      const audio = context.decodeAudioData(data.slice(0)).then(buffer => loopBuffer(context, buffer)).catch(error => {
        decoded.delete(key);
        throw error;
      });
      decoded.set(key, audio);
    }
  }
  return decoded.get(key);
}

export async function loadSound(context, scene) {
  const list = sources[scene] ?? [];
  const results = await Promise.allSettled(list.map(async ({ file, level }) => ({
    buffer: await loadTexture(context, file), level,
  })));
  const tracks = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  return { tracks, complete: tracks.length === list.length };
}

function makeReverb(context) {
  const seconds = 3.7;
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    const random = randomFrom(2981 + channel * 743);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const fade = (1 - i / length) ** 2.05;
      smooth = smooth * .52 + (random() * 2 - 1) * .48;
      data[i] = smooth * fade * Math.min(i / 600, 1);
    }
  }
  const convolution = context.createConvolver();
  convolution.buffer = buffer;
  return convolution;
}

function compressor(context, threshold, knee, ratio, attack, release) {
  const node = context.createDynamicsCompressor();
  node.threshold.value = threshold;
  node.knee.value = knee;
  node.ratio.value = ratio;
  node.attack.value = attack;
  node.release.value = release;
  return node;
}

function oscillator(context, target, frequency, when) {
  const node = context.createOscillator();
  node.frequency.value = frequency;
  if (target) node.connect(target);
  node.start(when);
  return node;
}

function bell(context, target, pitch, when, index) {
  const notes = [1.5, 2, 2.25, 3];
  const frequency = pitch * notes[index % notes.length] * 2;
  const stereo = context.createStereoPanner();
  stereo.pan.value = index % 2 ? .33 : -.33;
  stereo.connect(target);
  for (const [ratio, level, decay] of [[1, .057, 4.1], [2.005, .013, 2.5], [2.996, .005, 1.4]]) {
    const body = gain(context, stereo, 0);
    body.gain.setValueAtTime(.00001, when);
    body.gain.exponentialRampToValueAtTime(level, when + .028);
    body.gain.exponentialRampToValueAtTime(.00001, when + decay);
    oscillator(context, body, frequency * ratio, when).stop(when + decay + .04);
  }
}

function ease(parameter, value, now, speed = .05) {
  parameter.cancelScheduledValues(now);
  parameter.setTargetAtTime(value, now, speed);
}

export function createEngine(context, settings, length = Infinity) {
  const finite = Number.isFinite(length);
  let mix = settings;
  let bed;
  let bedGain;
  let nextBell;
  let bellIndex = 0;
  const began = context.currentTime;
  const finish = began + length;
  const glue = compressor(context, -17, 15, 2.1, .015, .32);
  const limiter = compressor(context, -4.5, 1, 16, .002, .13);
  glue.connect(limiter);
  limiter.connect(context.destination);

  // Separate transport and level gains let the volume move during a fade.
  const transport = gain(context, glue, 0);
  const volume = gain(context, transport, 0);
  const dry = gain(context, volume, .88);
  const reverb = makeReverb(context);
  const wet = gain(context, volume, 0);
  reverb.connect(wet);
  const input = context.createGain();
  input.connect(dry);
  input.connect(reverb);

  const bedInput = gain(context, input, 1);
  const rhythmDepth = gain(context, bedInput.gain, 0);
  const rhythm = oscillator(context, rhythmDepth, mix.pace / 60, began);

  const pure = gain(context, volume, 0);
  const stereo = context.createChannelMerger(2);
  const binaural = gain(context, volume, 0);
  stereo.connect(binaural);
  const left = oscillator(context, pure, mix.pitch, began);
  const right = oscillator(context, null, mix.pitch + mix.beat, began);
  left.connect(stereo, 0, 0);
  right.connect(stereo, 0, 1);

  function apply(next, initial = false) {
    const now = context.currentTime;
    const set = (parameter, value) => initial ? parameter.setValueAtTime(value, now) : ease(parameter, value, now);
    set(volume.gain, next.volume ? 1.46 * (next.volume / 100) ** 1.23 : 0);
    set(wet.gain, (.1 + next.space / 100 * .43) * sounds[next.scene].reverb);
    set(rhythm.frequency, next.rhythm === 'gamma' ? next.pulse : next.pace / 60);
    set(rhythmDepth.gain, next.rhythm === 'breath' ? .175 : next.rhythm === 'gamma' ? .043 : 0);
    set(left.frequency, next.pitch);
    set(right.frequency, next.pitch + next.beat);
    const level = .105 * (next.toneLevel / 100) ** 1.15;
    set(pure.gain, next.tone === 'pure' ? level : 0);
    set(binaural.gain, next.tone === 'binaural' ? level : 0);
    if (mix.bells !== next.bells) nextBell = undefined;
    mix = next;
  }

  function openFade() {
    const now = context.currentTime;
    transport.gain.cancelScheduledValues(now);
    transport.gain.setValueAtTime(0, now);
    transport.gain.linearRampToValueAtTime(1, now + .85);
    if (finite) {
      transport.gain.setValueAtTime(1, finish - fadeOutSeconds);
      transport.gain.linearRampToValueAtTime(0, finish);
    }
  }

  function schedule(horizon = context.currentTime + scheduleLead) {
    if (!bed) return;
    bed.schedule(Math.min(horizon, finish));
    if (mix.bells === 'off') return;
    const interval = mix.bells === 'frequent' ? 11.5 : 24;
    const now = context.currentTime;
    if (nextBell === undefined || nextBell < now) nextBell = now + 3.5;
    // Schedule one bell at a time, so changes to the accent control are heard quickly.
    const limit = finite ? finish - fadeOutSeconds : now + 1;
    while (nextBell < limit) {
      bell(context, input, sounds[mix.scene].pitch ?? 110, nextBell, bellIndex++);
      nextBell += interval;
    }
  }

  apply(mix, true);
  return {
    selectScene(scene, tracks) {
      const now = context.currentTime;
      if (bed) {
        ease(bedGain.gain, 0, now, .115);
        bed.stop(now + .75);
        const oldGain = bedGain;
        setTimeout(() => oldGain.disconnect(), 1000);
      }
      bedGain = gain(context, bedInput, 0);
      bedGain.gain.setValueAtTime(0, now);
      bedGain.gain.linearRampToValueAtTime(1, now + .72);
      bed = makeBed(context, bedGain, scene, tracks, now);
      schedule(finite ? finish : undefined);
    },
    apply,
    schedule,
    start: openFade,
    quiet(value) { ease(transport.gain, value ? 0 : 1, context.currentTime, .045); },
    ring() { bell(context, input, sounds[mix.scene].pitch ?? 110, context.currentTime + .03, bellIndex++); },
  };
}

