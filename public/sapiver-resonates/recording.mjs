import { normaliseMix } from './catalog.mjs';
import { createEngine, loadLayers } from './audio.mjs';
import { credits } from './credits.mjs';

export const sampleSeconds = 30;

// Set to an async function accepting a recording request when checkout is connected.
export const startCheckout = null;

export function recordingRequest(mix, preview = false) {
  const settings = normaliseMix(mix);
  return {
    version: 2,
    settings,
    seconds: preview ? sampleSeconds : settings.duration || 1200,
    format: preview ? 'wav' : 'mp3',
  };
}

export function encodeWav(buffer, comment = '') {
  const channels = 2;
  const bytes = buffer.length * channels * 2;
  const attribution = comment ? new TextEncoder().encode(comment + '\0') : null;
  const infoLength = attribution ? 12 + attribution.length + attribution.length % 2 : 0;
  const file = new ArrayBuffer(44 + bytes + (infoLength ? 8 + infoLength : 0));
  const view = new DataView(file);
  const write = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  write(0, 'RIFF');
  view.setUint32(4, file.byteLength - 8, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, bytes, true);

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  for (let i = 0, offset = 44; i < buffer.length; i++, offset += 4) {
    view.setInt16(offset, pcm(left[i]), true);
    view.setInt16(offset + 2, pcm(right[i]), true);
  }
  if (attribution) {
    const offset = 44 + bytes;
    write(offset, 'LIST');
    view.setUint32(offset + 4, infoLength, true);
    write(offset + 8, 'INFO');
    write(offset + 12, 'ICMT');
    view.setUint32(offset + 16, attribution.length, true);
    new Uint8Array(file, offset + 20, attribution.length).set(attribution);
  }
  return new Blob([file], { type: 'audio/wav' });
}

function pcm(sample) {
  const safe = Math.max(-1, Math.min(1, sample));
  return Math.round(safe * (safe < 0 ? 32768 : 32767));
}

export async function renderSample(mix) {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Offline) throw new Error('Your browser cannot render audio downloads.');
  const request = recordingRequest(mix, true);
  const rate = 44100;
  const context = new Offline(2, rate * request.seconds, rate);
  const { tracks, complete } = await loadLayers(context, request.settings.layers);
  if (!complete) throw new Error('A selected recording could not load.');
  const engine = createEngine(context, request.settings, request.seconds);
  engine.setTracks(tracks);
  engine.start();
  const buffer = await context.startRendering();
  const attribution = credits.filter(source => source.scenes.some(scene => request.settings.layers[scene]))
    .map(source => [source.name + ' by ' + source.author, source.url, source.licence, source.terms]
      .filter(Boolean).join(' | '));
  const comment = attribution.length ? 'Edited and looped by Sapiver Resonates. ' + attribution.join(' / ') : '';
  return encodeWav(buffer, comment);
}

