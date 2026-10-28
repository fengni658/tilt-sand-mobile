import {Sand,orientationGravity,type Vector} from './engine.js';
const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=get<HTMLCanvasElement>('sand'),ctx=canvas.getContext('2d')!;
const sim=new Sand(); let gravity:Vector={x:0,y:1},raw:Vector={x:0,y:1},baseline:Vector={x:0,y:0};
let sensorActive=false,hasSensorReading=false,pointer:number|null=null,last=0,palette='spectrum',permissionEpoch=0,sensorTimer=0;
const status=(message:string)=>get('status').textContent=message;
const colors:string[]=[];
function setColors(){for(let i=0;i<1024;i++){const t=(i%64)/63;const hue=palette==='sunset'?330+t*75:palette==='ocean'?155+t*100:t*320;colors[i+1]=`hsl(${hue} 90% ${55+(Math.floor(i/64)%4)*3}%)`;}}
function draw(){ctx.fillStyle='#05070d';ctx.fillRect(0,0,512,512);ctx.fillStyle='#101522';for(let y=0;y<64;y++)for(let x=0;x<64;x++)ctx.fillRect(x*8+2,y*8+2,3,3);for(let i=0;i<4096;i++){const id=sim.cells[i];if(!id)continue;ctx.fillStyle=colors[id];ctx.fillRect(i%64*8+1,Math.floor(i/64)*8+1,6,6);}get('direction').style.transform=`rotate(${Math.atan2(-gravity.x,gravity.y)*180/Math.PI}deg)`;}
function frame(now:number){if(!document.hidden){if(last)sim.advance((now-last)/1000,gravity);draw();}last=now;requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{last=0;});
function screenAngle(){return screen.orientation?.angle??Number((window as Window & {orientation?:number}).orientation??0);}
function onOrientation(e:DeviceOrientationEvent){if(!sensorActive||e.beta===null||e.gamma===null||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;clearTimeout(sensorTimer);hasSensorReading=true;raw=orientationGravity(e.beta,e.gamma,screenAngle());if(pointer===null){gravity={x:gravity.x*.75+(raw.x-baseline.x)*.25,y:gravity.y*.75+(raw.y-baseline.y)*.25};}status('倾斜已连接 · 缓慢转动手机，让沙粒流动');get('mode').textContent='手机传感器';}
window.addEventListener('deviceorientation',onOrientation);
get<HTMLButtonElement>('sensor').onclick=async()=>{const button=get<HTMLButtonElement>('sensor');const epoch=++permissionEpoch;sensorActive=false;hasSensorReading=false;clearTimeout(sensorTimer);get('mode').textContent='触摸控制';button.disabled=true;status('正在请求动作与方向权限…');try{if(!window.isSecureContext)throw new Error('需要 HTTPS 安全页面才能开启倾斜；当前可使用触摸。');if(typeof DeviceOrientationEvent==='undefined')throw new Error('此浏览器没有方向传感器接口，请使用触摸。');const api=DeviceOrientationEvent as typeof DeviceOrientationEvent & {requestPermission?:()=>Promise<string>};if(api.requestPermission&&await api.requestPermission()!=='granted')throw new Error('方向权限未获允许。可在浏览器设置中允许，或继续触摸。');if(epoch!==permissionEpoch)return;sensorActive=true;hasSensorReading=false;baseline={x:0,y:0};status('权限已就绪，正在等待传感器读数…');clearTimeout(sensorTimer);sensorTimer=window.setTimeout(()=>{if(sensorActive){sensorActive=false;hasSensorReading=false;get('mode').textContent='触摸控制';status('未收到传感器数据，请使用触摸，或换手机浏览器重试。');}},4000);}catch(error){if(epoch===permissionEpoch){sensorActive=false;status(error instanceof Error?error.message:'传感器不可用，请继续使用触摸。');}}finally{button.disabled=false;}};
get('touch').onclick=()=>{permissionEpoch++;sensorActive=false;hasSensorReading=false;clearTimeout(sensorTimer);get('mode').textContent='触摸控制';status('触摸模式 · 拖动画布改变重力，松手后保持方向');};
function point(e:PointerEvent){const r=canvas.getBoundingClientRect();gravity={x:Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/(r.width*.4))),y:Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/(r.height*.4)))};}
canvas.onpointerdown=e=>{if(pointer!==null)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);point(e);};canvas.onpointermove=e=>{if(e.pointerId===pointer)point(e);};
const release=(e:PointerEvent)=>{if(e.pointerId===pointer){pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};canvas.onpointerup=release;canvas.onpointercancel=release;canvas.onlostpointercapture=()=>{pointer=null;};
canvas.onkeydown=e=>{const vectors:Record<string,Vector>={ArrowDown:{x:0,y:1},ArrowUp:{x:0,y:-1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};if(vectors[e.key]){e.preventDefault();gravity=vectors[e.key];}};
get('pause').onclick=()=>{sim.paused=!sim.paused;get('pause').textContent=sim.paused?'▶ 继续':'Ⅱ 暂停';get('pause').setAttribute('aria-pressed',String(sim.paused));};
get('reset').onclick=()=>{sim.reset();baseline={x:0,y:0};gravity={x:0,y:1};status(sim.paused?'沙粒已重置 · 当前仍暂停':'沙粒与重力已重置');draw();};
get('calibrate').onclick=()=>{if(sensorActive&&!hasSensorReading){status('尚未收到传感器读数，暂不能校准；请稍候或使用触摸。');return;}if(sensorActive){baseline={...raw};gravity={x:0,y:0};status('当前姿态已设为零重力 · 向任意方向倾斜试试');}else{gravity={x:0,y:1};status('触摸重力已恢复向下 · 开启手机倾斜后可校准姿态');}};
get<HTMLSelectElement>('palette').onchange=e=>{palette=(e.target as HTMLSelectElement).value;setColors();draw();};
screen.orientation?.addEventListener('change',()=>{baseline={x:0,y:0};status('屏幕方向已改变 · 如有偏移请重新校准');});
setColors();draw();requestAnimationFrame(frame);
if('serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>status('离线缓存未就绪；当前在线模式仍可使用。'));});
