(() => {
'use strict';
const $=s=>document.querySelector(s);
const game=$('#game'),help=$('#help'),field=$('#playfield'),ctx=field.getContext('2d');
let audio=null,soundOn=false,frameId=0,last=0,lag=0,worldWidth=800,dpr=1;
let postWin=false,pauseFrom='run';
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
function clearHeld(){ controller.clear(); Highway.clearInput(); }
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
const controller = EncoreInput.mount({
 root: $('.deck'),
 press: key => Highway.press(key),
 release: key => Highway.release(key),
 enabled: () => !help.open && Highway.state?.mode === 'run'
});
window.addEventListener('keydown', event => {
 if (help.open || !['KeyP','Escape'].includes(event.code)) return;
 event.preventDefault();
 if (!event.repeat) pause();
});
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
const launchOptions = new URLSearchParams(window.location.search);
document.documentElement.classList.toggle('embedded', launchOptions.get('embedded') === '1');
if (launchOptions.get('autostart') === '1') start();
else showTitle();
})();

