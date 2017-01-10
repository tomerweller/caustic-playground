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