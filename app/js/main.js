import CANNON from 'cannon';
import THREE from 'three';

import Controls from './controls';
import Player from './player';
import pointerLock from './pointer-lock';

import createScene from './scenes';

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

const player = new Player();
scene.add( player.mesh );
scene.add( player.directionMesh );

// Physics.
const clock = new THREE.Clock();
const dt = 1 / 60;
let running = true;

const world = new CANNON.World();
world.gravity.set( 0, -9.81, 0 );
world.addBody( player.body );

const controls = new Controls( camera, player.body );
scene.add( controls.getObject() );
pointerLock( controls );

createScene( 'basic' )( scene, world );

function update() {
  const delta = clock.getDelta();
  world.step( dt, delta );
  controls.update( delta );
  player.update( delta );
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
    player.body.position.set( 0, 16, 0 );
    player.body.velocity.setZero();
  }
});
