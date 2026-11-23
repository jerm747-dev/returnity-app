/* Highway Encore physics. Coordinates use the center of each character's feet. */
(() => {
'use strict';
const groundY=340, finish=4740, endX=4970, playerHeight=58, duckHeight=43, halfWidth=11;
const floorRuns=[[0,866],[953,1614],[1705,2376],[2481,3108],[3219,3906],[4020,endX]];
const bridges=[[580,259,115],[1180,267,135],[1860,258,106],[2750,256,115],[3450,267,104],[3610,211,102],[4260,259,122]];
const blockSet=[[275,'wood'],[311,'disc'],[347,'wood'],[1120,'wood'],[1480,'wood'],[1990,'disc'],[2026,'wood'],[2260,'wood'],[2860,'wood'],[2896,'disc'],[3290,'wood'],[3750,'wood'],[4180,'disc'],[4460,'wood']];
const patrols=[
 ['cocoa',571,472,675],['marker',795,720,824],
 ['cocoa',1375,1280,1450],['crown',1580,1470,1584],
 ['crown',1828,1760,1910],['marker',2160,2080,2230],
 ['peach',2680,2550,2720],['shield',3020,2920,3050],
 ['marker',3420,3335,3470],['peach',3650,3520,3675],['shield',3844,3760,3870],
 ['peach',4330,4260,4400],['shield',4515,4410,4560]
];
const saves=[65,1733,3246];
const allNotes=[[170,292],[220,269],[594,216],[632,209],[672,216],[856,267],[908,232],[961,267],[1220,228],[1260,221],[1490,282],[1620,259],[1660,237],[1700,259],[1880,215],[1922,216],[2325,279],[2400,245],[2440,236],[2483,256],[2770,211],[2812,205],[3113,249],[3167,228],[3211,249],[3472,222],[3634,172],[3670,171],[3910,245],[3970,226],[4020,249],[4290,214],[4334,211],[4600,285],[4650,267]];
const characteristics={cocoa:[42,32],crown:[60,34],peach:[40,31],marker:[75,32],shield:[57,32]};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const onGroundAt=x=>floorRuns.some(([a,b])=>x>=a&&x<=b);
const toward=(now,target,step)=>now<target?Math.min(now+step,target):Math.max(now-step,target);
const tau=Math.PI*2;
let state;
let callbacks={};
const down=new Set();
function makeCritter([type,x,lo,hi],index){
 return {type,x,lo,hi,y:groundY,dir:index%2?1:-1,mode:'walk',phase:index,vy:0,vx:0,clock:index*.6,height:characteristics[type][1]};
}
function reset(){
 down.clear();
 state={mode:'run',time:0,score:0,stomps:0,save:0,camera:0,toast:'',toastTime:0,winTime:0,
  blocks:blockSet.map(([x,kind])=>({x,y:218,w:36,h:36,kind,alive:true,spent:false,bump:0})),enemies:patrols.map(makeCritter),
  notes:allNotes.map(([x,y])=>({x,y,got:false})),discs:[],particles:[],dtSinceRespawn:0};
 spawn(false);message('Hit the road  →',2.1);return state;
}
function spawn(retry=true){
 const s=state,x=saves[s.save];
 if(s.player?.cargo){s.player.cargo.mode='gone'}
 s.player={x,y:groundY,vx:0,vy:0,face:1,ground:true,coyote:.1,buffer:0,phase:0,power:0,grace:retry?1.65:.35,cargo:null,duck:false};
 s.camera=Math.max(0,x-155);
 if(retry){s.mode='retry';s.retryTime=.7;message('Back on the road',1.65);sound('retry')}
}
function message(t,sec=1.4){state.toast=t;state.toastTime=sec;callbacks.message?.(t)}
function sound(id){callbacks.sound?.(id)}
function press(which){
 if(!state||state.mode!=='run'||down.has(which))return;
 down.add(which);
 if(which==='jump')state.player.buffer=.13;
 if(which==='lift')lift();
}
function release(which){
 const held=down.delete(which);
 if(held&&which==='jump'&&state?.mode==='run'&&state.player.vy< -285)state.player.vy=-285;
}
function setMode(m){if(state)state.mode=m;down.clear()}
function lift(){
 const p=state.player;
 if(p.cargo){const e=p.cargo;e.mode='thrown';e.x=p.x+p.face*23;e.y=p.y-49;e.vx=p.face*445+p.vx*.2;e.vy=-144;p.cargo=null;sound('throw');return}
 const e=state.enemies.find(e=>e.mode==='flip'&&Math.abs(e.x-p.x)<48&&Math.abs(e.y-p.y)<52);
 if(e){e.mode='carried';p.cargo=e;sound('pickup');message('Lifted!  X / Lift to throw',1.7)}
}
function burst(x,y,colors,count=9){
 for(let i=0;i<count;i++){
  const angle=i*2.39996+state.time*2,vel=28+(i%4)*23;
  state.particles.push({x,y,vx:Math.cos(angle)*vel,vy:Math.sin(angle)*vel-55,life:.36+i%3*.07,color:colors[i%colors.length]});
 }
}
function hitBlock(b){
 if(b.kind==='wood'){
  b.alive=false;state.score+=1;burst(b.x+18,b.y+18,['#ad6754','#ffd67c','#69394b'],13);sound('crack');
 }else if(!b.spent){
  b.spent=true;b.bump=.2;
  state.discs.push({x:b.x+18,y:b.y-15,vy:-110,vx:56,life:0});sound('discOut');message('Encore Disc!',1.25);
 }else{b.bump=.13;sound('tap')}
}
function updatePlayer(dt){
 const s=state,p=s.player,previousY=p.y;
 const dir=Number(down.has('right'))-Number(down.has('left'));
 const ceilingBlocked = p.duck && s.blocks.some(b =>
  b.alive && p.x + halfWidth > b.x && p.x - halfWidth < b.x + b.w &&
  p.y > b.y && p.y - playerHeight < b.y + b.h
 );
 p.duck = (p.ground && down.has('down')) || ceilingBlocked;
 const maxSpeed = p.duck ? 88 : down.has('speed') ? 358 : 229;
 p.vx=toward(p.vx,dir*maxSpeed,(dir?1320:1650)*dt);
 if(dir)p.face=dir;
 p.phase+=Math.abs(p.vx)*dt*.061;
 p.power=Math.max(0,p.power-dt);p.grace=Math.max(0,p.grace-dt);
 p.coyote=p.ground?.105:Math.max(0,p.coyote-dt);
 if(p.buffer>0&&p.coyote>0&&!ceilingBlocked){p.duck=false;p.vy=-690;p.ground=false;p.coyote=0;p.buffer=0;sound('jump')}
 p.buffer=Math.max(0,p.buffer-dt);
 const bodyHeight = p.duck ? duckHeight : playerHeight;
 let x=clamp(p.x+p.vx*dt,halfWidth,endX-halfWidth);
 for(const b of s.blocks){
  if(!b.alive||p.y<=b.y+.2||p.y-bodyHeight>=b.y+b.h-.2)continue;
  if(p.vx>0&&p.x+halfWidth<=b.x+.1&&x+halfWidth>b.x){x=b.x-halfWidth;p.vx=0}
  if(p.vx<0&&p.x-halfWidth>=b.x+b.w-.1&&x-halfWidth<b.x+b.w){x=b.x+b.w+halfWidth;p.vx=0}
 }
 p.x=x;p.vy=Math.min(p.vy+1790*dt,880);let y=p.y+p.vy*dt;p.ground=false;
 if(p.vy<0){
  for(const b of s.blocks){
   if(!b.alive||p.x+halfWidth<=b.x||p.x-halfWidth>=b.x+b.w)continue;
   if(previousY-bodyHeight>=b.y+b.h-.1&&y-bodyHeight<=b.y+b.h){
    hitBlock(b);y=b.y+b.h+bodyHeight;p.vy=50;break;
   }
  }
 }else{
  const land=(a,b,top)=>{if(p.x+halfWidth>a&&p.x-halfWidth<b&&previousY<=top+.5&&y>=top){y=top;p.vy=0;p.ground=true}};
  for(const [a,b] of floorRuns)land(a,b,groundY);
  for(const [a,top,w] of bridges)land(a,a+w,top);
  for(const b of s.blocks)if(b.alive)land(b.x,b.x+b.w,b.y);
 }
 p.y=y;
 if(p.y>485){spawn();return}
 for(const [i,sx] of saves.entries())if(i>s.save&&p.x>=sx&&p.ground){s.save=i;message('Checkpoint  •  Side '+(i===1?'B':'C'),2);sound('save')}
 if(p.x>=finish){setMode('win');s.winTime=0;sound('win');callbacks.win?.();return}
 updateEnemies(dt,previousY);
}
function updateEnemies(dt,previousY){
 const s=state,p=s.player;
 for(const e of s.enemies){
  if(e.mode==='gone'||e.mode==='carried')continue;
  if(e.mode==='thrown'){
   e.x+=e.vx*dt;e.vy+=1050*dt;e.y+=e.vy*dt;
   for(const t of s.enemies){
    if(t===e||!['walk','flip'].includes(t.mode)||Math.abs(t.x-e.x)>28||Math.abs(t.y-e.y)>31)continue;
    t.mode='gone';burst(t.x,t.y-16,['#ffe8a5','#ed7192']);s.score+=2;sound('flip');
   }
   if(e.y>=groundY&&onGroundAt(e.x)){e.mode='gone';burst(e.x,groundY-7,['#ffe7aa','#75cdb0'],7)}
   if(e.y>510||e.x<0||e.x>endX)e.mode='gone';
   continue;
  }
  if(e.mode!=='walk')continue;
  const old=e.y;e.clock+=dt;e.phase+=dt*6.5;
  let speed=characteristics[e.type][0];
  if(e.type==='shield')speed*=Math.sin(e.clock*2.4)>.4?2.15:.35;
  e.x+=e.dir*speed*dt;if(e.x<e.lo||e.x>e.hi){e.x=clamp(e.x,e.lo,e.hi);e.dir*=-1}
  e.y=groundY-(e.type==='peach'?Math.pow(Math.max(0,Math.sin(e.clock*3.2)),1.1)*24:0);
  if(Math.abs(p.x-e.x)>24||p.y<e.y-e.height||p.y-(p.duck?duckHeight:playerHeight)>e.y-5)continue;
  if(p.power>0){e.mode='gone';s.score+=2;burst(e.x,e.y-12,['#ffc94d','#69cbb9']);sound('flip');continue}
  if(p.vy>=0&&previousY<=old-e.height+11){
   e.mode='flip';e.y=groundY;p.y=e.y-e.height-1;p.vy=down.has('jump')?-505:-347;p.ground=false;p.coyote=0;
   s.stomps++;s.score+=2;burst(e.x,e.y-28,['#fff1ca','#e15e88']);sound('flip');
   if(s.stomps===1)message('Flipped!  Lift it with X or Lift.',2.4);
  }else if(p.grace<=0){spawn();return}
 }
 if(p.cargo){p.cargo.x=p.x;p.cargo.y=p.y-59}
}
function updateLoot(dt){
 const s=state,p=s.player;
 for(const n of s.notes)if(!n.got&&Math.abs(p.x-n.x)<23&&n.y>p.y-(p.duck?duckHeight:playerHeight)-9&&n.y<p.y+8){
  n.got=true;s.score++;sound('note');burst(n.x,n.y,['#ffdb69','#fff2ba'],5);
 }
 for(const d of s.discs){
  if(d.got)continue;const last=d.y;d.life+=dt;d.x+=d.vx*dt;d.vy+=690*dt;d.y+=d.vy*dt;
  if(d.vy>0){
   let surface=onGroundAt(d.x)?groundY:800;
   for(const b of s.blocks)if(b.alive&&d.x>b.x&&d.x<b.x+b.w&&last+11<=b.y+2)surface=Math.min(surface,b.y);
   if(last+11<=surface+2&&d.y+11>=surface){d.y=surface-11;d.vy=-207}
  }
  if(d.life>.12&&Math.abs(p.x-d.x)<28&&d.y>p.y-(p.duck?duckHeight:playerHeight)-11&&d.y<p.y+8){
   d.got=true;p.power=8;s.score+=5;burst(d.x,d.y,['#ffcf56','#79ddce','#eb5e96'],16);sound('power');message('Encore power  •  8 seconds',1.8);
  }else if(d.y>510)d.got=true;
 }
}
function step(dt,viewWidth=850){
 const s=state;if(!s||!['run','retry','win'].includes(s.mode))return;
 s.time+=dt;
 if(s.toastTime>0&&(s.toastTime-=dt)<=0){s.toast='';callbacks.message?.('')}
 if(s.mode==='win'){s.winTime+=dt;return}
 if(s.mode==='retry'){if((s.retryTime-=dt)<=0)s.mode='run';return}
 updatePlayer(dt);if(s.mode!=='run')return;
 updateLoot(dt);for(const b of s.blocks)b.bump=Math.max(0,b.bump-dt);
 for(const fx of s.particles){fx.x+=fx.vx*dt;fx.y+=fx.vy*dt;fx.vy+=300*dt;fx.life-=dt}
 s.particles=s.particles.filter(f=>f.life>0);
 const goal=clamp(s.player.x-viewWidth*.34,0,endX-viewWidth);
 s.camera+=(goal-s.camera)*(1-Math.exp(-dt*8));
 s.camera=clamp(s.camera,0,Math.max(0,endX-viewWidth));
}
function disc(c,x,y,t,r=13){
 c.save();c.translate(x,y);c.rotate(t*.8);c.fillStyle='#31233d';c.beginPath();c.arc(0,0,r+2,0,tau);c.fill();
 const colors=['#7edcd4','#a59bd8','#e8a7c4','#ffdc84','#f6edba','#8fccc3'];
 colors.forEach((color,i)=>{c.fillStyle=color;c.beginPath();c.moveTo(0,0);c.arc(0,0,r,i*tau/6,(i+1)*tau/6+.01);c.fill()});
 c.strokeStyle='#fff0c58c';c.lineWidth=1;c.beginPath();c.arc(0,0,r*.74,0,tau);c.stroke();c.fillStyle='#42283d';c.beginPath();c.arc(0,0,r*.29,0,tau);c.fill();c.restore();
}
function crate(c,b){
 const x=b.x,y=b.y-Math.sin(b.bump/.2*Math.PI)*4,d=b.kind==='disc';
 c.fillStyle='#34263c';c.fillRect(x,y,36,36);c.fillStyle=b.spent?'#9a7f82':d?'#f6bb57':'#bf7354';c.fillRect(x+2,y+2,32,32);
 c.strokeStyle=b.spent?'#6e5865':d?'#986449':'#754444';c.lineWidth=2;c.strokeRect(x+5,y+5,26,26);
 if(d){disc(c,x+18,y+17,0,b.spent?5:8)}
 else{c.strokeStyle='#713e42';c.lineWidth=5;c.beginPath();c.moveTo(x+6,y+29);c.lineTo(x+29,y+6);c.stroke();c.strokeStyle='#efa46f';c.lineWidth=2;c.stroke()}
 c.fillStyle='#ffe9a9';for(const a of [4,29])c.fillRect(x+a,y+4,2,2);
}
function musicNote(c,x,y){
 c.save();c.translate(x,y);c.fillStyle='#4a2d40';c.fillRect(-1,-10,4,15);c.fillRect(1,-10,6,4);
 c.beginPath();c.ellipse(-3,5,6,4,-.45,0,tau);c.fill();c.fillStyle='#ffdf75';c.fillRect(0,-9,2,13);c.fillRect(2,-9,4,2);c.beginPath();c.ellipse(-3,4,4.3,2.4,-.45,0,tau);c.fill();c.restore();
}
function checkpoint(c,x,active){
 c.save();c.translate(x,groundY);c.fillStyle='#39263d';c.fillRect(-3,-65,6,65);c.fillStyle=active?'#80ceaf':'#b78daf';c.fillRect(-17,-72,34,22);c.strokeStyle='#30283c';c.lineWidth=2;c.strokeRect(-17,-72,34,22);disc(c,0,-61,0,7);c.restore();
}
function draw(c,w,h){
 const s=state;if(!s)return;const cam=Math.round(s.camera),p=s.player,t=s.time;
 RoadArt.drawSky(c,w,h,cam,t,p.x/finish);
 RoadArt.drawTower(c,finish-cam,groundY,t,Math.min(1,s.winTime*1.7));
 for(const [a,b] of floorRuns){const start=Math.max(a,cam-3),end=Math.min(b,cam+w+3);if(end>start)RoadArt.drawRoad(c,start-cam,groundY,end-start,h-groundY,start)}
 for(const [x,y,size] of bridges)if(x+size>cam&&x<cam+w)RoadArt.drawRoad(c,x-cam,y,size,23,x,'ledge');
 c.save();c.translate(-cam,0);const visible=x=>x>cam-52&&x<cam+w+52;
 for(let i=1;i<saves.length;i++)if(visible(saves[i]))checkpoint(c,saves[i],s.save>=i);
 for(const b of s.blocks)if(b.alive&&visible(b.x))crate(c,b);
 for(const n of s.notes)if(!n.got&&visible(n.x))musicNote(c,n.x,n.y+Math.sin(t*3+n.x)*2);
 for(const d of s.discs)if(!d.got&&visible(d.x))disc(c,d.x,d.y,t);
 for(const e of s.enemies)if(!['gone','carried'].includes(e.mode)&&visible(e.x))Cast.drawCritter(c,e.type,e.x,e.y,{facing:e.dir,phase:e.mode==='walk'?e.phase:0,flipped:e.mode!=='walk',time:t});
 const action=s.mode==='win'?'celebrate':p.cargo?'carry':!p.ground?(p.vy<0?'jump':'fall'):Math.abs(p.vx)>12?'run':'idle';
 Cast.drawNige(c,p.x,p.y,{facing:p.face,phase:p.phase,action,ducking:p.duck,powered:p.power>0,invulnerable:p.grace>0,time:t});
 if(p.cargo)Cast.drawCritter(c,p.cargo.type,p.x,p.y-59+(p.duck?15:0),{flipped:true});
 for(const f of s.particles){c.fillStyle=f.color;c.fillRect(f.x,f.y,3.5,3.5)}
 c.restore();
}
globalThis.Highway={reset,step,draw,press,release,setMode,clearInput:()=>down.clear(),get state(){return state},finish,setCallbacks:c=>{callbacks=c}};
})();
