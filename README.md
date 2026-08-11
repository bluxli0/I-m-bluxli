# I-m-bluxli — Interactive Three.js site

This update makes the site highly interactive: it adds a procedurally-textured, UV-warped cube inspired by your OC, lots of animations, lighting, and three mini-games (Collector, Rotate Match, Shooting).

Files added/changed
- index.html — UI and canvas container; buttons to start games
- styles.css — layout and UI style tweaks
- main.js — Three.js scene with materials, animations, interactions, and games

Notes
- The cube textures are generated procedurally in-browser using canvas; you don't need external image assets.
- To publish, enable GitHub Pages on branch `main` (root). The site will use modern ES modules, so a modern browser is required.

Tell me what to personalize next
- Do you want a specific color palette for your OC, or an uploaded image (avatar) to incorporate on a cube face?
- Want additional games (memory match, platform-style mini-level) or sound effects (requires hosting or embed)?
- Want a separate page for a full gallery or resume?

If you say "Apply my OC avatar" provide a URL or upload the image and I will modify the face texture to include it.
