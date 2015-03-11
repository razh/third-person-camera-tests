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
camera.position.set( 0, 2, 6 );
scene.add( camera );

const wireframeMaterial = new THREE.MeshPhongMaterial({ wireframe: true });
const material = new THREE.MeshPhongMaterial();

const lowerSphereGeometry = new THREE.SphereGeometry( 1 );
const lowerSphereMesh = new THREE.Mesh( lowerSphereGeometry, wireframeMaterial );
lowerSphereMesh.castShadow = true;
lowerSphereMesh.receiveShadow = true;
scene.add( lowerSphereMesh );

const upperSphereGeometry = new THREE.SphereGeometry( 1.25 );
const upperSphereMesh = new THREE.Mesh( upperSphereGeometry, wireframeMaterial );
upperSphereMesh.castShadow = true;
upperSphereMesh.receiveShadow = true;
scene.add( upperSphereMesh );

const planeGeometry = new THREE.PlaneGeometry( 40, 40, 8, 8 );
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
spotLight.shadowMapWidth = 1024;
spotLight.shadowMapHeight = 1024;
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

const lowerSphereBody = new CANNON.Body({
  mass: 4,
  position: new CANNON.Vec3( 0, 16, 0 )
});
lowerSphereBody.addShape( new CANNON.Sphere() );
world.add( lowerSphereBody );

const upperSphereBody = new CANNON.Body({
  mass: 2,
  position: new CANNON.Vec3( 0, 18, 0 )
});
upperSphereBody.addShape( new CANNON.Sphere( 1.25 ) );
world.add( upperSphereBody );

const sphereConstraint = new CANNON.PointToPointConstraint(
  lowerSphereBody,
  new CANNON.Vec3(),
  upperSphereBody,
  new CANNON.Vec3( 0, 1.25, 0 ),
  4
);
sphereConstraint.collideConnected = false;
world.addConstraint( sphereConstraint );

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

const controls = new Controls( camera, lowerSphereBody );
scene.add( controls.getObject() );
pointerLock( controls );

function update() {
  const delta = clock.getDelta();
  world.step( dt, delta );
  controls.update( delta );

  upperSphereBody.position.x = lowerSphereBody.position.x;
  upperSphereBody.position.z = lowerSphereBody.position.z;

  // Look straight up.
  lowerSphereBody.quaternion.set( 0, 0, 1, 0 );
  upperSphereBody.quaternion.set( 0, 0, 1, 0 );

  lowerSphereMesh.position.copy( lowerSphereBody.position );
  lowerSphereMesh.quaternion.copy( lowerSphereBody.quaternion );

  upperSphereMesh.position.copy( upperSphereBody.position );
  upperSphereMesh.quaternion.copy( upperSphereBody.quaternion );
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
    lowerSphereBody.position.set( 0, 16, 0 );
    lowerSphereBody.velocity.setZero();
  }
});
