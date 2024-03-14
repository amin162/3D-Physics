import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    0.1, 1000
    );
const renderer = new THREE.WebGLRenderer();
const controls = new OrbitControls( camera, renderer.domElement );
scene.background = new THREE.Color(0x333333);
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//Declare dat.gui
const gui = new dat.GUI({ width: 300, height: 400 });

// Camera position
camera.position.set(0, 0, 250);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Initialize Light
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.y = -300;
light.position.z = 200;
light.castShadow = true;
scene.add(light);

// Setting ceilling
const ceillingGeometry = new THREE.BoxGeometry(300, 0.5, 100);
const ceillingMaterial = new THREE.MeshStandardMaterial(
    {color:0xffffff, 
     side: THREE.DoubleSide});
const ceillingMesh = new THREE.Mesh(ceillingGeometry, ceillingMaterial);
ceillingMesh.position.y = 100;
ceillingMesh.receiveShadow = true;
scene.add(ceillingMesh);

//Initialize value
const k = 0.01;
const radius = 5;
const restLength = 5;
const spacing = radius-100;
const fixedPoints = ceillingMesh.position.y - radius;
let particles = [];
let springs = [];


//Initialize dat.gui controller
const config = {
  gravity: -0.1,
  positionX: 0
};

//Particle Class 
class Particle {
  constructor(x, y, z) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3(0, config.gravity, 0);
    this.mass = 1;

    this.particleGeometry = new THREE.SphereGeometry(radius, 32, 32);
    this.particleMaterial = new THREE.MeshStandardMaterial(
        {color: 0xffff00, 
         side: THREE.DoubleSide,
         transparent: true});
         
    this.particleMesh = new THREE.Mesh(
        this.particleGeometry, 
        this.particleMaterial
      );
   }

  applyForce(force) {
    let f = force.clone();
    f.divideScalar(this.mass);
    this.acceleration.add(f);
  }

  update() {
    this.velocity.multiplyScalar(0.99);
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.acceleration.multiplyScalar(0);
  }

  display() {
    this.particleMesh.position.copy(this.position);
    scene.add(this.particleMesh);
  }
}

class RopeSpring {
  constructor(k, a, b, restLength, aMass, bMass) {
    this.k = k;
    this.restLength = restLength;
    this.a = a;
    this.b = b;
    this.aMass = aMass;
    this.bMass = bMass

    this.segments = 20;
    this.tubeRadius = 2;
    this.radiusSegments = 8;
    this.closed  = false;
    this.linePath = new THREE.CatmullRomCurve3([this.a.position, this.b.position]);

    // Create TubeGeometry
    this.tubeGeometry = new THREE.TubeGeometry(
      this.linePath,
      this.segments,
      this.tubeRadius,
      this.radiusSegments,
      this.closed
    );
    this.tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    this.tubeMesh = new THREE.Mesh(this.tubeGeometry, this.tubeMaterial);
  }

  update() {
    let force = new THREE.Vector3().subVectors(this.a.position, this.b.position);
    let x = force.length() - this.restLength;
    force.normalize();
    force.multiplyScalar(k * x);
    force.multiplyScalar(-1);
    this.a.velocity.multiplyScalar(0.9);
    this.a.velocity.add(force);
    this.a.velocity.add(this.a.acceleration);
    this.a.position.add(this.a.velocity);
  }

  display() {
   this.linePath.points[0].copy(this.a.position);
   this.linePath.points[1].copy(this.b.position);
   this.tubeGeometry.dispose();
   this.tubeGeometry = new THREE.TubeGeometry(
    this.linePath,
    this.segments,
    this.tubeRadius,
    this.radiusSegments,
    this.closed
  );
  this.tubeMesh.geometry = this.tubeGeometry;
  this.tubeMesh.geometry.dispose();
  scene.add(this.tubeMesh);
  }
}

//Add paratmeters to the GUI
gui.add(config, "gravity", -1, -0).step(0.1).name("Gravity");
gui.add(config, "positionX", -100, 100);

//Initialize Particles and Springs
for(let i = 0; i < 10; i++){
  particles[i] = new Particle(i*spacing, fixedPoints+i*spacing, 0);
  if(i !== 0){
    let a = particles[i];
    let b = particles[i-1];
    let spring = new RopeSpring(k, a, b, restLength, a.mass, b.mass);
    springs.push(spring);
  }
}


// Render loop
function animate() {
    requestAnimationFrame(animate);
    // Update springs
    for(let s of springs){
      s.display();
      s.update();
    }
    
    // Update Particles
    for(let particle of particles){
      particle.display();
      particle.acceleration.y = config.gravity; //Customizing gravity
    }

    //Adjust the first particle position
    particles[0].position.x = config.positionX;
    
    // Render scene
    renderer.render(scene, camera);
}

animate();