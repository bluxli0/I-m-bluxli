// main.js — Expanded Three.js interactive site
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.154.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://unpkg.com/three@0.154.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.154.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.154.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.154.0/examples/jsm/postprocessing/SMAAPass.js';

// --- Utilities ---
const HS_KEY = 'bluxli_highscores_v2';
function loadHighScores(){ try { return JSON.parse(localStorage.getItem(HS_KEY) || '{}'); } catch(e){ return {}; } }
function saveHighScores(obj){ localStorage.setItem(HS_KEY, JSON.stringify(obj)); }
let highScores = loadHighScores();

// Auto LDM detection for low-end devices
const deviceMemory = navigator.deviceMemory || 4;
const cores = navigator.hardwareConcurrency || 4;
let autoLDM = (deviceMemory <= 1.5) || (cores <= 2);

// Scene setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 3000);
camera.position.set(0,1.2,3.8);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Postprocessing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85); bloom.threshold = 0.1; bloom.strength = 0.8; bloom.radius = 0.4; composer.addPass(bloom);
const smaa = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio()); composer.addPass(smaa);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.45); scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.5); dir.position.set(5,10,7.5); scene.add(dir);
const pointerLight = new THREE.PointLight(0x7bdfff, 0.9, 12, 2); pointerLight.position.set(0,2,2); scene.add(pointerLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping=true; controls.dampingFactor=0.08; controls.minDistance=1.6; controls.maxDistance=8;

// State
let score = 0; const scoreEl = document.getElementById('score'); const gameHint = document.getElementById('gameHint'); let particles = []; let lowDetailMode = autoLDM;

// Disable audio by default per request (no audio files)
let audioEnabled = false;
function initAudio(){ /* intentionally empty — audio disabled per request */ }
function setSound(on){ audioEnabled = !!on; }

// Cursor
const cursor = document.createElement('div'); cursor.className='cursor'; document.body.appendChild(cursor);
window.addEventListener('pointermove', (e)=>{ cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });

// Procedural glass face
function makeGlassFace({text='>_<', palette=['#a8d0ff','#eaf6ff','#6bb8ff']}){ const size=1024; const canvas=document.createElement('canvas'); canvas.width=size; canvas.height=size; const ctx=canvas.getContext('2d'); const g=ctx.createLinearGradient(0,0,size,size); g.addColorStop(0,palette[0]); g.addColorStop(0.6,palette[1]); g.addColorStop(1,palette[2]); ctx.fillStyle=g; ctx.fillRect(0,0,size,size); ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(0,0,size,size);
  ctx.fillStyle='rgba(2,6,23,0.6)'; ctx.fillRect(size*0.33,size*0.88,size*0.04,size*0.08); ctx.fillRect(size*0.63,size*0.88,size*0.04,size*0.08); ctx.fillRect(size*0.05,size*0.5,size*0.06,size*0.02); ctx.fillRect(size*0.89,size*0.5,size*0.06,size*0.02);
  ctx.font='bold 240px system-ui, serif'; ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillText(text,size*0.5,size*0.58);
  const tex=new THREE.CanvasTexture(canvas); tex.flipY=false; tex.encoding=THREE.sRGBEncoding; return tex; }

// Create glass cube
function createGlassCube(){ const geom=new THREE.BoxGeometry(1.6,1.6,1.6); const uvAttr=geom.attributes.uv; for(let i=0;i<uvAttr.count;i++){ uvAttr.setX(i, uvAttr.getX(i)*(0.95+0.1*Math.sin(i*2.5))); uvAttr.setY(i, uvAttr.getY(i)*(0.92+0.12*Math.cos(i*1.7))); } uvAttr.needsUpdate=true;
  const pal=['#a8d0ff','#eaf6ff','#6bb8ff']; const faceTex=[]; for(let i=0;i<6;i++) faceTex.push(makeGlassFace({text:'>_<', palette:pal})); const mats = faceTex.map(t=> new THREE.MeshPhysicalMaterial({map:t, transmission:0.6, transparent:true, roughness:0.08, metalness:0.02, clearcoat:0.2, ior:1.45})); const cube=new THREE.Mesh(geom,mats); cube.castShadow=true; cube.receiveShadow=true; const limbMat=new THREE.MeshStandardMaterial({color:0x021430,roughness:0.6,metalness:0.1}); const limbGeom=new THREE.BoxGeometry(0.12,0.4,0.12); const leftLeg=new THREE.Mesh(limbGeom,limbMat); leftLeg.position.set(-0.35,-0.95,0.3); cube.add(leftLeg); const rightLeg=leftLeg.clone(); rightLeg.position.set(0.35,-0.95,0.3); cube.add(rightLeg); const leftHand=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.18,0.18), limbMat); leftHand.position.set(-0.95,0.0,0.0); cube.add(leftHand); const rightHand=leftHand.clone(); rightHand.position.set(0.95,0.0,0.0); cube.add(rightHand); return cube; }

const cube = createGlassCube(); scene.add(cube);

// Raycaster & pointer
const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
function updatePointer(e){ const rect=renderer.domElement.getBoundingClientRect(); pointer.x = ((e.clientX-rect.left)/rect.width)*2-1; pointer.y = -((e.clientY-rect.top)/rect.height)*2+1; const p3=new THREE.Vector3(pointer.x,pointer.y,0.5).unproject(camera); pointerLight.position.lerp(p3,0.12); }
window.addEventListener('pointermove', updatePointer);

// Orb spawner
function spawnOrb(pos){ if(lowDetailMode && Math.random()>0.6) return; const g=new THREE.SphereGeometry(0.06,16,16); const m=new THREE.MeshStandardMaterial({emissive:0x7ce7ff,emissiveIntensity:1,metalness:0.1,roughness:0.2}); const s=new THREE.Mesh(g,m); s.position.copy(pos); s.userData.v = new THREE.Vector3((Math.random()-0.5)*0.02,0.06+Math.random()*0.04,(Math.random()-0.5)*0.02); scene.add(s); particles.push(s); }
for(let i=0;i<6;i++) spawnOrb(new THREE.Vector3((Math.random()-0.5)*2,0.6+Math.random()*1.2,(Math.random()-0.5)*2));

// Shooting
function shootFromCamera(ndcX, ndcY){ if(lowDetailMode && Math.random()>0.6) return; const vec=new THREE.Vector3(ndcX,ndcY,0.5).unproject(camera); const dir=vec.sub(camera.position).normalize(); const g=new THREE.SphereGeometry(0.03,8,8); const m=new THREE.MeshStandardMaterial({color:0xffe18b,emissive:0xffe18b,emissiveIntensity:0.9}); const proj=new THREE.Mesh(g,m); proj.position.copy(camera.position); proj.userData.v = dir.multiplyScalar(0.35); proj.userData.life = 180; scene.add(proj); particles.push(proj); }

// Click handler
window.addEventListener('pointerdown', (e)=>{ const rect=renderer.domElement.getBoundingClientRect(); const ndcX = ((e.clientX-rect.left)/rect.width)*2-1; const ndcY = -((e.clientY-rect.top)/rect.height)*2+1; shootFromCamera(ndcX,ndcY); raycaster.setFromCamera(pointer,camera); const intersects = raycaster.intersectObjects(particles.concat(cube), true); if(intersects.length){ const it = intersects[0].object; if(it.geometry && it.geometry.type === 'SphereGeometry' && it.material && it.material.emissive){ scene.remove(it); const idx = particles.indexOf(it); if(idx>=0) particles.splice(idx,1); score+=10; scoreEl.textContent = score; for(let i=0;i<2;i++) spawnOrb(new THREE.Vector3(it.position.x+(Math.random()-0.5)*0.3, it.position.y+0.2, it.position.z+(Math.random()-0.5)*0.3)); } if(it.object === cube){ const faceIndex = Math.floor(it.faceIndex / 2); const newTex = makeGlassFace({text:'._.'}); cube.material[faceIndex].map = newTex; cube.material[faceIndex].needsUpdate = true; score+=5; scoreEl.textContent = score; } } });

// --- Game: Parkour (improved) ---
class ParkourLevel{
  constructor(index=0){ this.group = new THREE.Group(); this.index = index; this.player = null; this.platforms = []; this.active = false; this.checkpointIndex = 0; }
  start(){ this.active=true; this.build(); }
  build(){ const size = 0.5; const geometry = new THREE.BoxGeometry(size,size,size); const mat = new THREE.MeshStandardMaterial({color:0x5bd1ff}); const pathLen = 18 + this.index*4; for(let i=0;i<pathLen;i++){ const m = new THREE.Mesh(geometry, mat); m.position.set((Math.sin(i*0.5))*0.8, (Math.random()*0.8 - 0.2), -i*1.1); if(Math.random()>0.8) m.userData.obstacle = true; this.group.add(m); this.platforms.push(m); }
    this.player = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.46,0.32), new THREE.MeshStandardMaterial({color:0xffd27c})); this.player.position.set(0,1,1); this.group.add(this.player); this.group.position.set(0,-0.5,0); scene.add(this.group);
    this.velocity = new THREE.Vector3(); this.onGround = false; this.t = 0;
  }
  update(input){ if(!this.active) return; this.t += 1/60; // basic gravity & forward motion
    // simple forward auto-run
    this.player.position.z -= 0.06; // speed
    // jump handling
    if(input.jump && this.onGround){ this.velocity.y = 0.22; this.onGround=false; }
    this.velocity.y -= 0.02; this.player.position.add(this.velocity);
    // ground collision against nearest platform
    for(const p of this.platforms){ const dx = Math.abs(p.position.x - this.player.position.x); const dz = p.position.z - this.player.position.z; if(Math.abs(dz) < 0.6 && dx < 0.6){ // on platform
        this.player.position.y = Math.max(this.player.position.y, p.position.y + 0.5); this.velocity.y = 0; this.onGround = true; }
    }
    // obstacles check
    for(const p of this.platforms){ if(p.userData.obstacle && p.position.distanceTo(this.player.position) < 0.36){ // hit obstacle
        this.player.position.y -= 0.12; // knock
    } }
    // camera follows
    camera.position.lerp(new THREE.Vector3(this.player.position.x, this.player.position.y + 1.2, this.player.position.z + 3.6), 0.08); camera.lookAt(this.player.position);
    // end condition
    if(this.player.position.z < - (this.platforms.length*1.05)){
      this.end(true);
    }
    if(this.player.position.y < -4){ this.end(false); }
  }
  end(success){ this.active=false; scene.remove(this.group); if(success){ score += 200 + this.index*30; scoreEl.textContent = score; highScores['parkour_level_'+this.index] = Math.max(highScores['parkour_level_'+this.index]||0, score); saveHighScores(highScores); } }
}
let currentParkour = null; const inputState = {jump:false}; window.addEventListener('keydown', (e)=>{ if(e.code==='Space') inputState.jump = true; }); window.addEventListener('keyup', (e)=>{ if(e.code==='Space') inputState.jump = false; });

// --- Game: Rhythm (simple but polished) ---
class RhythmGame{
  constructor(){ this.active=false; this.notes = []; this.hitZoneZ = 1.2; this.spawnTimer = 0; this.combo = 0; this.score = 0; }
  start(){ this.active=true; this.spawnTimer = 0; this.notes=[]; this.combo=0; this.score=0; gameHint.textContent='Rhythm: press Space or tap to hit notes when they cross the line!'; }
  update(dt){ if(!this.active) return; this.spawnTimer -= dt; if(this.spawnTimer < 0){ this.spawnNote(); this.spawnTimer = 0.7 + Math.random()*0.6; }
    // move notes
    for(let i=this.notes.length-1;i>=0;i--){ const n = this.notes[i]; n.position.z += 0.02; if(n.position.z > 3){ // missed
        this.notes.splice(i,1); scene.remove(n); this.combo=0; }
    }
  }
  spawnNote(){ const g = new THREE.BoxGeometry(0.32,0.16,0.08); const m = new THREE.MeshStandardMaterial({color:0xff9b6b,emissive:0xff8066}); const n = new THREE.Mesh(g,m); n.position.set((Math.random()-0.5)*1.2, 0.6, -6); this.notes.push(n); scene.add(n); }
  tryHit(){ // check nearest note near hitZone
    let best = null; let bestDist = 999; for(const n of this.notes){ const d = Math.abs(n.position.z - this.hitZoneZ); if(d < bestDist){ bestDist = d; best = n; } }
    if(best && bestDist < 0.45){ // hit
      this.score += Math.round(100*(0.5/bestDist + 1)); this.combo++; score += 10; scoreEl.textContent = score; scene.remove(best); this.notes.splice(this.notes.indexOf(best),1); return true; } else { this.combo = 0; return false; }
  }
}
const rhythm = new RhythmGame(); window.addEventListener('keydown', (e)=>{ if(e.code==='Space'){ if(rhythm.active){ rhythm.tryHit(); } else { inputState.jump = true; } } }); window.addEventListener('pointerdown', ()=>{ if(rhythm.active) rhythm.tryHit(); });

// --- Game: Memory Match (cards, procedural icons) ---
class MemoryMatch{
  constructor(size=4){ this.size = size; this.cards = []; this.active = false; this.selection = []; this.locked = false; }
  start(){ this.active = true; this.build(); }
  build(){ const total = this.size * this.size; const icons = []; for(let i=0;i<total/2;i++) icons.push(this.makeIcon(i)); const deck = icons.concat(icons).sort(()=>Math.random()-0.5);
    const spacing = 0.7; const startX = -((this.size-1)/2)*spacing; const startY = 0.8; this.group = new THREE.Group();
    for(let i=0;i<total;i++){ const col = i % this.size; const row = Math.floor(i/this.size); const card = this.makeCardMesh(deck[i]); card.position.set(startX + col*spacing, startY - row*0.9, -2); this.group.add(card); this.cards.push(card); }
    scene.add(this.group);
  }
  makeIcon(seed){ // simple colored circle icon
    const size=256; const c=document.createElement('canvas'); c.width=size; c.height=size; const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size); ctx.fillStyle = `hsl(${(seed*73)%360} 80% 60%)`; ctx.beginPath(); ctx.arc(size/2,size/2,size*0.28,0,Math.PI*2); ctx.fill(); const tex=new THREE.CanvasTexture(c); tex.flipY=false; return tex; }
  makeCardMesh(texture){ const front = new THREE.MeshBasicMaterial({map:texture}); const back = new THREE.MeshStandardMaterial({color:0x102033}); const geom = new THREE.BoxGeometry(0.6,0.8,0.06); const mesh = new THREE.Mesh(geom, [front, front, back, back, back, back]); mesh.userData.revealed = false; mesh.userData.texture = texture; mesh.userData.isCard = true; return mesh; }
  flip(card){ if(this.locked) return; if(card.userData.revealed) return; this.locked = true; // animate flip
    const start = {r:0}; const that = this; // simple tween using requestAnimationFrame
    let t0 = performance.now(); function animateFlip(now){ const p = Math.min(1,(now - t0)/280); const ang = p*Math.PI; card.rotation.y = ang; if(p < 1) requestAnimationFrame(animateFlip); else { card.userData.revealed = true; that.selection.push(card); that.locked = false; that.checkMatch(); } }
    requestAnimationFrame(animateFlip);
  }
  checkMatch(){ if(this.selection.length < 2) return; const a=this.selection[0], b=this.selection[1]; if(a.userData.texture.image.toDataURL() === b.userData.texture.image.toDataURL()){ // match
      score += 50; scoreEl.textContent = score; this.selection = []; } else { // flip back after short delay
      this.locked = true; setTimeout(()=>{ this.unflip(a); this.unflip(b); this.selection = []; this.locked = false; }, 700); } }
  unflip(card){ let t0 = performance.now(); function animateBack(now){ const p = Math.min(1,(now - t0)/280); const ang = Math.PI*(1-p); card.rotation.y = ang; if(p < 1) requestAnimationFrame(animateBack); else { card.userData.revealed = false; } } requestAnimationFrame(animateBack); }
  onPointerDown(intersect){ if(!this.active) return; if(!intersect) return; const card = intersect.object; if(card.userData && card.userData.isCard) this.flip(card); }
  end(){ this.active=false; scene.remove(this.group); }
}
let memory = new MemoryMatch(4);

// Game registry & UI
const games = [];
function registerGame(id, title, starter){ games.push({id,title,starter}); }
registerGame('collector','Collector', ()=>{ gameHint.textContent='Collector: click glowing orbs to score.'; });
registerGame('rotate-match','Rotate Match', ()=>{ startRotateMatch(); });
registerGame('shooting','Shooting', ()=>{ gameHint.textContent='Shooting: click to shoot and change face accents.'; });
registerGame('parkour','Parkour — Levels', ()=>{ if(currentParkour && currentParkour.active) return; currentParkour = new ParkourLevel(0); currentParkour.start(); gameHint.textContent='Parkour: use space to jump (desktop) or tap to jump (mobile).'; });
registerGame('rhythm','Rhythm — Tap the beat', ()=>{ rhythm.start(); });
registerGame('memory','Memory Match', ()=>{ memory = new MemoryMatch(4); memory.start(); gameHint.textContent='Memory Match: tap tiles to reveal and match pairs.'; });
// add a few more small playable micro-games to replace placeholders (randomized challenges)
for(let i=1;i<=24;i++){ const id='micro-'+i; registerGame(id, 'Micro Game '+i, ()=>{ gameHint.textContent='Micro challenge: collect 5 orbs quickly.'; // simple micro-challenge
    let collected = 0; const handler = (e)=>{ raycaster.setFromCamera(pointer,camera); const ints = raycaster.intersectObjects(particles); if(ints.length){ const it = ints[0].object; scene.remove(it); particles.splice(particles.indexOf(it),1); collected++; score += 6; scoreEl.textContent = score; if(collected>=5){ gameHint.textContent='Micro challenge complete!'; window.removeEventListener('pointerdown', handler); } } }; window.addEventListener('pointerdown', handler); }); }

// populate UI
const listEl = document.getElementById('gamesList'); games.forEach(g=>{ const el = document.createElement('div'); el.className='game-entry'; el.innerHTML = `<div>${g.title}</div>`; const b = document.createElement('button'); b.textContent='Play'; b.addEventListener('click', ()=>{ try{ // stop other active games
    if(currentParkour && currentParkour.active) currentParkour.end(false); if(rhythm.active) rhythm.active=false; if(memory.active) memory.end(); g.starter(); } catch(e){ console.warn(e); } }); el.appendChild(b); listEl.appendChild(el); });

// Rotate match from earlier
let rotateTarget = null; let rotateMatchActive = false;
function startRotateMatch(){ rotateTarget = new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random()-0.5)*Math.PI*2,(Math.random()-0.5)*Math.PI*2,(Math.random()-0.5)*Math.PI*2)); rotateMatchActive = true; gameHint.textContent = 'Rotate the cube to match the target orientation!'; const targetCube = createGlassCube(); targetCube.scale.setScalar(0.5); targetCube.position.set(-2.2,0.5,-1); targetCube.userData.isTarget = true; scene.add(targetCube); targetCube.quaternion.copy(rotateTarget); setTimeout(()=>{ scene.remove(targetCube); },9000); }
function checkRotateMatch(){ if(!rotateMatchActive) return; const delta = cube.quaternion.angleTo(rotateTarget); if(delta < 0.22){ rotateMatchActive=false; score+=40; scoreEl.textContent = score; gameHint.textContent = 'Great! Rotate Match complete — fireworks!'; fireworks(cube.position.clone()); highScores['rotate-match'] = Math.max(highScores['rotate-match']||0, score); saveHighScores(highScores); } }

// fireworks
function fireworks(origin){ const n=48; for(let i=0;i<n;i++){ const g=new THREE.SphereGeometry(0.02,6,6); const c=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(Math.random(),0.75,0.6)}); const p=new THREE.Mesh(g,c); p.position.copy(origin); p.userData.v = new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2, (Math.random()-0.5)*2).multiplyScalar(0.4); p.userData.life = 100 + Math.random()*80; scene.add(p); particles.push(p); } }

// Pointer down integration for memory
window.addEventListener('pointerdown', ()=>{ // feed memory match
  raycaster.setFromCamera(pointer,camera); const ints = raycaster.intersectObjects(scene.children, true); if(ints.length){ if(memory && memory.active) memory.onPointerDown(ints[0]); } });

// snapshot & wallpaper
function snapshot(){ try{ const data = renderer.domElement.toDataURL('image/png'); const a = document.createElement('a'); a.href = data; a.download = 'bluxli_snapshot.png'; document.body.appendChild(a); a.click(); a.remove(); } catch(e){ console.warn('snapshot failed', e); } }
async function wallpaper(){ // render a larger offscreen render
  const w = 2048, h = 1152; const prevSize = renderer.getSize(new THREE.Vector2()); const prevPixelRatio = renderer.getPixelRatio(); renderer.setSize(w,h); renderer.setPixelRatio(1);
  // render via composer to capture postprocessing
  composer.setSize(w,h); composer.render(); const data = renderer.domElement.toDataURL('image/png'); const a = document.createElement('a'); a.href=data; a.download='bluxli_wallpaper.png'; document.body.appendChild(a); a.click(); a.remove(); // restore
  renderer.setSize(prevSize.x, prevSize.y); renderer.setPixelRatio(prevPixelRatio); composer.setSize(prevSize.x, prevSize.y);
}

document.getElementById('snapshotBtn').addEventListener('click', snapshot);
document.getElementById('wallpaperBtn').addEventListener('click', wallpaper);

// Settings
const settingsEl = document.getElementById('settings'); document.getElementById('openSettings').addEventListener('click', ()=>{ settingsEl.classList.remove('hidden'); }); document.getElementById('closeSettings').addEventListener('click', ()=>{ settingsEl.classList.add('hidden'); });
const toggleSound = document.getElementById('toggleSound'); toggleSound.checked = false; toggleSound.addEventListener('change',(e)=>{ setSound(e.target.checked); });
const toggleLDM = document.getElementById('toggleLDM'); toggleLDM.checked = lowDetailMode; toggleLDM.addEventListener('change',(e)=>{ lowDetailMode = e.target.checked; if(lowDetailMode){ renderer.setPixelRatio(1); bloom.strength = 0.25; } else { renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); bloom.strength = 0.8; } });
const resetScoresBtn = document.getElementById('resetScores'); resetScoresBtn.addEventListener('click', ()=>{ highScores = {}; saveHighScores(highScores); gameHint.textContent = 'High scores reset.'; });

// HUD / game loop
const clock = new THREE.Clock(); function animate(){ requestAnimationFrame(animate); const dt = clock.getDelta(); const t = clock.getElapsedTime(); cube.position.y = Math.sin(t*0.8)*0.06; cube.rotation.x += 0.002; cube.rotation.y += 0.004;
  // update parkour
  if(currentParkour && currentParkour.active) currentParkour.update(inputState);
  // update rhythm
  rhythm.update(dt);
  // update particles
  for(let i=particles.length-1;i>=0;i--){ const p = particles[i]; if(!p) continue; if(p.userData.v){ p.position.add(p.userData.v); p.userData.v.y -= 0.01*(p.userData.v.length()*0.08+1); } if(p.userData.life !== undefined){ p.userData.life--; if(p.userData.life<0){ scene.remove(p); particles.splice(i,1); continue; } } }
  // basic orbiting objects
  scene.traverse(obj=>{ if(obj.userData && obj.userData.orbit){ obj.rotation.y += 0.008; obj.position.applyAxisAngle(new THREE.Vector3(0,1,0), 0.002); } });
  // hover
  raycaster.setFromCamera(pointer,camera); const intersects = raycaster.intersectObject(cube); if(intersects.length) cube.scale.lerp(new THREE.Vector3(1.03,1.03,1.03), 0.08); else cube.scale.lerp(new THREE.Vector3(1,1,1),0.06);
  checkRotateMatch(); controls.update(); composer.render(); }
animate();

// periodic spawns
setInterval(()=>{ spawnOrb(new THREE.Vector3((Math.random()-0.5)*2, 0.8 + Math.random()*1.4, (Math.random()-0.5)*2)); }, 2600);

// responsive
window.addEventListener('resize', ()=>{ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); });

// initial hint
setTimeout(()=>{ gameHint.textContent = 'Welcome! Drag to rotate the cube, tap to interact. No external images or audio are used.'; }, 1200);

// expose for debugging
window.bluxli = { scene, cube, saveHighScores, highScores };
