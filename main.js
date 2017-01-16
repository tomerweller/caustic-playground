/**
 * Created by weller on 1/3/17.
 */

const loader = new THREE.ObjectLoader();
let camera, renderer, stats, scene, ball, floor, light, ballGeometry, floorGeometry;

const initScene = loadedScene => {
    scene = loadedScene;
    ball = scene.getObjectByName("Ball");
    ball.material.side = THREE.DoubleSide;
    ballGeometry = ball.geometry;

    floor = scene.getObjectByName("Floor");
    floorGeometry = floor.geometry;
    floor.material.vertexColors = THREE.VertexColors;
    // floor.material.side = THREE.DoubleSide;

    light = scene.getObjectByName("PointLight");
    console.log("scene loading...");
    console.log(scene);

    const container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.set( 0.0, 10, 10 * 3.5 );

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    renderer.gammaInput = true;
    renderer.gammaOutput = true;


    stats = new Stats();
    container.appendChild( stats.dom );
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.target.set( 0, 0, 0 );
    controls.update();
    initSettings();
    animate();
};

const onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize( width, height );
};

const animate = () => {
    requestAnimationFrame( animate );
    stats.begin();
    render();
    stats.end();
};

const render = () => {
    light.castShadow = settings.lightPointCastShadows;
    renderer.render( scene, camera );
};

const deg = (rad) => rad*(180/Math.PI);

const log = console.log;

const projectFacesBallWall = pf => {
    const vertices = [pf.face.a, pf.face.b, pf.face.c]
        .map(v => new THREE.Vector3().fromBufferAttribute( ball.geometry.attributes.position, v).add(ball.position));

    return vertices.reduce( (prev, v) => {
        const ray = refract(pf.face.normal.clone().multiplyScalar(-1), pf.ray.clone().multiplyScalar(-1), RINDEX_GLASS, RINDEX_AIR);
        const isecs = raycast(v, ray, floor);
        //we might only care about the furthest but taking all for now
        return prev.concat(isecs);
    }, []);
};

const getCausticMap = (origin, refractive, receiver, outIOR, inIOR) => {
    const start = performance.now();
    console.log("0", performance.now() - start);
    const  refractiveProjectedFaces = refractOnSelf(ball, origin, outIOR, inIOR);
    console.log("1", performance.now() - start);
    const receiverProjectedFaces = refractOnOther(refractiveProjectedFaces, refractive, receiver, inIOR, outIOR);
    console.log("2", performance.now()-start);
    const causticMap = {};
    receiverProjectedFaces.forEach(f => {
        if (!(f.faceIndex in causticMap)){
            causticMap[f.faceIndex] = 0;
        }
        causticMap[f.faceIndex]+=1;
    });
    console.log("3", performance.now()-start);
    return causticMap;
};

const getMainCausticMap = () => getCausticMap(light.position, ball, floor, RINDEX_AIR, RINDEX_GLASS);
const applyCaustics = (causticMap, fnGetter) => {
    const max = Object.keys(causticMap).reduce((currMax,i) => {
        return causticMap[i]>currMax? causticMap[i]: currMax;
    }, Number.MIN_SAFE_INTEGER);

    console.log("max is", max);
    const fn = fnGetter(max);

    const color = new Float32Array(floor.geometry.attributes.position.count*3);
    for(face of faceIterator(floor.geometry, floor.position)) {
        const val = face.index in causticMap ? fn(causticMap[face.index]) : 0;
        [0,1,2]
            .map(i => floorGeometry.index.array[3*face.index+i])
            .map(vertexIndex => {
                [0,1,2].map(j => color[vertexIndex*3+j]= val);
            })
    }

    floor.geometry.addAttribute('color', new THREE.BufferAttribute(color, 3) );
    floor.geometry.attributes.color.needsUpdate = true;
    // floorGeometry.colorsNeedUpdate = true;
};

const getArctanFn = max => x => Math.atan(50*(x/max))/(Math.PI/2);
const getLinearFn = max => x => x/max;
const getQuadraticFn = max => x => Math.pow(x/max,2);

const testCaustics = () => {
    const map = getCausticMap();
    applyCaustics(map, getArctanFn);
};

loader.load( "plane-scene.json", initScene);
window.addEventListener( 'resize', onWindowResize, false );

const settings = {
    lightPointCastShadows: true,
    testCaustics: testCaustics
};

const initSettings = () => {
    const gui = new dat.GUI();
    gui.add(settings, 'lightPointCastShadows');
    gui.add(settings, 'testCaustics');
};

