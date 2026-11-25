// Alle Web Audio-logica op één plek. Keten: bron -> EQ -> master -> analyser -> speakers
export class AudioEngine {
  constructor() {
    this.fftSize = 1024; this.bins = this.fftSize / 2;
    this.freq = new Uint8Array(this.bins); this.wave = new Uint8Array(this.fftSize);
    this.ctx = null; this.stopFn = null; this.name = '';
    this.eqPct = { bass: 100, mid: 100, treble: 100 }; this.volume = .5; this.smoothing = .8;
  }

  #init() {
    if (this.ctx) return;
    const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const mk = (type, f) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; return n; };
    this.eq = { bass: mk('lowshelf', 200), mid: mk('peaking', 1000), treble: mk('highshelf', 3000) };
    this.master = c.createGain();
    this.analyser = c.createAnalyser();
    this.eq.bass.connect(this.eq.mid).connect(this.eq.treble).connect(this.master).connect(this.analyser).connect(c.destination);
    for (const k in this.eqPct) this.setEQ(k, this.eqPct[k]);
    this.setVolume(this.volume * 100); this.setSmoothing(this.smoothing);
    this.analyser.fftSize = this.fftSize;
  }

  setEQ(band, pct) { this.eqPct[band] = pct; if (this.ctx) this.eq[band].gain.value = (pct - 100) * .3; } // ±30 dB
  setVolume(pct) { this.volume = pct / 100; if (this.ctx) this.master.gain.value = this.volume; }
  setSmoothing(v) { this.smoothing = v; if (this.ctx) this.analyser.smoothingTimeConstant = v; }

  get playing() { return !!this.stopFn && this.ctx?.state === 'running'; }
  get hasSource() { return !!this.stopFn; }

  #stop() { this.stopFn?.(); this.stopFn = null; }

  async startDemo() { // pentatonische demo-toon met zachte glides i.p.v. willekeurige sprongen
    this.#init(); this.#stop();
    const c = this.ctx, g = c.createGain(), osc = c.createOscillator(), sub = c.createOscillator();
    osc.type = 'triangle'; sub.type = 'sine'; g.gain.value = .6;
    osc.connect(g); sub.connect(g); g.connect(this.eq.bass);
    const scale = [110, 130.81, 146.83, 164.81, 196, 220, 261.63, 329.63, 392];
    const step = () => { const f = scale[Math.floor(Math.random() * scale.length)];
      osc.frequency.setTargetAtTime(f, c.currentTime, .1); sub.frequency.setTargetAtTime(f / 2, c.currentTime, .1); };
    step(); osc.start(); sub.start();
    const timer = setInterval(step, 1200);
    this.stopFn = () => { clearInterval(timer); osc.stop(); sub.stop(); g.disconnect(); };
    this.name = 'Demo-toon';
    await c.resume();
  }

  async loadFile(file) {
    this.#init();
    const buffer = await this.ctx.decodeAudioData(await file.arrayBuffer());
    this.#stop();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer; src.loop = true; src.connect(this.eq.bass); src.start();
    this.stopFn = () => { src.stop(); src.disconnect(); };
    this.name = file.name;
    await this.ctx.resume();
  }

  async toggle() { // echte pauze via AudioContext.suspend (bestand loopt dus niet door)
    if (!this.hasSource) { await this.startDemo(); return true; }
    if (this.ctx.state === 'running') { await this.ctx.suspend(); return false; }
    await this.ctx.resume(); return true;
  }

  sample() { this.analyser.getByteFrequencyData(this.freq); this.analyser.getByteTimeDomainData(this.wave); }
}
