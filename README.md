# WebGL2 Audio Visualizer

Geen dependencies, geen build-stap. ES-modules werken niet via `file://`, dus start een lokale server:

    python -m http.server 8000     # of: npx serve   /   VS Code "Live Server"

Open daarna http://localhost:8000

## Structuur
    index.html            markup
    css/style.css         styling
    src/main.js           koppelt alles + render-loop
    src/ui.js             paneel gebouwd uit een schema
    src/audio/            AudioEngine (Web Audio, EQ, analyser)
    src/gl/               renderer, shaders, camera, matrices, geometrie per visualisatie

Nieuwe visualisatie: voeg een `{ label, build }` toe aan `MODES` in `src/gl/geometry.js`.
