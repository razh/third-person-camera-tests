import THREE from 'three';
import CANNON from 'cannon';

import Controls from './controls';
import pointerLock from './pointer-lock';

const container = document.createElement( 'div' );
document.body.appendChild( container );

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMapEnabled = true;
container.appendChild( renderer.domElement );

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight );
camera.position.set( 0, 8, 32 );
scene.add( camera );

const material = new THREE.MeshPhongMaterial();

const sphereGeometry = new THREE.SphereGeometry( 1, 32, 24 );
const sphereMesh = new THREE.Mesh( sphereGeometry, material );
sphereMesh.castShadow = true;
sphereMesh.receiveShadow = true;
scene.add( sphereMesh );

const planeGeometry = new THREE.PlaneGeometry( 32, 32, 8, 8 );
const planeMatrix = new THREE.Matrix4().makeRotationX( -Math.PI / 2 );
planeGeometry.applyMatrix( planeMatrix );
const planeMesh = new THREE.Mesh( planeGeometry, material );
planeMesh.castShadow = true;
planeMesh.receiveShadow = true;
scene.add( planeMesh );

const tetrahedronGeometry = new THREE.TetrahedronGeometry( 8 );
const tetrahedronMatrix = new THREE.Matrix4()
  .makeRotationAxis(
    new THREE.Vector3( 1, 0, -1 ).normalize(),
    Math.atan( Math.sqrt( 2 ) )
  );
tetrahedronGeometry.applyMatrix( tetrahedronMatrix );
const tetrahedronMesh = new THREE.Mesh( tetrahedronGeometry, material );
tetrahedronMesh.castShadow = true;
tetrahedronMesh.receiveShadow = true;
scene.add( tetrahedronMesh );

const spotLight = new THREE.SpotLight( 0x888888 );
spotLight.castShadow = true;
spotLight.shadowCameraNear = 24;
spotLight.shadowCameraFar = 72;
spotLight.position.set( 0, 48, 32 );
scene.add( spotLight );

const ambientLight = new THREE.AmbientLight( 0x222222 );
scene.add( ambientLight );

function convertVertices( threeVertices ) {
  const vertices = [];

  for ( let i = 0, il = threeVertices.length; i < il; i++ ) {
    vertices.push( new CANNON.Vec3().copy( threeVertices[i] ) );
  }

  return vertices;
}

function convertFaces( threeFaces ) {
  const faces = [];

  for ( let i = 0, il = threeFaces.length; i < il; i++ ) {
    let face = threeFaces[i];
    faces.push( [ face.a, face.b, face.c ] );
  }

  return faces;
}

// Physics.
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
world.add( sphereBody );

const groundBody = new CANNON.Body({
  mass: 0
});
groundBody.addShape( new CANNON.Plane() );
groundBody.quaternion.setFromAxisAngle( new CANNON.Vec3( 1, 0, 0 ), -Math.PI / 2 );
world.add( groundBody );

const tetrahedronBody = new CANNON.Body({
  mass: 0
});
tetrahedronBody.addShape(
  new CANNON.ConvexPolyhedron(
   convertVertices( tetrahedronGeometry.vertices ),
   convertFaces( tetrahedronGeometry.faces )
  )
);
world.add( tetrahedronBody );

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
