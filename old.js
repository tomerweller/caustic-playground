const vector3FromArr = arr => new THREE.Vector3(arr[0],arr[1],arr[2]);
const vertexIterator = mesh => { //for meshes with buffered geometry
    const iterable = {};
    iterable[Symbol.iterator] = function* () {
        const vertexCount = mesh.geometry.attributes.normal.count;
        const normalArr = mesh.geometry.attributes.normal.array;
        const positionArr = mesh.geometry.attributes.position.array;
        for (let i=0; i<vertexCount; i++) {
            const projectedI = i*3;
            yield {
                normal: vector3FromArr(normalArr.subarray(projectedI,projectedI+3)),
                position: vector3FromArr(positionArr.subarray(projectedI,projectedI+3)),
            }
        }
    };
    return iterable;
};

const testRefract1 = () => refract(new THREE.Vector3(0,1,0), new THREE.Vector3(0.5,0.866,0), 1, 1.5);
const testRefract2 = () => refract(new THREE.Vector3(0,1,0), new THREE.Vector3(-0.5,0.866,0), 1, 1.5);
const testRefract4 = () => refract(new THREE.Vector3(0,-1,0), new THREE.Vector3(0.5,-0.866,0), 1, 1.5);
const testRefract5 = () => refract(new THREE.Vector3(0,-1,0), new THREE.Vector3(-0.5,-0.866,0), 1, 1.5);

const vTest = {
    normal: new THREE.Vector3(0,1,0),
    position: new THREE.Vector3(0,1.5,0)
};


//pseudo code
//l is light source
//for v in refractive vertices:
//  ln = vector between l and v
//  isects1 = raycast from l in ln with refractive mesh.
//  if first hit is v:
//    rn = refract normal
//    v2 = raycast from v in rn with refractive mesh
//    fn = refract rn from v2
//    raycast fn with receptive mesh


const calcLightDestination = (v) => {
    log(v);
    const v1globalPos = v.position.clone().add(ball.position);
    const ln = v1globalPos.clone().sub(light.position).normalize();
    const isecs = raycast(light.position, ln, ball);
    // console.log(isecs);
    // isecs.forEach((isec,i) => console.log(`${i}:${isec.distance}`));
    // console.log(v.position);
    if (isecs.length>0 && isecs[0].point.distanceTo(v1globalPos)<EQUALITY_THRESHEOLD){
        const out = refract(v.normal, ln.clone().multiplyScalar(-1), RINDEX_AIR, RINDEX_GLASS);
        console.log("out", out);
        const inIsecs = raycast(v1globalPos, out, ball);
        inIsecs
        // .filter(isec => isec.distance>EQUALITY_THRESHEOLD)
            .forEach((isec,i) => console.log(`${i}:${isec.distance}`));
        const firstRemoteIsec = inIsecs.find(isec => isec.distance>EQUALITY_THRESHEOLD);
        console.log("second intersection", firstRemoteIsec);
    }
};

const hashVertex = v => `${v.position.x},${v.position.y},${v.position.z},${v.normal.x},${v.normal.y},${v.normal.z}`;
const distinctVertices = arr => {
    //filter to unique positions
    const mem = new Set();
    return arr.filter(v => {
        const hash = hashVertex(v);
        if (mem.has(hash)) {
            return false;
        } else {
            mem.add(hash);
            return true;
        }
    });
};

const calc = () => {
    const allVertices = [... vertexIterator(ball)];
    const uniqueVertices = distinctVertices(allVertices);
    log("all/unique", allVertices.length, uniqueVertices.length);
    uniqueVertices.forEach(calcLightDestination);
    return "done";
};
