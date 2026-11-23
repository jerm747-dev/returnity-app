(() => {
'use strict';
const $=s=>document.querySelector(s),game=$('#game'),field=$('#playfield'),ctx=field.getContext('2d'),help=$('#help'),chat=$('#conversation');
let worldWidth=920,worldHeight=500,ready=false,last=0,lag=0,pauseFrom='run',resumeAfterHelp=false,audio=null,soundOn=false,controller;
const engine=StreetGame.create({onEvent:onGameEvent});
const tones={jump:[260,490,.10],flip:[320,700,.13],reward:[540,980,.22],crate:[470,850,.16]};
function playSound(name){
 if(!soundOn||!audio||audio.state!=='running')return;
 const [from,to,len]=tones[name]||tones.jump,o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;
 o.type='sine';o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(to,t+len);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.07,t+.008);v.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(v);v.connect(audio.destination);o.start(t);o.stop(t+len+.02);
}
function onGameEvent(event){
 if(event.type==='message')$('#toast').textContent=event.text;
 if(event.type==='sound')playSound(event.name);
 if(event.type==='reset'){
  chat.hidden=true;$('#nige-line').textContent='…';$('#npc-line').textContent='…';$('#toast').textContent='';
 }
 if(event.type==='dialogue'){
  controller?.clear();chat.hidden=false;$('#overlay').hidden=true;
  const who=event.line.speaker;
  $('#'+who+'-line').textContent=event.line.text;
  $('#nige-card').classList.toggle('active',who==='nige');$('#npc-card').classList.toggle('active',who==='npc');
  $('#dialogue-count').textContent=(event.index+1)+' / '+engine.script.length;
  $('#spoken-line').textContent=(who==='nige'?'Nige Hood: ':'Open mic regular: ')+event.line.text;
  $('#next-line').textContent=event.index===engine.script.length-1?'Take token & go →':'Next →';
  StreetArt.portrait($('#nige-portrait').getContext('2d'),'nige');
  StreetArt.portrait($('#npc-portrait').getContext('2d'),'npc',engine.state.walkers[event.partner].type);
  if(event.index===0)$('#next-line').focus({preventScroll:true});
 }
 if(event.type==='dialogueEnd'){chat.hidden=true;controller?.clear();field.focus({preventScroll:true})}
}
function resize(){
 const r=field.getBoundingClientRect();if(!r.width||!r.height)return;
 const dpr=Math.min(2,window.devicePixelRatio||1);field.width=Math.round(r.width*dpr);field.height=Math.round(r.height*dpr);
 worldWidth=Math.max(540,Math.min(920,500*r.width/r.height));worldHeight=worldWidth*r.height/r.width;
}
new ResizeObserver(resize).observe($('#viewport'));
function render(){
 if(!ready)return;const s=engine.state,scale=field.width/worldWidth;
 ctx.setTransform(scale,0,0,scale,0,0);StreetArt.render(ctx,s,worldWidth,worldHeight);
 $('#stop').textContent='STREET 01';$('#score').textContent='♪ '+s.notes;$('#tokens').textContent='◉ '+s.tokens+' TOKEN'+(s.tokens===1?'':'S');
 $('#route-label').textContent=s.player.y<220?'THE ROOFTOPS':s.player.y<600?'THE UPPER ROUTE':'THE SIDEWALK';
 $('#progress').style.width=Math.min(100,s.player.x/engine.world.finish*100)+'%';
}
function frame(now){
 lag+=Math.min(.08,(now-(last||now))/1000);last=now;
 while(lag>=1/120){engine.step(1/120,worldWidth,worldHeight);lag-=1/120}
 render();requestAnimationFrame(frame);
}
function clearHeld(){controller.clear();engine.clearInput()}
function start(){
 if(!ready)return;
 resumeAfterHelp=false;if(help.open)help.close();clearHeld();engine.reset();
 $('#overlay').hidden=true;$('#pause').disabled=false;$('#pause').textContent='Pause';
 resize();field.focus({preventScroll:true});
}
function overlay(k,title,desc,a,onA,b,onB){
 $('#overKicker').textContent=k;$('#overTitle').textContent=title;$('#overText').textContent=desc;
 $('#primary').textContent=a;$('#primary').onclick=onA;$('#secondary').textContent=b;$('#secondary').onclick=onB;
 $('#overlay').hidden=false;$('#primary').focus({preventScroll:true});
}
function pause(){
 if(!ready)return;
 const mode=engine.state.mode;if(!['run','dialogue','paused'].includes(mode))return;
 if(mode==='paused'){
  engine.setMode(pauseFrom);$('#overlay').hidden=true;$('#pause').textContent='Pause';
  chat.hidden=pauseFrom!=='dialogue';
  (pauseFrom==='dialogue'?$('#next-line'):field).focus({preventScroll:true});return;
 }
 pauseFrom=mode;clearHeld();engine.setMode('paused');chat.hidden=true;$('#pause').textContent='Resume';
 overlay('RETURNITY · STREET SESSION','Take a breath.','Your place on the block is waiting.','Resume',pause,'New run',start);
}
function showTitle(){
 engine.reset();engine.setMode('ready');$('#pause').disabled=true;
 overlay('NIGE HOOD · RETURNITY','Street Session','Find your rhythm. Explore the upper route. A familiar face might say hello.','Start walking',start,'How to play',openHelp);
}
function openHelp(){
 if(!ready)return;resumeAfterHelp=['run','dialogue'].includes(engine.state.mode);
 if(resumeAfterHelp)pause();help.showModal();
}
help.addEventListener('close',()=>{if(resumeAfterHelp&&engine.state.mode==='paused')pause();resumeAfterHelp=false});
help.addEventListener('click',e=>{if(e.target===help)help.close()});
$('[data-close-help]').onclick=()=>help.close();
document.querySelectorAll('[data-play]').forEach(b=>b.onclick=start);
document.querySelectorAll('[data-help]').forEach(b=>b.onclick=openHelp);
$('#pause').onclick=pause;$('#next-line').onclick=()=>engine.advance();$('#leave-chat').onclick=()=>engine.skip();
$('#audio').onclick=async()=>{
 if(!soundOn){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audio||=new A();await audio.resume();soundOn=true;playSound('reward')}catch{return}}
 else soundOn=false;$('#audio').textContent=soundOn?'Sound on':'Sound off';$('#audio').setAttribute('aria-pressed',String(soundOn));
};
if(!game.requestFullscreen)$('#expand').hidden=true;
else $('#expand').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await game.requestFullscreen();resize()}catch{$('#expand').hidden=true}};
controller=EncoreInput.mount({root:$('.deck'),press:key=>engine.press(key),release:key=>engine.release(key),enabled:()=>ready&&!help.open&&engine.state.mode==='run'});
window.addEventListener('keydown',event=>{
 if(!ready||help.open)return;
 if(engine.state.mode==='dialogue'){
  if(event.code==='Escape'){event.preventDefault();if(!event.repeat)engine.skip();return}
  if(event.code==='Space'||event.code==='Enter'){
   // Let the focused dialog button own Enter/Space so it activates only once.
   if(document.activeElement?.tagName==='BUTTON')return;
   event.preventDefault();if(!event.repeat)engine.advance();return;
  }
  if(event.code==='Tab'){
   const first=$('#leave-chat'),last=$('#next-line');
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 }
 if(event.code==='KeyP'||event.code==='Escape'){event.preventDefault();if(!event.repeat)pause()}
});
function pauseIfPlaying(){if(ready&&['run','dialogue'].includes(engine.state.mode))pause()}
window.addEventListener('blur',pauseIfPlaying);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseIfPlaying()});
const launch=new URLSearchParams(location.search);document.documentElement.classList.toggle('embedded',launch.get('embedded')==='1');
$('#pause').disabled=true;
overlay('NIGE HOOD · RETURNITY','Loading the block…','Getting the street and sprites ready.','Loading…',()=>{},'How to play',()=>{});
$('#primary').disabled=true;$('#secondary').disabled=true;
StreetArt.load().then(()=>{
 ready=true;$('#primary').disabled=false;$('#secondary').disabled=false;resize();
 if(launch.get('autostart')==='1')start();else showTitle();requestAnimationFrame(frame);
}).catch(error=>{
 $('#primary').disabled=false;$('#secondary').disabled=false;
 overlay('ASSETS NOT FOUND','A file is missing.','Keep the assets folder beside this page, then reload. '+error.message,'Reload',()=>location.reload(),'Original demo',()=>{location.href='classic/index.html'});
});
})();
