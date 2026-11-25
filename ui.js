// Het bedieningspaneel wordt uit dit schema gebouwd: nieuwe slider = één regel erbij.
export const CONTROLS = [
  { title: 'Audio Equalizer', items: [
    { key: 'bass', label: 'Bass (20–200 Hz)', min: 0, max: 200, value: 100 },
    { key: 'mid', label: 'Mid (200 Hz–3 kHz)', min: 0, max: 200, value: 100 },
    { key: 'treble', label: 'Treble (3–20 kHz)', min: 0, max: 200, value: 100 },
    { key: 'volume', label: 'Volume', min: 0, max: 100, value: 50 },
  ] },
  { title: 'Phong Lighting', items: [
    { key: 'light', label: 'Lighting aan', type: 'checkbox', value: true },
    { key: 'lightInt', label: 'Ambient + Diffuse', min: 0, max: 200, value: 100 },
    { key: 'spec', label: 'Specular (glans)', min: 0, max: 200, value: 80 },
  ] },
  { title: 'Visual Effects', items: [
    { key: 'smooth', label: 'FFT smoothing', min: 0, max: 99, value: 80 },
    { key: 'colorSpd', label: 'Kleur-animatie', min: 0, max: 100, value: 30 },
    { key: 'camSpd', label: 'Camera-rotatie', min: 0, max: 100, value: 20 },
    { key: 'bloom', label: 'Glow (simpele bloom)', type: 'checkbox', value: true },
    { key: 'autoRotate', label: 'Auto-rotatie', type: 'checkbox', value: true },
  ] },
];

const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, attrs); e.append(...kids); return e; };

export function buildControls(root, schema, onChange) {
  const settings = {};
  for (const sec of schema) {
    root.append(el('div', { className: 'title', textContent: sec.title }));
    const row = el('div', { className: 'row' });
    for (const it of sec.items) {
      settings[it.key] = it.value;
      const group = el('div', { className: 'group' });
      if (it.type === 'checkbox') {
        const input = el('input', { type: 'checkbox', checked: it.value });
        input.addEventListener('change', () => { settings[it.key] = input.checked; onChange(it.key, input.checked); });
        group.append(el('label', { className: 'chk' }, input, it.label));
      } else {
        const val = el('span', { className: 'val', textContent: it.value + '%' });
        const input = el('input', { type: 'range', min: it.min, max: it.max, value: it.value });
        input.addEventListener('input', () => { settings[it.key] = +input.value; val.textContent = input.value + '%'; onChange(it.key, +input.value); });
        group.append(el('label', { textContent: it.label }), el('div', { className: 'slider' }, input, val));
      }
      row.append(group);
    }
    root.append(row);
  }
  return settings;
}
