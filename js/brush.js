'use strict'

class Brush extends EventEmitter{
  constructor(brushId) {
    super();
    this.brushId = brushId;
    this.size = 10;
    this.width = 1;
    this.height = 1;
    this.angle = 0;
    this.name = 'paint';
    this.edge = 1;
    this.color = {r: 25, g: 55, b: 0};
    this.opacity = 1;
    this.compositeOperation = 'source-over';
    this.erase = false;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.id = 'brush' + this.brushId;
    this.callbacks = {};
    this.updateCanvas();
  }

  updateCanvas() {
    let maxSize;
    let radgrad;

    const halfSize = this.size/2;
    const hash = this.hash();
    const width = Math.ceil(this.size * this.width);
    const height  = Math.ceil(this.size * this.height);

    const cachedBrush = Brush.cache[hash];

    this.canvas.width = 0;
    this.canvas.width = this.canvas.height = maxSize = Math.ceil(Math.max(width, height));

    if(!cachedBrush){
      this.ctx.save();
      radgrad = this.ctx.createRadialGradient(halfSize, halfSize, halfSize, halfSize, halfSize, 0);
      radgrad.addColorStop(0, 'rgba(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ', 0)');
      radgrad.addColorStop(this.edge, 'rgba(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ',' + this.opacity + ')');

      this.ctx.fillStyle = radgrad;
      this.ctx.translate(maxSize/2, maxSize/2);
      this.ctx.rotate(this.angle * Math.PI / 180);
      this.ctx.scale(this.width, this.height);
      this.ctx.translate(-halfSize, -halfSize);
      this.ctx.fillRect(0, 0, this.size, this.size)
      this.ctx.restore();
      Brush.cache[hash] = new Image();
      Brush.cache[hash].src = this.canvas.toDataURL();
    } else {
      this.ctx.drawImage(cachedBrush, 0, 0);
    }

    this.emit('updated', Brush.cache[hash]);

    return Brush.cache[hash];
  }

  addEventListener(event, callback) {
    this.callbacks[event] = this.callbacks[event] || [];
    this.callbacks[event].push(callback);
    return this;
  }

  removeEventListener(event, callback) {
    this.callbacks[event] = this.callbacks[event] || [];
    this.callbacks[event] = this.callbacks[event].filter(value => callback != value);
    return this;
  }

  emit(event, value) {
    let callbacks = this.callbacks[event];
    if(callbacks){
      this.callbacks[event].forEach(function emitForEach(cb) {
        cb(value);
      });
    }
    return this;
  }

  getBrushImage() {
    return Brush.cache[this.hash()] || this.updateCanvas();
  }

  hash() {
    return this.size +
      this.width +
      'h' + this.height +
      'a' + this.angle +
      'n' + this.name +
      'e' + this.edge +
      'r' + this.color.r +
      'g' + this.color.g +
      'b' + this.color.b +
      'o' + this.opacity +
      'c' + this.compositeOperation +
      'e' + this.erase;
  }

  toObject() {
    return {
      size: this.size,
      width: this.width,
      height: this.height,
      angle: this.angle,
      name: this.name,
      edge: this.edge,
      color: this.color,
      opacity: this.opacity,
      compositeOperation: this.compositeOperation,
      erase: this.erase
    };
  }

  fromObject(value) {
    this.size = value.size;
    this.width = value.width;
    this.height = value.height;
    this.angle = value.angle;
    this.name = value.name;
    this.edge = value.edge;
    this.color = value.color;
    this.opacity = value.opacity;
    this.compositeOperation = value.compositeOperation;
    this.erase = value.erase;

    return this.updateCanvas();
  }

  toString() {
    return JSON.stringify(this.toObject());
  }

  set(property, value){
    let fixedValue = typeof value == 'string' ? Number(value):value;
    this[property.replace('Range', '')] = fixedValue;
    let settings = this.toObject();
    settings.altColor = this.altColor;
    localStorage.setItem('brushSettings', JSON.stringify(settings));
    return this.updateCanvas();
  }
}

Brush.cache = {};
