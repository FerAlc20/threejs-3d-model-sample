// Importa Three.js y utilidades:
//  - GLTFLoader: para cargar modelos .gltf/.glb
//  - OrbitControls: control de cámara con mouse (orbitar/zoom)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ----- RENDERER (motor de dibujo WebGL) -----
const renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias suaviza bordes dentados
renderer.outputColorSpace = THREE.SRGBColorSpace;              // respeta el espacio de color sRGB (correcto para glTF)
renderer.setSize(window.innerWidth, window.innerHeight);       // ocupa todo el viewport
renderer.setClearColor(0x000000);                              // color de fondo (negro)
renderer.setPixelRatio(window.devicePixelRatio);               // nitidez en pantallas HiDPI

// Sombras: activadas con un filtro suave (PCFSoftShadowMap)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Inserta el lienzo <canvas> de WebGL en el DOM
document.body.appendChild(renderer.domElement);

// ----- ESCENA -----
const scene = new THREE.Scene(); // contenedor de todo (mallas, luces, cámara, etc.)

// ----- CÁMARA -----
// Perspectiva: fov=45°, relación de aspecto de la ventana, plano cercano=1, lejano=1000
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
// Posiciona la cámara para ver el modelo desde cierta altura y distancia
camera.position.set(4, 5, 11);

// ----- CONTROLES ORBITALES -----
// Permiten rotar/acerar/alejar la cámara con el mouse (y toques)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;   // amortiguación inercial (movimiento suave)
controls.enablePan = false;      // desactiva desplazamiento lateral (opcional)
controls.minDistance = 5;        // límite mínimo de zoom (distancia a target)
controls.maxDistance = 20;       // límite máximo de zoom
controls.minPolarAngle = 0.5;    // ángulo mínimo vertical (en radianes) ~28.6°
controls.maxPolarAngle = 1.5;    // ángulo máximo vertical (en radianes) ~85.9°
controls.autoRotate = false;     // no gira solo
controls.target = new THREE.Vector3(0, 1, 0); // punto al que “mira” la cámara
controls.update();               // aplicar los límites/ajustes iniciales

// ----- SUELO (PLANO) -----
// Geometría de plano 20x20 subdividido (subdivisiones útiles si luego lo deformas o aplicas efectos)
const groundGeometry = new THREE.PlaneGeometry(20, 20, 32, 32);
// Rota el plano 90° para que quede horizontal (por defecto mira al +Z)
groundGeometry.rotateX(-Math.PI / 2);

// Material estándar (PBR básico) de color gris medio, visible por ambas caras
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x555555,
  side: THREE.DoubleSide
});

// Malla del suelo; recibe sombras
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.castShadow = false;   // el suelo no proyecta sombra sobre otros
groundMesh.receiveShadow = true; // pero sí recibe sombras de otros objetos
scene.add(groundMesh);

// ----- ILUMINACIÓN (FOCO) -----
// SpotLight(color, intensidad, distancia, ángulo, penumbra)
//  - intensidad alta (3000) porque no hay exposición/toneMapping activados; ajusta según look
//  - distancia 100: más allá de esto la luz deja de afectar
//  - ángulo 0.22 rad (~12.6°): haz relativamente estrecho
//  - penumbra 1: bordes del cono suavizados al máximo
const spotLight = new THREE.SpotLight(0xffffff, 3000, 100, 0.22, 1);
spotLight.position.set(0, 25, 0);  // luz arriba del escenario
spotLight.castShadow = true;       // la luz emite sombras
spotLight.shadow.bias = -0.0001;   // pequeño sesgo para reducir “acné” de sombras
scene.add(spotLight);

// ----- CARGA DEL MODELO GLTF -----
// setPath define el directorio base desde donde GLTFLoader buscará los archivos
// Nota: al cargar "scene.gltf", Three también buscará automáticamente sus .bin y texturas relativas a este path
const loader = new GLTFLoader().setPath('/millennium_falcon/');

loader.load(
  'scene.gltf',
  (gltf) => {
    console.log('loading model');

    const mesh = gltf.scene; // gltf.scene contiene la jerarquía de nodos del modelo

    // Recorre todos los nodos para habilitar sombras en las mallas
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;    // que proyecte sombra
        child.receiveShadow = true; // que pueda recibir sombra
      }
    });

    // Posiciona el modelo un poco sobre el suelo y ligeramente hacia atrás en Z
    mesh.position.set(0, 1.05, -1);
    scene.add(mesh);

    // Oculta el contenedor de progreso si está presente en el DOM
    // (Asegúrate de tener <div id="progress-container"> en tu HTML si quieres ver la barra/spinner)
    document.getElementById('progress-container').style.display = 'none';
  },
  (xhr) => {
    // Progreso de carga (0–100%). Ten en cuenta que xhr.total puede ser 0 en algunos servidores
    console.log(`loading ${xhr.loaded / xhr.total * 100}%`);
  },
  (error) => {
    console.error(error); // Manejo de errores de carga (ruta incorrecta, CORS, archivos faltantes, etc.)
  }
);

// ----- RESPONSIVE / RESIZE -----
// Ajusta cámara y renderer cuando cambia el tamaño de la ventana
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; // nueva relación de aspecto
  camera.updateProjectionMatrix();                         // recalcular la proyección
  renderer.setSize(window.innerWidth, window.innerHeight); // redimensionar canvas
});

// ----- BUCLE DE RENDER (ANIMACIÓN) -----
// requestAnimationFrame sincroniza con la frecuencia de refresco del navegador
function animate() {
  requestAnimationFrame(animate);

  // Con enableDamping=true, OrbitControls necesita update() cada frame
  controls.update();

  // Dibuja la escena desde la perspectiva de la cámara
  renderer.render(scene, camera);
}

animate(); // inicia el bucle
