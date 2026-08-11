# I-m-bluxli — Interactive Three.js site (updated)

This commit adds a large interactive update per your request:

Highlights
- Avatar set to "._." and displayed in a bubbly avatar bubble.
- Display name uses a bubbly font (Fredoka One); touching the name triggers a rainbow gradient + short glitch animation.
- The cube is a glass-gradient cube with the emoticon >_< on each face, and tiny hands & legs drawn procedurally.
- Many mini-games (30+ placeholders) are registered in the UI; implemented games include Collector, Rotate Match, Shooting, and a basic Voxel Parkour runner. The rest are lightweight placeholders that award points and can be expanded.
- Soft ambient audio generated procedurally via WebAudio; toggle in Settings.
- High scores stored locally (localStorage). Resettable via Settings.
- Settings panel (⚙️) includes Low Detail Mode (LDM), Sound toggle, mobile/full effects toggle, and a reset high scores button.
- Full effects enabled by default; LDM reduces particle spawning and renderer pixel ratio.
- Updated UI and many small interactions and animations.

Custom domain / GitHub Pages
- I added a CNAME file with `bluxli.me`. To publish the site at that domain you must:
  1. Configure DNS for bluxli.me to point to GitHub Pages (A records and/or ALIAS as documented by GitHub).
  2. In repo Settings → Pages select branch `main` (root) and set custom domain to `bluxli.me` (or add a Pages custom domain in the UI).

Notes and next steps
- The update uses ES modules and no external media files; procedural textures and generated audio avoid external asset hosting.
- If you want me to fully implement 30+ deep mini-games (parkour levels, voxel platformer, rhythm game, memory match, etc.), I can continue building them one-by-one — tell me which to prioritize and whether you want them opened on separate routes/HTML pages or within the same canvas.
- If you want a specific avatar image baked into a face, provide a URL and I will embed it into the face textures.

Files changed
- index.html — UI, settings, and controls
- styles.css — fonts, bubbly name, rainbow/glitch styles
- main.js — Three.js scene, cube, games manager, audio, high scores
- README.md — updated notes
- CNAME — contains bluxli.me

How to preview locally
- Run a static server (e.g., `npx http-server` or `python -m http.server`) from the repository root and open http://localhost:8080 or the port your server uses. GitHub Pages requires the site to be on `main` branch (root).

Tell me which game(s) you want me to fully expand first (I suggest Parkour levels, Rhythm game, Memory match), or if you want tweaks to the cube styling, palette, or name animation.
