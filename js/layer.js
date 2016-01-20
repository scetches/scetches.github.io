'use strict'

class Layer extends EventEmitter{
  constructor(layerId, scetch){
    super();
    this.layerId = layerId;
    this.busy = false;
    this.lastId = -1;
    this.safeId = 0;
    this.steps = [];
    this.safeSteps = [];
    this.dataURL = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
    this.layerCanvas = document.createElement('canvas');
    this.layerCtx = this.layerCanvas.getContext('2d');
    this.safeLayerCanvas = document.createElement('canvas');
    this.safeLayerCtx = this.safeLayerCanvas.getContext('2d');
    this.scetch = scetch;
    this.timeoutIds = [];
    this.brush = new Brush();
    this.layerCanvas.id = 'layer' + this.layerId;

    this.layerCanvas.style.zIndex = this.layerId + 1;

    this.layerCanvas.width = this.safeLayerCanvas.width = this.scetch.roomWidth;
    this.layerCanvas.height = this.safeLayerCanvas.height = this.scetch.roomHeight;

    this.layerCtx.lineJoin = this.layerCtx.lineCap = this.safeLayerCtx.lineJoin = this.safeLayerCtx.lineCap = 'round';

    this.li = document.createElement('li');
    this.li.id = 'layerList' + layerId;
    this.li.addEventListener('change', (e)=>{
      if (e.target.getAttribute('class').indexOf('hide-btn') != -1){
        let layer = document.getElementById('layer' + e.target.parentNode.dataset.id);
        this.layerCanvas.style.visibility = e.target.checked?'visible':'hidden';
      }
    });

    this.li.addEventListener('click', (e)=>{
      if(e.target.getAttribute('class').indexOf('layer-item') != -1){
        this.setActive();
      }
    });
    this.li.className = 'layer-item';
    this.li.innerHTML = '<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="layerCheck' + this.layerId + '">' +
                          '<input class="mdl-checkbox__input hide-btn" type="checkbox" id="layerCheck' + this.layerId + '" checked>' +
                          '<span class="mdl-checkbox__label">Layer ' + this.layerId + '</span>' +
                        '</label>';
    this.li.appendChild(this.safeLayerCanvas);
    this.li.dataset.id = this.layerId;
    layerListContainer.appendChild(this.li);
    if(scetch.activeLayerId == layerId || layerListContainer.getElementsByClassName('active').length == 0){
      this.li.className += ' active';
      scetch.activeLayerId = this.li.dataset.id;
    }
    componentHandler.upgradeDom('MaterialCheckbox');
  }

  setActive(){
    //select the layer
    let oldLayers = Array.prototype.slice.call(layerListContainer.getElementsByClassName('active'));
    oldLayers.forEach((el)=>{
      el.className = 'layer-item';
    });
    this.li.className = 'layer-item active';
    scetch.activeLayerId = this.layerId;
  }

  draw(value, safe) {
    const ctx = safe ? this.safeLayerCtx : this.layerCtx;
    if(value.to.radiusX){
      let x = (value.from.radiusX + value.to.radiusX) / 2;
      let y = (value.from.radiusY + value.to.radiusY) / 2;
      let ratio = x>y?y/x:x/y;
      value.brush.width = (value.brush.width + (x>y?1:ratio)) / 2;
      value.brush.height = (value.brush.height + (x>y?ratio:1)) / 2;
      value.brush.size = value.brush.size + (x>y?y:x) * 5 - 50;
    }
    const angle = Math.atan2(value.to.x - value.from.x, value.to.y - value.from.y);
    const dist = Math.sqrt(Math.pow(value.to.x - value.from.x, 2) + Math.pow(value.to.y - value.from.y, 2));
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const brushSource = this.brush.fromObject(value.brush);
    let increment = Math.min(value.brush.size*value.brush.width, value.brush.size*value.brush.height)/10;

    increment = (increment < 2 ? 2 : increment);

    ctx.save();
    ctx.globalCompositeOperation = value.brush.erase?"destination-out":value.brush.compositeOperation;
    if(dist <= 0){
      ctx.drawImage(brushSource,  value.from.x - brushSource.width/2, value.from.y - brushSource.height/2);
    } else {
      for(let i = 0; i < dist; i += increment){
        ctx.drawImage(brushSource,  (value.from.x + sin * i) - brushSource.width/2, (value.from.y + cos * i) - brushSource.height/2);
      }
    }
    ctx.restore();
    return this;
  }

  checkSteps() {
    let beginLastId = this.lastId;
    this.steps.sort((a, b) => (a.stepId > b.stepId) ? 1 : (a.stepId < b.stepId) ? -1 : 0);


    for(let i = 0; i < this.steps.length && (this.lastId + 1) == this.steps[i].stepId; i++){
      this.draw(this.steps[i], true);
      this.lastId++;
    }

    this.safeSteps = this.safeSteps.concat(this.steps.splice(0, this.lastId - beginLastId));

    return this;
  }

  syncCanvas(force){
    if(!this.scetch.mouseDown || force){
      clearTimeout(this.timeoutId);
      this.layerCtx.clearRect(0, 0, this.layerCanvas.width, this.layerCanvas.height);
      this.layerCtx.drawImage(this.safeLayerCanvas, 0, 0);
      this.safeSteps = [];
      this.safeId = this.lastId;
      this.dataURL = this.safeLayerCanvas.toDataURL();
      this.emit('sync');
    } else {
      clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => this.syncCanvas(), 500);
    }
  }

  addStep(step) {
    clearTimeout(this.timeoutId);
    this.steps = this.steps.concat(step);
    this.checkSteps();
    this.timeoutId = setTimeout(() => this.syncCanvas(), 500);
    return this;
  }

  fromObject(value){
    this.dataURL = value.dataURL || this.dataURL;

    let image = new Image();

    image.addEventListener('load', e => {
      this.safeLayerCtx.clearRect(0, 0, this.layerCanvas.width, this.layerCanvas.height);
      this.safeLayerCtx.drawImage(image, 0, 0);
      this.layerCtx.clearRect(0, 0, this.layerCanvas.width, this.layerCanvas.height);
      this.layerCtx.drawImage(this.safeLayerCanvas, 0, 0);
      this.checkSteps();
      this.syncCanvas(true);
    });

    this.safeId = value.lastId || this.safeId;
    this.lastId = value.lastId || this.lastId;
    this.layerId = value.layerId || this.layerId;
    this.steps = value.steps || this.steps;

    image.src = this.dataURL;

    this.layerCanvas.id = 'layer' + this.layerId;
    this.safeId = this.lastId;

    return this;
  }

  toObject(){
    let steps = this.safeSteps.concat(this.steps);
    return {
      layerId: this.layerId,
      lastId: this.safeId,
      steps: steps,
      dataURL: this.dataURL
    }
  }

  toString(){
    return JSON.stringify(this.toObject());
  }
}
