let transition = {phase : 0.0};

let currentSongIndex = 0;
let songTitleList = ["UNVEIL","REFLECTION","NEVER MAKE IT","RED HAZE"];

function wait({ ms = 0, second = 0, s = 0 } = {}) {
  const delay = ms + (second + s) * 1000;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function smoothstep(edge0, edge1, x) {
  // Scale, bias and saturate x to 0..1 range
  let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  // Evaluate polynomial
  return t * t * (3 - 2 * t);
}




const titleSpan = document.getElementById("SongTitleSpan");
const leftButton = document.getElementById("LeftButton");
const rightButton = document.getElementById("RightButton");

async function changeTitleType(newTitle) {
  titleSpan.classList.add("highlighted");

  await wait({ ms: 300 });
  
  titleSpan.classList.remove("highlighted");
  titleSpan.innerText = "";

  await wait({ second: 1 });
  for (const letter of newTitle) {
    titleSpan.innerText += letter;
    await wait({ ms: 100 });
  }
}

function randomUppercase() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
  return letters[Math.floor(Math.random() * letters.length)];
}
async function changeTitleRandom(newTitle) {
  titleSpan.innerText = "";
  for (const letter of newTitle) {
    titleSpan.innerText += randomUppercase();
  }
  
  let newText = titleSpan.innerText.split("");

  for (let i = 0; i < newTitle.length; i++) {
    (async () => {
      let changeTimes = 10 + Math.floor(Math.random() * 50);
  
      while (changeTimes > 0) {
        newText[i] = randomUppercase();
        titleSpan.innerText = newText.join("");
  
        await wait({ second: 0.5 / changeTimes });
        changeTimes--;
      }
  
      // lock correct letter
      newText[i] = newTitle[i];
      titleSpan.innerText = newText.join("");
    })();
  }
}


function update(){
  const step = 0.01
  if(transition.phase > currentSongIndex){
    transition.phase -= step;
  }else if(transition.phase < currentSongIndex){
    transition.phase += step;
  }
  if(Math.abs(transition.phase-currentSongIndex)<step){
    transition.phase = currentSongIndex;
  }
  leftButton.style.opacity = smoothstep(0,1,transition.phase)
  rightButton.style.opacity = smoothstep(3,2,transition.phase)
  requestAnimationFrame(update);
}
update()

leftButton.onclick = ()=>{
  if(transition.phase == currentSongIndex && currentSongIndex > 0){
    currentSongIndex--;
    changeTitleRandom(songTitleList[currentSongIndex]);
  }
}

rightButton.onclick = ()=>{
  if(transition.phase == currentSongIndex && currentSongIndex < 3){
    currentSongIndex++;
    changeTitleRandom(songTitleList[currentSongIndex]);
  }
}
// changeTitleRandom("REFLECTION");





/**********************THREE JS SECTION**********************/


import * as THREE from "three";
import {OrbitControls} from "jsm/controls/OrbitControls.js";

import { FontLoader } from 'jsm/loaders/FontLoader.js';
import { TextGeometry } from 'jsm/geometries/TextGeometry.js';
import * as BufferGeometryUtils from 'jsm/utils/BufferGeometryUtils.js';

import { Reflector } from 'jsm/objects/Reflector.js';

// import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';

import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';




// const gui = new GUI();
// gui.add(transition,"phase",0.0,3.0,0.01).name('Transition between song');
const canvas = document.querySelector("#threejsbg");
// const renderer = new THREE.WebGLRenderer({ canvas });
const w = window.innerWidth;
const h = window.innerHeight; 
const renderer = new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setSize(w,h);
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();

const scene = new THREE.Scene();

const fov = 75; 
const aspect = w/h;
const near = 0.1;
const far = 40;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 4;

scene.background = new THREE.Color(0x000000);
// scene.background = new THREE.Color(0xe1e5f0);

// textureLoader.load('skybox.png', texture => {
//   const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
//   rt.fromEquirectangularTexture(renderer, texture);
//   scene.background = rt.texture;
// });


const urls = [
  'Uskybox.png',
  'Rskybox.png',
  'NMIskybox.png',
  'RHskybox.png'
];

const skyboxes = new Array(urls.length);

urls.forEach((url, i) => {
  textureLoader.load(url, tex => {
    const rt = new THREE.WebGLCubeRenderTarget(tex.image.height);
    rt.fromEquirectangularTexture(renderer, tex);
    skyboxes[i] = rt.texture;
  });
});
const skyUniforms = {
  texA: { value: null },
  texB: { value: null },
  blend: { value: 0.0 }
};

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: `
    varying vec3 vWorldDirection;
    void main() {
      vec4 pos = modelMatrix * vec4(position, 1.0);
      vWorldDirection = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform samplerCube texA;
    uniform samplerCube texB;
    uniform float blend;
    varying vec3 vWorldDirection;
    void main() {
      vec4 colA = textureCube(texA, vWorldDirection);
      vec4 colB = textureCube(texB, vWorldDirection);
      gl_FragColor = mix(colA, colB, blend);
    }
  `,
  side: THREE.BackSide
});

const skyMesh = new THREE.Mesh(
  new THREE.BoxGeometry(40, 40, 40),
  skyMaterial
);
scene.add(skyMesh);


const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;


const planeGeo = new THREE.PlaneGeometry(10, 10);
const reflector = new Reflector(planeGeo, {
  clipBias: 0.003,
  textureWidth: window.innerWidth,
  textureHeight: window.innerHeight,
  color: 0xffffff,
});

reflector.position.y -= 1.2;
reflector.position.z -= 1;
reflector.rotation.x = -Math.PI / 2;
const reflectionTexture = reflector.getRenderTarget().texture;

reflector.material = new THREE.ShaderMaterial({
  uniforms: {
    tReflection: { value: reflectionTexture },
    texelSize : { value: new THREE.Vector2(1 / window.innerWidth, 1 / window.innerHeight)},
    cameraPos : { value: camera.position },
    transitionPhase: { value: transition.phase }
  },
  vertexShader: /* glsl */`
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  uniform float transitionPhase;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }

  `,
  fragmentShader: /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform sampler2D tReflection;
  uniform float transitionPhase;
  uniform vec3 cameraPos;
  uniform vec2 texelSize; // 1 / texture resolution

  void main() {
    
    int dist = int((3.5-distance(vWorldPosition, cameraPos))*5.0);
    // float dist = (3.5-distance(vWorldPosition, cameraPos))*5.0;
    vec4 sum = vec4(0.0);

    int blur = dist;
    float combinedPixel = 0.0;
    for (int x = -blur; x <= blur; x++) {
      for (int y = -blur; y <= blur; y++) {
        vec2 offset = vec2(float(x), float(y)) * texelSize;
        sum += texture2D(tReflection, vUv + offset);
        combinedPixel++;
      }
    }
    

    gl_FragColor = (sum / float(combinedPixel)) * distance(vWorldPosition, cameraPos)/6.0;
    gl_FragColor *= 1.0/max(gl_FragColor.a,0.01);
    gl_FragColor *= smoothstep(1.0,0.0,transitionPhase);

  }
`,transparent: true
});
scene.add(reflector);

const NMImountGradientTexture = new THREE.TextureLoader().load('NMIgroundGradientMap.png');
NMImountGradientTexture.magFilter = THREE.NearestFilter;

const RHmountGradientTexture = new THREE.TextureLoader().load('RHgroundGradientMap.png');
RHmountGradientTexture.magFilter = THREE.NearestFilter;

 const mountMaterial = new THREE.ShaderMaterial({
  uniforms: {
    NMIGradientMap: { value: NMImountGradientTexture },
    RHGradientMap: { value: RHmountGradientTexture },
    cameraPos : { value: camera.position },
    transitionPhase: { value: transition.phase }
  },
  vertexShader: /* glsl */`
    uniform float transitionPhase;
    varying vec3 vWorldPosition;

    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_Position.y -= pow(4.0*min(0.0,transitionPhase-2.0),2.0);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vWorldPosition;

    uniform sampler2D NMIGradientMap;
    uniform sampler2D RHGradientMap;
    uniform vec3 cameraPos;
    uniform float transitionPhase;

    void main() {
      
      float uMinDist = 2.0;
      float uMaxDist = 10.0;
      float dist = distance(vWorldPosition, cameraPos);
      dist = distance(vWorldPosition.z, cameraPos.z);

      float t = clamp((dist - uMinDist) / (uMaxDist - uMinDist), 0.0, 1.0);

      vec4 NMIcolor = texture2D(NMIGradientMap, vec2(t, 0.5));
      vec4 RHcolor = texture2D(RHGradientMap, vec2(t, 0.5));

      gl_FragColor = mix(NMIcolor,RHcolor,transitionPhase-2.0);
      

    }
  
`,transparent: true
});

const loader = new GLTFLoader();

loader.load('blender/mount1.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.center();
    
    child.material = mountMaterial
      scene.add(child);

      child.position.x -=3
      child.position.y -=8
      child.position.z -=5

      child.scale.set(6.7,6.7,5)
    }
  });
});
loader.load('blender/mount2.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.center();
    
    child.material = mountMaterial
      scene.add(child);

      child.position.x -=0.5
      child.position.y -=4.8
      child.position.z -=0.5

      child.scale.set(4.5,4.5,5)
    }
  });
});
loader.load('blender/mount3.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.center();
    
    child.material = mountMaterial
      scene.add(child);

      child.position.x -=3
      child.position.y -=2.7
      child.position.z +=3

      child.scale.set(3.5,3.5,5)
    }
  });
});
loader.load('blender/mount4.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.center();
    
    child.material = mountMaterial
      scene.add(child);

      child.position.x -=0.8
      child.position.y -=0.8
      child.position.z +=5

      child.scale.set(2,2,2)
    }
  });
});


const geometry = new THREE.IcosahedronGeometry(1.1, 8);

const unveilGradientTexture = textureLoader.load('UshapeGradientMap.png');
const reflectionGradientTexture = textureLoader.load('RshapeGradientMap.png');
const redHazeGradientTexture = textureLoader.load('RHshapeGradientMap.png');
const neverMakeItGradientTexture = textureLoader.load('NMIshapeGradientMap.png');


let material = new THREE.ShaderMaterial({
  uniforms: {
    uUnveilGradientMap    : { value: unveilGradientTexture },
    uReflectionGradientMap: { value: reflectionGradientTexture },
    uRedHazeGradientMap   : { value: redHazeGradientTexture },
    uNeverMakeItGradientMap: { value: neverMakeItGradientTexture },
    uLightDirection: { value: new THREE.Vector3(0, -1, 0).normalize() },
    uTransitionPhase: { value: transition.phase }
  },
  vertexShader: /* glsl */`
  varying vec3 vPosition;
  varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    // uniform float uTime;
    // varying vec3 vPos;
    // void main(){
    //   float p = 1.0 + 0.1*sin(uTime+position.x*500.0+position.y*500.0);
    //   vec3 pos = position*p;
    //   vPos = pos;
    //   gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1.0);
    // } 
  }`,
  fragmentShader: /*glsl*/`
    uniform float uTransitionPhase;

    varying vec3 vPosition;
    uniform sampler2D uUnveilGradientMap;

    
    uniform vec3 uLightDirection;
    varying vec3 vNormal;
    
    uniform sampler2D uReflectionGradientMap;
    uniform sampler2D uRedHazeGradientMap;
    uniform sampler2D uNeverMakeItGradientMap;

    void main() {


      float r = length(vPosition);
      float x = (r - 1.01) * 4.0;
      vec4 unveilColor = texture2D(uUnveilGradientMap, vec2(x, 0.5));

      
      float light = dot(normalize(vNormal), normalize(uLightDirection));
      float t = clamp(light * 0.5 + 0.5, 0.0, 1.0);

      vec4 reflColor = texture2D(uReflectionGradientMap, vec2(t, 0.5));
      vec4 nmiColor = texture2D(uNeverMakeItGradientMap, vec2(t, 0.5));
      vec4 redhColor = texture2D(uRedHazeGradientMap, vec2(t, 0.5));

      // gl_FragColor = unveilColor/(1.0+64.0*(uTransitionPhase-0.0)*(uTransitionPhase-0.0))
      //              + reflColor/(1.0+64.0*(uTransitionPhase-1.0)*(uTransitionPhase-1.0))
      //              + nmiColor/(1.0+64.0*(uTransitionPhase-2.0)*(uTransitionPhase-2.0))
      //              + redhColor/(1.0+64.0*(uTransitionPhase-3.0)*(uTransitionPhase-3.0));

      // float exponent = 4.0;
      // float multiplier = 16.0;
      
      float exponent = 6.0;
      float multiplier = 64.0;
      
      // float exponent = 8.0;
      // float multiplier = 256.0;
      
      gl_FragColor = unveilColor /(1.0+multiplier*pow((uTransitionPhase-0.0),exponent))
                   + reflColor   /(1.0+multiplier*pow((uTransitionPhase-1.0),exponent))
                   + nmiColor    /(1.0+multiplier*pow((uTransitionPhase-2.0),exponent))
                   + redhColor   /(1.0+multiplier*pow((uTransitionPhase-3.0),exponent));
      gl_FragColor.a = 1.0;
    }
  `
});
// textureLoader.load("getcha.png", (texture) => {
//   texture.mapping = THREE.EquirectangularReflectionMapping;
//   scene.environment = texture;
// });
const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,       // pure white base
  metalness: 1.0,        // maximum metal
  roughness: 0.0,        // perfectly smooth
  envMapIntensity: 1.0   // how strong the reflections show
});
const mesh = new THREE.Mesh(geometry, material);
    const wireMat = new THREE.MeshBasicMaterial({
        color:0xffffff,
        wireframe:true,
        transparent: true,
        opacity: 0.25, 
    });
    const wireMesh = new THREE.Mesh(geometry,wireMat)
    wireMesh.scale.setScalar(1.005)
    mesh.add(wireMesh);
scene.add(mesh);

const positionAttr = geometry.getAttribute('position');
const positionAttrClone = positionAttr.clone();
  
let beating = false;
document.querySelector("canvas").addEventListener("click",()=>{
  beating = !beating
})
let time = 0;
window.addEventListener('resize', () => {
  
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();

})
function animate(t=0){
  // transition.phase =( t/2000 )%5 - 1

  
  mesh.rotation.y = Math.PI*2 * t/50000;

  for (let i = 0; i < positionAttrClone.count; i++) {
    const x = positionAttrClone.getX(i);
    const y = positionAttrClone.getY(i);
    const z = positionAttrClone.getZ(i);
  
    const r = Math.sqrt(x*x + y*y + z*z);
    const theta = Math.atan2(z, x);
    const phi = Math.acos(y / r); 
      
    const u = t / Math.PI * 0.02;

    let petrusion = 0;

    if(beating){
      time += Math.max(0,Math.sin(t/80))/(10000*Math.PI)
    }else{
      time += 1/100000
    }
    petrusion = 1+(Math.sin(time+(phi*500+theta*500)))*0.1;
    
    // petrusion = 1+(Math.sin(time+(x*5000+y*7000+z*9000)))*0.1;
  
  
    positionAttr.setXYZ(
      i,
      x*petrusion,y*petrusion,z*petrusion
    );
  }
  positionAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  
    requestAnimationFrame(animate);
    renderer.render(scene,camera);
    // controls.update();
    // console.log((1.0/(1.0+64.0*transition.phase*transition.phase)))
    material.uniforms.uTransitionPhase.value = transition.phase;
    reflector.material.uniforms.transitionPhase.value = transition.phase;
    mountMaterial.uniforms.transitionPhase.value = transition.phase;

    
    // mountMaterial.opacity = smoothstep(0.7,1.0,transition.phase)
    reflector.position.y = -1.2 - 1 + 1 * (1/(1.0+4*transition.phase*transition.phase));

    if(transition.phase > 1){
      reflector.position.z = 10;
    }else{
      reflector.position.z = -1;
    }

    // sky transition 
    const index = Math.floor(transition.phase);        // 0,1,2
    const phaseFraction = transition.phase - index;                // fractional part [0,1)
  
    skyUniforms.texA.value = skyboxes[index];
    skyUniforms.texB.value = skyboxes[index + 1];
    skyUniforms.blend.value = phaseFraction;
    
}
animate()