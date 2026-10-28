import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sand,orientationGravity} from '../dist/src/engine.js';

// Isolated controller tests with DOM/timer doubles, not browser or device QA.
const source=readFileSync(new URL('../dist/src/main.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
function setup(){
 const elements=new Map(),listeners=new Map(),timers=new Map();let next=0;
 const ctx={fillRect(){},fillStyle:''};
 const get=id=>{if(!elements.has(id))elements.set(id,{textContent:'',style:{},disabled:false,getContext:()=>ctx,setAttribute(){}});return elements.get(id);};
 const window={isSecureContext:true,addEventListener:(name,fn)=>listeners.set(name,fn),setTimeout:fn=>{timers.set(++next,fn);return next;}};
 const sandbox={Sand,orientationGravity,window,document:{hidden:false,getElementById:get,addEventListener(){}},screen:{orientation:{angle:0,addEventListener(){}}},navigator:{},requestAnimationFrame(){},clearTimeout:id=>timers.delete(id),DeviceOrientationEvent:class{static async requestPermission(){return 'granted';}}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {get,sandbox,timers,read:()=>listeners.get('deviceorientation')({beta:30,gamma:10}),state:expression=>vm.runInContext(expression,sandbox)};
}
test('calibration waits for a fresh valid sample',async()=>{
 const h=setup();await h.get('sensor').onclick();h.get('calibrate').onclick();
 assert.match(h.get('status').textContent,/尚未收到/);assert.equal(h.state('baseline.y'),0);
 h.read();h.get('calibrate').onclick();assert.match(h.get('status').textContent,/零重力/);
 assert.equal(h.state('baseline.y'),h.state('raw.y'));assert.equal(h.state('gravity.y'),0);
});
test('reenable invalidates the previous session sample',async()=>{
 const h=setup();await h.get('sensor').onclick();h.read();h.get('calibrate').onclick();
 await h.get('sensor').onclick();h.get('calibrate').onclick();
 assert.match(h.get('status').textContent,/尚未收到/);assert.equal(h.state('baseline.y'),0);
});
test('permission rejection restores touch mode and clears previous wait timer',async()=>{
 const h=setup();await h.get('sensor').onclick();assert.equal(h.timers.size,1);
 h.get('mode').textContent='手机传感器';
 h.sandbox.DeviceOrientationEvent=class{static async requestPermission(){return 'denied';}};
 await h.get('sensor').onclick();
 assert.equal(h.get('mode').textContent,'触摸控制');assert.equal(h.timers.size,0);
 assert.equal(h.state('sensorActive'),false);assert.equal(h.get('sensor').disabled,false);
});
test('touch cancels a pending permission result',async()=>{
 const h=setup();let resolve;
 h.sandbox.DeviceOrientationEvent=class{static requestPermission(){return new Promise(r=>resolve=r);}};
 const pending=h.get('sensor').onclick();h.get('touch').onclick();resolve('granted');await pending;
 assert.equal(h.state('sensorActive'),false);assert.equal(h.timers.size,0);
 assert.equal(h.get('mode').textContent,'触摸控制');
});
