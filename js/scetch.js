'use strict'

class Scetch extends EventEmitter{
  constructor(){
    super();
    this.layers = {};
    this.brushes = {};
    this.roomWidth = 1280;
    this.roomHeight = 720;
    this.roomName = '';
    this.userName = '';
    this.activeBrushId = 0;
    this.activeLayerId = 0;
    this.totalSyncs = 0;
    this.mouseDown = false;
    this.activeBrush = new Brush('active');

    this.activeBrush.altColor = this.activeBrush.color;

    let settings = JSON.parse(localStorage.getItem('brushSettings') || '{}');

    if(!settings.color){
      settings = this.activeBrush.toObject();
      this.activeBrush.altColor = this.activeBrush.color;
    }

    settings.erase = false;

    this.activeBrush.fromObject(settings);
    this.activeBrush.altColor = settings.altColor;

    activeBrushContainer.appendChild(this.activeBrush.canvas);

    pickerSize.value = pickerSizeRange.value = this.activeBrush.size;
    pickerWidth.value = pickerWidthRange.value = this.activeBrush.width;
    pickerHeight.value = pickerHeightRange.value = this.activeBrush.height;
    pickerAngle.value = pickerAngleRange.value = this.activeBrush.angle;
    pickerOpacity.value = pickerOpacityRange.value = this.activeBrush.opacity;
    pickerEdge.value = pickerEdgeRange.value = this.activeBrush.edge;

    pickerR.value = this.activeBrush.color.r;
    pickerG.value = this.activeBrush.color.g;
    pickerB.value = this.activeBrush.color.b;

    this.addEventListener('draw', (e) => {
      let value = {
        brush: scetch.activeBrush.toObject(),
        roomName: scetch.roomName,
        name: scetch.userName,
        layerId: scetch.activeLayerId,
        from: e.from,
        to: e.to
      }
      scetch.draw(value);
      socket.emit('step', value, (stepId) => {
        value.stepId = stepId;
        this.addStep(value);
      });
    });

    this.on('addlayer', e => {
      canvasContainer.appendChild(e.layerCanvas);
    });

    document.addEventListener('mousemove', e => {
      this.mouseDown = e.buttons > 0;
    });
    document.addEventListener('mousedown', e => {
      this.mouseDown = e.buttons > 0;
      for(let layerId in this.layers){
        clearTimeout(this.layers[layerId].timeoutId);
      }
    });
    document.addEventListener('mouseup', e => {
      this.mouseDown = e.buttons > 0;
      for(let layerId in this.layers){
        clearTimeout(this.layers[layerId].timeoutId);
        this.timeoutId = setTimeout(() => this.layers[layerId].syncCanvas(), 500);
      }
    });

    document.addEventListener('keyup', (e) =>{
      switch(e.keyCode){
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
          let activeElement = document.getElementsByClassName('layer-item')[e.keyCode==48?10:e.keyCode-49];
          if(activeElement){
            this.layers[activeElement.dataset.id].setActive();
          }
        break;

        case 69: //e
          erase.checked?mdlErase.MaterialCheckbox.uncheck():mdlErase.MaterialCheckbox.check();
          this.activeBrush.set('erase', erase.checked);
        break;
        case 88: //x
          let color = this.activeBrush.color;
          scetch.activeBrush.set('color', scetch.activeBrush.altColor);
          scetch.activeBrush.set('altColor', color);
        break;
        case 32: //space
          let drawerBtn = document.getElementsByClassName('mdl-layout__drawer-button')[0];
          let ev = document.createEvent('MouseEvents');
          ev.initEvent('click', true, true);
          drawerBtn.dispatchEvent(ev);
        break;
      }
    });
  }

  init(value){
    body.className = 'connected loading';
    this.roomName = value.roomName;
    this.roomWidth = value.roomWidth;
    this.roomHeight = value.roomHeight;
    canvasContainerSizeFix.style.maxWidth = this.roomWidth + 'px';
    canvasContainerSizeFix.style.maxHeight = this.roomHeight + 'px';

    this.totalSyncs = 0;

    canvasContainer.style.paddingBottom = this.roomHeight / this.roomWidth * 100 + '%';

    for(let layerId in this.layers){
      this.removeLayer(layerId, this.layers[layerId]);
    }
    for(let layerId in value.layers){
      let layer = this.addLayer(layerId, value.layers[layerId]);
    }
  }

  syncInfo(layerId){
    let layer = this.layers[layerId];
    return {layerId: layerId, dataURL: layer.dataURL, lastId: layer.safeId};
  }

  onInput(property) {
    return (e) => this.activeBrush()[property] = e.target.value;
  }

  addLayer(layerId, value){
    let layer = new Layer(layerId, this);
    layer.once('sync', () => {
      this.totalSyncs++;
      layer.synced = true;
      if(this.allLayersSynced()){
        body.className = 'connected';
      }
    });
    if(value){
      layer.fromObject(value);
    }
    this.layers[layerId] = layer;
    this.emit('addlayer', layer);
    return layer;
  }

  allLayersSynced(){
    return this.totalSyncs >= Object.keys(this.layers).length;
  }

  removeLayer(layerId){
    let layer = this.layers[layerId];
    layerListContainer.removeChild(layer.li);
    canvasContainer.removeChild(layer.layerCanvas);
    if(layer.synced){
      this.totalSyncs--;
    }
    delete this.layers[layerId];
    if(layerListContainer.getElementsByClassName('active').length == 0){
      let layerList = layerListContainer.getElementsByClassName('layer-item');
      if(layerList.length > 0){
        let li = layerList[0];
        li.className += ' active';
        this.activeLayerId = li.dataset.id;
      }
    }
  }

  setActiveBrush(value){
    this.activeBrush.fromObject(value);
    return this.activeBrush;
  }

  activeLayer() {
    this.layers[this.activeLayerId] = this.layers[this.activeLayerId];
    return this.layers[this.activeLayerId];
  }

  draw(step) {
    if(step.length > 0){
      this.layers[step[0].layerId] = this.layers[step[0].layerId] || this.addLayer(step[0].layerId);
      step.forEach(step => this.layers[step.layerId].draw(step));
    } else {
      this.layers[step.layerId] = this.layers[step.layerId] || this.addLayer(step.layerId);
      this.layers[step.layerId].draw(step);
    }
    return this;
  }

  addStep(step) {
    if(step.length > 0){
      this.layers[step[0].layerId] = this.layers[step[0].layerId] || this.addLayer(step[0].layerId);
      step.forEach(step => this.layers[step.layerId].addStep(step));
    } else {
      this.layers[step.layerId] = this.layers[step.layerId] || this.addLayer(step.layerId);
      this.layers[step.layerId].addStep(step);
    }
    return this;
  }
}
