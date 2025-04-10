const counterDOM = document.getElementById('counter');  
const endDOM = document.getElementById('end');  

const scene = new THREE.Scene();

const distance = 500;
const camera = new THREE.OrthographicCamera( window.innerWidth/-2, window.innerWidth/2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 10000 );

camera.rotation.x = 50*Math.PI/180;
camera.rotation.y = 20*Math.PI/180;
camera.rotation.z = 10*Math.PI/180;

const initialCameraPositionY = -Math.tan(camera.rotation.x)*distance;
const initialCameraPositionX = Math.tan(camera.rotation.y)*Math.sqrt(distance**2 + initialCameraPositionY**2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

const zoom = 3;

const chickenSize = 15;

const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth*columns;

const stepTime = 200; // Miliseconds it takes for the chicken to take a step forward, backward, left or right

let lanes;
let currentLane;
let currentColumn;

let previousTimestamp;
let startMoving;
let moves;
let stepStartTimestamp;

let gameOver = false;
let isFlattened = false;

const carFrontTexture = new Texture(40,80,[{x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = new Texture(40,80,[{x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = new Texture(110,40,[{x: 10, y: 0, w: 50, h: 30 }, {x: 70, y: 0, w: 30, h: 30 }]);
const carLeftSideTexture = new Texture(110,40,[{x: 10, y: 10, w: 50, h: 30 }, {x: 70, y: 10, w: 30, h: 30 }]);

const truckFrontTexture = new Texture(30,30,[{x: 15, y: 0, w: 10, h: 30 }]);
const truckRightSideTexture = new Texture(25,30,[{x: 0, y: 15, w: 10, h: 10 }]);
const truckLeftSideTexture = new Texture(25,30,[{x: 0, y: 5, w: 10, h: 10 }]);

const generateLanes = () => [-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9].map((index) => {
  const lane = new Lane(index);
  lane.mesh.position.y = index*positionWidth*zoom;
  scene.add( lane.mesh );
  return lane;
}).filter((lane) => lane.index >= 0);

const addLane = () => {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index*positionWidth*zoom;
  scene.add(lane.mesh);
  lanes.push(lane);
}

const chicken = new Chicken();
scene.add( chicken );

hemiLight = new THREE.HemisphereLight(0xdedda2, 0xbacee3, 0.6);
scene.add(hemiLight)

const initialDirLightPositionX = -100;
const initialDirLightPositionY = 0;
dirLight = new THREE.DirectionalLight(0xe0dbab, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = chicken;
scene.add(dirLight);

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = - d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = - d;

// var helper = new THREE.CameraHelper( dirLight.shadow.camera );
// var helper = new THREE.CameraHelper( camera );
// scene.add(helper)

backLight = new THREE.DirectionalLight(0x000000, .4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight)

const laneTypes = ['car', 'truck', 'forest','railway'];
const laneSpeeds = [2.5, 3, 3.5];
const CarColors = [0xbbf36a, 0xff7035, 0xfdfe5e,0xb08aff];
const TruckColors = [0x36a7e9, 0xe82e49];
const threeHeights = [20,45,60];

const initaliseValues = () => {
  lanes = generateLanes()

  currentLane = 0;
  currentColumn = Math.floor(columns/2);

  previousTimestamp = null;

  startMoving = false;
  moves = [];
  stepStartTimestamp;

  chicken.position.x = 0;
  chicken.position.y = 0;

  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;

  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;
}

initaliseValues();

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

function Texture(width, height, rects) {
  const canvas = document.createElement( "canvas" );
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext( "2d" );
  context.fillStyle = "#ffffff";
  context.fillRect( 0, 0, width, height );
  context.fillStyle = "rgba(0,0,0,0.6)";  
  rects.forEach(rect => {
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  return new THREE.CanvasTexture(canvas);
}

function Wheel() {
  const wheel = new THREE.Mesh( 
    new THREE.BoxBufferGeometry( 13*zoom, 33*zoom, 12*zoom ),
    new THREE.MeshLambertMaterial( { color: 0x333333, flatShading: true } ) 
  );
  wheel.position.z = 6*zoom;
  return wheel;
}

function Stripe(a) {
  const stripeColor = new THREE.Color(a);
  stripeColor.multiplyScalar(0.8); // Делаем цвет на 30% темнее

  const stripe = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 61*zoom, 10*zoom, 15*zoom ),
    new THREE.MeshLambertMaterial( { color:stripeColor, flatShading: true } )
  );
  stripe.position.z = 6*zoom;
  return stripe;
}

function underCar(a) {
  const stripeColor = new THREE.Color(a);
  stripeColor.multiplyScalar(0.6); // Делаем цвет на 30% темнее

  const undercar = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 23*zoom, 32*zoom, 2*zoom ),
    new THREE.MeshLambertMaterial( { color:stripeColor, flatShading: true } )
  );
  undercar.position.z = 6*zoom;
  return undercar;
}

function SideunderCar(a) {
  const stripeColor = new THREE.Color(a);
  stripeColor.multiplyScalar(0.6); // Делаем цвет на 30% темнее

  const sideundercar = new THREE.Mesh(
    new THREE.BoxBufferGeometry(10*zoom, 32*zoom, 2*zoom ),
    new THREE.MeshLambertMaterial( { color:stripeColor, flatShading: true } )
  );
  sideundercar.position.z = 6*zoom;
  return sideundercar;
}

function underunderCar() {
  const underundercar = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 23*zoom, 32*zoom, 2*zoom ),
    new THREE.MeshLambertMaterial( { color:0x454062, flatShading: true } )
  );
  underundercar.position.z = 6*zoom;
  return underundercar;
}

function SideunderunderCar() {
  const sideunderundercar = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 7*zoom, 32*zoom, 2*zoom ),
    new THREE.MeshLambertMaterial( { color:0x454062, flatShading: true } )
  );
  sideunderundercar.position.z = 6*zoom;
  return sideunderundercar;
}


function WingMirror(a){
  const stripeColor = new THREE.Color(a);
  stripeColor.multiplyScalar(0.8); // Делаем цвет на 20% темнее

  const stripe = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 8*zoom, 37*zoom, 5*zoom ),
    new THREE.MeshLambertMaterial( { color:stripeColor, flatShading: true } )
  );
  stripe.position.z = 6*zoom;
  return stripe;
}


function InWheel()
{
  const inwheel = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 5*zoom, 33.5*zoom, 5*zoom ),
    new THREE.MeshLambertMaterial( { color: 0xc1c8fc, flatShading: true } )
  );
  inwheel.position.z = 6*zoom;
  return inwheel;
}

function Car() {
  const car = new THREE.Group();
  const color = CarColors[Math.floor(Math.random() * CarColors.length)];
  
  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 60*zoom, 30*zoom, 15*zoom ), 
    new THREE.MeshPhongMaterial( { color, flatShading: true } )
  );
  main.position.z = 12*zoom;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main)
  
  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 33*zoom, 24*zoom, 12*zoom ), 
    [
      new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true, map: carBackTexture } ),
      new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true, map: carFrontTexture } ),
      new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true, map: carRightSideTexture } ),
      new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true, map: carLeftSideTexture } ),
      new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ), // top
      new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ),// bottom
    ]

  );
  cabin.position.x = 6*zoom;
  cabin.position.z = 25.5*zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add( cabin );

  const undercar = new underCar(color);
  undercar.position.z =8*zoom;
  car.add( undercar );

  const leftsideunderCar = new SideunderCar(color)
  leftsideunderCar.position.z = 8*zoom;
  leftsideunderCar.position.x = -26*zoom;
  car.add(leftsideunderCar);

  const rightsideunderCar = new SideunderCar(color)
  rightsideunderCar.position.z = 8*zoom;
  rightsideunderCar.position.x = 26*zoom;
  car.add(rightsideunderCar);



  const underundercar = new underunderCar();
  underundercar.position.z = 6*zoom;
  car.add( underundercar );

  const leftsideunderunderCar = new SideunderunderCar()
  leftsideunderunderCar.position.z = 6*zoom;
  leftsideunderunderCar.position.x = -28*zoom;
  car.add(leftsideunderunderCar);

  const rightsideunderunderCar = new SideunderunderCar()
  rightsideunderunderCar.position.z = 6*zoom;
  rightsideunderunderCar.position.x = 28*zoom;
  car.add(rightsideunderunderCar);

  const stripe = new Stripe(color);
  stripe.position.z = 13*zoom;
  car.add( stripe );

  const wingmirror = new WingMirror(color);
  wingmirror.position.z = 16.5*zoom;
  wingmirror.position.x = -4*zoom;
  car.add( wingmirror );


  const frontWheel = new Wheel();
  frontWheel.position.x = -18*zoom;
  car.add( frontWheel );

  const backWheel = new Wheel();
  backWheel.position.x = 18*zoom;
  car.add( backWheel );

  const frontInWheel = new InWheel();
  frontInWheel.position.x = -18*zoom;
  car.add( frontInWheel );

  const backInWheel = new InWheel();
  backInWheel.position.x = 18*zoom;
  car.add( backInWheel );

  car.castShadow = true;
  car.receiveShadow = false;
  
  return car;  
}

function UnderCabin() {
  const undercabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 10*zoom, 23*zoom, 4*zoom ),
    new THREE.MeshLambertMaterial( { color: 0xffffff, flatShading: true } )
  );
  undercabin.position.z = 6*zoom;
  undercabin.castShadow = true;
  return undercabin;
}

function UpUnderCabin() {
  const upundercabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 7*zoom, 23*zoom, 4*zoom ),
    new THREE.MeshLambertMaterial( { color: 0xffffff, flatShading: true } )
  );
  upundercabin.position.z = 6*zoom;
  upundercabin.castShadow = true;
  return upundercabin;
}

function WindowCabin() {
  const window = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 10*zoom, 30.5*zoom, 9*zoom ),
    new THREE.MeshLambertMaterial( { color: 0x000000, flatShading: true } )
  );
  window.position.z = 6*zoom;
  return window;
}

function WingTruckMirror(b){
  const mirrorTruckColor = new THREE.Color(b);
  mirrorTruckColor.multiplyScalar(0.8); // Делаем цвет на 20% темнее

  const wingtruckmirror = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 4*zoom, 37*zoom, 6*zoom ),
    new THREE.MeshLambertMaterial( { color:mirrorTruckColor, flatShading: true } )
  );
  wingtruckmirror.position.z = 6*zoom;
  return wingtruckmirror;
}

function Truck() {
  const truck = new THREE.Group();
  const color = TruckColors[Math.floor(Math.random() * TruckColors.length)];

  const base = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 100*zoom, 25*zoom, 5*zoom ), 
    new THREE.MeshLambertMaterial( { color: 0xb4c6fc, flatShading: true } )
  );
  base.position.z = 10*zoom;
  truck.add(base)

  const cargo = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 75*zoom, 35*zoom, 40*zoom ), 
    new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } )
  );
  cargo.position.x = 15*zoom;
  cargo.position.z = 30*zoom;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo)

  const wingtruckmirror = new WingTruckMirror(color);
  wingtruckmirror.position.x = -44*zoom;
  wingtruckmirror.position.z = 16*zoom;
  // wingtruckmirror.position.y = *zoom;
  truck.add( wingtruckmirror );


  const undercabin = new UnderCabin();
  undercabin.position.x = -32*zoom;
  undercabin.position.z = 37*zoom;
  truck.add( undercabin );

  const upundercabin = new UpUnderCabin();
  upundercabin.position.x = -29*zoom;
  upundercabin.position.z = 41*zoom;
  truck.add( upundercabin );

  const window = new WindowCabin();
  window.position.x = -48*zoom;
  window.position.z = 25*zoom;
  truck.add( window );

  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 25*zoom, 30*zoom, 30*zoom ), 
    [
      new THREE.MeshPhongMaterial( { color, flatShading: true } ), // back
      new THREE.MeshPhongMaterial( { color, flatShading: true, map: truckFrontTexture } ),
      new THREE.MeshPhongMaterial( { color, flatShading: true, map: truckRightSideTexture } ),
      new THREE.MeshPhongMaterial( { color, flatShading: true, map: truckLeftSideTexture } ),
      new THREE.MeshPhongMaterial( { color, flatShading: true } ), // top
      new THREE.MeshPhongMaterial( { color, flatShading: true } ) // bottom
    ]
  );
  cabin.position.x = -40*zoom;
  cabin.position.z = 20*zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add( cabin );

  const frontWheel = new Wheel();
  frontWheel.position.x = -38*zoom;
  truck.add( frontWheel );

  const middleWheel = new Wheel();
  middleWheel.position.x = -10*zoom;
  truck.add( middleWheel );

  const backWheel = new Wheel();
  backWheel.position.x = 30*zoom;
  truck.add( backWheel );

  const frontInWheel = new InWheel();
  frontInWheel.position.x = -38*zoom;
  truck.add( frontInWheel );

  const middleInWheel = new InWheel();
  middleInWheel.position.x = -10*zoom;
  truck.add( middleInWheel );

  const backInWheel = new InWheel();
  backInWheel.position.x = 30*zoom;
  truck.add( backInWheel );

  return truck;
}



function Three() {
  const three = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 15*zoom, 15*zoom, 20*zoom ), 
    new THREE.MeshPhongMaterial( { color: 0x703939, flatShading: true } )
  );
  trunk.position.z = 10*zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  three.add(trunk);

  height = threeHeights[Math.floor(Math.random()*threeHeights.length)];

  const crown = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 30*zoom, 30*zoom, height*zoom ), 
    new THREE.MeshLambertMaterial( { color: 0x9fc217, flatShading: true } )
  );
  crown.position.z = (height/2+20)*zoom;
  crown.castShadow = true;
  crown.receiveShadow = false;
  three.add(crown);

  return three;  
}

function Rock() {
  const rock = new THREE.Group();
  const sizes = [25, 25, 25]; // Размеры кубов (уменьшаются)
  const colors = [0xc8b7dc, 0xc8b7dc, 0xc8b7dc]; // Серые оттенки

  sizes.forEach((size, index) => {
      const cube = new THREE.Mesh(
          new THREE.BoxBufferGeometry(size * zoom, size * zoom, size * zoom),
          new THREE.MeshPhongMaterial({ color: colors[index], flatShading: true })
      );
      cube.position.z = 5 * zoom; // Поднимаем камень над землей
      cube.castShadow = true;
      cube.receiveShadow = true;
      rock.add(cube);
      //cube.position.z = (sizes.length - index) * zoom; // Поднимаем каждый куб по оси Z
  });
  return rock;
}

function Chicken() {
  const chicken = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxBufferGeometry( chickenSize*zoom, (chickenSize+4)*zoom, 8*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } )
  );
  body.position.z = 15*zoom;
  body.castShadow = true;
  body.receiveShadow = true;
  chicken.add(body);

  const wing = new THREE.Mesh(
    new THREE.BoxBufferGeometry( (chickenSize+5)*zoom, (chickenSize)*zoom, 6*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } )
  );
  wing.position.z = 15*zoom;
  wing.castShadow = true;
  wing.receiveShadow = true;
  chicken.add(wing);

  const tail = new THREE.Mesh(
    new THREE.BoxBufferGeometry( (chickenSize-4)*zoom, (chickenSize-11)*zoom, 4*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } )
  );
  tail.position.z = 17*zoom;
  tail.position.y = -10*zoom;
  tail.castShadow = true;
  tail.receiveShadow = true;
  chicken.add(tail);

  const cock_head = new THREE.Mesh(
      new THREE.BoxBufferGeometry( chickenSize*zoom, (chickenSize-1)*zoom, 20*zoom ),
      new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } )
  );
  cock_head.position.z = 25*zoom;
  cock_head.position.y = 4*zoom;
  cock_head.castShadow = true;
  cock_head.receiveShadow = false;
  chicken.add(cock_head);

  const cock_beak = new THREE.Mesh(
      new THREE.BoxBufferGeometry( 5*zoom, 6*zoom, 4*zoom ),
      new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  cock_beak.position.z = 28*zoom;
  cock_beak.position.y = 13*zoom
  cock_beak.castShadow = true;
  cock_beak.receiveShadow = false;
  chicken.add(cock_beak);

  const under_cock_beak = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 5*zoom, 6*zoom, 3*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xF0619A, flatShading: true } )
  );
  under_cock_beak.position.z = 25*zoom;
  under_cock_beak.position.y = 12*zoom
  under_cock_beak.castShadow = true;
  under_cock_beak.receiveShadow = false;
  chicken.add(under_cock_beak);

  const lfoot = new THREE.Mesh(
      new THREE.BoxBufferGeometry( 2*zoom, 2*zoom, 10*zoom ),
      new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  lfoot.position.z = 10*zoom;
  lfoot.position.x = -5*zoom
  lfoot.castShadow = true;
  lfoot.receiveShadow = false;
  chicken.add(lfoot);

  const lpaw = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 5*zoom, 6*zoom, 2*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  lpaw.position.z = 3*zoom;
  lpaw.position.x = -5*zoom;
  lpaw.position.y = -1*zoom
  lpaw.castShadow = true;
  lpaw.receiveShadow = false;
  chicken.add(lpaw);

  const llpaw = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 2*zoom, 5*zoom, 2*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  llpaw.position.z = 3*zoom;
  llpaw.position.x = -6.5*zoom;
  llpaw.position.y = 3*zoom;
  llpaw.castShadow = true;
  llpaw.receiveShadow = false;
  chicken.add(llpaw);

  const lrpaw = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 2*zoom, 5*zoom, 2*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  lrpaw.position.z = 3*zoom;
  lrpaw.position.x = -3*zoom;
  lrpaw.position.y = 3*zoom;
  lrpaw.castShadow = true;
  lrpaw.receiveShadow = false;
  chicken.add(lrpaw);

  const rpaw = new THREE.Mesh(
      new THREE.BoxBufferGeometry( 5*zoom, 6*zoom, 2*zoom ),
      new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  rpaw.position.z = 3*zoom;
  rpaw.position.x = 5*zoom
  rpaw.position.y = -1*zoom
  rpaw.castShadow = true;
  rpaw.receiveShadow = false;
  chicken.add(rpaw);

  const rlpaw = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 2*zoom, 5*zoom, 2*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  rlpaw.position.z = 3*zoom;
  rlpaw.position.x = 6.5*zoom;
  rlpaw.position.y = 3*zoom;
  rlpaw.castShadow = true;
  rlpaw.receiveShadow = false;
  chicken.add(rlpaw);

  const rrpaw = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 2*zoom, 5*zoom, 2*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  rrpaw.position.z = 3*zoom;
  rrpaw.position.x = 3*zoom;
  rrpaw.position.y = 3*zoom;
  rrpaw.castShadow = true;
  rrpaw.receiveShadow = false;
  chicken.add(rrpaw);


  const rfoot = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 2*zoom, 2*zoom, 10*zoom ),
    new THREE.MeshPhongMaterial( { color: 0xd66c1c, flatShading: true } )
  );
  rfoot.position.z = 10*zoom;
  rfoot.position.x = 5*zoom
  rfoot.castShadow = true;
  rfoot.receiveShadow = false;
  chicken.add(rfoot);

  const eyes = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 16*zoom, 2*zoom, 2*zoom ),
    new THREE.MeshPhongMaterial( { color: 0x000000, flatShading: true } )
  );
  eyes.position.z = 30*zoom;
  eyes.position.y = 5*zoom
  eyes.castShadow = true;
  eyes.receiveShadow = false;
  chicken.add(eyes);

  const rowel = new THREE.Mesh(
    new THREE.BoxBufferGeometry( 5*zoom, 7*zoom, 5*zoom ),
    new THREE.MeshLambertMaterial( { color: 0xF0619A, flatShading: true } )
  );
  rowel.position.z = 36*zoom;
  rowel.position.y = 5*zoom;
  rowel.castShadow = true;
  rowel.receiveShadow = false;
  chicken.add(rowel);

  return chicken;  
}

function rzd() {
  const rzd = new THREE.Group();

  // Создаем основные секции дороги
  const createSection = color => new THREE.Mesh(
      new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
      new THREE.MeshPhongMaterial({ color })
  );

  //Левая полоса
  const leftLane = createSection(0x454A59); // Цвет левой полосы
  leftLane.position.x = -boardWidth * zoom / 4; // Смещаем левую полосу влево
  leftLane.position.z = 2;
  leftLane.receiveShadow = true;
  rzd.add(leftLane);

  // Правая полоса
  const rightLane = createSection(0x454A59); // Цвет правой полосы
  rightLane.position.x = boardWidth * zoom / 4; // Смещаем правую полосу вправо
  rightLane.position.z = 2;
  rightLane.receiveShadow = true;
  rzd.add(rightLane);

  // Добавляем пунктирную разделительную полосу
  const shpali = new THREE.Group(); // Группа для пунктирных сегментов
  const segmentLength = 35 * zoom; // Длина одного сегмента
  const gapLength = 15 * zoom; // Расстояние между сегментами
  const totalLength = boardWidth * zoom; // Полная длина разделительной полосы

  for (let x = -2* boardWidth * zoom; x < 2* boardWidth * zoom; x += gapLength) {
    const segment = new THREE.Mesh(
        new THREE.BoxBufferGeometry( 2*zoom, segmentLength, 2*zoom ),
        new THREE.MeshPhongMaterial( { color: 0x4d4c4c, flatShading: true } )
    );
    segment.position.x = x;
    segment.position.y = 0; // Располагаем сегмент
    segment.position.z = 3; // Поднимаем немного над дорогой
    shpali.add(segment);
  }

  const segmentl = new THREE.Mesh(
      new THREE.BoxBufferGeometry( 2 * boardWidth * zoom , 2*zoom,2*zoom), // Размер сегмента
      new THREE.MeshPhongMaterial({ color: 0x4d4c4c, flatShading: true}) // Цвет
  );
  segmentl.position.x = 0;
  segmentl.position.y = 17; // Располагаем сегмент
  segmentl.position.z = 3; // Поднимаем немного над дорогой
  shpali.add(segmentl);

  const segmentr = new THREE.Mesh(
      new THREE.BoxBufferGeometry( 2 * boardWidth * zoom , 2*zoom,2*zoom), // Размер сегмента
      new THREE.MeshPhongMaterial({ color: 0x4d4c4c, flatShading: true}) // Цвет
  );
  segmentr.position.x = 0;
  segmentr.position.y = -17; // Располагаем сегмент
  segmentr.position.z = 3; // Поднимаем немного над дорогой
  shpali.add(segmentr);

  rzd.add(shpali); // Добавляем пунктирную полосу в группу дороги

  return rzd;
}

function Road() {
  const road = new THREE.Group();

  // Создаем основные секции дороги
  const createSection = color => new THREE.Mesh(
    new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
    new THREE.MeshPhongMaterial({ color })
  );

  // Левая полоса
  const leftLane = createSection(0x454A59); // Цвет левой полосы
  leftLane.position.x = -boardWidth * zoom / 4; // Смещаем левую полосу влево
  leftLane.receiveShadow = true;
  road.add(leftLane);

  // Правая полоса
  const rightLane = createSection(0x454A59); // Цвет правой полосы
  rightLane.position.x = boardWidth * zoom / 4; // Смещаем правую полосу вправо
  rightLane.receiveShadow = true;
  road.add(rightLane);

  // Добавляем пунктирную разделительную полосу
  const divider = new THREE.Group(); // Группа для пунктирных сегментов
  const segmentLength = 20 * zoom; // Длина одного сегмента
  const gapLength = 10 * zoom; // Расстояние между сегментами
  const totalLength = boardWidth * zoom; // Полная длина разделительной полосы

  for (let x = -totalLength / 2; x < totalLength / 2; x += segmentLength + gapLength) {
    const segment = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(segmentLength, 4 * zoom), // Размер сегмента
      new THREE.MeshPhongMaterial({ color: 0xc3c9c5 }) // Цвет
    );
    segment.position.x = x;
    segment.position.y = 50; // Располагаем сегмент
    segment.position.z = 1; // Поднимаем немного над дорогой
    divider.add(segment);
  }

  road.add(divider); // Добавляем пунктирную полосу в группу дороги

  return road;
}

function createGrassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 200; // Ширина текстуры
  canvas.height = 200; // Высота текстуры

  const context = canvas.getContext("2d");

  // Заливаем фон прозрачным
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Размер одного блока текстуры
  const blockSize = 50;

  for (let x = 0; x < canvas.width; x += blockSize) {
    for (let y = 0; y < canvas.height; y += blockSize) {
      // Чередуем цвета
      const isLight = ((x / blockSize) + (y / blockSize)) % 2 === 0;
      context.fillStyle = isLight ? "#baf455" : "#99C846"; // Светлый и темный оттенки травы
      context.fillRect(x, y, blockSize, blockSize);
    }
  }

  return new THREE.CanvasTexture(canvas);
}

function createGrassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 200; // Ширина текстуры
  canvas.height = 200; // Высота текстуры
  const context = canvas.getContext("2d");

  // Заливаем фон прозрачным
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Размер одной группы полос (2 полосы)
  const groupSize = 50 * 2; // Каждая группа содержит 2 полосы

  for (let y = 0; y < canvas.height; y += groupSize) {
    // Определяем цвет группы (чередование светлого и темного)
    const isLightGroup = Math.floor(y / groupSize) % 2 === 0;

    // Рисуем 2 полосы в группе
    for (let i = 0; i < 2; i++) {
      const blockY = y + i * 50;
      context.fillStyle = isLightGroup ? "#aee168" : "#a7d960"; // Светлый или темный оттенок травы
      context.fillRect(0, blockY, canvas.width, 50); // Рисуем полосу по всей ширине
    }
  }

  return new THREE.CanvasTexture(canvas);
}

function Grass() {
  const grass = new THREE.Group();

  // Создаем текстуру травы
  const grassTexture = createGrassTexture();

  // Создаем секции травы
  const createSection = () => new THREE.Mesh(
    new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
    new THREE.MeshPhongMaterial({
      map: grassTexture, // Используем текстуру
      side: THREE.DoubleSide // Чтобы текстура была видна с обеих сторон
    })
  );

  const middle = createSection();
  middle.receiveShadow = true;
  grass.add(middle);

  const left = createSection();
  left.position.x = -boardWidth * zoom;
  grass.add(left);

  const right = createSection();
  right.position.x = boardWidth * zoom;
  grass.add(right);

  grass.position.z = 1.5 * zoom; // Поднимаем траву немного над землей

  return grass;
}

function Lane(index) {
  this.index = index;
  this.type = index <= 0 ? 'field' : laneTypes[Math.floor(Math.random()*laneTypes.length)];

  switch(this.type) {
    case 'field': {
      this.type = 'field';
      this.mesh = new Grass();
      break;
    }
    case 'forest': {
      this.mesh = new Grass();
      this.occupiedPositions = new Set(); // Позиции, занятые деревьями или камнями
  
      // Добавляем деревья
      this.threes = [1, 2, 3, 4].map(() => {
          const three = new Three();
          let position;
          do {
              position = Math.floor(Math.random() * columns);
          } while (this.occupiedPositions.has(position));
          this.occupiedPositions.add(position);
          three.position.x = (position * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2;
          this.mesh.add(three);
          return three;
      });
  
      // Добавляем камни
      this.rocks = [1, 2].map(() => { // Добавляем 2 камня на полосу
          const rock = new Rock();
          let position;
          do {
              position = Math.floor(Math.random() * columns);
          } while (this.occupiedPositions.has(position));
          this.occupiedPositions.add(position);
          rock.position.x = (position * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2;
          this.mesh.add(rock);
          return rock;
      });
  
      break;
  }
    case 'car' : {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1,2,3].map(() => {
        const vechicle = new Car();
        let position;
        do {
          position = Math.floor(Math.random()*columns/2);
        }while(occupiedPositions.has(position))
          occupiedPositions.add(position);
        vechicle.position.x = (position*positionWidth*2+positionWidth/2)*zoom-boardWidth*zoom/2;
        if(!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add( vechicle );
        return vechicle;
      })

      this.speed = laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)] + (this.index / 50);
      break;
    }
    case 'truck' : {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1,2].map(() => {
        const vechicle = new Truck();
        let position;
        do {
          position = Math.floor(Math.random()*columns/3);
        }while(occupiedPositions.has(position))
          occupiedPositions.add(position);
        vechicle.position.x = (position*positionWidth*3+positionWidth/2)*zoom-boardWidth*zoom/2;
        if(!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add( vechicle );
        return vechicle;
      })

      this.speed = laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)]  + (this.index / 50) ;
      break;
    }
    case 'railway' : {
      this.mesh = new rzd();
      this.direction = Math.random() >= 0.5;
      break;
    }
  }
}

function retryGame() {
  lanes.forEach(lane => scene.remove(lane.mesh));
  initaliseValues();
  endDOM.classList.add('hide');
  endDOM.classList.remove('show');
  gameOver = false;
  isFlattened = false;
  chicken.scale.set(1, 1, 1); // Восстанавливаем исходный размер курицы
}

document.querySelector("#retry").addEventListener("click", () => {
  retryGame();
});

// document.querySelector("#retry").addEventListener("click", () => {
//   lanes.forEach(lane => scene.remove( lane.mesh ));
//   initaliseValues();
//   endDOM.classList.add('hide');
//   endDOM.classList.remove('show');
//   gameOver = false;
//   isFlattened = false;
//   chicken.scale.set(1, 1, 1)
// });

document.getElementById('forward').addEventListener("click", () => move('forward'));

document.getElementById('backward').addEventListener("click", () => move('backward'));

document.getElementById('left').addEventListener("click", () => move('left'));

document.getElementById('right').addEventListener("click", () => move('right'));

window.addEventListener("keydown", event => {
  if (gameOver) {
      // Проверяем, была ли нажата клавиша пробела
      if (event.keyCode === 32) { // 32 — код клавиши пробела
          retryGame(); // Вызываем функцию для перезапуска игры
      }
      return;
  }

  // Остальная логика управления курицей
  if (event.keyCode == '38') {
      // up arrow
      move('forward');
      chicken.rotation.z = 0;
  } else if (event.keyCode == '40') {
      // down arrow
      move('backward');
      chicken.rotation.z = Math.PI;
  } else if (event.keyCode == '37') {
      // left arrow
      move('left');
      chicken.rotation.z = Math.PI / 2;
  } else if (event.keyCode == '39') {
      // right arrow
      move('right');
      chicken.rotation.z = -Math.PI / 2;
  }
});

let lastKeyPressTime = 0;
const keyPressCooldown = 200; // миллисекунд

function move(direction) {

  const now = Date.now();
  if (now - lastKeyPressTime < keyPressCooldown) return; // слишком рано
  lastKeyPressTime = now;


  const finalPositions = moves.reduce((position, move) => {
      if (move === 'forward') return { lane: position.lane + 1, column: position.column };
      if (move === 'backward') return { lane: position.lane - 1, column: position.column };
      if (move === 'left') return { lane: position.lane, column: position.column - 1 };
      if (move === 'right') return { lane: position.lane, column: position.column + 1 };
  }, { lane: currentLane, column: currentColumn });

  if (direction === 'forward') {
      if (
          lanes[finalPositions.lane + 1].type === 'forest' &&
          (lanes[finalPositions.lane + 1].occupiedPositions.has(finalPositions.column))
      ) return;
      if (!stepStartTimestamp) startMoving = true;
      addLane();
  } else if (direction === 'backward') {
      if (finalPositions.lane === 0) return;
      if (
          lanes[finalPositions.lane - 1].type === 'forest' &&
          (lanes[finalPositions.lane - 1].occupiedPositions.has(finalPositions.column))
      ) return;
      if (!stepStartTimestamp) startMoving = true;
  } else if (direction === 'left') {
      if (finalPositions.column === 0) return;
      if (
          lanes[finalPositions.lane].type === 'forest' &&
          (lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column - 1))
      ) return;
      if (!stepStartTimestamp) startMoving = true;
  } else if (direction === 'right') {
      if (finalPositions.column === columns - 1) return;
      if (
          lanes[finalPositions.lane].type === 'forest' &&
          (lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column + 1))
      ) return;
      if (!stepStartTimestamp) startMoving = true;
  }

  moves.push(direction);
}

function animate(timestamp) {
  requestAnimationFrame( animate );

  if(!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  // Animate cars and trucks moving on the lane
  lanes.forEach(lane => {
    if(lane.type === 'car' || lane.type === 'truck') {
      const aBitBeforeTheBeginingOfLane = -boardWidth*zoom/2 - positionWidth*2*zoom;
      const aBitAfterTheEndOFLane = boardWidth*zoom/2 + positionWidth*2*zoom;
      lane.vechicles.forEach(vechicle => {
        if(lane.direction) {
          vechicle.position.x = vechicle.position.x < aBitBeforeTheBeginingOfLane ? aBitAfterTheEndOFLane : vechicle.position.x -= lane.speed/16*delta;
        }else{
          vechicle.position.x = vechicle.position.x > aBitAfterTheEndOFLane ? aBitBeforeTheBeginingOfLane : vechicle.position.x += lane.speed/16*delta;
        }
      });
    }
  });

  if(startMoving) {
    stepStartTimestamp = timestamp;
    startMoving = false;
  }

  if(stepStartTimestamp) {
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance = Math.min(moveDeltaTime/stepTime,1)*positionWidth*zoom;
    const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime/stepTime,1)*Math.PI)*8*zoom;
    switch(moves[0]) {
      case 'forward': {
        const positionY = currentLane*positionWidth*zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY; 
        dirLight.position.y = initialDirLightPositionY + positionY; 
        chicken.position.y = positionY; // initial chicken position is 0

        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'backward': {
        positionY = currentLane*positionWidth*zoom - moveDeltaDistance
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY; 
        chicken.position.y = positionY;

        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'left': {
        const positionX = (currentColumn*positionWidth+positionWidth/2)*zoom -boardWidth*zoom/2 - moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;     
        dirLight.position.x = initialDirLightPositionX + positionX; 
        chicken.position.x = positionX; // initial chicken position is 0
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'right': {
        const positionX = (currentColumn*positionWidth+positionWidth/2)*zoom -boardWidth*zoom/2 + moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;       
        dirLight.position.x = initialDirLightPositionX + positionX;
        chicken.position.x = positionX; 

        chicken.position.z = jumpDeltaDistance;
        break;
      }
    }
    // Once a step has ended
    if(moveDeltaTime > stepTime) {
      switch(moves[0]) {
        case 'forward': {
          currentLane++;
          counterDOM.innerHTML = currentLane;    
          break;
        }
        case 'backward': {
          currentLane--;
          counterDOM.innerHTML = currentLane;    
          break;
        }
        case 'left': {
          currentColumn--;
          break;
        }
        case 'right': {
          currentColumn++;
          break;
        }
      }
      moves.shift();
      // If more steps are to be taken then restart counter otherwise stop stepping
      stepStartTimestamp = moves.length === 0 ? null : timestamp;
    }
  }

  // Hit test
  if (lanes[currentLane].type === 'car' || lanes[currentLane].type === 'truck') {
    const chickenMinX = chicken.position.x - chickenSize * zoom / 2;
    const chickenMaxX = chicken.position.x + chickenSize * zoom / 2;
    const vechicleLength = { car: 60, truck: 105 }[lanes[currentLane].type];
    lanes[currentLane].vechicles.forEach(vechicle => {
        const carMinX = vechicle.position.x - vechicleLength * zoom / 2;
        const carMaxX = vechicle.position.x + vechicleLength * zoom / 2;
        if (chickenMaxX > carMinX && chickenMinX < carMaxX) {
            endDOM.classList.remove('hide');
            setTimeout(() => {
              endDOM.classList.add('show');
            }, 1000); // задержка 1000 мс = 1 секунда
            gameOver = true;
  
            // Сплющиваем курицу
            isFlattened = true;
            chicken.scale.set(1, 1, 0.01); // Уменьшаем высоту курицы
             // Поворачиваем курицу на бок
        }
    });
  }
  renderer.render( scene, camera );	
}

requestAnimationFrame( animate );