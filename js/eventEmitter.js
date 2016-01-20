'use strict'

class EventEmitter{
  constructor(){
    this.callbacks = {};
  }

  addEventListener(){
    return this.on.apply(this, arguments);
  }

  on(event, callback){
  this.callbacks[event] = this.callbacks[event] || [];
  this.callbacks[event].push(callback);
  return this;
  }

  once(event, callback){
    let cb = (value) => {
      callback(value);
      this.removeListener(event, cb);
    };

    return this.on(event, cb);
  }

  removeEventListener() {
    return this.removeListener.apply(this, arguments);
  }

  removeListener(event, callback) {
    this.callbacks[event] = this.callbacks[event] || [];
    this.callbacks[event] = this.callbacks[event].filter(value => callback != value);
    return this;
  }

  removeAllListeners(event){
    this.callbacks[event] = [];
    return this;
  }

  emit(event, value) {
    let callbacks = this.callbacks[event];
    if(callbacks){
      this.callbacks[event].forEach((cb) => {
        cb(value);
      });
    }
    return this;
  }
}
