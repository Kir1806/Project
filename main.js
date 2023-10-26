//Hello
import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';


//Глобальные переменные и константы
const canvas = document.getElementById('canvas');
const engine = new BABYLON.Engine(canvas,true);

const materials =new Map([
  [ '1',{name:'stone',material:undefined, filename:'brickwall.jpg'}],
  [ '2',{name:'grass',material:undefined, filename:'grass.png'}],
  [ '3',{name:'sand',material:undefined, filename:'sand.jpg'}],
]);

const fruitModels =new Map([
  [ 'a',{name:'apple',asset:undefined, filename:"apple.glb"}],
  [ 'c',{name:'cherry',asset:undefined, filename:"peach2.glb"}],
]);

const monsterModels =new Map([
  [ 'm',{name:'enemy',asset:undefined, filename:"creeper.glb"}],
]);

var data = [],objects=[], startPosition, endPosition;
const playerHeight=0.8,
      playerWidth=0.5;
var playing=true;
var monsters=[];
var bullets=[];

var playerModel;
var map='';
var sceneLoaded = false;

var player = {
  velocityX:0,
  velocityY:0,
  flying:false,
  jumping:false,
  movingRight:false,
  movingLeft:false,
  shooting:false,
  direction:'right',
  x:2,y:4,
  health:100
};
var playerMesh;

//Материалы
var enemy;


//Обработчики событий
function keyUp(event){
  var key = event.key;
  switch(key){
    case 'a': player.movingLeft=false; break;
    case 'd': player.movingRight=false; break;
    case 's': player.jumping= false; break;
    case 'w': player.jumping= false; break;
    case ' ': player.shooting = false; break;
  }
}


function keyDown(event){
  var key = event.key;
  switch(key){
    case 'a': player.movingLeft=true;player.movingRight=false;player.direction='left'; break;
    case 'd': player.movingLeft=false;player.movingRight=true;player.direction='right';break;
    case 's': player.jumping = false; break;
    case 'w': if(!player.flying) player.jumping = true; break;
    case ' ': player.shooting = true; break; 
  }
}

function onMonsterMeetBullet(m,b){
  killMonster(m);
  removeBullet(b);
}

function onTouchFruit(o){
  //Удаляем фрукт
  scene.removeMesh(o.mesh);
  o.mesh.dispose();
  var idx=objects.findIndex((a)=>a===o);
  objects.splice(idx,1);
}


//Функция обновления
function update(){
  if(!sceneLoaded) return;
  //Обновим позиции монстров
  for(let m of monsters){
    var mnewx=m.mesh.position.x,mnewy=m.mesh.y;
    //Если монстр движется вправо
    if(m.direction=='right') 
    {
      mnewx+=+0.1;
      //Если кубик справа-внизу не пустой(не обрыв) и нет стенки справа,
      if (collideBox(mnewx+0.2, m.y-1) && !collideBox(mnewx+0.2, m.y) ){
        m.mesh.position.x=mnewx; // двигаем монстра дальше
      }else m.direction='left';  //Иначе меняем монстру направление
    }
    //Аналогично, если монстр движется влево
    if(m.direction=='left') {
      mnewx-=+0.1;
      if (collideBox(mnewx-0.2, m.y-1) && !collideBox(mnewx-0.2, m.y)){
        m.mesh.position.x=mnewx;
      } else m.direction='right';
    
    }
  }
  //Обновим пули
  for(let b of bullets){
    var mnewx=b.mesh.position.x;
    if(b.direction=='right') 
    {
      mnewx+=0.3;
      if (collideBox(mnewx+0.1, b.y)){
       //Вставить взрыв
       removeBullet(b);
      }else  b.mesh.position.x=mnewx;
    }
    if(b.direction=='left'){
      mnewx-=0.3;
      if (collideBox(mnewx-0.1, b.y)){
        //Вставить взрыв
        removeBullet(b);
      } else b.mesh.position.x=mnewx;
    }

    //Проверка столкновкения пуль и монстров
    for(let m of monsters){
      if(collideCircles(b.mesh.position.x,b.mesh.position.y,0.5,m.mesh.position.x,m.mesh.position.y,0.4)){
        onMonsterMeetBullet(m,b)
      }
    }

  }
  //Обновим игрока
  if(playing){
    if(player.jumping){
       player.velocityY = -0.3;  //Ускорение свободного падения
       player.jumping=false;
    }
    player.velocityY+=0.01;
    var newx=playerMesh.position.x,newy=playerMesh.position.y;
    if(player.movingRight) { newx= playerMesh.position.x +0.1;playerMesh.rotation.y=Math.PI/2;}
    if(player.movingLeft) {newx= playerMesh.position.x -0.1;playerMesh.rotation.y=-Math.PI/2;}
    //Если не уперся в стенку, двигается дальше
    if (!collideBox(newx, playerMesh.position.y)){
      playerMesh.position.x = newx;
    }else 
      {player.velocityX=0;}//Уперся, скрость обнуляем

    newy= playerMesh.position.y - player.velocityY;
    
    //Если есть куда падать, падает, иначе - стоит на земле
    if (!collideBox(playerMesh.position.x, newy)){
      playerMesh.position.y = newy;
      player.flying=true;
    }
    else {
      player.velocityY=0;
      player.flying=false;
    }

    if(player.shooting){
      addBullet(playerMesh.position.x+0.5,playerMesh.position.y,'b',player.direction);
      player.shooting=false;
    }
    
    //Проверка столкновения игрока с фруктами
    var o=collideObjects(playerMesh.position.x, playerMesh.position.y);
    if(o){
      onTouchFruit(o)
    }

    //Проверка игрока и монстров
    for(let m of monsters){
      if(collideCircles(playerMesh.position.x,playerMesh.position.y,0.1,m.mesh.position.x,m.mesh.position.y,0.1)){
        die()
      }
    }

    //Проверяем, не попал ли игрок в дверь выхода
    if(collideExit(playerMesh.position.x, playerMesh.position.y)){
      alert('Вы прошли!');
      playing=false;
    }
    if(playerMesh.position.y<0) {
      playing=false;
      alert('Вы проиграли')
    }
  }
}

//Создание сцены
async function createScene(){
  const scene = new BABYLON.Scene(engine);
  var cam = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 0, 10), scene);
	cam.radius = -15;
	cam.heightOffset = 2;
	cam.rotationOffset = 0;
	cam.cameraAcceleration = 0.05
	cam.maxCameraSpeed = 20

  const skybox = BABYLON.MeshBuilder.CreateSphere('sky',{diameter:1000},scene);

  var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.reflectionTexture = new BABYLON.Texture("/textures/skybox2.jpg", scene,true,false);
  skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.EQUIRECTANGULAR_MODE;
  skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  skybox.material = skyboxMaterial;

  const light = new BABYLON.HemisphericLight('l1',new BABYLON.Vector3(0,1,-1),scene)
  
  playerModel=await BABYLON.SceneLoader.ImportMeshAsync(null,"/models/", "steve.glb", scene);
  playerMesh = playerModel.meshes[0];
  playerMesh.position.x=2;
  playerMesh.position.y=4;
  cam.lockedTarget=playerMesh;


  //Установка обработчиков событий
  document.addEventListener('keydown',keyDown)
  document.addEventListener('keyup',keyUp)

  scene.onDispose = function(){
    document.removeEventListener('keydown',keyDown)
    document.removeEventListener('keyup',keyUp)
  }
  cam.attachControl(canvas);
 
  await fetchMap('./map3.map');
  console.log('everything loaded. generationg scene')
  //Загрузка материалов по таблице materials
  for(let m of materials.values()){
    m.material = new BABYLON.StandardMaterial(m.name,scene);
    m.material.diffuseTexture = new BABYLON.Texture('/textures/'+m.filename,scene);
  }

  //Загрузка фруктов
  for(let m of fruitModels.values()){
    m.asset = await BABYLON.SceneLoader.LoadAssetContainerAsync("/models/", m.filename, scene);
  }

  for(let m of monsterModels.values()){
    m.asset = await BABYLON.SceneLoader.LoadAssetContainerAsync("/models/", m.filename, scene);
  }

  loadMap(scene)
  playerMesh.position.x=startPosition.x
  playerMesh.position.y=startPosition.y;
  sceneLoaded=true;
  
  scene.registerBeforeRender(update)
  return scene;  
}

const scene = await createScene();

engine.runRenderLoop(()=>{
  scene.render();
})

//Добавление блока в сцену
function addBlock(x,y,m,scene){
  var mat = materials.get(m);
  if(mat!=undefined){
  var block={x1:x-0.5,x2:x+0.5, y1:y-0.5, y2:y+0.5, type:mat.name};
  data.push(block);
  let box = new BABYLON.MeshBuilder.CreateBox('b'+x+y,{size:1},scene);
    box.position.x=block.x1+0.5;
    box.position.y=block.y1+0.5;
    box.material = mat.material;
  }else
    console.log('Не найден тип блока ',m)
}

//Добавление обьекта в сцену(фрукта)
function addObject(x,y,t,scene){
  var o = {x:x,y:y, type:t.name};
  objects.push(o);

  var fruits={};
  fruits = fruitModels.get(t).asset.instantiateModelsToScene();
  var fruit=fruits.rootNodes[0];
  fruit.position.x=o.x;
  fruit.position.y=o.y;
  fruit.position.z=-0.2;
  fruit.scalingDeterminant=0.4;
  fruit.rotation.y=Math.PI/2;
  var animationBezierTorus = new BABYLON.Animation("animationBezierTorus", "position", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  var animShake = [];
  animShake.push({ frame: 0, value: fruit.position.add(new BABYLON.Vector3(0, -0.2, 0)) });
  animShake.push({ frame: 30, value: fruit.position.add(new BABYLON.Vector3(0, 0.2, 0)) });
  animShake.push({ frame: 60, value: fruit.position.add(new BABYLON.Vector3(0, -0.2, 0)) });
  animationBezierTorus.setKeys(animShake);
  var bezierEase = new BABYLON.SineEase();
  animationBezierTorus.setEasingFunction(bezierEase);
  fruit.animations.push(animationBezierTorus);
  scene.beginAnimation(fruit, 0, 120, true);
  o.mesh=fruit;
}

 
function addMonster(x,y,t,scene){
  var m ={x:x,y:y, type:t,health:100,direction:'right'};
  monsters.push(m);
  
  var monster= monsterModels.get(t);
  if(monster){
    monster = monster.asset.instantiateModelsToScene();
  }else return;

  var mon=monster.rootNodes[0];
  mon.position.x=m.x;
  mon.position.y=m.y;
  mon.rotation.y=Math.PI/2;
  m.mesh=mon;  
}

function addBullet(x,y,t,d){
  var bullet = new BABYLON.MeshBuilder.CreateCylinder('c'+x+'_'+y,{height:0.7,diameterTop:0.3,diameterBottom:0},scene);
  bullet.position.x = x;
  bullet.position.y = y;
  bullet.rotation.z = d=='right'?Math.PI/2 : -Math.PI/2; 
  console.log(bullet)
  bullets.push({x:x,y:y, type:t,harm:50,direction:d, mesh:bullet});
}

function removeBullet(b){
  scene.removeMesh(b.mesh)
  b.mesh.dispose();
  var idx=bullets.findIndex((a)=>a===b);
  bullets.splice(idx,1);
}

function killMonster(m){
  scene.removeMesh(m.mesh)
  m.mesh.dispose();
  var idx=monsters.findIndex((a)=>a===m);
  monsters.splice(idx,1);
};

function die(){
  playing=false;
  alert('Гейм ова');
}

//Функция проверяет пересечение двух прямоугольников
function checkRectOverlap(rect1, rect2) {
    if ((rect1[0][0] < rect2[0][0] && rect2[0][0] < rect1[1][0]) 
      || (rect1[0][0] < rect2[1][0] && rect2[1][0] < rect1[1][0]) 
      || (rect2[0][0] < rect1[0][0] && rect1[1][0] < rect2[1][0])) { 
      if ((rect1[0][1] < rect2[0][1] && rect2[0][1] < rect1[1][1])
          || (rect1[0][1] < rect2[1][1] && rect2[1][1] < rect1[1][1]) 
          || (rect2[0][1] < rect1[0][1] && rect1[1][1] < rect2[1][1])) { 
          return true;
      }
  }
  return false;
}

//Проверяет пересечение игрока со всеми кубиками
function collideBox(x,y){
  for(let b of data){
    var x1=x-playerWidth/2;
    var x2=x+playerWidth/2;
    var y1=y-playerHeight/2;
    var y2=y+playerHeight/2;
    
    if(checkRectOverlap([[x1,y1],[x2,y2]],[[b.x1,b.y1],[b.x2,b.y2]]))
      return true;
  }
  return false;
}

function collideObjects(x,y){ 
  for(let b of objects){
    var dist =Math.sqrt(Math.pow((x-b.x),2)+Math.pow((y-b.y),2));
    if(dist<=1)
      return b;
  }
  return false;
}

function collideExit(x,y){ 
    var dist =Math.sqrt(Math.pow((x-endPosition.x),2)+Math.pow((y-endPosition.y),2));
    if(dist<=1)
      return true;
  return false;
}

function collideCircles(x,y,r,x2,y2,r2){
  var dist =Math.sqrt(Math.pow((x-x2),2)+Math.pow((y-y2),2));
  if(dist<=r+r2) return true;
  return false;
}

//Загрузка карты из файла
async function fetchMap(filename){
  const resp= await fetch(filename);
  var r =  await resp.text();
  map = r;
}

function loadMap(scene){
  var r =  map;
  var line=0,col=0,pos=0,x='';
  //console.log(r)
  var linecount =r.split(String.fromCharCode(10)).length - 1;
  for(let i=0;i<r.length;i++){
    x = r[i];
    switch (x){
      case ' ': col++; break;
      case String.fromCharCode(10): col=0; line++; break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':addBlock(col,linecount-line,x,scene); col++; break;
        
      case 'i':startPosition={x:col, y:linecount-line}; col++; break;
      case 'o':endPosition={x:col, y:linecount-line}; col++; break;
      case 'c':
      case 'a':addObject(col,linecount-line, x,scene);col++; break;
      case 'm':addMonster(col,linecount-line, x,scene);col++; break; 
    }
  }
}
