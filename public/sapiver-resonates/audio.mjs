const recordings = {
  chapel: [{ file: 'choir.mp3', level: 1, seam: 1.6 }],
  piano: [{ file: 'piano.mp3', level: 1, seam: 1.2 }],
  strings: [{ file: 'cello.mp3', level: 1, seam: 1.4 }],
  rain: [{ file: 'rain.mp3', level: .86, seam: .8 }],
  coast: [{ file: 'coast.mp3', level: .86, seam: .8 }],
  woodland: [{ file: 'forest.mp3', level: .74, seam: .8 }, { file: 'fire.mp3', level: .28, seam: .65 }],
};

const audioCache = new Map();
const fadeOutSeconds = 1.6;
let decoder;

function gain(context, target, level = 1) {
  const node = context.createGain();
  node.gain.value = level;
  node.connect(target);
  return node;
}

function loopBuffer(context, audio, seam) {
  const overlap = Math.min(Math.floor(audio.sampleRate * seam), Math.floor(audio.length / 6));
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

function loadTexture(context, track) {
  const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const audioContext = Offline ? (decoder ??= new Offline(2, 1, 32000)) : context;
  const key = audioContext.sampleRate + '/' + track.file;
  if (!audioCache.has(key)) {
    const url = new URL('./audio/' + track.file, import.meta.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    const promise = fetch(url, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Audio source unavailable.');
      return response.arrayBuffer();
    }).then(bytes => audioContext.decodeAudioData(bytes)).then(audio => {
      return loopBuffer(audioContext, audio, track.seam);
    }).catch(error => {
      audioCache.delete(key);
      throw error;
    }).finally(() => clearTimeout(timeout));
    audioCache.set(key, promise);
  }
  return audioCache.get(key);
}

export async function loadLayers(context, layers) {
  const wanted = Object.keys(layers).flatMap(scene => (recordings[scene] ?? []).map(track => ({ ...track, scene })));
  const results = await Promise.allSettled(wanted.map(async track => ({
    ...track, buffer: await loadTexture(context, track),
  })));
  const tracks = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  return { tracks, complete: tracks.length === wanted.length };
}

function makeReverb(context) {
  const seconds = 3.7;
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let seed = 2981 + channel * 743;
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const fade = (1 - i / length) ** 2.05;
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      smooth = smooth * .52 + (seed / 2147483648 - 1) * .48;
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
  const voices = new Map();
  let nextBell;
  let bellIndex = 0;
  const began = context.currentTime;
  const finish = began + length;
  const glue = compressor(context, -12, 9, 1.65, .015, .32);
  const limiter = compressor(context, -4.5, 1, 16, .002, .13);
  glue.connect(limiter);
  limiter.connect(context.destination);

  // Separate transport and level gains let the volume move during a fade.
  const transport = gain(context, glue, 0);
  const volume = gain(context, transport, 0);
  const dry = gain(context, volume, .94);
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
    set(wet.gain, next.space / 100 * .24);
    set(rhythm.frequency, next.rhythm === 'gamma' ? next.pulse : next.pace / 60);
    set(rhythmDepth.gain, next.rhythm === 'breath' ? .175 : next.rhythm === 'gamma' ? .043 : 0);
    set(left.frequency, next.pitch);
    set(right.frequency, next.pitch + next.beat);
    const level = .105 * (next.toneLevel / 100) ** 1.15;
    set(pure.gain, next.tone === 'pure' ? level : 0);
    set(binaural.gain, next.tone === 'binaural' ? level : 0);
    const weight = Math.sqrt(Math.max(1, Object.values(next.layers).reduce((sum, level) => sum + (level / 100) ** 2, 0)));
    for (const { track, channel } of voices.values()) {
      set(channel.gain, (next.layers[track.scene] ?? 0) / 100 * track.level / weight);
    }
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

  function schedule() {
    if (mix.bells === 'off') return;
    const interval = mix.bells === 'frequent' ? 11.5 : 24;
    const now = context.currentTime;
    if (nextBell === undefined || nextBell < now) nextBell = now + 3.5;
    // Schedule one bell at a time, so changes to the accent control are heard quickly.
    const limit = finite ? finish - fadeOutSeconds : now + 1;
    while (nextBell < limit) {
      bell(context, input, 110, nextBell, bellIndex++);
      nextBell += interval;
    }
  }

  apply(mix, true);
  return {
    setTracks(tracks) {
      const now = context.currentTime;
      const wanted = new Set(tracks.map(track => track.file));
      for (const [file, voice] of voices) {
        if (wanted.has(file)) continue;
        ease(voice.channel.gain, 0, now, .08);
        voice.node.stop(now + .5);
        voices.delete(file);
      }
      for (const track of tracks) {
        if (voices.has(track.file)) continue;
        const channel = gain(context, bedInput, 0);
        const node = context.createBufferSource();
        node.buffer = track.buffer;
        node.loop = true;
        node.connect(channel);
        node.addEventListener('ended', () => channel.disconnect(), { once: true });
        node.start(now);
        voices.set(track.file, { track, channel, node });
      }
      apply(mix);
      schedule();
    },
    apply,
    schedule,
    start: openFade,
    quiet(value) { ease(transport.gain, value ? 0 : 1, context.currentTime, .045); },
    ring() { bell(context, input, 110, context.currentTime + .03, bellIndex++); },
  };
}

