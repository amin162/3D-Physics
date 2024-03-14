import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000000 // Increase the far plane distance
);
camera.position.set(0, 0, 5); // Adjust camera position as needed
const renderer = new THREE.WebGLRenderer();
const controls = new OrbitControls(camera, renderer.domElement);
scene.background = new THREE.Color("white");
renderer.shadowMap.enabled = true;

// Enable logarithmic depth buffer for the camera
camera.logarithmicDepthBuffer = true;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setting ground
const groundGeometry = new THREE.BoxGeometry(1000, 1, 200000);
const groundMaterial = new THREE.MeshStandardMaterial({color:"#737373", side: THREE.DoubleSide});
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.position.y = -20;
groundMesh.receiveShadow = true;



// Initialize Light
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.y = 3;
light.position.z = 2;
light.castShadow = true;
scene.add(light);

class Sensor {
    constructor(car) {
        this.car = car;
        this.rayCount = 5;
        this.rayLength = 1000;
        this.raySpread = Math.PI/2;
        
        this.start = new THREE.Vector3();

        this.rays = [];
        this.readings = [];

        this.update();

        for(let i = 0; i < this.rayCount; i++) {
            this.rays.push( new THREE.Vector3( 
                this.rays[i][0].x, 
                this.rays[i][0].y, 
                this.rays[i][0].z 
                ));
            this.rays.push( new THREE.Vector3( 
                this.rays[i][1].x, 
                this.rays[i][1].y, 
                this.rays[i][1].z 
                ));
        }
        this.rayGeometry = new THREE.BufferGeometry().setFromPoints(this.rays);
        this.rayMaterial = new THREE.LineBasicMaterial({ color: "yellow", linewidth: 10 });
        this.rayMesh = new THREE.Line(this.rayGeometry, this.rayMaterial);
    }

    #castRays() {
        this.rays = []
        for(let i = 0; i < this.rayCount; i++) {
            const rayAngle = THREE.MathUtils.lerp(
                this.raySpread/2,
                -this.raySpread/2,
                this.rayCount == 1 ? 0.5 : i/(this.rayCount - 1)
            )
            const start = new THREE.Vector3(
                0,
                0,
                0
            )
            const end = new THREE.Vector3(
                this.car.position.x - Math.sin(rayAngle) * this.rayLength,
                0,
                this.car.position.z - Math.cos(rayAngle) * this.rayLength
            )
            this.rays.push([start, end]);
        }
    }

    update() {
        this.#castRays();
    }

    display() {
        this.rayMesh.rotation.y = this.car.carMesh.rotation.y;
        this.rayMesh.position.copy(this.car.position);
        scene.add(this.rayMesh);
    }
}


class Controls {
    constructor() {
        this.forward = false;
        this.left = false;
        this.right = false;
        this.reverse = false;

        this.#addKeyboardListeners();
    }

    #addKeyboardListeners() {
        document.onkeydown =  (event) => {
            switch(event.key) {
                case "a":
                    this.left = true;
                    break;
                case "d":
                    this.right = true;
                    break;
                case "w":
                    this.forward = true;
                    break;
                case "s":
                    this.reverse = true;
                    break;
            }
        }

        document.onkeyup =  (event) => {
            switch(event.key) {
                case "a":
                    this.left = false;
                    break;
                case "d":
                    this.right = false;
                    break;
                case "w":
                    this.forward = false;
                    break;
                case "s":
                    this.reverse = false;
                    break;
            }
        }
    }
}

class Car {
    constructor({
        carWidth,
        carHeight,
        x, 
        y = 0,
        z, 
    })       
    {   
        this.carWidth = carWidth;
        this.carHeight = carHeight;
        this.x = x;
        this.y = y + carHeight/2;
        this.z = z;

        this.angle = 0;
        this.maxSpeed = 20;
        this.minSpeed = 0;
        this.friction = 0.06;

        this.position = new THREE.Vector3(this.x, this.y ,this.z);
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3(
            0,
            0, 
            0.5 * Math.cos(this.angle)
            );
        this.carGeometry = new THREE.BoxGeometry(this.carWidth, this.carHeight, 300);
        this.carMaterial = new THREE.MeshStandardMaterial({color: "blue", side: THREE.DoubleSide, wireframe: false})
        this.carMesh = new THREE.Mesh(this.carGeometry, this.carMaterial);
        this.sensor = new Sensor(this);
        this.controls = new Controls();
    }

    update(){
        this.#move();
    }

    #move() {
        if(this.controls.forward) {
            this.velocity.sub(this.acceleration)
        }
        if(this.controls.reverse) {
            this.velocity.add(this.acceleration)
        }

        if (this.velocity.z != 0) {
            const flip = this.velocity.z < 0 ? 1 : -1; 
            // The constant above has a purpose when the car change its velocity to backward the direction steer supposed to follow its key 
            // whether it's right or left, otherwise it will turn the steer reversed, for example if we try to turn left when pushing reverse key,
            // the car will turn right and that is not how the car supposed to move.
            // You may try to turn off the constant above and give it a shot how is this suppose to work

            const flipVelocity = Math.abs(this.velocity.z);
            // The flipVelocity constant purpose is to make the rate of change of the angle followed by the rate of change of the velocity, so
            // when the car velocity is close to zero, the rate of change of the angle is followed by the rate of change of the velocity. 
            // Which mean the car has less control of its direction when there is less velocity.
            // The absolute function has a purpose to make the steering velocity keeping its value in control due to ternary operator.
            // Because once the ternary operator is changing to 1 or -1 the value of the constant flip wouldnt matter 
            // due to flipVelocity keep changing its value to  either to posittive or negative

            if(this.controls.left) {
                this.carMesh.rotation.y += 0.01 * (flip * flipVelocity);
            }
            if(this.controls.right) {
                this.carMesh.rotation.y -= 0.01 * (flip * flipVelocity);
            }
        }
        

        // Apply friction
        const frictionForce = new THREE.Vector3(
            this.velocity.x * this.friction,
            0,
            this.velocity.z * this.friction
        );

        // Update object position based on velocity
        this.position.x += this.velocity.z * Math.sin(this.carMesh.rotation.y);
        this.position.z += this.velocity.z * Math.cos(this.carMesh.rotation.y);
        
        // Turn velocity into zero once the velocity reach the bottom of the speed 
        // and has lesser value then the friction value
        if(Math.abs(this.velocity.z) < this.friction) {
            this.velocity.z = 0;
        }
        // Subtract friction force from velocity
        this.velocity.sub(frictionForce);

        // Clamp velocity within minSpeed and maxSpeed
        this.velocity.clampLength(this.minSpeed, this.maxSpeed);
    }

    display() {
        this.carMesh.position.copy(this.position);
        scene.add(this.carMesh);
        // this.sensor.display();
    }
}

class Road {
    constructor({
        x,
        width,
        laneCount = 1,
        stripWidth = 20
    }) 
    {  
        this.x = x;
        this.width = width;
        this.laneCount = laneCount;
        this.stripWidth = stripWidth; // Width of the road strips

        this.left = x - (width/2);
        this.right = x + (width/2);

        const infinity = 100000;
    
        const stripGeometry = new THREE.PlaneGeometry(this.stripWidth, infinity); // Use a plane geometry for road strips
        const stripMaterial = new THREE.MeshBasicMaterial({ color: "orange" });
        
        // Create road strips on the left side of the road
        this.strips = [];
        for (let i = 0; i <= this.laneCount; i++) {
            const strip = new THREE.Mesh(stripGeometry, stripMaterial);
            const x = THREE.MathUtils.lerp(
                this.left,
                this.right,
                i/this.laneCount
            )
            strip.position.set(
                x, 
                0, 
                0
            );
            strip.rotation.x = -Math.PI / 2; // Rotate the strip to align with the ground
            this.strips.push(strip);
        }
    }

    getLaneCenter(laneIndex){
        const laneWidth = this.width/this.laneCount;
        return this.left + 
               (laneWidth/2) + 
               Math.min(laneIndex, this.laneCount - 1) * laneWidth;
    }

    display() {  
        this.strips.forEach(strip => scene.add(strip));
    }
}
//Declare Road
const road = new Road({
    x: groundMesh.position.x,
    width: groundGeometry.parameters.width
})

//Declare Car Initiation
const car = new Car({
    carHeight: 100,
    carWidth: 150,
    x: road.getLaneCenter(1),
    z: 100,
});

// camera.position.set(0, 2000, car.carMesh.position.z + 1000);
// camera.lookAt(new THREE.Vector3(car.carMesh.position.x, car.carMesh.position.y, car.carMesh.position.z));


    
// Render loop
function animate() {
    requestAnimationFrame(animate);

    //Display Road
    road.display();

    //Display Ground
    scene.add(groundMesh);

    //Display Car
    car.display();
    car.update();
    
    // Camera orietation
    camera.position.set(car.position.x, car.position.y + 500, car.position.z + 1000);
    camera.lookAt(new THREE.Vector3(car.carMesh.position.x, car.carMesh.position.y, car.carMesh.position.z));


    renderer.render(scene, camera);
}

animate();