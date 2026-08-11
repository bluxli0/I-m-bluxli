// main.js — Three.js interactive cube with mini-games
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.154.0/examples/jsm/controls/OrbitControls.js';

// Basic renderer/scene/camera setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 1.2, 3.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Environment-style subtle background light
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7.5);
scene.add(dir);

// Point light that follows pointer for interactive shading
const pointerLight = new THREE.PointLight(0x9be8ff, 0.8, 10, 2);
pointerLight.position.set(0,2,2);
scene.add(pointerLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.6;
controls.maxDistance = 8;

// Helpers
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoverIntersect = null;

// State
let score = 0;
const scoreEl = document.getElementById('score');
const gameHint = document.getElementById('gameHint');

// Particle pool for simple particle effects
const particles = [];

// Create procedural textures using canvas for each face of the cube
function makeFaceTexture({bgA='#0b2440', bgB='#082033', text='', accent='#7ce7ff', emblemColor='#ff8fb8'}){
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  // gradient background
  const g = ctx.createLinearGradient(0,0,size,size);
  g.addColorStop(0,bgA);
  g.addColorStop(1,bgB);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,size,size);

  // subtle noise
  for(let i=0;i<4000;i++){
    ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.02})`;
    ctx.fillRect(Math.random()*size, Math.random()*size, 1,1);
  }

  // emblem (circle)
  ctx.beginPath();
  ctx.fillStyle = emblemColor;
  ctx.globalAlpha = 0.18;
  ctx.arc(size*0.22, size*0.28, size*0.18, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // big stylized name or character mark
  ctx.font = '120px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillText(text.toUpperCase(), size*0.5, size*0.6);

  // bright accent stroke for top layers
  ctx.font = '72px system-ui, Arial';
  ctx.fillStyle = accent;
  ctx.fillText(text, size*0.5, size*0.78);

  // border
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 30;
  ctx.strokeRect(15,15,size-30,size-30);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

// Create the cube with custom UV offsets and materials
function createOCube(){
  const geometry = new THREE.BoxGeometry(1.6,1.6,1.6);

  // tweak UV mapping a bit to make each face use a different portion (demonstration)
  const uvAttr = geometry.attributes.uv;
  // shift uvs on some faces to create variety
  for(let i=0;i<uvAttr.count;i++){
    // small procedural warp
    uvAttr.setX(i, uvAttr.getX(i) * (0.9 + 0.2*Math.sin(i*4)));
    uvAttr.setY(i, uvAttr.getY(i) * (0.9 + 0.18*Math.cos(i*3)));
  }
  uvAttr.needsUpdate = true;

  // materials per face
  const faces = [
    makeFaceTexture({bgA:'#042033',bgB:'#061927',text:'bluxli',accent:'#7ce7ff',emblemColor:'#ff8fb8'}),
    makeFaceTexture({bgA:'#1b1b3a',bgB:'#071036',text:'OC',accent:'#ffd47c',emblemColor:'#7ce7ff'}),
    makeFaceTexture({bgA:'#082025',bgB:'#05213a',text:'art',accent:'#a4ffb0',emblemColor:'#ffb4f0'}),
    makeFaceTexture({bgA:'#08112a',bgB:'#041227',text:'cube',accent:'#d6b7ff',emblemColor:'#7ce7ff'}),
    makeFaceTexture({bgA:'#071326',bgB:'#022033',text:'unique',accent:'#7ce7ff',emblemColor:'#ffd9a3'}),
    makeFaceTexture({bgA:'#061a2b',bgB:'#03203a',text:'live',accent:'#7ce7ff',emblemColor:'#8df0ff'})
  ];

  const mats = faces.map(t=>new THREE.MeshStandardMaterial({map:t, roughness:0.45, metalness:0.18}));
  const cube = new THREE.Mesh(geometry, mats);
  cube.castShadow = true;
  cube.receiveShadow = true;
  return cube;
}

const cube = createOCube();
scene.add(cube);

// subtle floating motion
let clock = new THREE.Clock();

// interactive orb spawner for Collector game
function spawnOrb(pos){
  const g = new THREE.SphereGeometry(0.06, 16, 16);
  const m = new THREE.MeshStandardMaterial({emissive:0x7ce7ff,emissiveIntensity:1,metalness:0.1,roughness:0.2});
  const s = new THREE.Mesh(g,m);
  s.position.copy(pos);
  s.userData.v = new THREE.Vector3((Math.random()-0.5)*0.02,0.06+Math.random()*0.04,(Math.random()-0.5)*0.02);
  scene.add(s);
  particles.push(s);
}

// initial orbs
for(let i=0;i<6;i++){
  spawnOrb(new THREE.Vector3((Math.random()-0.5)*2, 0.6 + Math.random()*1.2, (Math.random()-0.5)*2));
}

// click shooting: spawn small projectile from camera
function shootFromCamera(ndcX, ndcY){
  const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
  const dir = vec.sub(camera.position).normalize();
  const g = new THREE.SphereGeometry(0.03,8,8);
  const m = new THREE.MeshStandardMaterial({color:0xffe18b,emissive:0xffe18b,emissiveIntensity:0.9});
  const proj = new THREE.Mesh(g,m);
  proj.position.copy(camera.position);
  proj.userData.v = dir.multiplyScalar(0.25);
  proj.userData.life = 200;
  scene.add(proj);
  particles.push(proj);
}

// fireworks effect
function fireworks(origin){
  const group = new THREE.Group();
  const n = 60;
  for(let i=0;i<n;i++){
    const g = new THREE.SphereGeometry(0.02,6,6);
    const c = new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(Math.random(),0.7,0.6)});
    const p = new THREE.Mesh(g,c);
    p.position.copy(origin);
    p.userData.v = new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2, (Math.random()-0.5)*2).multiplyScalar(0.4);
    p.userData.life = 120 + Math.random()*100;
    group.add(p);
    particles.push(p);
    scene.add(p);
  }
}

// rotate-match helper
let rotateTarget = null;
let rotateMatchActive = false;
function startRotateMatch(){
  rotateTarget = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    (Math.random()-0.5)*Math.PI*2,
    (Math.random()-0.5)*Math.PI*2,
    (Math.random()-0.5)*Math.PI*2
  ));
  rotateMatchActive = true;
  gameHint.textContent = 'Rotate the cube to match the target orientation!';
  // visual hint: spawn a translucent target cube at small scale
  const targetCube = createOCube();
  targetCube.scale.setScalar(0.5);
  targetCube.position.set(-2.2, 0.5, -1);
  targetCube.userData.isTarget = true;
  scene.add(targetCube);
  // animate target to show orientation
  targetCube.quaternion.copy(rotateTarget);
  setTimeout(()=>{
    // remove target after 9 seconds
    scene.remove(targetCube);
  }, 9000);
}

function checkRotateMatch(){
  if(!rotateMatchActive) return;
  const delta = cube.quaternion.angleTo(rotateTarget);
  if(delta < 0.25){
    rotateMatchActive = false;
    score += 40;
    scoreEl.textContent = score;
    gameHint.textContent = 'Great! Rotate Match complete — fireworks!';
    fireworks(cube.position.clone());
  }
}

// mouse / touch handlers
function onPointerMove(e){
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  // pointer light
  const p3 = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
  pointerLight.position.lerp(p3, 0.12);
}

function onPointerDown(e){
  // click interactions
  const rect = renderer.domElement.getBoundingClientRect();
  const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  // shoot a projectile
  shootFromCamera(ndcX, ndcY);

  // raycast to check orb clicking
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(particles.concat(cube), true);
  if(intersects.length){
    const it = intersects[0].object;
    // if orb (MeshStandardMaterial with emissive) remove & score
    if(it.geometry && it.geometry.type === 'SphereGeometry' && it.material && it.material.emissive){
      scene.remove(it);
      const idx = particles.indexOf(it);
      if(idx>=0) particles.splice(idx,1);
      score += 10;
      scoreEl.textContent = score;
      // spawn two small orbs
      for(let i=0;i<2;i++) spawnOrb(new THREE.Vector3(it.position.x + (Math.random()-0.5)*0.3, it.position.y+0.2, it.position.z + (Math.random()-0.5)*0.3));
    }
    // if clicked on cube face, change that face texture accent color
    if(it.object === cube){
      const faceIndex = Math.floor(it.faceIndex / 2);
      // recolor that face by generating a new texture and applying
      const newTex = makeFaceTexture({bgA:'#0b2b2b',bgB:'#061e2f',text:'bluxli',accent:'#'+Math.floor(Math.random()*16777215).toString(16),emblemColor:'#'+Math.floor(Math.random()*16777215).toString(16)});
      cube.material[faceIndex].map = newTex;
      cube.material[faceIndex].needsUpdate = true;
      score += 5;
      scoreEl.textContent = score;
    }
  }
}

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerdown', onPointerDown);

// UI controls
document.getElementById('startRotateMatch').addEventListener('click', ()=>{
  startRotateMatch();
});
document.getElementById('spawnTargetCube').addEventListener('click', ()=>{
  // spawn bigger target cube that slowly orbits
  const t = createOCube(); t.scale.setScalar(0.8); t.position.set(2.2,0.8,-0.5); scene.add(t);
  t.userData.orbit = true;
  setTimeout(()=>{ scene.remove(t); }, 12000);
});

document.getElementById('resetScene').addEventListener('click', ()=>{
  // reset score & cleanup
  score = 0; scoreEl.textContent = score; gameHint.textContent = 'Reset — try the mini-games again!';
});

// responsive
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
});

// animation loop
function animate(){
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // floating
  cube.position.y = Math.sin(t*0.8)*0.06;
  cube.rotation.x += 0.002;
  cube.rotation.y += 0.004;

  // particles update
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    if(!p) continue;
    if(p.userData.v){
      p.position.add(p.userData.v);
      p.userData.v.y -= 0.01 * (p.userData.v.length()*0.08 + 1); // gravity-ish
    }
    if(p.userData.life !== undefined){
      p.userData.life--;
      if(p.userData.life<0){ scene.remove(p); particles.splice(i,1); continue; }
    }
  }

  // orbit helpers
  scene.traverse(obj=>{
    if(obj.userData && obj.userData.orbit){ obj.rotation.y += 0.008; obj.position.applyAxisAngle(new THREE.Vector3(0,1,0), 0.002); }
  });

  // raycast hover for cube highlighting
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(cube);
  if(intersects.length){
    hoverIntersect = intersects[0];
    cube.scale.lerp(new THREE.Vector3(1.03,1.03,1.03), 0.08);
  } else {
    hoverIntersect = null;
    cube.scale.lerp(new THREE.Vector3(1,1,1), 0.06);
  }

  // check rotate match
  checkRotateMatch();

  controls.update();
  renderer.render(scene, camera);
}

animate();

// little UI: spawn orbs periodically to keep the scene lively
setInterval(()=>{ spawnOrb(new THREE.Vector3((Math.random()-0.5)*2, 0.8 + Math.random()*1.4, (Math.random()-0.5)*2)); }, 2800);

// initial hint
setTimeout(()=>{ gameHint.textContent = 'Welcome! Drag to rotate the cube, click orbs to collect points.'; }, 1200);
