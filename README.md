# I-m-bluxli — Polished mini-games and features

This commit expands and polishes core mini-games and UX per your request, without adding external images or audio assets.

What I changed
- Parkour: improved into a level-based voxel runner with obstacles, simple physics, checkpoints, camera follow, and scoring.
- Rhythm: implemented an interactive timing game that spawns notes and lets the player hit them with Space/tap.
- Memory Match: implemented a card-flip memory game with procedural icons and animations.
- Replaced placeholders with playable micro-games (24 lightweight micro-challenges) so there are no placeholder entries.
- Added postprocessing (bloom, SMAA), particle systems per interaction, glass refraction-like look using MeshPhysicalMaterial and bloom.
- Added Snapshot (download PNG) and Wallpaper (high-res render & download) buttons.
- Added custom cursor, improved settings panel, defaulted audio OFF to honor "no audio" requirement.
- Added automatic Low Detail Mode detection on low-memory devices and an LDM toggle.

No external images or audio
- All textures/icons are generated procedurally in-browser (canvas + shaders). Audio is disabled by default and no external audio files were added.

How to test
- Serve locally or view via GitHub Pages. Controls: drag to rotate, click/tap to interact, Space to jump or hit (contextual), use Settings to toggle LDM.

Next steps
- If you want, I can refine visual polish (advanced shaders/refraction), add level progression UI for Parkour, add more rhythm patterns, and wire per-game extended leaderboards (local only or remote with an API).
