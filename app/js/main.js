import THREE from 'three';
import CANNON from 'cannon';

import Controls from './controls';
import pointerLock from './pointer-lock';

const container = document.createElement( 'div' );
document.body.appendChild( container );

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight );
camera.position.set( 0, 8, 32 );
scene.add( camera );

const material = new THREE.MeshBasicMaterial({
  wireframe: true
});

const sphereGeometry = new THREE.SphereGeometry( 1 );
const sphereMesh = new THREE.Mesh( sphereGeometry, material );
scene.add( sphereMesh );

const planeGeometry = new THREE.PlaneGeometry( 32, 32, 8, 8 );
const planeMesh = new THREE.Mesh( planeGeometry, material );
planeMesh.rotation.x = -Math.PI / 2;
scene.add( planeMesh );

const clock = new THREE.Clock();
const dt = 1 / 60;
let running = true;

const world = new CANNON.World();
world.gravity.set( 0, -9.81, 0 );

const sphereBody = new CANNON.Body({
  mass: 1,
  position: new CANNON.Vec3( 0, 16, 0 ),
  angularVelocity: new CANNON.Vec3( 2, 0, -2 )
});
sphereBody.addShape( new CANNON.Sphere() );
sphereBody.linearDamping = 0;
world.add( sphereBody );

const groundBody = new CANNON.Body({
  mass: 0
});
groundBody.addShape( new CANNON.Plane() );
groundBody.quaternion.setFromAxisAngle( new CANNON.Vec3( 1, 0, 0 ), -Math.PI / 2 );
world.add( groundBody );

const controls = new Controls( camera, sphereBody );
scene.add( controls.getObject() );
pointerLock( controls );

function update() {
  const delta = clock.getDelta();
  world.step( dt, delta );
  controls.update( delta );

  sphereMesh.position.copy( sphereBody.position );
  sphereMesh.quaternion.copy( sphereBody.quaternion );
}

function animate() {
  if ( !running ) {
    return;
  }

  update();
  renderer.render( scene, camera );
  requestAnimationFrame( animate );
}

function start() {
  running = true;
  clock.start();
  animate();
}

function stop() {
  running = false;
}

start();
window.addEventListener( 'focus', start );
window.addEventListener( 'blur', stop );
