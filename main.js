import { Renderer } from './gl/renderer.js';
import { OrbitCamera } from './gl/camera.js';
import { MODES } from './gl/geometry.js';
import { AudioEngine } from './audio/audio-engine.js';
import { CONTROLS, buildControls } from './ui.js';

const $ = id => document.getElementById(id);
const statusEl = $('status'), btn = $('audioBtn'), modeSel = $('mode');
const setStatus = t => { statusEl.textContent = t; };

let renderer;
try { renderer = new Renderer($('glCanvas')); } catch (e) { setStatus(e.message); throw e; }
const camera = new OrbitCamera($('glCanvas'));
const audio = new AudioEngine();
let geo;

function setMode(key) { geo = MODES[key].build(audio.bins); renderer.setGeometry(geo); }

const settings = buildControls($('panel'), CONTROLS, (key, v) => {
  if (['bass', 'mid', 'treble'].includes(key)) audio.setEQ(key, v);
  else if (key === 'volume') audio.setVolume(v);
  else if (key === 'smooth') audio.setSmoothing(v / 100);
  else if (key === 'autoRotate') camera.autoRotate = v;
});
audio.setVolume(settings.volume); audio.setSmoothing(settings.smooth / 100);

for (const [k, m] of Object.entries(MODES)) modeSel.append(new Option(m.label, k));
modeSel.onchange = () => setMode(modeSel.value);
setMode(modeSel.value);

btn.onclick = async () => {
  try {
    const running = await audio.toggle();
    btn.textContent = running ? '⏸ Pause' : '▶ Resume';
    setStatus(running ? '▶ ' + audio.name : '⏸ Gepauzeerd');
  } catch (e) { setStatus('Audio-fout: ' + e.message); }
};

async function openFile(file) {
  if (!file) return;
  setStatus('Laden…');
  try { await audio.loadFile(file); btn.textContent = '⏸ Pause'; setStatus('🎵 ' + file.name); }
  catch { setStatus('Kon dit bestand niet decoderen'); }
}
$('fileInput').onchange = e => openFile(e.target.files[0]);
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => { e.preventDefault(); openFile(e.dataTransfer.files[0]); });

// Eén tijdlijn per doel: de kleur-slider verandert niet meer de cameratijd (gaf sprongen).
let last = performance.now(), colorTime = 0, amp = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000, .1); last = now;
  colorTime += dt * settings.colorSpd / 100;
  camera.speed = settings.camSpd / 100; camera.update(dt);

  if (audio.playing) {
    audio.sample();
    let sum = 0; for (let i = 0; i < audio.bins; i++) sum += audio.freq[i];
    amp = amp * .9 + (sum / audio.bins / 255) * .1;
    geo.update(audio);
  }

  renderer.render(geo, {
    viewProj: camera.viewProj(renderer.aspect), eye: camera.eye(), time: colorTime, amp,
    light: settings.light, lightInt: settings.lightInt / 100, spec: settings.spec / 100, glow: settings.bloom,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
