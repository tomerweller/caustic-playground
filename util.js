const RINDEX_AIR = 1;
const RINDEX_GLASS = 1.52;
const EQUALITY_THRESHEOLD = 0.01;

const perf = (fn) => {
  console.log(`running ${fn.name} with performance test`);
  const startTime = performance.now();
  const retval = fn();
  console.log(`${fn.name} took ${(performance.now() - startTime)/1000 } seconds.`);
  return retval;
};

const raycaster = new THREE.Raycaster();

/**
 *
 * @param origin
 * @param direction
 * @param mesh
 * @returns {*}
 */
const raycast = (origin, direction, mesh) => {
  raycaster.set(origin, direction);
  return raycaster.intersectObject(mesh);
};

/**
 *
 * @param surfaceNormal
 * @param inRay
 * @param inIOR
 * @param outIOR
 * @returns {*}
 */
const refract = (surfaceNormal, inRay, inIOR, outIOR) => {
  const theta1 = surfaceNormal.clone().angleTo(inRay); //+
  const refractAngle = Math.asin((inIOR/outIOR)*Math.sin(theta1)); //+
  const reverseSurfaceNormal = surfaceNormal.clone().multiplyScalar(-1);
  const rotationAxis = surfaceNormal.clone().cross(inRay).normalize();
  const out = reverseSurfaceNormal.clone().applyAxisAngle(rotationAxis, refractAngle);
  return out;
};

/**
 *
 * @param geometry
 * @param faceIndex
 * @param matrixWorld
 * @returns {{index: *, normal: (XML|XMLList|string|*), vertexPositions: Array}}
 */
const faceInBufferedGeometry = (geometry, faceIndex, matrixWorld) => {
  const vertexPositions = [0,1,2]
    .map(i => geometry.index.array[3*faceIndex+i])
    .map(vertexIndex =>
      new THREE.Vector3().fromBufferAttribute( geometry.attributes.position, vertexIndex).applyMatrix4(matrixWorld));


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

/**
 *
 * @param geometry
 * @param offset
 * @returns {{}}
 */
const faceIterator = (geometry, matrixWorld) => { //for meshes with buffered geometry
  const iterable = {};
  iterable[Symbol.iterator] = function* () {
    for (let i=0; i<(geometry.index.count/3); i++) {
      yield faceInBufferedGeometry(geometry, i, matrixWorld);
    }
  };
  return iterable;
};


/**
 * Get all faces in mesh from refracting a light source through a single face in the same mesh
 * @param face
 * @param mesh
 * @param lightOrigin
 * @param inIOR
 * @param outIOR
 * @returns {Array}
 */
const refractFaceOnSelf = (face, mesh, lightOrigin, inIOR, outIOR) => {
  const vertices = face.vertexPositions.map(position => ({
    position,
    inLightDirection: position.clone().sub(lightOrigin).normalize()
  }));
  const isFaceDirect = vertices.reduce((isTrue, v) => {
    const isecs = raycast(lightOrigin, v.inLightDirection, mesh);
    return isTrue && isecs.length>0 && isecs[0].point.distanceTo(v.position)<EQUALITY_THRESHEOLD;
  }, true);
  let faceProjections = [];
  if (isFaceDirect) {
    faceProjections = vertices.reduce( (prev, v) => {
      const ray = refract(face.normal, v.inLightDirection.clone().multiplyScalar(-1), inIOR, outIOR);
      const isecs = raycast(v.position, ray, mesh);
      //we might only care about the furthest but taking all for now
      const filteredIsecs = isecs.filter(isec => isec.distance>EQUALITY_THRESHEOLD);
      return prev.concat(filteredIsecs.map(isec => ({face: isec.face, ray})));
    }, []);
  }
  return faceProjections;
};


/**
 * Get all faces in mesh from refracting a light source through it
 * @param lightOrigin
 * @param mesh
 * @param inIOR
 * @param outIOR
 * @returns {Array}
 */
const refractOnSelf = (mesh, lightOrigin, inIOR, outIOR) => {
  let projectedFaces = [];
  for (let face of faceIterator(mesh.geometry, mesh.matrixWorld)) {
    for (let projectedFace of refractFaceOnSelf(face, mesh, lightOrigin, inIOR, outIOR)) {
      projectedFaces.push(projectedFace);
    }
  }
  return projectedFaces;
};

/**
 *
 * @param faceOrigin
 * @param originMesh
 * @param targetMesh
 * @param inIOR
 * @param outIOR
 * @returns {*}
 */
const projectOnOther = (faceOrigin, originMesh, targetMesh, inIOR, outIOR) => {
  const vertices = [faceOrigin.face.a, faceOrigin.face.b, faceOrigin.face.c]
    .map(v => new THREE.Vector3()
      .fromBufferAttribute(originMesh.geometry.attributes.position, v).applyMatrix4(originMesh.matrixWorld));
  return vertices.reduce( (prev, v) => {
    const ray = refract(faceOrigin.face.normal.clone().multiplyScalar(-1),
      faceOrigin.ray.clone().multiplyScalar(-1), inIOR, outIOR);
    const isecs = raycast(v, ray, targetMesh);
    return prev.concat(isecs);
  }, []);
};

/**
 *
 * @param faceOrigins
 * @param originMesh
 * @param targetMesh
 * @param inIOR
 * @param outIOR
 * @returns {Array}
 */
const refractOnOther = (faceOrigins, originMesh, targetMesh, inIOR, outIOR) => {
  let projectedFaces = [];
  for (let faceOrigin of faceOrigins) {
    for (let projectedFace of projectOnOther(faceOrigin, originMesh, targetMesh, inIOR, outIOR)) {
      projectedFaces.push(projectedFace);
    }
  }
  return projectedFaces;
};


const getDirectFaces = (lightOrigin, mesh, interference) => {
  let projectedFaces = [];
  for (let face of faceIterator(mesh.geometry, mesh.matrixWorld)) {
    const lightDirections = face.vertexPositions.map(position => position.clone().sub(lightOrigin).normalize());
    const isInterfered = lightDirections.reduce((prev, lightDirection) => {
      const isecs = raycast(lightOrigin, lightDirection, interference);
      return prev && isecs.length>0;
    }, true);
    if (!isInterfered) {
        projectedFaces.push(face.index);
    }
  }
  return projectedFaces;
};


/**
 *
 * @param origin
 * @param refractive
 * @param receiver
 * @param outIOR
 * @param inIOR
 * @returns {{}}
 */
const getCausticMap = (origin, refractive, receiver, outIOR, inIOR) => {
  const refractiveProjectedFaces = refractOnSelf(ball, origin, outIOR, inIOR);
  const receiverProjectedFaces = refractOnOther(refractiveProjectedFaces, refractive, receiver, inIOR, outIOR);
  const causticMap = {};
  receiverProjectedFaces.forEach(f =>
    causticMap[f.faceIndex] = f.faceIndex in causticMap? causticMap[f.faceIndex]+1: 0);

  const directFaces = getDirectFaces(origin, receiver, refractive);
  window.directFaces = directFaces;
  console.log("directFaces", directFaces);
  directFaces.forEach(faceIndex => causticMap[faceIndex] = faceIndex in causticMap? causticMap[faceIndex]+1: 0);

  return causticMap;
};