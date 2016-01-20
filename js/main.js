'use strict';

const socket = io.connect('http://24.113.64.254:8080');

const cursorCanvas = document.createElement('canvas');
const cursorCtx = cursorCanvas.getContext('2d');

const fab = document.getElementById('fab');
const showHeaderButton = document.getElementById('js-show-header-button');
const hideHeaderButton = document.getElementById('hide-header-button');
const canvasContainerSizeFix = document.getElementById('canvasContainerSizeFix');
const mdlErase = document.getElementById('mdlErase');
const canvasContainer = document.getElementById('canvasContainer');
const activeBrushContainer = document.getElementById('activeBrushContainer');
const pickerContainer = document.getElementById('pickerContainer');
const layerListContainer = document.getElementById('layerListContainer')
const pickerSize = document.getElementById('size');
const pickerWidth = document.getElementById('width');
const pickerHeight = document.getElementById('height');
const pickerAngle = document.getElementById('angle');
const pickerOpacity = document.getElementById('opacity');
const pickerEdge = document.getElementById('edge');
const pickerSizeRange = document.getElementById('sizeRange');
const pickerWidthRange = document.getElementById('widthRange');
const pickerHeightRange = document.getElementById('heightRange');
const pickerAngleRange = document.getElementById('angleRange');
const pickerOpacityRange = document.getElementById('opacityRange');
const pickerEdgeRange = document.getElementById('edgeRange');
const pickerR = document.getElementById('r');
const pickerG = document.getElementById('g');
const pickerB = document.getElementById('b');
const erase = document.getElementById('erase');
const addLayerBtn = document.getElementById('addLayer');
const removeLayerBtn = document.getElementById('removeLayer');

const body = document.getElementsByTagName('body')[0];

const userNameInput = document.getElementById('name');
const roomNameInput = document.getElementById('room');

const joinBtn = document.getElementById('joinButton');

let roomName = location.hash.slice(1);
let userName = localStorage.getItem('userName');

let lastTouches = {};

userNameInput.value = userName;
roomNameInput.value = roomName;

let scetch = new Scetch();
let picker = new Picker(20, pickerContainer);

let color = scetch.activeBrush.color;

picker.updateColor([color.r, color.g, color.b]);

picker.on('updated', (color)=>{
  scetch.activeBrush.set('color', {r: color[0], g: color[1], b: color[2]});

  pickerR.value = color[0];
  pickerG.value = color[1];
  pickerB.value = color[2];
});

//sets cursor to brush image
scetch.activeBrush.on('updated', (canvas)=>{
  let anyLayer = document.getElementsByTagName('canvas')[0];
  let scale = anyLayer.width / anyLayer.offsetWidth;
  cursorCanvas.width = 0;
  cursorCanvas.width = canvas.width / scale;
  cursorCanvas.height = canvas.height / scale;
  cursorCtx.drawImage(canvas, 0, 0, canvas.width/scale, canvas.height/scale);
  canvasContainer.style.cursor = 'url(' + cursorCanvas.toDataURL() + ')'+ cursorCanvas.width/2 + ' ' + cursorCanvas.height/2 +', crosshair';
});

scetch.activeBrush.updateCanvas()

joinRoom();

userNameInput.addEventListener('change', (e) => {
  userName = userNameInput.value;
  localStorage.setItem('userName', userName);
});

addLayerBtn.addEventListener('click', (e)=>{
  socket.emit('addLayer', {roomName: scetch.roomName});
});

removeLayerBtn.addEventListener('click', (e) => {
  socket.emit('removeLayer', {roomName: scetch.roomName, layerId: scetch.activeLayerId});
});

joinBtn.addEventListener('click', (e) => {
  body.className = 'loading';
  setTimeout(() => {
    location.hash = roomNameInput.value;
  }, 200);
});

fab.addEventListener('mousedown', fabMove, false);
fab.addEventListener('mouseup', fabMove);
document.addEventListener('mousemove', fabMove);
document.addEventListener('mouseup', fabMove);

fab.addEventListener('touchstart', fabMove);
document.addEventListener('touchmove', fabMove);
document.addEventListener('touchend', fabMove);

showHeaderButton.addEventListener('click', () => {
  body.className = 'connected';
});

hideHeaderButton.addEventListener('click', () => {
  body.className += ' header-hidden';
  if(mobileCheck()){
    toggleFullScreen();
  }
});

pickerSize.addEventListener('input', pickerChange);
pickerWidth.addEventListener('input', pickerChange);
pickerHeight.addEventListener('input', pickerChange);
pickerAngle.addEventListener('input', pickerChange);
opacity.addEventListener('input', pickerChange);
pickerEdge.addEventListener('input', pickerChange);
pickerOpacityRange.addEventListener('input', pickerChange);
pickerSizeRange.addEventListener('input', pickerChange);
pickerWidthRange.addEventListener('input', pickerChange);
pickerHeightRange.addEventListener('input', pickerChange);
pickerAngleRange.addEventListener('input', pickerChange);
pickerOpacityRange.addEventListener('input', pickerChange);
pickerEdgeRange.addEventListener('input', pickerChange);
pickerR.addEventListener('input', pickerChange);
pickerG.addEventListener('input', pickerChange);
pickerB.addEventListener('input', pickerChange);
erase.addEventListener('change', (e) => {
  scetch.activeBrush.set('erase', e.target.checked);
});

canvasContainer.addEventListener('mousemove', canvasContainerOnMouse);
canvasContainer.addEventListener('mousedown', canvasContainerOnMouse);

canvasContainer.addEventListener('touchstart', (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    lastTouches[e.changedTouches[i].identifier] = e.changedTouches[i];
  }
});
canvasContainer.addEventListener('touchend', (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    lastTouches[e.changedTouches[i].identifier] = e.changedTouches[i];
  }
});
canvasContainer.addEventListener('touchmove', canvasContainerOnTouch);

roomNameInput.addEventListener('keyup', (e) => {
  if(e.keyCode == 13){
    joinRoom();
  }
});

userNameInput.addEventListener('keyup', (e) => {
  if(e.keyCode == 13){
    joinRoom();
  }
});

window.addEventListener('hashchange', () => {
  roomName = location.hash.slice(1);
  roomNameInput.value = roomName;
  joinRoom();
});

window.addEventListener('resize', resetFab);

socket.on('roomSync', (room) => {
  scetch.init(room);
  resetFab();
});

socket.on('step', (step) => {
  scetch.draw(step);
  scetch.addStep(step);
});

socket.on('requestSync', value => socket.emit('syncCheck', value));

socket.on('syncSuccess', (value, callback) => {
  scetch.layers[value.layerId].once('sync', () => {
    callback(scetch.syncInfo(value.layerId))
  });
});

socket.on('addLayer', (data)=>{
  scetch.addLayer(data.layerId);
});

socket.on('removeLayer', (data)=>{
  scetch.removeLayer(data.layerId);
});

if(roomName.length == 0){
  body.className = '';
}

function fabMove(e){
  let el = fab.MaterialButton.element_;
  let elSize = el.getBoundingClientRect();
  if(e.type == 'touchstart' || e.type == 'mousedown'){
    //start
    el.dataset.moveStart = true;
    el.dataset.moving = true;
  } else if(e.type == 'touchend' || e.type == 'mouseup'){
    //stop
    if(e.type == 'mouseup' && el.dataset.moveStart == 'true'){
      let drawerBtn = document.getElementsByClassName('mdl-layout__drawer-button')[0];
      let ev = document.createEvent('MouseEvents');
      ev.initEvent('click', true, true);
      drawerBtn.dispatchEvent(ev);
    }
    el.dataset.moveStart = false;
    el.dataset.moving = false;
  } else if(el.dataset.moving == 'true'){
    //move it
    let x;
    let y;
    if(e.type.indexOf('mouse') != -1){
      //mouse
      x = e.clientX - elSize.width/2;
      y = e.clientY - elSize.height/2;
    } else {
      //touch
      x = e.changedTouches[0].clientX - elSize.width/2;
      y = e.changedTouches[0].clientY - elSize.height/2;
    }
    el.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    el.style.webkitTransform = 'translate(' + x + 'px, ' + y + 'px)';
    el.style.msTransform = 'translate(' + x + 'px, ' + y + 'px)';
    el.dataset.moveStart = false;
  }

};

function pickerChange(e){
  let id = e.target.id;
  if(id.length > 1){
    if(id.indexOf('Range') == -1){
      id += 'Range';
      document.getElementById(id).MaterialSlider.change(e.target.value);
    } else {
      id = id.replace('Range', '');
      document.getElementById(id).value = e.target.value;
    }
    scetch.activeBrush.set(id, e.target.value);
  } else {
    scetch.activeBrush.set('color', {r: pickerR.value, g: pickerG.value, b: pickerB.value})
  }
}

function joinRoom(){
  userName = userNameInput.value;
  roomName = roomNameInput.value;

  if(userName.length > 1 && roomName.length > 1){
    socket.emit('join', {roomName: roomName, userName: userName});
  } else {
    roomNameInput.value = roomName;
    userNameInput.value = userName;
  }
}

function canvasContainerOnTouch(e){
  e.preventDefault();
  if(fab.MaterialButton.element_.dataset.moving != 'true'){
    let offset = e.target.getBoundingClientRect();
    for (let i = 0; i < e.changedTouches.length; i++) {
      let scale = e.target.width / (e.target.offsetWidth);
      let value = {
        to: {
          x: (e.changedTouches[i].pageX - offset.left) * scale,
          y: (e.changedTouches[i].pageY - offset.top) * scale,
          // radiusX: e.changedTouches[i].radiusX,
          // radiusY: e.changedTouches[i].radiusY,
          // angle:  e.changedTouches[i].rotationAngle
        },
        from: {
          x: (lastTouches[e.changedTouches[i].identifier].pageX - offset.left) * scale,
          y: (lastTouches[e.changedTouches[i].identifier].pageY - offset.top) * scale,
          // radiusX: lastTouches[e.changedTouches[i].identifier].radiusX,
          // radiusY: lastTouches[e.changedTouches[i].identifier].radiusY,
          // angle: lastTouches[e.changedTouches[i].identifier].rotationAngle
        }
      };
      scetch.emit('draw', value);
      lastTouches[e.changedTouches[i].identifier] = e.changedTouches[i];
    }
  }
}

function canvasContainerOnMouse(e) {
  if(fab.MaterialButton.element_.dataset.moving != 'true'){
    if(e.buttons > 0){
      let scale = e.target.width / (e.target.offsetWidth);
      let value = {
        to: {
          x: e.offsetX * scale,
          y: e.offsetY * scale
        },
        from: {
          x: e.offsetX * scale - (e.movementX * scale || 0),
          y: e.offsetY * scale - (e.movementY * scale || 0)
        }
      };
      scetch.emit('draw', value);
    }
  }
}

function resetFab(e){
  let el = fab.MaterialButton.element_;
  let offset = fab.getBoundingClientRect();
  let x = offset.width * 2;
  let y = offset.height * 2;
  el.style.transform = 'translate(' + (document.body.clientWidth - x) + 'px, ' + (document.body.clientHeight - y) + 'px)';
  el.style.webkitTransform = 'translate(' + (document.body.clientWidth - x) + 'px, ' + (document.body.clientHeight - y) + 'px)';
  el.style.msTransform = 'translate(' + (document.body.clientWidth - x) + 'px, ' + (document.body.clientHeight - y) + 'px)';
}

function toggleFullScreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  }
  else {
    cancelFullScreen.call(doc);
  }
}

function mobileCheck() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}
