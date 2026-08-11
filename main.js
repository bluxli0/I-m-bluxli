// main.js — Three.js interactive cube with many features and games
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.154.0/examples/jsm/controls/OrbitControls.js';

// Simple util for localStorage high scores
const HS_KEY = 'bluxli_highscores_v1';
function loadHighScores(){
  try { return JSON.parse(localStorage.getItem(HS_KEY) || '{}'); } catch(e){return {}}
}
function saveHighScores(obj){ localStorage.setItem(HS_KEY, JSON.stringify(obj)); }
let highScores = loadHighScores();

// Scene setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 3000);
camera.position.set(0,1.2,3.8);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5,10,7.5);
scene.add(dir);
const pointerLight = new THREE.PointLight(0x7bdfff, 0.9, 12, 2);
pointerLight.position.set(0,2,2);
scene.add(pointerLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 1.6; controls.maxDistance = 8;

// state
let score = 0; const scoreEl = document.getElementById('score');
const gameHint = document.getElementById('gameHint');
let particles = [];
let lowDetailMode = false;

// Soft ambient sound using WebAudio (procedural pad)
let audioCtx, ambientGain, isSoundOn = true;
function initAudio(){
  try{
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = 220;
    gain.gain.value = 0.0001; // start silent
    osc.connect(gain);
    const filter = audioCtx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value = 800;
    gain.connect(filter); filter.connect(audioCtx.destination);
    osc.start();
    ambientGain = gain;
    // ramp to soft audible
    setTimeout(()=>{ if(isSoundOn) gain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 2); }, 200);
  } catch(e){ console.warn('Audio init failed', e); }
}

function setSound(on){ isSoundOn = on; if(!ambientGain) return; ambientGain.gain.cancelScheduledValues(audioCtx.currentTime); ambientGain.gain.linearRampToValueAtTime(on?0.02:0.00001, audioCtx.currentTime+0.6); }

// procedural canvas texture generator for gradient glass-like faces
function makeGlassFace({text='>_<', palette=['#a8d0ff','#ffffff','#6bb8ff']}){
  const size = 1024; const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  // radial gradient
  const g = ctx.createLinearGradient(0,0,size,size);
  g.addColorStop(0, palette[0]); g.addColorStop(0.6, palette[1]); g.addColorStop(1,palette[2]);
  ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
  // frosted glass overlay
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0,0,size,size);
  // tiny legs and hands (vector style)
  ctx.fillStyle = 'rgba(2,6,23,0.6)';
  // legs
  ctx.fillRect(size*0.33, size*0.88, size*0.04, size*0.08);
  ctx.fillRect(size*0.63, size*0.88, size*0.04, size*0.08);
  // hands
  ctx.fillRect(size*0.05, size*0.5, size*0.06, size*0.02);
  ctx.fillRect(size*0.89, size*0.5, size*0.06, size*0.02);
  // center emoticon
  ctx.font = 'bold 240px system-ui, serif'; ctx.textAlign='center'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(text, size*0.5, size*0.58);
  const tex = new THREE.CanvasTexture(canvas); tex.flipY=false; tex.encoding = THREE.sRGBEncoding; return tex;
}

// create glass cube with transmission & tiny limbs as child meshes
function createGlassCube(){
  const geom = new THREE.BoxGeometry(1.6,1.6,1.6);
  // slight UV warp for personality
  const uvAttr = geom.attributes.uv;
  for(let i=0;i<uvAttr.count;i++){
    uvAttr.setX(i, uvAttr.getX(i) * (0.95 + 0.1*Math.sin(i*2.5)));
    uvAttr.setY(i, uvAttr.getY(i) * (0.92 + 0.12*Math.cos(i*1.7)));
  }
  uvAttr.needsUpdate = true;
  const pal = ['#a8d0ff','#eaf6ff','#6bb8ff'];
  const faceTex = [];
  for(let i=0;i<6;i++) faceTex.push(makeGlassFace({text:'>_<', palette:pal}));
  const mats = faceTex.map(t=> new THREE.MeshPhysicalMaterial({map:t, transmission:0.5, transparent:true, roughness:0.1, metalness:0.05, clearcoat:0.2, ior:1.4}));
  const cube = new THREE.Mesh(geom, mats); cube.castShadow=true; cube.receiveShadow=true;
  // tiny limbs using boxes
  const limbGeom = new THREE.BoxGeometry(0.12,0.4,0.12);
  const limbMat = new THREE.MeshStandardMaterial({color:0x021430,roughness:0.6,metalness:0.1});
  const leftLeg = new THREE.Mesh(limbGeom,limbMat); leftLeg.position.set(-0.35,-0.95,0.3); cube.add(leftLeg);
  const rightLeg = leftLeg.clone(); rightLeg.position.set(0.35,-0.95,0.3); cube.add(rightLeg);
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.18,0.18), limbMat); leftHand.position.set(-0.95,0.0,0.0); cube.add(leftHand);
  const rightHand = leftHand.clone(); rightHand.position.set(0.95,0.0,0.0); cube.add(rightHand);
  return cube;
}

const cube = createGlassCube(); scene.add(cube);

// UI interactions: display name bubbly font, rainbow & glitch on touch
const nameEl = document.getElementById('display-name');
nameEl.dataset.text = nameEl.textContent;
nameEl.addEventListener('pointerdown', async ()=>{
  // trigger audio context on first user interaction
  if(!audioCtx) initAudio();
  // rainbow + glitch animation for 2.5s
  nameEl.classList.add('rainbow','glitch');
  setTimeout(()=>{ nameEl.classList.remove('glitch'); }, 2000);
  setTimeout(()=>{ nameEl.classList.remove('rainbow'); }, 2500);
});

// pointer handling in scene
const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
function onPointerMove(e){ const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((e.clientX-rect.left)/rect.width)*2-1; pointer.y = -((e.clientY-rect.top)/rect.height)*2+1; const p3 = new THREE.Vector3(pointer.x,pointer.y,0.5).unproject(camera); pointerLight.position.lerp(p3,0.12); }
function onPointerDown(e){ const rect = renderer.domElement.getBoundingClientRect(); const ndcX = ((e.clientX-rect.left)/rect.width)*2-1; const ndcY = -((e.clientY-rect.top)/rect.height)*2+1; shootFromCamera(ndcX, ndcY); raycaster.setFromCamera(pointer,camera); const intersects = raycaster.intersectObjects(particles.concat(cube), true); if(intersects.length){ const it = intersects[0].object; if(it.geometry && it.geometry.type === 'SphereGeometry' && it.material && it.material.emissive){ scene.remove(it); const idx = particles.indexOf(it); if(idx>=0) particles.splice(idx,1); score+=10; scoreEl.textContent = score; for(let i=0;i<2;i++) spawnOrb(new THREE.Vector3(it.position.x+(Math.random()-0.5)*0.3,it.position.y+0.2,it.position.z+(Math.random()-0.5)*0.3)); } if(it.object === cube){ const faceIndex = Math.floor(it.faceIndex/2); const newTex = makeGlassFace({text:'._.'}); cube.material[faceIndex].map = newTex; cube.material[faceIndex].needsUpdate=true; score+=5; scoreEl.textContent = score; } } }
window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerdown', onPointerDown);

// orb spawner & particles
function spawnOrb(pos){ if(lowDetailMode && Math.random()>0.5) return; const g = new THREE.SphereGeometry(0.06,16,16); const m = new THREE.MeshStandardMaterial({emissive:0x7ce7ff,emissiveIntensity:1,metalness:0.1,roughness:0.2}); const s = new THREE.Mesh(g,m); s.position.copy(pos); s.userData.v = new THREE.Vector3((Math.random()-0.5)*0.02,0.06+Math.random()*0.04,(Math.random()-0.5)*0.02); scene.add(s); particles.push(s); }
for(let i=0;i<6;i++) spawnOrb(new THREE.Vector3((Math.random()-0.5)*2, 0.6 + Math.random()*1.2, (Math.random()-0.5)*2));

function shootFromCamera(ndcX, ndcY){ const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera); const dir = vec.sub(camera.position).normalize(); const g = new THREE.SphereGeometry(0.03,8,8); const m = new THREE.MeshStandardMaterial({color:0xffe18b,emissive:0xffe18b,emissiveIntensity:0.9}); const proj = new THREE.Mesh(g,m); proj.position.copy(camera.position); proj.userData.v = dir.multiplyScalar(0.25); proj.userData.life=200; scene.add(proj); particles.push(proj); }

// rotate-match game support (reused)
let rotateTarget=null; let rotateMatchActive=false; function startRotateMatch(){ rotateTarget = new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random()-0.5)*Math.PI*2,(Math.random()-0.5)*Math.PI*2,(Math.random()-0.5)*Math.PI*2)); rotateMatchActive=true; gameHint.textContent='Rotate the cube to match the target orientation!'; const targetCube = createGlassCube(); targetCube.scale.setScalar(0.5); targetCube.position.set(-2.2,0.5,-1); targetCube.userData.isTarget=true; scene.add(targetCube); targetCube.quaternion.copy(rotateTarget); setTimeout(()=>{ scene.remove(targetCube); },9000); }
function checkRotateMatch(){ if(!rotateMatchActive) return; const delta = cube.quaternion.angleTo(rotateTarget); if(delta < 0.23){ rotateMatchActive=false; score+=40; scoreEl.textContent=score; gameHint.textContent='Great! Rotate Match complete — fireworks!'; fireworks(cube.position.clone()); saveScore('rotate-match', score); } }

function fireworks(origin){ const n=48; for(let i=0;i<n;i++){ const g=new THREE.SphereGeometry(0.02,6,6); const c=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(Math.random(),0.75,0.6)}); const p=new THREE.Mesh(g,c); p.position.copy(origin); p.userData.v = new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2, (Math.random()-0.5)*2).multiplyScalar(0.4); p.userData.life = 100 + Math.random()*80; scene.add(p); particles.push(p); } }

// simple parkour voxel mini-game (basic implementation)
class VoxelParkour{
  constructor(){ this.group = new THREE.Group(); this.player = null; this.platforms = []; this.active = false; }
  start(){ this.active = true; this.setup(); }
  setup(){ // build a simple path of instanced cubes
    const size = 0.4; const count = 30; const geometry = new THREE.BoxGeometry(size,size,size);
    const material = new THREE.MeshStandardMaterial({color:0x7bd0ff});
    for(let i=0;i<count;i++){ const m = new THREE.Mesh(geometry, material); m.position.set( (i-5)*0.6, (Math.random()*1.2 - 0.4), -i*0.9); this.group.add(m); this.platforms.push(m); }
    this.player = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.5,0.28), new THREE.MeshStandardMaterial({color:0xffd27c})); this.player.position.set(0,1,1); this.group.add(this.player);
    this.group.position.set(0,-0.5,0); scene.add(this.group);
    this.t = 0;
  }
  update(){ if(!this.active) return; this.t = (this.t || 0) + 0.02; // move player forward along negative z
    this.player.position.z -= 0.035; // auto-run
    camera.position.lerp(new THREE.Vector3(this.player.position.x, this.player.position.y+1.2, this.player.position.z+3.2), 0.06);
    camera.lookAt(this.player.position);
    // simple fall detection
    if(this.player.position.y < -4){ this.end(); }
  }
  end(){ this.active=false; scene.remove(this.group); score+=120; scoreEl.textContent=score; saveScore('parkour', score); }
}
const parkour = new VoxelParkour();

// Game manager and many game placeholders (we register 30+ names, implement some)
const games = [];
function registerGame(id, title, starter){ games.push({id,title,starter}); }
registerGame('collector','Collector (click orbs)', ()=>{ gameHint.textContent='Collector: click glowing orbs to score.'; });
registerGame('rotate-match','Rotate Match', ()=>{ startRotateMatch(); });
registerGame('shooting','Shooting', ()=>{ gameHint.textContent='Shooting: click to shoot and change face accents.'; });
registerGame('parkour','Parkour (voxel runner)', ()=>{ parkour.start(); gameHint.textContent = 'Parkour: avoid falling and reach the end!'; });
// register many lightweight placeholder mini-games
for(let i=1;i<=27;i++){ const id = 'mini-'+i; registerGame(id, 'Mini Game '+(i+3), ()=>{ gameHint.textContent = 'Mini Game placeholder: '+id; setTimeout(()=>{ score += 8; scoreEl.textContent = score; saveScore(id, score); }, 1200); }); }

// populate UI list
const listEl = document.getElementById('gamesList');
games.forEach(g=>{ const el = document.createElement('div'); el.className='game-entry'; el.innerHTML = `<div>${g.title}</div>`; const b = document.createElement('button'); b.textContent='Play'; b.addEventListener('click', ()=>{ try{ g.starter(); }catch(e){ console.warn(e); } }); el.appendChild(b); listEl.appendChild(el); });

// save score helper
function saveScore(gameId, value){ highScores[gameId] = Math.max(highScores[gameId]||0, value); saveHighScores(highScores); }

// UI buttons
document.getElementById('startRotateMatch').addEventListener('click', ()=> startRotateMatch());
document.getElementById('spawnTargetCube').addEventListener('click', ()=>{ const t = createGlassCube(); t.scale.setScalar(0.8); t.position.set(2.2,0.8,-0.5); scene.add(t); t.userData.orbit = true; setTimeout(()=>{ scene.remove(t); }, 12000); });
document.getElementById('resetScene').addEventListener('click', ()=>{ score=0; scoreEl.textContent=score; gameHint.textContent='Reset — try the mini-games again!'; });

// settings panel
const settingsEl = document.getElementById('settings');
document.getElementById('openSettings').addEventListener('click', ()=>{ settingsEl.classList.remove('hidden'); });
document.getElementById('closeSettings').addEventListener('click', ()=>{ settingsEl.classList.add('hidden'); });
const toggleSound = document.getElementById('toggleSound'); toggleSound.addEventListener('change',(e)=>{ if(e.target.checked){ if(!audioCtx) initAudio(); setSound(true); } else setSound(false); });
const toggleLDM = document.getElementById('toggleLDM'); toggleLDM.addEventListener('change',(e)=>{ lowDetailMode = e.target.checked; if(lowDetailMode){ renderer.setPixelRatio(1); } else { renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); } });
const resetScoresBtn = document.getElementById('resetScores'); resetScoresBtn.addEventListener('click', ()=>{ highScores = {}; saveHighScores(highScores); gameHint.textContent = 'High scores reset.'; });

// animation loop
const clock = new THREE.Clock();
function animate(){ requestAnimationFrame(animate); const t = clock.getElapsedTime(); cube.position.y = Math.sin(t*0.8)*0.06; cube.rotation.x += 0.002; cube.rotation.y += 0.004; if(parkour.active) parkour.update(); // particles update
  for(let i=particles.length-1;i>=0;i--){ const p = particles[i]; if(!p) continue; if(p.userData.v){ p.position.add(p.userData.v); p.userData.v.y -= 0.01*(p.userData.v.length()*0.08+1); } if(p.userData.life !== undefined){ p.userData.life--; if(p.userData.life<0){ scene.remove(p); particles.splice(i,1); continue; } } }
  scene.traverse(obj=>{ if(obj.userData && obj.userData.orbit){ obj.rotation.y += 0.008; obj.position.applyAxisAngle(new THREE.Vector3(0,1,0), 0.002); } });
  // hover scale
  raycaster.setFromCamera(pointer,camera); const intersects = raycaster.intersectObject(cube); if(intersects.length){ cube.scale.lerp(new THREE.Vector3(1.03,1.03,1.03),0.08); } else cube.scale.lerp(new THREE.Vector3(1,1,1),0.06);
  checkRotateMatch(); controls.update(); renderer.render(scene,camera);
}
animate();

// periodic spawn
setInterval(()=>{ spawnOrb(new THREE.Vector3((Math.random()-0.5)*2, 0.8 + Math.random()*1.4, (Math.random()-0.5)*2)); }, 2600);

// responsive
window.addEventListener('resize', ()=>{ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// initial hint and make sure audio resumes on user gesture
setTimeout(()=>{ gameHint.textContent = 'Welcome! Drag to rotate the cube, click orbs to collect points. Touch the name for a rainbow glitch effect.'; }, 1200);

// LDM default detection on low-power devices
if(/Mobi|Android/i.test(navigator.userAgent)){
  // mobile: keep full effects if user allowed; otherwise apply LDM
}

// expose a simple API for debugging
window.bluxli = { scene, cube, saveScore, highScores };
