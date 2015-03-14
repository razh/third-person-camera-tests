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
const material = new THREE.MeshPhongMaterial({
  specular: '#222',
  shininess: 4
});

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

const boxes = [
  {
    position: [ 12, 2, -1 ],
    dimensions: [ 8, 4, 4 ]
  },
  {
    position: [ 8, 1, 6 ],
    dimensions: [ 8, 2, 4 ]
  },
  {
    position: [ 4, 0.5, 12 ],
    dimensions: [ 4, 1, 4 ]
  }
];

boxes.forEach( box => {
  const boxGeometry = new THREE.BoxGeometry( ...box.dimensions );
  const boxMesh = new THREE.Mesh( boxGeometry, material );
  boxMesh.position.set( ...box.position );
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;
  scene.add( boxMesh );
});

const planeGeometry = new THREE.PlaneGeometry( 40, 40, 8, 8 );
const planeMatrix = new THREE.Matrix4().makeRotationX( -Math.PI / 2 );
planeGeometry.applyMatrix( planeMatrix );
planeGeometry.computeFaceNormals();
planeGeometry.computeVertexNormals();
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
tetrahedronGeometry.computeFaceNormals();
tetrahedronGeometry.computeVertexNormals();
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
spotLight.position.set( 0, 32, 32 );
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
  mass: SPHERE_MASS,
  position: new CANNON.Vec3( 0, 16, 0 )
});
sphereBody.addShape( new CANNON.Sphere( LOWER_SPHERE_RADIUS ) );
sphereBody.addShape(
  new CANNON.Sphere( UPPER_SPHERE_RADIUS ),
  new CANNON.Vec3( 0, -UPPER_SPHERE_RADIUS, 0 )
);
world.add( sphereBody );

boxes.forEach( box => {
  const boxBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3( ...box.position )
  });

  const halfExtents = new CANNON.Vec3( ...box.dimensions.map( d => d / 2 ) );
  const boxShape = new CANNON.Box( halfExtents );
  boxBody.addShape( boxShape );
  world.add( boxBody );
});

const groundBody = new CANNON.Body({
  mass: 0
});
groundBody.addShape( new CANNON.Plane() );
groundBody.quaternion.setFromAxisAngle(
  new CANNON.Vec3( 1, 0, 0 ),
  -Math.PI / 2
);
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
