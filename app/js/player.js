import CANNON from 'cannon';
import THREE from 'three';

import { material, wireframeMaterial } from './materials';

const vector = new THREE.Vector3();

const LOWER_SPHERE_RADIUS = 0.75;
const UPPER_SPHERE_RADIUS = 1;
const SPHERE_MASS = 2;

const sphereGeometry = new THREE.SphereGeometry( LOWER_SPHERE_RADIUS );
const upperSphereGeometry = new THREE.SphereGeometry( UPPER_SPHERE_RADIUS );
const upperSphereMatrix = new THREE.Matrix4()
  .makeTranslation( 0, -UPPER_SPHERE_RADIUS, 0 );
sphereGeometry.merge( upperSphereGeometry, upperSphereMatrix );

const directionGeometry = new THREE.CylinderGeometry( 0, 0.25, 0.75, 3 );
const directionMatrix = new THREE.Matrix4()
  .makeRotationFromEuler( new THREE.Euler( Math.PI / 2, Math.PI, 0 ) );
directionGeometry.applyMatrix( directionMatrix );
directionGeometry.computeFaceNormals();
directionGeometry.computeVertexNormals();

export default class Player {
  constructor() {
    const body = new CANNON.Body({
      mass: SPHERE_MASS,
      position: new CANNON.Vec3( 0, 16, 0 ),
      shape: new CANNON.Sphere( LOWER_SPHERE_RADIUS )
    });
    body.addShape(
      new CANNON.Sphere( UPPER_SPHERE_RADIUS ),
      new CANNON.Vec3( 0, -UPPER_SPHERE_RADIUS, 0 )
    );

    const mesh = new THREE.Mesh( sphereGeometry, wireframeMaterial );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const directionMesh = new THREE.Mesh( directionGeometry, material );
    directionMesh.receiveShadow = true;

    this.body = body;
    this.mesh = mesh;
    this.directionMesh = directionMesh;
  }

  update() {
    const { body, mesh, directionMesh } = this;

    // Look straight up.
    body.quaternion.set( 0, 0, 1, 0 );

    mesh.position.copy( body.position );
    mesh.quaternion.copy( body.quaternion );

    // Set direction.
    vector.copy( body.position );
    vector.x += body.velocity.x;
    vector.z += body.velocity.z;

    directionMesh.position.copy( body.position );
    directionMesh.lookAt( vector );
    directionMesh.position.y += 1.3 *
      ( LOWER_SPHERE_RADIUS + UPPER_SPHERE_RADIUS );
  }
}
