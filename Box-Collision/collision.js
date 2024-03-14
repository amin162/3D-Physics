import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { normalize, randFloat, randFloatSpread } from 'three/src/math/MathUtils';

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

// Setting ground
const groundGeometry = new THREE.BoxGeometry(700, 0.5, 200);
const groundMaterial = new THREE.MeshStandardMaterial({color:0xffffff, side: THREE.DoubleSide});
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.position.y = 0;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Setting wall
const wallGeometry = new THREE.BoxGeometry(0.5, 200, 200);
const wallMaterial = new THREE.MeshStandardMaterial({color:"Black", side: THREE.DoubleSide});
const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
wallMesh.position.y = 100;
wallMesh.position.x = -groundGeometry.parameters.width/2;
wallMesh.receiveShadow = true;
scene.add(wallMesh);

// Camera position
camera.position.set(0, 100, 500);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Initialize Light
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.y = 3;
light.position.z = 2;
light.position.x = 3;
light.castShadow = true;
scene.add(light);

// Create an AudioListener and add it to the camera
const listener = new THREE.AudioListener();
camera.add(listener);

// Create an Audio object
const audioLoader = new THREE.AudioLoader();

// Load the sound file
const sound = new THREE.Audio(listener);
audioLoader.load("/mixkit-plastic-bubble-click-1124.mp3", function(buffer) {
    sound.setBuffer(buffer);
    sound.setVolume(1.0);
});

//Block Class 
class Block {
    constructor(x, v, mass, volume, color) {
        this.volume = volume
        this.mass = mass;
        this.w = this.volume/2;
        this.position = new THREE.Vector3(x, groundMesh.position.y + this.w, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);

        this.resetPosition = new THREE.Vector3(x, this.w, 0);
        this.resetVelocity = new THREE.Vector3(v, 0, 0);
        
        this.blockGeometry = new THREE.BoxGeometry(this.volume, this.volume, this.volume);
        this.blockMaterial = new THREE.MeshStandardMaterial({color: color, side: THREE.DoubleSide})
        this.blockMesh = new THREE.Mesh(this.blockGeometry, this.blockMaterial);
    }

    collide(other) {
    return !(this.position.x + this.w < other.position.x - other.w ||
             this.position.x - this.w > other.position.x + other.w ) 
    }

    hitWall() {
        if (this.position.x < wallMesh.position.x + this.w) {
            this.velocity.multiplyScalar(-1);
            sound.play();
            collisionCounter++;
            collisionCounterElement.textContent = `Collisions: ${collisionCounter}`;
        }
    }

    bounce(other) {
        // Calculate new velocities for both blocks
        let newVelocityX = ((this.mass - other.mass) * this.velocity.x + 2 * other.mass * other.velocity.x) / (this.mass + other.mass);
    
        // Update velocities for both blocks
        return new THREE.Vector3(newVelocityX, 0, 0);
    }
    
    update() {
        this.position.add(this.velocity);

    }

    reset() {
        this.position.copy(this.resetPosition);
        this.velocity.set(0, 0, 0);
        this.velocity.copy(this.resetVelocity);
    }

    display() {
        this.blockMesh.position.copy(this.position);
        scene.add(this.blockMesh);
    }
}

//Declare dat.gui
const gui = new dat.GUI({ width: 300, height: 400 });

//Declare controller
const config = {
    mass_digits: 7,
    reset: function() {
        resetScene();
    }
}

//Add paratmeters to the GUI
gui.add(config, "mass_digits", 1, 7).step(1).name("PI Digits");
gui.add(config, "reset").name("Start/Reset");

//Polygonal approximation by Euler's Method
let timeSteps = Math.pow(10, 4);

//Initialize block value
let position0_X = -300;
let mass_0 = 1;
let volume_0 = 50;
let color0 = "Red";
let velocity0 = 0;
let velocity0fix = velocity0/timeSteps;

let position1_X = -100;
let mass_1 = Math.pow(100, config.mass_digits-1);
let volume_1 = 50;
let color1 = "Blue"
let velocity1 = -1;
let velocity1fix = velocity1/timeSteps;

//Colission Counter
let collisionCounter = 0;
let collisionCounterElement  = document.getElementById('collisionCounter');

//Mass display
let blueMass =  mass_1;
let blueMassElement = document.getElementById('blueMass');
blueMassElement.textContent = `Blue: ${blueMass} Kg`;

//Declare block initiation
let block_0 = new Block(
    position0_X, 
    velocity0fix,
    mass_0, 
    volume_0,
    color0
    );

let block_1 = new Block(
    position1_X,
    velocity1fix,
    mass_1, 
    volume_1,
    color1
    );

//Declare reset function
function resetScene() {
    // Reset positions and velocities
    block_0.reset();
    block_1.reset();

    block_1.mass = Math.pow(100, config.mass_digits-1);

    // Reset other properties
    collisionCounter = 0;
    blueMass = Math.pow(100, config.mass_digits-1);
    blueMassElement.textContent = `Blue: ${blueMass} Kg`;
    collisionCounterElement.textContent = `Collisions: ${collisionCounter}`;

}

//Render Loop
function animate() {
    requestAnimationFrame(animate);  
    block_1.mass = Math.pow(100, config.mass_digits-1);
    

    // Update block
    for(let i = 0; i < timeSteps; i++) {
    if (block_0.collide(block_1)) {
        const v0 = block_0.bounce(block_1);
        const v1 = block_1.bounce(block_0);

        block_0.velocity.copy(v0);
        block_1.velocity.copy(v1);

        // Play the sound when a collision occurs
        sound.play();
        collisionCounter++;
        collisionCounterElement.textContent = `Collisions: ${collisionCounter}`;
    }
    
    block_0.update();
    block_1.update();
    block_0.hitWall();
    }
    block_0.display();
    block_1.display();
    
    // Render scene
    renderer.render(scene, camera);
}

animate();