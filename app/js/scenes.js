import THREE from 'three';
import CANNON from 'cannon';

import { material } from './materials';

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

function createBoxMesh( box ) {
  const geometry = new THREE.BoxGeometry( ...box.dimensions );
  const mesh = new THREE.Mesh( geometry, material );
  mesh.position.fromArray( box.position );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createBoxBody( box ) {
  const halfExtents = new CANNON.Vec3( ...box.dimensions.map( d => d / 2 ) );
  return new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3( ...box.position ),
    shape: new CANNON.Box( halfExtents )
  });
}


function createBlocks(
  width, depth,
  xCount, zCount,
  spacing,
  minHeight, maxHeight
) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  const blockWidth = ( width - ( xCount - 1 ) * spacing ) / xCount;
  const blockDepth = ( depth - ( zCount - 1 ) * spacing ) / zCount;

  const halfBlockWidth = blockWidth / 2;
  const halfBlockDepth = blockDepth / 2;

  const blocks = [];

  for ( let x = 0; x < xCount; x++ ) {
    for ( let z = 0; z < zCount; z++ ) {
      const height = minHeight + Math.random() * ( maxHeight - minHeight );

      blocks.push({
        position: [
          x * ( blockWidth + spacing ) + halfBlockWidth - halfWidth,
          height / 2,
          z * ( blockDepth + spacing ) + halfBlockDepth - halfDepth
        ],
        dimensions: [
          blockWidth,
          height,
          blockDepth
        ]
      });
    }
  }

  return blocks;
}

const scenes = {
  basic( scene, world ) {
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

    // Graphics.
    boxes.forEach( box => scene.add( createBoxMesh( box ) ) );

    const planeGeometry = new THREE.PlaneBufferGeometry( 40, 40, 8, 8 );
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

    // Physics.
    boxes.forEach( box => world.addBody( createBoxBody( box ) ) );

    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3( 1, 0, 0 ),
      -Math.PI / 2
    );
    world.addBody( groundBody );

    const tetrahedronBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.ConvexPolyhedron(
        convertVertices( tetrahedronGeometry.vertices ),
        convertFaces( tetrahedronGeometry.faces )
      )
    });
    world.addBody( tetrahedronBody );
  }
};

export default function createScene( name ) {
  return scenes[ name ];
}
