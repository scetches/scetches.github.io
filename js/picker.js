'use strict'

class Picker extends EventEmitter{
  constructor(hueHeight, element){
    super();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.rainbow = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    this.light = this.ctx.createLinearGradient(0, this.canvas.width, this.canvas.width, this.canvas.width);
    this.dark = this.ctx.createLinearGradient(this.canvas.width, 0, this.canvas.width, this.canvas.width);
    this.hueHeight = hueHeight;

    this.x = 0;
    this.y = 0;
    this.z = 0;

    this.color = [0,0,0];

    this.rainbow.addColorStop(0, 'rgb(255,0,0)');
    this.rainbow.addColorStop(1/6, 'rgb(255,255,0)');
    this.rainbow.addColorStop(2/6, 'rgb(0,255,0)');
    this.rainbow.addColorStop(3/6, 'rgb(0,255,255)');
    this.rainbow.addColorStop(4/6, 'rgb(0,0,255)');
    this.rainbow.addColorStop(5/6, 'rgb(255,0,255)');
    this.rainbow.addColorStop(1, 'rgb(255,0,0)');

    this.light.addColorStop(1, 'transparent');
    this.light.addColorStop(0, 'white');
    this.dark.addColorStop(0, 'transparent');
    this.dark.addColorStop(1, 'black');

    this.canvas.id = 'picker';
    this.canvas.width = 256;
    this.canvas.height = this.canvas.width + hueHeight;

    this.canvas.addEventListener('mousemove', (e) => {this.clickHandler(e)});
    this.canvas.addEventListener('mouseup',   (e) => {this.clickHandler(e)});
    this.canvas.addEventListener('touchmove', (e) => {this.touchHandler(e)})
    this.canvas.addEventListener('touchend', (e) => {this.touchHandler(e)})


    element.appendChild(this.canvas);
  }

  clickHandler(e){
    e.preventDefault();
    if(e.buttons > 0){
      if (e.offsetY > this.canvas.width){
        this.z = this.clamp(e.offsetX, 0, this.canvas.width);
      } else if(e.offsetY < this.canvas.width){
        this.x = this.clamp(e.offsetX, 0, this.canvas.width);
        this.y = this.clamp(e.offsetY, 0, this.canvas.width);
      }
      this.render();
    }
  }

  touchHandler(e){
    e.preventDefault();
    let offset = e.target.getBoundingClientRect();
    if (e.changedTouches[0].pageY - offset.top > this.canvas.width){
      this.z = this.clamp(e.changedTouches[0].pageX - offset.left, 0, this.canvas.width);
    } else if(e.changedTouches[0].pageY - offset.top < this.canvas.width){
      this.x = this.clamp(e.changedTouches[0].pageX - offset.left, 0, this.canvas.width);
      this.y = this.clamp(e.changedTouches[0].pageY - offset.top, 0, this.canvas.width);
    }
    this.render();
  }

  clamp(value, low, high){
    return value<low?low:(value>high?high:value);
  }

  hsvToRgb(h, s, v){
      var r, g, b;

      var i = Math.floor(h * 6);
      var f = h * 6 - i;
      var p = v * (1 - s);
      var q = v * (1 - f * s);
      var t = v * (1 - (1 - f) * s);

      switch(i % 6){
          case 0: r = v, g = t, b = p; break;
          case 1: r = q, g = v, b = p; break;
          case 2: r = p, g = v, b = t; break;
          case 3: r = p, g = q, b = v; break;
          case 4: r = t, g = p, b = v; break;
          case 5: r = v, g = p, b = q; break;
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  rgbToHsv(r, g, b){
      r = r/255, g = g/255, b = b/255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, v = max;

      var d = max - min;
      s = max == 0 ? 0 : d / max;

      if(max == min){
          h = 0;
      }else{
          switch(max){
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
      }

      return [h, s, v];
  }

  updateColor(color){
    this.color = this.rgbToHsv(color[0], color[1], color[2]);
    this.z = this.color[0] * this.canvas.width;
    this.x = this.color[1] * this.canvas.width;
    this.y = (this.color[2] * this.canvas.width) * -1 + this.canvas.width;
    this.render();
  }

  render(){
    let h,s,v,
        r,g,b,
        color;
    h = this.z / this.canvas.width;
    s = this.x / this.canvas.width;
    v = (this.y * - 1 + this.canvas.width) / this.canvas.width;
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = this.rainbow;
    this.ctx.fillRect(0, this.canvas.height - this.hueHeight, this.canvas.width, this.hueHeight);
    color = this.hsvToRgb(h, 1, 1);
    r = color[0];
    g = color[1];
    b = color[2];
    this.ctx.beginPath();
    this.ctx.moveTo(this.z, this.canvas.height - this.hueHeight);
    this.ctx.lineTo(this.z, this.canvas.height);
    this.ctx.stroke();
    this.ctx.restore();
    this.ctx.save();
    this.ctx.fillStyle = 'rgb('+ r +','+ g +','+ b +')';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.width);
    this.ctx.fillStyle = this.light;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.width);
    this.ctx.fillStyle = this.dark;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.width);
    color = this.hsvToRgb(h,s,v);
    r = color[0];
    g = color[1];
    b = color[2];

    this.emit('updated', color);

    this.ctx.translate(this.x, this.y);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 3, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.restore();
  }
}
