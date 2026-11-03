(() => {
'use strict';
const $=s=>document.querySelector(s);
const game=$('#game'),help=$('#help'),field=$('#playfield'),ctx=field.getContext('2d');
let audio=null,soundOn=false,frameId=0,last=0,lag=0,worldWidth=800,dpr=1;
let speedLock=false,postWin=false,pauseFrom='run',keyboard=new Set(),pointers=new Map();
const labels={jump:[260,490,.09],flip:[300,630,.12],note:[620,930,.07],crack:[130,62,.08],discOut:[360,680,.14],tap:[150,115,.04],power:[460,920,.22],retry:[210,105,.16],save:[430,720,.16],win:[330,880,.4],pickup:[320,510,.12],throw:[520,200,.09]};
function playSound(k){
 if(!soundOn||!audio||audio.state!=='running')return;const [from,to,len]=labels[k]||labels.note;
 const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;
 o.type=['crack','retry'].includes(k)?'triangle':'sine';o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(to,t+len);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.095,t+.008);v.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(v);v.connect(audio.destination);o.start(t);o.stop(t+len+.01);
}
$('#audio').onclick=async()=>{
 if(!soundOn){try{const Engine=window.AudioContext||window.webkitAudioContext;if(!Engine)return;audio ||= new Engine();await audio.resume();soundOn=true;playSound('note')}catch{return}}
 else soundOn=false;$('#audio').textContent=soundOn?'Sound on':'Sound off';$('#audio').setAttribute('aria-pressed',String(soundOn));field.focus({preventScroll:true});
};
Highway.setCallbacks({message:t=>{$('#toast').textContent=t},sound:playSound,win:()=>{clearHeld();$('#pause').disabled=true}});
function resize(){
 
 const r=field.getBoundingClientRect();if(!r.height||!r.width)return;
 worldWidth=Math.min(1152,432*r.width/r.height);dpr=Math.min(2,window.devicePixelRatio||1);field.width=Math.round(r.width*dpr);field.height=Math.round(r.height*dpr);
}
new ResizeObserver(resize).observe($('#viewport'));
function render(){
 const s = Highway.state;
 const scale = field.width / worldWidth;
 const visibleHeight = field.height / scale;
 const floorOffset = Math.max(0, 340 - visibleHeight * .8);
 const cameraY = visibleHeight < 431 ? Math.min(floorOffset, Math.max(0, s.player.y - 100)) : 0;
 ctx.setTransform(scale, 0, 0, scale, 0, -cameraY * scale);
 Highway.draw(ctx,worldWidth,432);$('#stop').textContent=['SIDE A','SIDE B','SIDE C'][s.save];$('#score').textContent=String(s.score).padStart(3,'0')+' PTS';
 $('#power').hidden=s.player.power<=0;$('#power').textContent='◉ '+Math.ceil(s.player.power)+'s';$('#progress').style.width=Math.min(100,100*s.player.x/Highway.finish)+'%';
}
function frame(now){
 lag+=Math.min(.08,(now-(last||now))/1000);last=now;
 while(lag>=1/120){Highway.step(1/120,worldWidth);lag-=1/120}
 render();if(Highway.state.mode==='win'&&Highway.state.winTime>1.0&&!postWin){postWin=true;overlay('MANSION STAGE','Encore!','Flag raised. '+Highway.state.score+' points and '+Highway.state.stomps+' flips on the highway.','Play again',start,'Title screen',showTitle)}
 frameId=requestAnimationFrame(frame);
}
function clearHeld(){
 keyboard.clear();pointers.clear();speedLock=false;Highway.clearInput();for(const b of document.querySelectorAll('.deck button')){b.classList.remove('held');if(b.dataset.key==='speed')b.setAttribute('aria-pressed','false')}
}
function start(){
 if(help.open)help.close();
 clearHeld();Highway.reset();postWin=false;$('#overlay').hidden=true;$('#pause').disabled=false;$('#pause').textContent='Pause';
 resize();cancelAnimationFrame(frameId);last=0;lag=0;render();frameId=requestAnimationFrame(frame);field.focus({preventScroll:true});
}
function overlay(k,title,desc,a,onA,b,onB){
 $('#overKicker').textContent=k;$('#overTitle').textContent=title;$('#overText').textContent=desc;$('#primary').textContent=a;$('#primary').onclick=onA;$('#secondary').textContent=b;$('#secondary').onclick=onB;$('#overlay').hidden=false;$('#primary').focus({preventScroll:true});
}
function pause(){
 const s=Highway.state;if(!s||!['run','retry','paused'].includes(s.mode))return;
 if(s.mode==='paused'){Highway.setMode(pauseFrom);$('#pause').textContent='Pause';$('#overlay').hidden=true;field.focus({preventScroll:true});return}
 pauseFrom=s.mode;clearHeld();Highway.setMode('paused');$('#pause').textContent='Resume';overlay('RETURNITY ARCADE','Intermission','Your run is waiting right here.','Resume run',pause,'Restart run',start);
}
let resumeAfterHelp = false;
function openHelp() {
 resumeAfterHelp = ['run', 'retry'].includes(Highway.state.mode);
 if (resumeAfterHelp) pause();
 help.showModal();
}
document.querySelectorAll('[data-play]').forEach(button => button.onclick = start);
document.querySelectorAll('[data-help]').forEach(button => button.onclick = openHelp);
$('[data-close-help]').onclick = () => help.close();
$('#pause').onclick = pause;
help.addEventListener('click', event => { if (event.target === help) help.close(); });
help.addEventListener('close', () => {
 if (resumeAfterHelp && Highway.state.mode === 'paused') pause();
 resumeAfterHelp = false;
});
if(!game.requestFullscreen)$('#expand').hidden=true;else $('#expand').onclick=async()=>{try{
 if(document.fullscreenElement)await document.exitFullscreen();else await game.requestFullscreen();resize();field.focus({preventScroll:true})
 }catch{ $('#expand').hidden=true }};
const mapping={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',ArrowDown:'down',KeyS:'down',Space:'jump',KeyX:'lift',ShiftLeft:'speed',ShiftRight:'speed'};
function stillDown(which){return [...keyboard].some(code=>mapping[code]===which)||[...pointers.values()].some(v=>v===which)||(which==='speed'&&speedLock)}
window.addEventListener('keydown',e=>{
 
 if(help.open)return;
 if(e.code==='KeyM'&&arcadeMusic){e.preventDefault();if(!e.repeat)$('#music').onclick();return}
 if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(!e.repeat)pause();return}
 const key=mapping[e.code];if(!key||Highway.state.mode!=='run')return;
 if(e.code==='Space'&&document.activeElement?.tagName==='BUTTON'&&!document.activeElement.closest('.deck'))return;
 e.preventDefault();if(!e.repeat&&!keyboard.has(e.code)){keyboard.add(e.code);Highway.press(key);syncControls()}
});
window.addEventListener('keyup',e=>{const key=mapping[e.code];if(!key)return;e.preventDefault();keyboard.delete(e.code);if(!stillDown(key))Highway.release(key);syncControls()});
const controls = [...document.querySelectorAll('.deck [data-key]')];

function syncControls() {
 for (const button of controls) {
  const key = button.dataset.key;
  button.classList.toggle('held', key !== 'speed' && stillDown(key));
  if (key === 'speed') button.setAttribute('aria-pressed', String(speedLock));
 }
}

function toggleSpeed() {
 speedLock = !speedLock;
 if (speedLock) Highway.press('speed');
 else if (!stillDown('speed')) Highway.release('speed');
 syncControls();
}

function movePointer(id, key) {
 const previous = pointers.get(id);
 if (previous === key) return;
 pointers.set(id, key);
 if (previous && !stillDown(previous)) Highway.release(previous);
 if (key) Highway.press(key);
 syncControls();
}

function releasePointer(id) {
 if (!pointers.has(id)) return;
 const key = pointers.get(id);
 pointers.delete(id);
 if (key && !stillDown(key)) Highway.release(key);
 syncControls();
}

for (const button of controls) {
 const key = button.dataset.key;
 const directionPad = button.closest('.dpad');
 button.addEventListener('pointerdown', event => {
  if (Highway.state?.mode !== 'run') return;
  event.preventDefault();
  button.setPointerCapture(event.pointerId);
  if (key === 'speed') toggleSpeed();
  else movePointer(event.pointerId, key);
 });
 // A thumb can move between directions without lifting from the pad.
 button.addEventListener('pointermove', event => {
  if (!directionPad || !pointers.has(event.pointerId)) return;
  const hovered = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-key]');
  movePointer(event.pointerId, directionPad.contains(hovered) ? hovered.dataset.key : null);
 });
 for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  button.addEventListener(eventName, event => releasePointer(event.pointerId));
 }
 button.addEventListener('keydown', event => {
  if (!['Space', 'Enter'].includes(event.code)) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat || Highway.state?.mode !== 'run') return;
  if (key === 'speed') toggleSpeed();
  else movePointer('control-' + event.code, key);
 });
 button.addEventListener('keyup', event => {
  if (!['Space', 'Enter'].includes(event.code)) return;
  event.preventDefault();
  event.stopPropagation();
  releasePointer('control-' + event.code);
 });
 button.addEventListener('contextmenu', event => event.preventDefault());
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['run','retry'].includes(Highway.state.mode))pause()});
window.addEventListener('blur',()=>{if(['run','retry'].includes(Highway.state.mode))pause()});
function showTitle() {
 clearHeld();
 Highway.reset();
 Highway.setMode('ready');
 postWin = false;
 $('#pause').disabled = true;
 $('#pause').textContent = 'Pause';
 $('#toast').textContent = '';
 resize();
 render();
 overlay('NIGE HOOD · RETURNITY', 'Highway Encore',
  'Flip the road crew. Catch the disc. Reach the mansion.',
  'Start the run', start, 'How to play', openHelp);
 cancelAnimationFrame(frameId);
 last = 0;
 lag = 0;
 frameId = requestAnimationFrame(frame);
}
// Music: when this game runs inside a Sound Arcade cabinet, the cabinet keeps the site's music
// playing and has a music player. Ask whether it's there; if it answers, the title and pause
// screens get a Music button that opens it over the game. Played on its own, nothing changes.
let arcadeMusic = false;
const toArcade = type => { try { parent.postMessage({ type }, location.origin); } catch {} };
window.addEventListener('message', event => {
 if (event.source !== parent || event.origin !== location.origin) return;
 const type = event.data && event.data.type;
 if (type === 'sound-arcade-music-ready') { arcadeMusic = true; $('#music').hidden = $('#overlay').hidden; }
 if (type === 'sound-arcade-music-closed') field.focus({ preventScroll: true });
});
$('#music').onclick = () => {
 if (['run', 'retry'].includes(Highway.state.mode)) pause();
 toArcade('sound-arcade-music-open');
};
new MutationObserver(() => { $('#music').hidden = !arcadeMusic || $('#overlay').hidden; }).observe($('#overlay'), { attributes: true, attributeFilter: ['hidden'] });
if (parent !== window) toArcade('sound-arcade-music-hello');
const launchOptions = new URLSearchParams(window.location.search);
document.documentElement.classList.toggle('embedded', launchOptions.get('embedded') === '1');
if (launchOptions.get('autostart') === '1') start();
else showTitle();
})();

