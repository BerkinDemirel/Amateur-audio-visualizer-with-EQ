// Elke visualisatie = { label, build(bins) } en geeft een mesh terug met een update(audio)-functie.
const TAU = Math.PI * 2;
const hue = h => [Math.sin(h * TAU) * .5 + .5, Math.sin(h * TAU + 2.094) * .5 + .5, Math.sin(h * TAU + 4.189) * .5 + .5];

function pack(pos, col, nor, tex, idx, primitive) {
  return { pos: new Float32Array(pos), col: new Float32Array(col), norm: new Float32Array(nor), tex: new Float32Array(tex),
    idx: idx ? new Uint16Array(idx) : null, primitive, count: pos.length / 3, update() {} };
}

// Logaritmische banden: laag = weinig bins, hoog = veel bins (zoals het oor werkt).
function edgesFor(n, bins) {
  const e = [];
  for (let i = 0; i <= n; i++) e.push(Math.round(Math.pow(bins, i / n)));
  for (let i = 1; i <= n; i++) if (e[i] <= e[i - 1]) e[i] = e[i - 1] + 1;
  return e;
}
const level = (f, a, b) => { let m = 0; for (let i = a; i < Math.min(b, f.length); i++) m = Math.max(m, f[i]); return m / 255; };

// [normaal, hoeken als [x-kant, y-onder/boven, z-kant]]
const FACES = [
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
];

function bars(bins) {
  const N = 64, e = edgesFor(N, bins), hw = 2 / N * .8, hd = .08;
  const pos = [], col = [], nor = [], tex = [], idx = [], top = [];
  for (let i = 0; i < N; i++) {
    const cx = (i + .5) / N * 4 - 2, c = hue(i / N);
    for (const f of FACES) {
      const b = pos.length / 3;
      for (const [sx, sy, sz] of f.c) {
        pos.push(cx + (sx ? hw : -hw), 0, sz ? hd : -hd);
        top.push(sy); col.push(...c); nor.push(...f.n); tex.push(i / N, sy);
      }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }
  const g = pack(pos, col, nor, tex, idx, 'triangles'), h = new Float32Array(N);
  g.update = ({ freq }) => {
    for (let i = 0; i < N; i++) h[i] = level(freq, e[i], e[i + 1]) * 2;
    for (let v = 0; v < top.length; v++) g.pos[v * 3 + 1] = top[v] * h[(v / 20) | 0]; // 20 vertices per bar
  };
  return g;
}

function lineMesh(N, fill) {
  return bins => {
    const pos = [], col = [], nor = [], tex = [];
    for (let i = 0; i < N; i++) { const p = fill.pos(i, N); pos.push(...p); col.push(...fill.col(i, N)); nor.push(...(fill.nor ? fill.nor(i, N) : [0, 1, 0])); tex.push(i / N, 0); }
    const g = pack(pos, col, nor, tex, null, fill.primitive), e = edgesFor(N, bins);
    g.update = a => fill.update(g, a, e, N);
    return g;
  };
}

const spectrum = lineMesh(128, {
  primitive: 'strip', pos: (i, N) => [i / N * 4 - 2, 0, 0], col: (i, N) => hue(i / N),
  update: (g, { freq }, e, N) => { for (let i = 0; i < N; i++) g.pos[i * 3 + 1] = level(freq, e[i], e[i + 1]) * 2; },
});

const waveform = lineMesh(128, {
  primitive: 'strip', pos: (i, N) => [i / N * 4 - 2, 0, 0], col: (i, N) => hue(i / N),
  update: (g, { wave }, e, N) => { const s = Math.floor(wave.length / N); for (let i = 0; i < N; i++) g.pos[i * 3 + 1] = (wave[i * s] / 128 - 1) * 1.5; },
});

const circular = lineMesh(128, {
  primitive: 'loop', // LINE_LOOP sluit de ring (de oude LINE_STRIP liet een gat)
  pos: (i, N) => { const a = i / N * TAU; return [Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5]; },
  col: (i, N) => { const a = i / N * TAU; return [Math.abs(Math.cos(a)), Math.abs(Math.sin(a)), Math.abs(Math.sin(a * 2))]; },
  nor: (i, N) => { const a = i / N * TAU; return [Math.cos(a), 0, Math.sin(a)]; },
  update: (g, { freq }, e, N) => {
    for (let i = 0; i < N; i++) {
      const v = level(freq, e[i], e[i + 1]), a = i / N * TAU, r = 1.5 + v * 1.5;
      g.pos[i * 3] = Math.cos(a) * r; g.pos[i * 3 + 1] = v * .5; g.pos[i * 3 + 2] = Math.sin(a) * r;
    }
  },
});

function particles(bins) {
  const N = 512, B = 64, e = edgesFor(B, bins), pos = [], col = [], nor = [], tex = [];
  for (let i = 0; i < N; i++) {
    pos.push((Math.random() - .5) * 4, (Math.random() - .5) * 2, (Math.random() - .5) * 4);
    col.push(Math.random(), Math.random(), Math.random()); nor.push(0, 1, 0); tex.push(Math.random(), Math.random());
  }
  const g = pack(pos, col, nor, tex, null, 'points'), lv = new Float32Array(B);
  g.update = ({ freq }) => {
    for (let b = 0; b < B; b++) lv[b] = level(freq, e[b], e[b + 1]);
    for (let i = 0; i < N; i++) { g.pos[i * 3 + 1] += (lv[i % B] - .35) * .03; g.pos[i * 3 + 1] *= .98; }
  };
  return g;
}

function sphere(bins) {
  const lt = 30, ln = 30, R = 1.5, B = 32, e = edgesFor(B, bins), cy = .9;
  const pos = [], col = [], nor = [], tex = [], idx = [];
  for (let i = 0; i <= lt; i++) {
    const t = i * Math.PI / lt;
    for (let j = 0; j <= ln; j++) {
      const p = j * TAU / ln, x = Math.cos(p) * Math.sin(t), y = Math.cos(t), z = Math.sin(p) * Math.sin(t);
      pos.push(R * x, cy + R * y, R * z); nor.push(x, y, z); tex.push(j / ln, i / lt); col.push(x * .5 + .5, y * .5 + .5, z * .5 + .5);
    }
  }
  for (let i = 0; i < lt; i++) for (let j = 0; j < ln; j++) {
    const a = i * (ln + 1) + j, b = a + ln + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = pack(pos, col, nor, tex, idx, 'triangles'), lv = new Float32Array(B);
  g.update = ({ freq }) => { // bol vervormt langs zijn normaal per frequentieband
    for (let b = 0; b < B; b++) lv[b] = level(freq, e[b], e[b + 1]);
    for (let i = 0; i <= lt; i++) for (let j = 0; j <= ln; j++) {
      const k = i * (ln + 1) + j, r = R * (1 + .5 * lv[Math.floor(Math.abs(j / ln * 2 - 1) * (B - 1))]);
      g.pos[k * 3] = g.norm[k * 3] * r; g.pos[k * 3 + 1] = cy + g.norm[k * 3 + 1] * r; g.pos[k * 3 + 2] = g.norm[k * 3 + 2] * r;
    }
  };
  return g;
}

export const MODES = {
  bars: { label: '3D Bars', build: bars },
  spectrum: { label: '3D Spectrum Lines', build: spectrum },
  waveform: { label: 'Waveform', build: waveform },
  circular: { label: 'Circular Spectrum', build: circular },
  particles: { label: 'Particle Cloud', build: particles },
  sphere: { label: 'Audio Sphere', build: sphere },
};
