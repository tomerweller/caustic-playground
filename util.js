const perf = (fn) => {
  const t0 = performance.now();
  const retval = fn();
  const t1 = performance.now();
  console.log("Call to fn took " + (t1 - t0)/1000 + " seconds.");
  return retval;
};

const raycaster = new THREE.Raycaster();
const raycast = (origin, direction, mesh) => {
  raycaster.set(origin, direction);
  return raycaster.intersectObject(mesh);
};

const refract = (surfaceNormal, inRay, inIOR, outIOR) => {
  const theta1 = surfaceNormal.clone().angleTo(inRay); //+
  const refractAngle = Math.asin((inIOR/outIOR)*Math.sin(theta1)); //+
  const reverseSurfaceNormal = surfaceNormal.clone().multiplyScalar(-1);
  const rotationAxis = surfaceNormal.clone().cross(inRay).normalize();
  const out = reverseSurfaceNormal.clone().applyAxisAngle(rotationAxis, refractAngle);
  return out;
};

const faceInBufferedGeometry = (geometry, faceIndex, offset) => {
  const vertexPositions = [0,1,2]
    .map(i => geometry.index.array[3*faceIndex+i])
    .map(vertexIndex =>
      new THREE.Vector3().fromBufferAttribute( geometry.attributes.position, vertexIndex).add(offset));
  const  normal = new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(vertexPositions[1], vertexPositions[0]),
    new THREE.Vector3().subVectors(vertexPositions[2], vertexPositions[0])
  ).normalize();
  return {
    index : faceIndex,
    normal,
    vertexPositions
  };
};

const faceIterator = (geometry, offset) => { //for meshes with buffered geometry
  const iterable = {};
  iterable[Symbol.iterator] = function* () {
    for (let i=0; i<(geometry.index.count/3); i++) {
      yield faceInBufferedGeometry(geometry, i, offset);
    }
  };
  return iterable;
};