/* Street Session: deterministic movement, one optional encounter, no enemies. */
(() => {
'use strict';
const WORLD={width:1672,height:941,ground:770,playerHeight:128,halfWidth:22,finish:1560};
const platformData=[
 {id:'step-a',x:190,y:685,w:72,kind:'wood'},
 {id:'step-b',x:304,y:595,w:72,kind:'wood'},
 {id:'step-c',x:440,y:505,w:82,kind:'wood'},
 {id:'cafe-awning',x:34,y:382,w:506,kind:'ledge'},
 {id:'cafe-balcony',x:32,y:316,w:130,kind:'ledge'},
 {id:'balcony-step',x:530,y:284,w:88,kind:'wood'},
 {id:'center-balcony',x:757,y:310,w:430,kind:'ledge'},
 {id:'rooftop-step',x:660,y:194,w:82,kind:'wood'},
 {id:'rooftop',x:705,y:87,w:522,kind:'ledge'},
 {id:'shop-step-a',x:750,y:680,w:76,kind:'wood'},
 {id:'shop-step-b',x:858,y:585,w:76,kind:'wood'},
 {id:'shop-awning',x:702,y:477,w:490,kind:'ledge'},
 {id:'shop-step-c',x:1075,y:392,w:78,kind:'wood'},
 {id:'bench',x:963,y:653,w:129,kind:'ledge'},
 {id:'east-step',x:1360,y:680,w:76,kind:'wood'}
];
const script=[
 {speaker:'npc',text:"Hey, don’t I know you from somewhere?"},
 {speaker:'nige',text:"I’m not sure. You look familiar, though."},
 {speaker:'npc',text:"I think I saw you at open mic night."},
 {speaker:'nige',text:"Yeah, that was me. I did the show with the live band."},
 {speaker:'npc',text:"Great to see you. Keep doing your thing. Here’s a token for the merchant shop."},
 {speaker:'nige',text:"Appreciate you. Catch you at the next one."}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(v,to,delta)=>v<to?Math.min(to,v+delta):Math.max(to,v-delta);
function create({random=Math.random,onEvent=()=>{}}={}){
 let s;const held=new Set();
 function emit(type,data){onEvent({type,...data})}
 function reset(){
  held.clear();
  const partner=Math.floor(random()*2)%2;
  s={mode:'run',time:0,elapsed:0,camera:{x:0,y:340},tokens:0,notes:0,finishVisited:false,
   encounter:{partner,status:'available',line:0,rewarded:false},
   player:{x:105,y:WORLD.ground,vx:0,vy:0,facing:1,grounded:true,platform:'ground',duck:false,coyote:.1,buffer:0,wantsFlip:false,flip:false,flipElapsed:0,flipAngle:0,flipUsed:false,phase:0,land:0},
   platforms:platformData.map(p=>({...p})),
   walkers:[{id:0,type:0,x:410,y:WORLD.ground,speed:18,dir:1,lo:350,hi:490,phase:0},{id:1,type:1,x:530,y:WORLD.ground,speed:17,dir:-1,lo:470,hi:590,phase:1.5},{id:2,type:0,x:880,y:WORLD.ground,speed:22,dir:-1,lo:720,hi:1120,phase:.5},{id:3,type:1,x:1280,y:WORLD.ground,speed:25,dir:1,lo:1130,hi:1550,phase:2}],
   blocks:[{x:620,y:551,w:66,h:66,used:false,bump:0},{x:1020,y:177,w:66,h:66,used:false,bump:0}],
   particles:[],lastMessage:'Walk the street. Try the upper route.',messageTime:4};
  emit('reset');return s;
 }
 function message(text){s.lastMessage=text;s.messageTime=3.3;emit('message',{text})}
 function clearInput(){held.clear();if(s){s.player.buffer=0;s.player.wantsFlip=false}}
 function mode(value){s.mode=value;clearInput()}
 function press(key){
  if(s.mode!=='run'||held.has(key))return;held.add(key);
  if(key==='jump'){s.player.buffer=.13;s.player.wantsFlip=false}
  if(key==='flip'){
   if(s.player.grounded||s.player.coyote>0){s.player.buffer=.13;s.player.wantsFlip=true}
   else if(!s.player.flipUsed){s.player.flip=true;s.player.flipUsed=true;s.player.flipElapsed=0;emit('sound',{name:'flip'})}
  }
 }
 function release(key){
  if(held.delete(key)&&key==='jump'&&s.player.vy< -350&&!s.player.flip)s.player.vy=-350;
 }
 function beginEncounter(){
  s.mode='dialogue';s.encounter.status='talking';s.encounter.line=0;
  s.player.vx=0;s.player.vy=0;
  s.player.facing=s.walkers[s.encounter.partner].x>s.player.x?1:-1;
  s.walkers[s.encounter.partner].dir=-s.player.facing;
  clearInput();emit('dialogue',{line:script[0],index:0,partner:s.encounter.partner});
 }
 function endEncounter(completed){
  if(s.encounter.status!=='talking')return;
  if(completed&&!s.encounter.rewarded){s.tokens++;s.encounter.rewarded=true;emit('sound',{name:'reward'})}
  s.encounter.status=completed?'completed':'skipped';s.mode='run';clearInput();
  emit('dialogueEnd',{completed});
  message(completed?'Merchant token +1 · Thanks for stopping.':'Back to the street.');
 }
 function advance(){
  if(s.mode!=='dialogue')return;
  if(s.encounter.line===script.length-1){endEncounter(true);return}
  s.encounter.line++;emit('dialogue',{line:script[s.encounter.line],index:s.encounter.line,partner:s.encounter.partner});
 }
 function skip(){if(s.mode==='dialogue')endEncounter(false)}
 function hop(){
  const p=s.player;p.vy=-720;p.grounded=false;p.coyote=0;p.buffer=0;p.platform=null;
  p.flip=p.wantsFlip;p.flipUsed=p.flip;p.flipElapsed=0;p.flipAngle=0;p.wantsFlip=false;
  emit('sound',{name:p.flip?'flip':'jump'});
 }
 function updatePlayer(dt){
  const p=s.player,oldY=p.y,oldX=p.x;
  p.buffer=Math.max(0,p.buffer-dt);p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);p.land=Math.max(0,p.land-dt);
  p.duck=held.has('down')&&p.grounded;
  const dir=Number(held.has('right'))-Number(held.has('left'));
  const max=p.duck?70:held.has('speed')?304:172;
  p.vx=approach(p.vx,dir*max,(dir?1600:2100)*dt);
  if(dir)p.facing=dir;
  if(p.buffer>0&&p.coyote>0)hop();
  p.x=clamp(p.x+p.vx*dt,35,WORLD.width-35);
  p.vy=Math.min(1100,p.vy+1650*dt);p.y+=p.vy*dt;
  p.grounded=false;p.platform=null;
  const bodyH=p.duck?88:WORLD.playerHeight;
  // Solid reward blocks: bump from below, land on top, stop at their sides.
  for(const b of s.blocks){
   if(p.y>b.y+1&&p.y-bodyH<b.y+b.h-1){
    if(oldX+WORLD.halfWidth<=b.x&&p.x+WORLD.halfWidth>b.x){p.x=b.x-WORLD.halfWidth;p.vx=0}
    else if(oldX-WORLD.halfWidth>=b.x+b.w&&p.x-WORLD.halfWidth<b.x+b.w){p.x=b.x+b.w+WORLD.halfWidth;p.vx=0}
   }
   const horizontal=p.x+WORLD.halfWidth>b.x&&p.x-WORLD.halfWidth<b.x+b.w;
   if(horizontal&&p.vy<0&&oldY-bodyH>=b.y+b.h-.5&&p.y-bodyH<=b.y+b.h){
    p.y=b.y+b.h+bodyH;p.vy=95;b.bump=.24;
    if(!b.used){b.used=true;s.notes+=5;message('Golden crate · +5 notes');emit('sound',{name:'crate'});
     for(let i=0;i<9;i++)s.particles.push({x:b.x+b.w/2,y:b.y,vx:(i-4)*22,vy:-150-(i%3)*35,life:1});}
   }
  }
  const surfaces=[{id:'ground',x:0,y:WORLD.ground,w:WORLD.width},...s.platforms,...s.blocks.map((b,i)=>({id:'gold-'+i,x:b.x,y:b.y,w:b.w}))];
  if(p.vy>=0){
   const crossed=surfaces.filter(a=>p.x+WORLD.halfWidth>a.x&&p.x-WORLD.halfWidth<a.x+a.w&&oldY<=a.y+.8&&p.y>=a.y);
   if(crossed.length){const land=crossed.reduce((a,b)=>a.y<b.y?a:b);p.y=land.y;p.grounded=true;p.platform=land.id;p.vy=0;
    if(p.flip||oldY<land.y-1)p.land=.10;
    p.flip=false;p.flipUsed=false;p.flipAngle=0;
   }
  }
  if(p.y>WORLD.ground){p.y=WORLD.ground;p.vy=0;p.grounded=true;p.flip=false;p.flipUsed=false}
  if(p.flip){p.flipElapsed+=dt;p.flipAngle=Math.min(1,p.flipElapsed/.62)*Math.PI*2;
   if(p.flipElapsed>.65){p.flip=false;p.flipAngle=0}}
  p.phase+=Math.abs(p.vx)*dt/(Math.abs(p.vx)>215?155:150);
  const e=s.encounter,partner=s.walkers[e.partner];
  if(e.status==='available'){
   if(p.grounded&&p.platform==='ground'&&Math.abs(p.x-partner.x)<70){beginEncounter();return}
   if(p.x>partner.x+100){e.status='bypassed';emit('bypassed')}
  }
  if(p.x>WORLD.finish&&p.grounded&&!s.finishVisited){s.finishVisited=true;emit('finish');message('End of the block · Turn back and keep exploring.');}
 }
 function updateCamera(dt,w,h){
  const p=s.player,cam=s.camera;
  const tx=clamp(p.x-w*.38,0,Math.max(0,WORLD.width-w));
  const base=clamp(WORLD.ground-h*.83,0,Math.max(0,WORLD.height-h));
  const ty=Math.min(base,Math.max(-160,p.y-h*.73));
  const blend=1-Math.exp(-6*dt);
  cam.x+=(tx-cam.x)*blend;cam.y+=(ty-cam.y)*blend;
 }
 function step(dt,w=900,h=520){
  if(!s||s.mode==='paused')return;
  s.time+=dt;
  if(s.mode==='run')s.elapsed+=dt;
  if(s.messageTime>0){s.messageTime-=dt;if(s.messageTime<=0){s.lastMessage='';emit('message',{text:''})}}
  for(const npc of s.walkers){
   if(s.encounter.status==='talking'&&npc.id===s.encounter.partner)continue;
   npc.x+=npc.dir*npc.speed*dt;npc.phase+=dt*5;
   if(npc.x<npc.lo){npc.x=npc.lo;npc.dir=1}if(npc.x>npc.hi){npc.x=npc.hi;npc.dir=-1}
  }
  for(const b of s.blocks)b.bump=Math.max(0,b.bump-dt);
  for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=340*dt;p.life-=dt}s.particles=s.particles.filter(p=>p.life>0);
  if(s.mode==='run')updatePlayer(dt);
  updateCamera(dt,w,h);
 }
 return {reset,press,release,clearInput,setMode:mode,step,advance,skip,get state(){return s},world:WORLD,script};
}
globalThis.StreetGame={create,world:WORLD,script};
})();
