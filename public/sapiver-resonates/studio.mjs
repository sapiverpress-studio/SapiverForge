import { defaultLayerLevel, defaultMix, experiences, normaliseMix, sounds } from './catalog.mjs';
import { createEngine, loadLayers } from './audio.mjs';
import { recordingRequest, renderSample, sampleSeconds, startCheckout } from './recording.mjs';
import { credits } from './credits.mjs';

const get = id => document.getElementById(id);
const storageKey = 'sapiver-resonates.mix.v2';
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

let mix = readMix();
let listening = null;
let noticeTimer;
const layerControls = new Map();
const lastLevels = {};

function readMix() {
  try {
    const saved = localStorage.getItem(storageKey) ?? localStorage.getItem('sapiver-resonates.mix.v1');
    return normaliseMix(JSON.parse(saved) ?? defaultMix);
  } catch {
    return { ...defaultMix };
  }
}

function storeMix() {
  try { localStorage.setItem(storageKey, JSON.stringify(mix)); } catch { /* Private browsing may restrict storage. */ }
}

function showNotice(message) {
  const notice = get('notice');
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 4200);
}

function makeChoice({ name, detail, icon, hue }, group, key) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'choice' + (group === 'sound' ? ' sound-choice' : '');
  button.dataset[group] = key;
  button.setAttribute('aria-pressed', 'false');
  button.style.setProperty('--tile-hue', hue);
  const symbol = document.createElement('span');
  symbol.className = 'choice-icon';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = icon;
  const text = document.createElement('span');
  const title = document.createElement('strong');
  title.textContent = name;
  const subtitle = document.createElement('small');
  subtitle.textContent = detail;
  text.append(title, subtitle);
  button.append(symbol, text);
  return button;
}

function presetSettings(experience) {
  const { id, name, scene, ...settings } = experience;
  return { ...defaultMix, ...settings, layers: { [scene]: defaultLayerLevel } };
}

function chooseExperience(experience) {
  if (listening?.engine) listening.began = listening.context.currentTime;
  setMix({ ...presetSettings(experience), volume: mix.volume }, true);
}

function setLayer(id, level) {
  if (mix.layers[id]) lastLevels[id] = mix.layers[id];
  setMix({ layers: { ...mix.layers, [id]: level } });
}

function buildLayer(id, sound) {
  const card = document.createElement('div');
  card.className = 'sound-channel';
  const button = makeChoice(sound, 'sound', id);
  const indicator = document.createElement('span');
  indicator.className = 'layer-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  button.append(indicator);
  button.addEventListener('click', () => setLayer(id, mix.layers[id] ? 0 : lastLevels[id] ?? defaultLayerLevel));
  const levelRow = document.createElement('div');
  levelRow.className = 'layer-level';
  const label = document.createElement('label');
  label.htmlFor = 'level-' + id;
  label.className = 'sr-only';
  label.textContent = sound.name + ' level';
  const slider = document.createElement('input');
  slider.id = label.htmlFor;
  slider.type = 'range';
  slider.min = 0;
  slider.max = 100;
  slider.step = 1;
  slider.value = 0;
  slider.addEventListener('input', () => setLayer(id, Number(slider.value)));
  const output = document.createElement('output');
  output.setAttribute('for', slider.id);
  levelRow.append(label, slider, output);
  card.append(button, levelRow);
  layerControls.set(id, { card, button, indicator, slider, output });
  return card;
}

function buildChoices() {
  for (const experience of experiences) {
    const sound = sounds[experience.scene];
    const button = makeChoice({
      ...sound, name: experience.name, detail: (experience.duration / 60) + ' min · ' + sound.name,
    }, 'experience', experience.id);
    button.addEventListener('click', () => chooseExperience(experience));
    get('experiences').append(button);
  }
  for (const [id, sound] of Object.entries(sounds)) {
    get('sounds').append(buildLayer(id, sound));
  }
}

function showCredits() {
  const intro = document.createElement('p');
  intro.textContent = 'Recorded performances and field recordings. Excerpts have been edited, level-balanced and looped for this studio.';
  const list = document.createElement('ul');
  for (const source of credits) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.textContent = source.name;
    item.append(link, ' · ' + source.author + ' · ');
    if (source.terms) {
      const terms = document.createElement('a');
      terms.href = source.terms;
      terms.textContent = source.licence;
      item.append(terms);
    } else item.append(source.licence);
    list.append(item);
  }
  get('credits').append(intro, list);
}

function showOrb() {
  let label = 'Listening mode';
  let value = 'Still';
  let unit = 'Sound only';
  if (mix.rhythm === 'breath') {
    label = 'Breathing pace';
    value = mix.pace.toFixed(1);
    unit = 'breaths/min';
  } else if (mix.tone === 'binaural') {
    label = 'Binaural beat';
    value = String(mix.beat);
    unit = 'Hz difference';
  } else if (mix.tone === 'pure') {
    label = 'Tone pitch';
    value = String(mix.pitch);
    unit = 'Hz';
  } else if (mix.rhythm === 'gamma') {
    label = 'Pulse frequency';
    value = String(mix.pulse);
    unit = 'Hz';
  }
  get('orbLabel').textContent = label;
  get('orbValue').textContent = value;
  get('orbUnit').textContent = unit;
}

function showMix(refreshPitch = false) {
  for (const [key, value] of Object.entries(mix)) {
    const control = get(key);
    if (control && control.value !== String(value)) control.value = value;
  }
  const pitchNumber = get('pitchNumber');
  if (refreshPitch || document.activeElement !== pitchNumber) pitchNumber.value = mix.pitch;
  get('pitchValue').textContent = mix.pitch + ' Hz';
  get('applyPitch').textContent = mix.tone === 'off' ? 'Add tone' : 'Apply Hz';
  get('turnToneOff').hidden = mix.tone === 'off';
  get('volumeValue').textContent = mix.volume + '%';
  get('spaceValue').textContent = mix.space + '%';
  get('toneLevelValue').textContent = mix.toneLevel + '%';
  get('paceValue').textContent = mix.pace.toFixed(1) + ' breaths/min';
  get('paceHint').textContent = (mix.pace / 60).toFixed(3) + ' Hz · One gentle swell every ' + (60 / mix.pace).toFixed(1) + ' seconds';
  get('pulseValue').textContent = mix.pulse + ' Hz';
  get('beatValue').textContent = mix.beat.toFixed(1) + ' Hz';
  get('headphoneTip').textContent = 'Use stereo headphones · Left ' + mix.pitch + ' Hz · Right ' + (mix.pitch + mix.beat).toFixed(1).replace(/\.0$/, '') + ' Hz';
  get('breathSettings').hidden = mix.rhythm !== 'breath';
  get('gammaSettings').hidden = mix.rhythm !== 'gamma';
  get('toneSettings').hidden = mix.tone === 'off';
  get('beatSettings').hidden = mix.tone !== 'binaural';
  const active = Object.keys(mix.layers);
  const sound = active.length === 1 ? sounds[active[0]] : null;
  get('sceneTitle').textContent = sound?.name ?? (active.length ? 'Your mix' : 'Blank mix');
  get('sceneDetail').textContent = sound?.description ?? (active.length
    ? active.map(id => sounds[id].name).join(' + ')
    : mix.tone === 'off' ? 'Add a sound or set a frequency' : mix.pitch + ' Hz tone');
  get('canvasWrap').style.setProperty('--hue', sound?.hue ?? 82);
  for (const [id, controls] of layerControls) {
    const level = mix.layers[id] ?? 0;
    const selected = level > 0;
    controls.card.classList.toggle('on', selected);
    controls.button.setAttribute('aria-pressed', String(selected));
    controls.indicator.textContent = selected ? '✓' : '+';
    controls.slider.value = level;
    controls.output.textContent = level + '%';
  }
  for (const [i, button] of Array.from(get('experiences').children).entries()) {
    const { layers, volume, ...settings } = presetSettings(experiences[i]);
    const matches = Object.entries(settings).every(([key, value]) => mix[key] === value)
      && Object.keys(sounds).every(id => layers[id] === mix.layers[id]);
    button.setAttribute('aria-pressed', String(matches));
  }
  showOrb();
  if (reducedMotion.matches) drawOrb(0);
}

function setMix(changes, refreshPitch = false) {
  const previous = mix;
  mix = normaliseMix({ ...mix, ...changes });
  storeMix();
  showMix(refreshPitch);
  if (listening) {
    listening.engine.apply(mix);
    if (Object.keys(previous.layers).join(' ') !== Object.keys(mix.layers).join(' ')) void syncTracks(listening);
  }
  updateClock();
}

function showTransport() {
  const phase = listening?.phase ?? 'ready';
  const labels = {
    ready: ['Ready to listen', 'Begin listening', '▶'],
    loading: ['Loading sound', 'Loading sound…', '…'],
    playing: ['Now playing', 'Pause listening', 'Ⅱ'],
    pausing: ['Pausing', 'Pausing…', 'Ⅱ'],
    paused: ['Paused', 'Resume listening', '▶'],
    resuming: ['Resuming', 'Resuming…', '▶'],
  };
  const [status, action, icon] = labels[phase];
  get('player').dataset.state = phase;
  get('playState').textContent = status;
  get('playLabel').textContent = action;
  get('playIcon').textContent = icon;
  get('play').disabled = ['loading', 'pausing', 'resuming'].includes(phase);
  get('mixPlay').textContent = phase === 'ready' ? 'Play mix' : action;
  get('mixPlay').disabled = get('play').disabled;
  get('stop').disabled = !listening;
  get('bell').disabled = phase !== 'playing';
}

function updateClock() {
  const elapsed = listening?.began == null ? 0 : listening.context.currentTime - listening.began;
  const limit = mix.duration;
  const remaining = limit ? Math.max(0, limit - elapsed) : elapsed;
  const total = limit ? Math.ceil(remaining) : Math.floor(remaining);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  get('timer').textContent = !listening && !limit ? 'No time limit' : minutes + ':' + seconds;
  get('timer').setAttribute('aria-label', limit ? total + ' seconds remaining' : total + ' seconds elapsed');
  if (listening?.phase === 'playing' && limit && elapsed >= limit) {
    stopListening();
    showNotice('Your session has ended.');
  }
}

function hasAudio() {
  return Object.keys(mix.layers).length > 0 || (mix.tone !== 'off' && mix.toneLevel > 0);
}

async function syncTracks(session) {
  const revision = ++session.revision;
  try {
    const [, result] = await Promise.all([session.ready, loadLayers(session.context, mix.layers)]);
    if (listening !== session || revision !== session.revision) return;
    session.engine.apply(mix);
    session.engine.setTracks(result.tracks);
    if (session.phase === 'loading') {
      if (!result.tracks.length && (mix.tone === 'off' || !mix.toneLevel)) {
        stopListening();
        showNotice(result.complete ? 'Add a sound or set a frequency to play your mix.' : 'The selected sound could not load. Try playing it again.');
        return;
      }
      session.phase = 'playing';
      session.began = session.context.currentTime;
      session.engine.start();
      showTransport();
      updateClock();
    }
    if (!result.complete) showNotice('A recording could not load. Playing the available sound layers.');
  } catch (error) {
    if (listening !== session || revision !== session.revision) return;
    console.error(error);
    stopListening();
    showNotice('Audio could not start. Tap Begin listening to try again.');
  }
}

function startListening() {
  if (!hasAudio()) {
    showNotice('Add a sound or set a frequency to play your mix.');
    return;
  }
  if (!AudioContextClass) {
    showNotice('Your browser cannot play Web Audio. Try a current version of Chrome, Firefox or Safari.');
    return;
  }
  let context;
  try {
    context = new AudioContextClass();
    const engine = createEngine(context, mix);
    const session = { context, engine, phase: 'loading', ready: context.resume(), revision: 0, began: null, timer: null };
    listening = session;
    session.timer = setInterval(() => {
      if (session.phase === 'playing') session.engine.schedule();
      updateClock();
    }, 300);
    context.addEventListener('statechange', () => {
      if (listening === session && session.phase === 'playing' && context.state === 'interrupted') {
        session.phase = 'paused';
        showTransport();
      }
    });
    showTransport();
    void syncTracks(session);
  } catch (error) {
    console.error(error);
    if (context) void context.close().catch(() => {});
    showNotice('Audio could not start.');
  }
}

async function toggleListening() {
  const session = listening;
  if (!session) {
    startListening();
    return;
  }
  if (session.phase !== 'playing' && session.phase !== 'paused') return;
  const pausing = session.phase === 'playing';
  session.phase = pausing ? 'pausing' : 'resuming';
  showTransport();
  try {
    if (pausing) {
      session.engine.quiet(true);
      await sleep(215);
      if (listening !== session) return;
      await session.context.suspend();
    } else {
      await session.context.resume();
      if (listening !== session) return;
      session.engine.quiet(false);
    }
    if (listening === session) {
      session.phase = pausing ? 'paused' : 'playing';
      showTransport();
      updateClock();
    }
  } catch (error) {
    if (listening !== session) return;
    console.error(error);
    stopListening();
    showNotice('Playback was interrupted. Tap Begin listening to restart.');
  }
}

function stopListening() {
  const session = listening;
  if (!session) return;
  listening = null;
  clearInterval(session.timer);
  const running = session.context.state === 'running';
  if (running) session.engine.quiet(true);
  setTimeout(() => void session.context.close().catch(() => {}), running ? 255 : 0);
  showTransport();
  updateClock();
}

async function download() {
  const button = get('download');
  const status = get('exportStatus');
  const chosen = { ...mix };
  if (!hasAudio()) {
    status.textContent = 'Add a sound or set a frequency first.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Rendering your stereo sample…';
  try {
    const blob = await renderSample(chosen);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const layers = Object.keys(chosen.layers);
    const name = layers.length === 1 ? layers[0] : layers.length ? 'mix' : 'tone';
    link.download = 'sapiver-resonates-' + name + '-' + sampleSeconds + 's.wav';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    status.textContent = 'Your sample is ready.';
  } catch (error) {
    console.error(error);
    status.textContent = 'The sample could not be saved. Try again.';
  } finally {
    button.disabled = false;
  }
}

function connectRecordingControls() {
  get('download').addEventListener('click', download);
  if (typeof startCheckout !== 'function') return;
  const purchase = get('purchase');
  purchase.hidden = false;
  purchase.addEventListener('click', async () => {
    purchase.disabled = true;
    try {
      await startCheckout(recordingRequest(mix));
    } catch (error) {
      console.error(error);
      showNotice('Checkout could not start.');
    } finally {
      purchase.disabled = false;
    }
  });
}

const canvas = get('visualizer');
const area = get('canvasWrap');
const drawing = canvas.getContext('2d');
let width = 1;
let height = 1;

function resizeOrb() {
  const box = area.getBoundingClientRect();
  width = box.width;
  height = box.height;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  drawing?.setTransform(scale, 0, 0, scale, 0, 0);
  drawOrb(0);
}

function drawOrb(time) {
  if (!drawing) return;
  const cx = width / 2;
  const cy = height / 2;
  const seconds = time / 1000;
  const layers = Object.keys(mix.layers);
  const hue = layers.length === 1 ? sounds[layers[0]].hue : 82;
  const active = listening?.phase === 'playing';
  const animated = !reducedMotion.matches;
  const phase = animated && active && mix.rhythm === 'breath'
    ? Math.sin(2 * Math.PI * listening.context.currentTime * mix.pace / 60) : 0;
  get('orb').style.transform = 'scale(' + (1 + phase * .043) + ')';
  drawing.clearRect(0, 0, width, height);
  const radius = Math.max(1, Math.min(width, height) * .49);
  const glow = drawing.createRadialGradient(cx, cy, radius * .05, cx, cy, radius);
  glow.addColorStop(0, 'hsla(' + hue + ',55%,65%,.14)');
  glow.addColorStop(1, 'hsla(' + hue + ',55%,65%,0)');
  drawing.fillStyle = glow;
  drawing.fillRect(0, 0, width, height);
  for (let ring = 0; ring < 4; ring++) {
    const r = radius * (.69 + ring * .10);
    drawing.beginPath();
    for (let i = 0; i <= 96; i++) {
      const angle = i / 96 * Math.PI * 2;
      const wave = Math.sin(angle * 4 + ring * .8 + seconds * .19) * (2 + ring);
      const ellipse = (r + wave) * (1 + phase * .028);
      const x = cx + Math.cos(angle) * ellipse * 1.29;
      const y = cy + Math.sin(angle) * ellipse * .93;
      if (i === 0) drawing.moveTo(x, y);
      else drawing.lineTo(x, y);
    }
    drawing.strokeStyle = 'hsla(' + hue + ',44%,76%,' + (.22 - ring * .036) + ')';
    drawing.lineWidth = 1;
    drawing.stroke();
  }
}

function animateOrb(time) {
  if (!reducedMotion.matches) drawOrb(time);
  requestAnimationFrame(animateOrb);
}

buildChoices();
showCredits();
for (const key of ['volume', 'space', 'pace', 'pulse', 'pitch', 'beat', 'toneLevel']) {
  get(key).addEventListener('input', event => setMix({ [key]: Number(event.currentTarget.value) }));
}
for (const key of ['rhythm', 'tone', 'bells']) {
  get(key).addEventListener('change', event => setMix({ [key]: event.currentTarget.value }));
}
get('duration').addEventListener('change', event => setMix({ duration: Number(event.currentTarget.value) }));
get('pitchNumber').addEventListener('change', event => {
  const input = event.currentTarget;
  if (input.validity.valid) setMix({ pitch: input.valueAsNumber });
});
get('manualHz').addEventListener('submit', event => {
  event.preventDefault();
  const input = get('pitchNumber');
  if (!input.reportValidity()) return;
  setMix({ pitch: input.valueAsNumber, tone: mix.tone === 'off' ? 'pure' : mix.tone, toneLevel: mix.toneLevel || defaultMix.toneLevel }, true);
  if (!listening || listening.phase === 'paused') void toggleListening();
});
get('turnToneOff').addEventListener('click', () => setMix({ tone: 'off' }));
get('clearMix').addEventListener('click', () => {
  stopListening();
  setMix({ layers: {}, tone: 'off', rhythm: 'off', bells: 'off' });
});
get('play').addEventListener('click', toggleListening);
get('mixPlay').addEventListener('click', toggleListening);
get('stop').addEventListener('click', stopListening);
get('bell').addEventListener('click', () => listening?.engine.ring());
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateClock(); });
window.addEventListener('pagehide', stopListening);
connectRecordingControls();
showMix();
showTransport();
updateClock();
if (window.ResizeObserver) new ResizeObserver(resizeOrb).observe(area);
else window.addEventListener('resize', resizeOrb);
resizeOrb();
requestAnimationFrame(animateOrb);

