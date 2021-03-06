import THREE from 'three';
import CANNON from 'cannon';

const HALF_PI = Math.PI / 2;

/**
 * Custom version of cannon.js's THREE.PointerLockControls example
 * implementation.
 *
 * https://github.com/mrdoob/three.js/blob/master/examples/js/controls/PointerLockControls.js
 * https://github.com/schteppe/cannon.js/blob/master/examples/js/PointerLockControls.js
 *
 * @author mrdoob / http://mrdoob.com/
 * @author schteppe / https://github.com/schteppe
 */
export default function Controls( camera, cannonBody, {
  velocity = 64,
  jumpVelocity = 8,
  damping = 8,
  airControl = 0.25
} = {} ) {

  this.enabled = false;

  const pitchGroup = new THREE.Group();
  pitchGroup.add( camera );

  const yawGroup = new THREE.Group();
  yawGroup.position.y = 2;
  yawGroup.add( pitchGroup );

  const quat = new THREE.Quaternion();

  const move = {
    forward:  false,
    backward: false,
    left:     false,
    right:    false
  };

  let onGround = false;

  // Normal in the contact, pointing out of whatever the player touched.
  const contactNormal = new CANNON.Vec3();
  const up = new CANNON.Vec3( 0, 1, 0 );

  cannonBody.addEventListener( 'collide', event => {
    const { contact } = event;
    // contact.bi and contact.bj are the colliding bodies.
    // contact.ni is the collision normal.
    // Check which one is which.
    if ( contact.bi.id === cannonBody.id ) {
      // bi is the player body, flip the contact normal.
      contact.ni.negate( contactNormal );
    } else {
      // bi is something else. Keep the normal as it is.
      contactNormal.copy( contact.ni );
    }

    // If contactNormal.dot(up) is in [0, 1], the normal is in the up direction.
    // This threshold value should be in [0, 1].
    if ( contactNormal.dot( up ) > 0.5 ) {
      onGround = true;
    }
  });

  this.getObject = () => yawGroup;

  // Modifies target vector.
  this.getDirection = target => {
    target.set( 0, 0, -1 );
    quat.multiplyVector3( target );
  };


  // Moves the camera to the cannon.js object position and adds the velocity to
  // the object if the run is down.
  const dv = new THREE.Vector3();
  const euler = new THREE.Euler();

  this.update = dt => {
    dv.set( 0, 0, 0 );

    if ( this.enabled ) {
      if ( move.forward  ) { dv.z += -1; }
      if ( move.backward ) { dv.z +=  1; }
      if ( move.left     ) { dv.x += -1; }
      if ( move.right    ) { dv.x +=  1; }
      dv.setLength( velocity * dt );

      // Convert velocity to world coordinates.
      euler.x = pitchGroup.rotation.x;
      euler.y = yawGroup.rotation.y;
      quat.setFromEuler( euler );
      dv.applyQuaternion( quat );
    }

    let dx = dv.x;
    let dz = dv.z;

    // Damp along x/z-axes.
    dx -= cannonBody.velocity.x * damping * dt;
    dz -= cannonBody.velocity.z * damping * dt;

    if ( !onGround ) {
      dx *= airControl;
      dz *= airControl;
    }

    // Apply input velocity.
    cannonBody.velocity.x += dx;
    cannonBody.velocity.z += dz;

    yawGroup.position.copy( cannonBody.position );
  };

  const onMouseMove = event => {
    if ( !this.enabled ) {
      return;
    }

    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    yawGroup.rotation.y   -= movementX * 0.002;
    pitchGroup.rotation.x -= movementY * 0.002;

    pitchGroup.rotation.x = THREE.Math.clamp( pitchGroup.rotation.x, -HALF_PI, HALF_PI );
  };

  const onKeyDown = event => {
    switch ( event.keyCode ) {
      // Up arrow,
      case 38:
      // W.
      case 87:
        move.forward = true;
        break;

      // Left arrow.
      case 37:
      // A.
      case 65:
        move.left = true;
        break;

      // Down arrow.
      case 40:
      // S.
      case 83:
        move.backward = true;
        break;

      // Right arrow.
      case 39:
      // D.
      case 68:
        move.right = true;
        break;

      // Space.
      case 32:
        if ( onGround ) {
          cannonBody.velocity.y = jumpVelocity;
        }

        onGround = false;
        break;
    }
  };

  const onKeyUp = event => {
    switch ( event.keyCode ) {
      // Up arrow,
      case 38:
      // W.
      case 87:
        move.forward = false;
        break;

      // Left arrow.
      case 37:
      // A.
      case 65:
        move.left = false;
        break;

      // Down arrow.
      case 40:
      // S.
      case 83:
        move.backward = false;
        break;

      // Right arrow.
      case 39:
      // D.
      case 68:
        move.right = false;
        break;
    }
  };

  document.addEventListener( 'mousemove', onMouseMove, true );
  document.addEventListener( 'keydown', onKeyDown, true );
  document.addEventListener( 'keyup', onKeyUp, true );
}
