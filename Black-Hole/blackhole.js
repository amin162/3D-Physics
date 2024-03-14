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

// Camera position
camera.position.set(0, 0, 600);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Initialize Light
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.y = 3;
light.position.z = 2;
light.castShadow = true;
scene.add(light);

//Set the value of the constant to calculate the force of the M87 black hole
const c = 299792458; // Speed of light = 299.792.458 m/s
const G = 6.674e-11; // Universal gravitional constant 6.674 x 10^11
const M87 = 6.5e9; // Mass of M87 Black Hole 6.5 x 10^9
const scaleFactor = 10e7; // 1 unit = 1 million solar masses
const scaledM87 = M87/scaleFactor;
const scaledG = G/scaleFactor;

// The value above can be necessary if we can find an appropriate the value of 
// scaling factor to re-visualize photons and black hole interactions,
// the scaling factor can re customized, but not for the speed of light.
// Rescaling the speed of light would essentially mean altering the fundamental 
// structure of spacetime as described by relativity, leading to inconsistencies 
// and contradictions within the theory

//Simulation value to approach visualization
const smallerC = 30;
const smallerG = 5;
const smallerM87 = 6500;
const dt = 0.2;


class BlackHole {
    constructor(x, y, z, m, c, g) {
        this.position = new THREE.Vector3(x, y, z);
        this.mass = m;
        this.g = g;
        this.c = c;
        //rs : Schwarzschild's radius, to calculate the distance of 
        //     the center of the black hole to the event horizon 
        this.rs = (2 * this.g * this.mass)/(c*c); 

        this.blackHoleGeometry = new THREE.SphereGeometry(this.rs, 10, 10);
        this.blackHoleMesh = new THREE.MeshStandardMaterial(
        {color: 0x156289, side: THREE.DoubleSide ,transparent: true, wireframe:true});
        this.mesh = new THREE.Mesh(
            this.blackHoleGeometry, 
            this.blackHoleMesh
        )
    }

    pull(photon) {
        const force = new THREE.Vector3().subVectors(this.position, photon.position);
        const r = force.length();
        const fg = this.g * this.mass / (r*r); 
        force.normalize();
        force.multiplyScalar(fg);
        photon.velocity.add(force);
        photon.velocity.clampLength(this.c, this.c);
    }

    display() {
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
    }
}

class Photon {
    constructor(x, y, z, c) {
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(-c, 0 , 0);

        this.line = [];
        this.lineGeometry = new THREE.BufferGeometry();
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff
        });
        this.lineMesh = new THREE.Line(
            this.lineGeometry, 
            this.lineMaterial
        );
        this.maxLength = 200;
        this.initializeTrail();

        this.photonGeometry = new THREE.SphereGeometry(2, 32, 32);
        this.photonMesh = new THREE.MeshStandardMaterial(
        {color: 0xffff00, 
         side: THREE.DoubleSide,
         transparent: true});
         
        this.mesh = new THREE.Mesh(
            this.photonGeometry, 
            this.photonMesh
        );
    }

    initializeTrail() {
        for (let i = 0; i < this.maxLength; i++) {
            this.line.push(new THREE.Vector3(
                this.position.x, 
                this.position.y, 
                this.position.z)
                );
        }
        this.lineGeometry.setFromPoints(this.line);
    }

    update() {
        this.line.push(this.position.clone())

        if (this.line.length > this.maxLength) {
            this.line.shift(); // Remove the oldest vertex
        }
        const deltaV = this.velocity.clone();
        deltaV.multiplyScalar(dt);
        this.position.add(deltaV);

        this.lineGeometry.setFromPoints(this.line);
    }

    display() {
        scene.add(this.lineMesh);

        this.mesh.position.copy(this.position);
        this.mesh.geometry.dispose();
        scene.add(this.mesh);
    }
}

// Initialize black hole
const blackHole = new BlackHole(0 ,0 ,0 ,smallerM87, smallerC, smallerG);
blackHole.position.x = -200;
blackHole.display();

// Create a GUI
let gui = new dat.GUI();

// Initialize photon
let photons_1= [];
let photons_2 = []; 

const end = 600 - blackHole.rs ;
let defaultPositionX = 400;
let photon, photon2;
let i = 0;
let increase = 30;

//Initialize dat.gui controller
const config = {
    particleY: function() {
        addPhotonY();
    },
    particleZ: function() {
        addPhotonZ();
    },
    reset: function() {
        resetScene();
    }
  };

  // Add parameters to the GUI
  gui.add(config, 'particleY').name('Particle-Y');
  gui.add(config, 'particleZ').name('Particle-Z');
  gui.add(config, 'reset').name('Reset');

  // Function to add more Photon
  function addPhotonY() {
  // Add new photons to the array
  for (i = 0; i < end; i += increase) {
     photon = new Photon(defaultPositionX, i, 0, smallerC);
     photons_1.push(photon);
     scene.add(photon.mesh);
     }
  }

  function addPhotonZ() {
    // Add new photons to the array
  for (i = 0; i < end; i += increase) {
     photon2 = new Photon(defaultPositionX, 0, i-end, smallerC);
     photons_2.push(photon2);
     scene.add(photon2.mesh);
    }
  }

  function resetScene() {
    // Remove existing photons from the scene
  photons_1.forEach((photon) => {
    scene.remove(photon.mesh);
    scene.remove(photon.lineMesh)
    photon.mesh.geometry.dispose();
    photon.lineMesh.geometry.dispose();
  });

  photons_2.forEach((photon2) => {
    scene.remove(photon2.mesh);
    scene.remove(photon2.lineMesh)
    photon2.mesh.geometry.dispose();
    photon2.lineMesh.geometry.dispose();
  });

  //Clear the array
  photons_1 = [];
  photons_2 = [];

  // Camera position
  camera.position.set(0, 0, 600);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

// Render loop
function animate() {
    requestAnimationFrame(animate);

    // Update photon
    for(let photon of photons_1 ) {
        
        blackHole.pull(photon);
        photon.update();
        photon.display();
    }

    for(let photon2 of photons_2 ) {
        blackHole.pull(photon2);
        photon2.update();
        photon2.display();
    }

    // Render scene
    renderer.render(scene, camera);
}

animate();