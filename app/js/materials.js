import THREE from 'three';

export const wireframeMaterial = new THREE.MeshPhongMaterial({
  wireframe: true
});

export const material = new THREE.MeshPhongMaterial({
  specular: '#222',
  shininess: 4
});
