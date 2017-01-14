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
    // console.log("theta1 is", deg(theta1));
    const refractAngle = Math.asin((inIOR/outIOR)*Math.sin(theta1)); //+
    // console.log("refract angle", deg(refractAngle));
    const reverseSurfaceNormal = surfaceNormal.clone().multiplyScalar(-1);
    // console.log("reverse surface normal", reverseSurfaceNormal);
    const rotationAxis = surfaceNormal.clone().cross(inRay).normalize();
    // console.log("rotation axis is", rotationAxis);
    const out = reverseSurfaceNormal.clone().applyAxisAngle(rotationAxis, refractAngle);
    // console.log("out", out);
    return out;
};

const getVertex = (geometry, index) => {
    const position = new THREE.Vector3();
    const normal = new THREE.Vector3();

    return {
        position: position.fromBufferAttribute( geometry.attributes.position, index),
        normal: normal.fromBufferAttribute( geometry.attributes.normal, index)
    }
};

const faceInBufferedGeomtry = (geometry, faceIndex) => {
    const vertices = [0,1,2].map(i => geometry.index.array[3*faceIndex+i]).map(i => getVertex(geometry, i));
    const positions = vertices.map(v => v.position);
    // const faceNormal = vertices.reduce((curr, v) => curr.add(), new THREE.Vector3(0,0,0)).normalize();
    var faceNormal = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors( b, a ),
        new THREE.Vector3().subVectors( c, a )
    ).normalize();

    return {
        normal: faceNormal,
        positions
    };
};

// const faceIterator = mesh => { //for meshes with buffered geometry
//     const iterable = {};
//     iterable[Symbol.iterator] = function* () {
//         const vertexCount = mesh.geometry.attributes.normal.count;
//         const normalArr = mesh.geometry.attributes.normal.array;
//         const positionArr = mesh.geometry.attributes.position.array;
//         for (let i=0; i<vertexCount; i++) {
//             const projectedI = i*3;
//             yield {
//                 normal: vector3FromArr(normalArr.subarray(projectedI,projectedI+3)),
//                 position: vector3FromArr(positionArr.subarray(projectedI,projectedI+3)),
//             }
//         }
//     };
//     return iterable;
// };