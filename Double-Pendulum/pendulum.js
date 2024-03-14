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
 
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera position
camera.position.set(0, 0, 400);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Initialize Light
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.y = -300;
light.position.z = 200;
light.castShadow = true;
scene.add(light);

// Class Pendulum
class Pendulum {
  constructor(length, angle, mass, fixedPoint) {
    this.length = length;
    this.angle = angle;
    this.fixedPoint = fixedPoint;
    this.positionX = this.length * Math.sin(this.angle);
    this.positionY = -this.length * Math.cos(this.angle);
    this.positionXMixed = this.positionX + this.fixedPoint.position.x;
    this.positionYMixed = this.positionY + this.fixedPoint.position.y;

    this.position = new THREE.Vector3
    (this.positionXMixed, 
     this.positionYMixed, 
     0);
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.mass = mass;
    
    this.pendulumGeometry = new THREE.SphereGeometry(this.mass, 32, 32);
    this.pendulumMaterial = new THREE.MeshStandardMaterial({
      color: "Blue",
      side: THREE.DoubleSide,
      transparent: true,
    });

    this.pendulumMesh = new THREE.Mesh(
      this.pendulumGeometry,
      this.pendulumMaterial
    )
    
    this.line = [];
    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff
    });
    this.lineMesh = new THREE.Line(
        this.lineGeometry, 
        this.lineMaterial
    );
    // this.maxLength = 200;

  }

  applyForce(force) {
    let f = force.clone();
    f.divideScalar(this.mass);
    this.acceleration.add(f);
  }

  /*accelerationAngle() {
    // Implement simple pendulum motion equations
    let equation = -this.mass * Math.sin(this.angle) * gravityConst; 
    return equation;
  }*/
  //The equation above can be important to apply simple pendulum movement

  accelerationAngle0(mass1, angle1, angularVel, length1) {
    const angularSquared1 = angularVel * angularVel;
    const angularSquared = this.velocity.y * this.velocity.y;
    const num0 = -gravityConst * (2 * this.mass + mass1) * Math.sin(this.angle);
    const num1 = -mass1 * gravityConst * Math.sin(this.angle-(2*angle1));
    const num2 = -2 * Math.sin(this.angle-angle1) * mass1 * (angularSquared1*length1 + angularSquared*this.length*Math.cos(this.angle-angle1));
    const denominator = this.length*(2*this.mass + mass1 - mass1*Math.cos(2*this.angle - 2*angle1));
    const equation = (num0 + num1 + num2)/denominator;
    return equation;
  }

  accelerationAngle1(mass1, angle1, angularVel, length1) {
    const angularSquared1 = angularVel * angularVel;
    const angularSquared = this.velocity.y * this.velocity.y;
    const num0 = 2* Math.sin(angle1 - this.angle);
    const num1 = angularSquared1 * length1 * (mass1 + this.mass);
    const num2 = gravityConst*(mass1 + this.mass)*Math.cos(angle1);
    const num3 = angularSquared* this.length * this.mass *Math.cos(angle1 - this.angle);
    const denominator = this.length*(2*mass1 + this.mass - this.mass*Math.cos(2*angle1 - this.angle));
    const equation = (num0*(num1 + num2 + num3))/denominator;
    return equation;
  }

  update(equation) { 
     const gravity = new THREE.Vector3(0, equation, 0); // You may need to adjust the gravity value
     const damping = 0.999; // Damping factor to simulate air resistance

     // Calculate total force
     const totalForce = gravity;
 
     // Apply the force to the pendulum
     this.applyForce(totalForce);
 
     // Update the pendulum's velocity and position
     this.velocity.multiplyScalar(damping);
     this.velocity.add(this.acceleration);
     this.angle += this.velocity.y; // Update the angle based on the velocity
     this.acceleration.multiplyScalar(0);
    
    // Calculate new position based on the updated angle
    this.position.x = this.length * Math.sin(this.angle) + this.fixedPoint.position.x;
    this.position.y = -this.length * Math.cos(this.angle) + this.fixedPoint.position.y;
    
    // Update the visual representation of the pendulum
    this.pendulumMesh.position.copy(this.position);
  }

  display() {
    this.pendulumMesh.position.copy(this.position);
    scene.add(this.pendulumMesh);
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

  updateTrail() {
    this.initializeTrail();
    this.line.push(this.position.clone())

    scene.add(this.lineMesh);
  }
}

class PendulumRod {
  constructor(a, b) {
    this.a = a;
    this.b = b;

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

//Initial value pendulum
let length_0 = 100;
let length_1 = 100;
let angle_0 = Math.PI/2;
let angle_1 = Math.PI/2;
let mass_0 = 10;
let mass_1 = 10;
let gravityConst = 5;

//Declare dat.gui
const gui = new dat.GUI({ width: 300, height: 400 });

//Initialize dat.gui controller
const config = {
  length: {
    length0: length_0,
    length1: length_1
  },
  mass: {
    mass0: mass_0,
    mass1: mass_1
  },
  reset: function() {
    resetScene();
  }
};

//Add paratmeters to the GUI
gui.add(config.length, "length0", 50, 200).step(0.1).name("Pendulum-Rod 1");
gui.add(config.length, "length1", 50, 200).step(0.1).name("Pendulum-Rod 2");
gui.add(config.mass, "mass0", 10, 50).step(0.1).name("Pendulum-Mass 1");
gui.add(config.mass, "mass1", 10, 50).step(0.1).name("Pendulum-Mass 2");
gui.add(config, "reset").name("Reset");

// Setting ceilling
const ceilingGeometry = new THREE.BoxGeometry(300, 0.5, 100);
const ceilingMaterial = new THREE.MeshStandardMaterial(
    {color:0xffffff, 
     side: THREE.DoubleSide});
const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
ceilingMesh.position.y = 100;
ceilingMesh.receiveShadow = true;
// scene.add(ceilingMesh);

// Declare pendulum component
let pendulum_0 = new Pendulum(
  length_0,
  angle_0,
  mass_0,
  ceilingMesh
);

let pendulum_1 = new Pendulum(
  length_1,
  angle_1,
  mass_1,
  pendulum_0
);
let pendulumRod_0 = new PendulumRod(ceilingMesh, pendulum_0)
let pendulumRod_1 = new PendulumRod(pendulum_0, pendulum_1)

// Declare reset function
function resetScene() {  
  //Update the current value of pendulum according to the controller
  pendulum_0.pendulumMesh.geometry.dispose();
  pendulum_0.geometry = new Pendulum(
    config.length.length0,
    angle_0,
    config.mass.mass0,
    ceilingMesh
  );
  pendulum_1.pendulumMesh.geometry.dispose();
  pendulum_1.lineMesh.geometry.dispose();
  pendulum_1.geometry = new Pendulum(
    config.length.length1,
    angle_1,
    config.mass.mass1,
    pendulum_0
  );
  
  //Reset the initial position and initial velocity
  pendulum_0.angle = Math.PI/2;
  pendulum_1.angle = Math.PI/2;
  pendulum_0.velocity.y = 0;
  pendulum_1.velocity.y = 0;
  
  //Clear the array and the line
  pendulum_1.line = []
  scene.remove(pendulum_1.lineMesh);
}

// Render loop
function animate() {
    requestAnimationFrame(animate);

    //Update the value of the pendulum 
    pendulum_0.length = config.length.length0;
    pendulum_1.length = config.length.length1;
    pendulum_0.mass = config.mass.mass0;
    pendulum_1.mass = config.mass.mass1;
    pendulum_0.pendulumMesh.geometry = new THREE.SphereGeometry(config.mass.mass0, 32, 32);
    pendulum_1.pendulumMesh.geometry = new THREE.SphereGeometry(config.mass.mass1, 32, 32);
    
    // Update Pendulum
    pendulum_0.display();
    pendulum_0.update(
      pendulum_0.accelerationAngle0(
        pendulum_1.mass,
        pendulum_1.angle,
        pendulum_1.velocity.y,
        pendulum_1.length
        )
      );
    pendulum_1.display();
    pendulum_1.update(
      pendulum_1.accelerationAngle1(
        pendulum_0.mass,
        pendulum_0.angle,
        pendulum_0.velocity.y,
        pendulum_0.length
        )
    );
    pendulum_1.updateTrail();

    // Display Pendulum Rod
    pendulumRod_0.display();
    pendulumRod_1.display();
  
    // Render scene
    renderer.render(scene, camera);
}

animate();