import THREE from 'three';
import CANNON from 'cannon';

import Controls from './controls';
import pointerLock from './pointer-lock';

import createScene from './scenes';
import { material, wireframeMaterial } from './materials';

const container = document.createElement( 'div' );
document.body.appendChild( container );

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMapEnabled = true;
container.appendChild( renderer.domElement );

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight );
camera.position.set( 0, 2, 6 );
scene.add( camera );

const LOWER_SPHERE_RADIUS = 0.75;
const UPPER_SPHERE_RADIUS = 1;
const SPHERE_MASS = 2;

const sphereGeometry = new THREE.SphereGeometry( LOWER_SPHERE_RADIUS );
const upperSphereGeometry = new THREE.SphereGeometry( UPPER_SPHERE_RADIUS );
const upperSphereMatrix = new THREE.Matrix4()
  .makeTranslation( 0, -UPPER_SPHERE_RADIUS, 0 );
sphereGeometry.merge( upperSphereGeometry, upperSphereMatrix );
const sphereMesh = new THREE.Mesh( sphereGeometry, wireframeMaterial );
sphereMesh.castShadow = true;
sphereMesh.receiveShadow = true;
scene.add( sphereMesh );

const directionVector = new THREE.Vector3();
const directionGeometry = new THREE.CylinderGeometry( 0, 0.25, 0.75, 3 );
const directionMatrix = new THREE.Matrix4()
  .makeRotationFromEuler( new THREE.Euler( Math.PI / 2, Math.PI, 0 ) );
directionGeometry.applyMatrix( directionMatrix );
directionGeometry.computeFaceNormals();
directionGeometry.computeVertexNormals();
const directionMesh = new THREE.Mesh( directionGeometry, material );
directionMesh.receiveShadow = true;
scene.add( directionMesh );

// Physics.
const clock = new THREE.Clock();
const dt = 1 / 60;
let running = true;

const world = new CANNON.World();
world.gravity.set( 0, -9.81, 0 );

const sphereBody = new CANNON.Body({
  mass: SPHERE_MASS,
  position: new CANNON.Vec3( 0, 16, 0 ),
  shape: new CANNON.Sphere( LOWER_SPHERE_RADIUS )
});
sphereBody.addShape(
  new CANNON.Sphere( UPPER_SPHERE_RADIUS ),
  new CANNON.Vec3( 0, -UPPER_SPHERE_RADIUS, 0 )
);
world.addBody( sphereBody );

const controls = new Controls( camera, sphereBody );
scene.add( controls.getObject() );
pointerLock( controls );

createScene( 0 )( scene, world );

function update() {
  const delta = clock.getDelta();
  world.step( dt, delta );
  controls.update( delta );

  // Look straight up.
  sphereBody.quaternion.set( 0, 0, 1, 0 );

  sphereMesh.position.copy( sphereBody.position );
  sphereMesh.quaternion.copy( sphereBody.quaternion );

  // Set direction.
  directionVector.copy( sphereBody.position );
  directionVector.x += sphereBody.velocity.x;
  directionVector.z += sphereBody.velocity.z;

  directionMesh.position.copy( sphereBody.position );
  directionMesh.lookAt( directionVector );
  directionMesh.position.y += 1.3 *
    ( LOWER_SPHERE_RADIUS + UPPER_SPHERE_RADIUS );
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

window.addEventListener( 'resize', () => {
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

document.addEventListener( 'keydown', event => {
  // R. Reset.
  if ( event.keyCode === 82 ) {
    sphereBody.position.set( 0, 16, 0 );
    sphereBody.velocity.setZero();
  }
});
