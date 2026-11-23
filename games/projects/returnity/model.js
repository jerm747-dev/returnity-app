// Coordinates use a 480 × 270 game field. All simulation times are seconds.
(function (root) {
  'use strict';
  const W = 480, H = 270, FLOOR = 226, LENGTH = 2160, DOOR = 2040;
  const animation = typeof module === 'object' && module.exports ? require('./animation.js') : root.NigelAnimation;
  const motionState = () => ({actSpan:0, preJump:0, jumpAge:1, landing:0, stride:0, moving:false,
    laneDelta:0, laneDominant:false, contact:null, crouchTime:0, liftAge:0, liftOrigin:null, releasing:false});
  const tune = { walk: 91, run: 137, accel: 450, brake: 485, gravity: 520, jump: 227, doubleJump: 211, coyote: .095, buffer: .13 };
  const ledges = [
    [136,198,67],[222,165,86],[343,188,65],[514,193,82],[625,164,90],
    [753,139,80],[894,183,100],[1050,196,72],[1150,163,96],[1280,132,95],
    [1430,172,100],[1570,197,86],[1692,166,82],[1810,140,94]
  ].map(([x,y,w]) => ({x,y,w}));
  const discs = [[250,146],[781,120],[1316,113]];
  const contacts = [[448,'fan-0'],[1018,'fan-1'],[1551,'fan-2']];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const approach = (v,to,by) => Math.abs(v-to)<by ? to : v+Math.sign(to-v)*by;
  function body(x,base=FLOOR) { return {x,base,y:base,vx:0,vy:0,dir:1}; }
  function enemy(x,base,boss=false) { return {...body(x,base),type:'echo',hp:boss?14:3,maxHp:boss?14:3,boss,mode:'walk',timer:.45,flash:0,cycle:0,home:x}; }
  const crate = (x,base=FLOOR) => ({...body(x,base),type:'case',mode:'rest',timer:0,dir:1});
  function init() {
    return {scene:'street',p:{...body(67),...motionState(),on:true,air:1,hp:6,inv:0,action:'idle',act:0,combo:0,comboTime:0,shot:0,hold:null,skid:0,sprint:0,coyote:tune.coyote,buffer:0,ignore:null},
      camera:0,cameraY:0,view:{width:W,height:H,thumbs:false},clock:0,delivered:0,bag:0,special:1,score:0,wave:0,waveWait:0,completed:false,down:false,
      discs:discs.map(([x,y])=>({x,y,taken:false})),contacts:contacts.map(([x,art])=>({x,art,given:false})),
      enemies:[enemy(630,FLOOR),enemy(1380,FLOOR)],cases:[crate(330),crate(675),crate(1220),crate(1720)],
      shots:[],effects:[],drops:[],backup:0,shake:0,events:[],message:'',msgTime:0,holdTime:0,holdUsed:false,checkpoint:null};
  }
  function emit(s,type,value) { s.events.push({type,value}); }
  function notice(s,msg,time=2.3) { s.message=msg;s.msgTime=time; }
  function burst(s,x,y,kind='hit') { s.effects.push({x,y,kind,t:0}); }
  function sound(s,id) { emit(s,'sound',id); }
  function act(p,id,t) { p.action=id;p.act=t;p.actSpan=t;p.contact=null; }
  function followCamera(s,dt=Infinity) {
    const view=s.view, bounds=s.scene==='street'?LENGTH:W;
    const goalX=clamp(s.p.x-view.width*(s.scene==='street'?.42:.5),0,Math.max(0,bounds-view.width));
    // Keep the landing surface in frame until a high jump needs more headroom.
    const extraFloor=view.thumbs?22:clamp((view.height-H)*.32,0,20);
    const bottom=Math.max(H+extraFloor,FLOOR+view.height*(view.reserve||.18));
    const goalY=clamp(s.p.y-view.height*(view.thumbs?.57:.62),
      Math.min(-26,bottom-view.height),bottom-view.height);
    s.camera=approach(s.camera,goalX,Math.max(180,Math.abs(s.p.vx)*1.5)*dt);
    s.cameraY=approach(s.cameraY,goalY,Math.max(130,Math.abs(s.p.vy))*dt);
  }
  function setView(s,width,height,thumbs=false,reserve=.18) {
    s.view={width,height,thumbs,reserve};
    followCamera(s);
  }
  function enterClub(s) {
    s.scene='club'; s.camera=0;s.enemies=[];s.cases=[crate(95,219),crate(402,213)];s.shots=[];s.effects=[];s.drops=[];
    const p=s.p;Object.assign(p,body(62,216),motionState(),{action:'idle',on:true,air:1,hp:6,hold:null,act:0,inv:.75,ignore:null,buffer:0});
    s.wave=0;s.waveWait=.65;s.shake=0;s.backup=0;s.holdTime=0;s.holdUsed=true;
    followCamera(s);s.checkpoint={special:s.special,score:s.score};emit(s,'panel','venue');
  }
  function retry(s) {
    if (s.scene==='club'&&s.checkpoint) {
      const snap={...s.checkpoint};s.score=snap.score;s.special=snap.special;s.down=false;enterClub(s);return;
    }
    const view=s.view;Object.assign(s,init());setView(s,view.width,view.height,view.thumbs,view.reserve);emit(s,'panel','street');
  }
  const alive=e=>e.hp>0&&e.mode!=='out';
  function wave(s) {
    s.wave++;s.waveWait=0;
    if(s.wave===1){s.enemies.push(enemy(5,192),enemy(472,230));notice(s,'Clear the floor',1.6);}
    if(s.wave===2){s.enemies.push(enemy(s.p.x<240?440:40,203,true));notice(s,'Face FEAR',1.6);sound(s,'boss');}
    if(s.wave===3){s.enemies=[];notice(s,'Take the mic at center stage',6);sound(s,'clear');}
  }
  function nearContact(s) { return s.scene==='street'&&s.contacts.find(n=>!n.given&&Math.abs(n.x-s.p.x)<29 && s.p.y>201); }
  function atDoor(s) {return s.scene==='street'&&Math.abs(s.p.x-DOOR)<36&&s.p.y>196;}
  function atMic(s) {return s.scene==='club'&&s.wave===3&&Math.abs(s.p.x-240)<36&&s.p.base<=207&&s.p.on;}
  function interact(s) {
    const p=s.p,n=nearContact(s);
    if(atMic(s)){s.completed=true;s.score+=1000;sound(s,'win');emit(s,'panel','win');return true;}
    if(atDoor(s)){
      if(s.delivered===3){enterClub(s);return true;}
      notice(s,'Open mic • deliver all 3 CDs first'); return true;
    }
    if(!n)return false;
    if(!s.bag){notice(s,'Find a silver CD on the platforms');return true;}
    s.bag--;s.delivered++;n.given=true;s.score+=250;act(p,'handoff',.34);burst(s,n.x,FLOOR-30,'note');sound(s,'handoff');
    notice(s,s.delivered===3?'All CDs delivered • head to the open mic':'CD delivered  '+s.delivered+' / 3');return true;
  }
  function damage(s,e,amount,dir) {
    if(!alive(e)||e.mode==='held')return;
    e.hp=Math.max(0,e.hp-amount);e.vx=dir*(e.boss?46:83);e.flash=.1;e.cycle++;
    burst(s,e.x,e.y-(e.boss?27:19));s.shake=Math.max(s.shake,.12);sound(s,'hit');
    if(e.hp===0){
      e.mode='out';e.timer=.52;s.score+=e.boss?1200:125;
      if(!e.boss&&s.scene==='club')s.drops.push({x:e.x,base:e.base,t:0,used:false});
    } else {e.mode='stun';e.timer=e.boss?.39:.61;}
  }
  function releaseHeld(s) {
    const p=s.p,o=p.hold;
    if(!o)return;
    p.hold=null;p.releasing=false;p.liftOrigin=null;o.mode='fly';o.base=p.base;
    o.vx=p.dir*211;o.vy=-126;o.timer=1.15;o.dir=p.dir;o.hits=new Set();sound(s,'throw');
  }
  function toss(s) {
    const p=s.p,o=p.hold;if(!o)return false;
    if(!p.releasing){p.releasing=true;act(p,o.type==='case'?'caseThrow':'flipThrow',.32);}
    return true;
  }
  function grab(s) {
    const p=s.p;if(!p.on||p.hold)return false;
    const possible=[...s.enemies.filter(e=>alive(e)&&e.mode!=='fly'&&(!e.boss||e.mode==='stun')),...s.cases.filter(c=>c.mode==='rest')];
    const o=possible.filter(o=>Math.abs(o.x-p.x)<33&&Math.abs(o.y-p.y)<25&&Math.abs(o.base-p.base)<17).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    if(!o)return false;
    p.dir=Math.sign(o.x-p.x)||p.dir;
    p.liftOrigin={x:o.x,y:o.y};p.liftAge=0;p.releasing=false;
    o.mode='held';o.vx=o.vy=0;p.hold=o;act(p,o.type==='case'?'liftCase':'grapple',animation.liftTime);sound(s,'lift');
    notice(s,o.type==='case'?'Case lifted • strike to throw':'Grappled • strike to flip',1.25);return true;
  }
  function melee(s) {
    const p=s.p;
    if(toss(s)||interact(s))return;
    if(p.act>.11&&['jab','cross','kick','dive'].includes(p.action))return;
    const air=!p.on,combo=p.comboTime>0?p.combo%3:0;
    const name=air?'dive':['jab','cross','kick'][combo];
    p.combo=combo+1;p.comboTime=.6;act(p,name,air?.3:.21);
    if(air){p.vx=p.dir*178;p.vy=Math.min(p.vy+32,135);}
    p.contact=air?'dive':name;
    sound(s,combo===2?'kick':'swing');
  }
  function strikeContact(s,name) {
    const p=s.p,air=name==='dive',kick=name==='kick';
    for(const e of s.enemies) {
      const dx=(e.x-p.x)*p.dir;
      if(alive(e)&&e.mode!=='fly'&&dx>-9&&dx<(air?49:kick?48:40)&&Math.abs(e.y-p.y)<35&&Math.abs(e.base-p.base)<18)
        damage(s,e,air||kick?2:1,p.dir);
    }
  }
  function projectile(s) {
    const p=s.p;if(toss(s)||p.shot>0)return;
    p.shot=.42;act(p,'fire',.24);p.contact='fire';
  }
  function special(s) {
    if(!s.special){notice(s,'Backup used');return;}
    const targets=s.enemies.filter(e=>alive(e)&&e.mode!=='held'&&e.x>=s.camera-12&&e.x<=s.camera+s.view.width+12);
    if(!targets.length){notice(s,'Call backup when enemies are on screen');return;}
    s.special--;s.backup=.92;s.shake=.29;sound(s,'backup');if(s.p.hold)releaseHeld(s);act(s.p,'backup',.38);
    for(const e of targets)damage(s,e,e.boss?5:e.hp,Math.sign(e.x-s.p.x)||1);
    notice(s,'BACKUP • SOUND CREW',1.35);
  }
  function hurt(s,dir) {
    const p=s.p;if(p.inv>0||s.completed||s.down)return;
    if(p.hold)releaseHeld(s);p.preJump=0;p.hp=Math.max(0,p.hp-1);p.inv=1.12;p.vx=dir*90;act(p,'hurt',.23);s.shake=.16;sound(s,'hurt');
    if(!p.hp){s.down=true;emit(s,'panel','down');}
  }
  function flight(s,o,dt) {
    o.timer-=dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.vy+=tune.gravity*dt;
    for(const e of s.enemies)if(e!==o&&alive(e)&&!o.hits.has(e)&&Math.abs(e.x-o.x)<22&&Math.abs(e.y-16-o.y)<25&&Math.abs(e.base-o.base)<19){
      o.hits.add(e);damage(s,e,3,o.dir);
    }
    if((o.y>=o.base&&o.vy>=0)||o.timer<=0||o.x<6||o.x>(s.scene==='street'?LENGTH:W)-6){
      o.x=clamp(o.x,8,(s.scene==='street'?LENGTH:W)-8);o.y=o.base;o.vx=o.vy=0;
      if(o.type==='case'){o.mode='broken';s.score+=25;}
      else {o.mode='stun';damage(s,o,3,o.dir);}
      burst(s,o.x,o.base-4,'slam');sound(s,'slam');
    }
  }
  function enemies(s,dt) {
    const p=s.p;
    for(const e of s.enemies){
      e.flash=Math.max(0,e.flash-dt);
      if(e.mode==='held')continue;
      if(e.mode==='fly'){flight(s,e,dt);continue;}
      if(e.mode==='out'){e.timer=Math.max(0,e.timer-dt);continue;}
      if(s.scene==='street'&&Math.abs(e.x-p.x)>184)continue;
      e.timer-=dt;e.dir=Math.sign(p.x-e.x)||e.dir;
      if(e.mode==='stun'){e.x+=e.vx*dt;e.vx=approach(e.vx,0,260*dt);if(e.timer<=0){e.mode='walk';e.timer=.34;}continue;}
      if(e.mode==='tell'){if(e.timer<=0){e.mode='strike';e.timer=.22;if(Math.abs(p.x-e.x)<(e.boss?46:32)&&Math.abs(p.base-e.base)<15&&p.base-p.y<26)hurt(s,e.dir);}continue;}
      if(e.mode==='strike'){if(e.timer<=0){e.mode='walk';e.timer=e.boss?.52:.79;}continue;}
      const dx=p.x-e.x,dy=p.base-e.base,speed=e.boss?50:(s.scene==='club'?42:30);
      if(Math.abs(dx)>22)e.x+=Math.sign(dx)*Math.min(Math.abs(dx),speed*dt);
      if(s.scene==='club'){if(Math.abs(dy)>1)e.base+=Math.sign(dy)*Math.min(Math.abs(dy),29*dt);e.base=clamp(e.base,173,244);}
      e.y=e.base;
      if(Math.abs(dx)<(e.boss?41:29)&&Math.abs(dy)<14&&e.timer<=0){e.mode='tell';e.timer=e.boss?.5:.58;}
    }
  }
  function launch(s,first) {
    const p=s.p;
    p.vy=-(first?tune.jump:tune.doubleJump);p.on=false;p.coyote=0;p.landing=0;p.jumpAge=0;
    if(!first)p.air--;
    p.surface=null;
    if(!p.releasing)act(p,first?'rise':'flip',first?.13:.34);
    sound(s,first?'jump':'flip');
  }
  function move(s,i,dt) {
    const p=s.p,street=s.scene==='street',axis=(i.right?1:0)-(i.left?1:0),lane=(i.down?1:0)-(i.up?1:0);
    const lastX=p.x,lastBase=p.base;
    p.jumpAge+=dt;if(p.hold)p.liftAge+=dt;
    for(const key of ['act','inv','shot','comboTime','skid','buffer','coyote','landing'])p[key]=Math.max(0,p[key]-dt);
    if(p.on)p.coyote=tune.coyote;
    if(i.jumpPress)p.buffer=tune.buffer;
    if(i.upPress&&(atDoor(s)||atMic(s))){if(interact(s))return;}
    if(i.strikePress){s.holdTime=0;s.holdUsed=false;if(p.hold){toss(s);s.holdUsed=true;}
      else if((nearContact(s)||atDoor(s)||atMic(s))&&interact(s)){s.holdUsed=true;return;}}
    if(i.strike){s.holdTime+=dt;if(!s.holdUsed&&s.holdTime>=.215&&grab(s))s.holdUsed=true;}
    if(i.strikeRelease&&!s.holdUsed){melee(s);s.holdUsed=true;}
    if(i.shotPress)projectile(s);
    if(i.specialPress)special(s);
    if(axis&&Math.sign(p.vx)===axis)p.sprint+=dt;else p.sprint=0;
    if(p.on&&Math.abs(p.vx)>61&&axis!==Math.sign(p.vx))p.skid=.13;
    if(axis&&!(p.hold&&(p.liftAge<animation.liftTime||p.releasing)))p.dir=axis;
    const crouch=street&&p.on&&i.down;
    let speed=(p.sprint>.38?tune.run:tune.walk)*(street?1:.72)*(p.hold?.76:1);
    if(crouch)speed=23;
    p.crouchTime=crouch?p.crouchTime+dt:0;
    if(p.hold&&p.liftAge<animation.liftTime*.65)speed=0;
    const locked=p.act>0&&['hurt','dive','pound'].includes(p.action);
    if(!locked)p.vx=approach(p.vx,axis*speed,(axis?tune.accel:tune.brake)*dt);
    p.x=clamp(p.x+p.vx*dt,12,(street?LENGTH:W)-12);
    if(!street&&p.on){p.base=clamp(p.base+lane*68*dt,174,245);p.y=p.base;}
    if(p.hold&&!p.releasing&&p.liftAge<.10){
      const grip=p.hold.type==='case'?13:17;
      p.x=clamp(approach(p.x,p.liftOrigin.x-p.dir*grip,230*dt),12,(street?LENGTH:W)-12);
    }
    const dx=p.x-lastX;
    p.laneDelta=p.base-lastBase;p.laneDominant=Math.abs(p.laneDelta)>Math.abs(dx);
    const travelled=Math.hypot(dx,p.laneDelta);
    p.moving=travelled>dt*3;
    if(p.on)p.stride=(p.stride+travelled/(p.sprint>.38?43:35))%1;
    if(p.preJump>0){
      p.preJump=Math.max(0,p.preJump-dt);
      if(!p.preJump)launch(s,true);
    } else if(p.buffer>0&&street&&i.down&&p.on&&p.surface){p.ignore=p.surface;p.surface=null;p.on=false;p.coyote=0;p.buffer=0;p.y+=2;}
    else if(p.buffer>0&&(p.coyote>0||p.air>0)&&p.action!=='pound'){
      const first=p.coyote>0;p.buffer=0;
      if(first&&p.on){p.preJump=.045;p.landing=0;}else launch(s,first);
    }
    if(i.downPress&&!p.on&&p.act>=0&&p.base-p.y>13){p.vy=300;p.vx*=.36;act(p,'pound',1);sound(s,'dive');}
    const prev=p.y;p.vy+=tune.gravity*dt;p.y+=p.vy*dt;
    let ground=street?FLOOR:p.base,surface=null;
    if(street&&p.vy>=0){
      for(const a of ledges){if(a!==p.ignore&&p.x>a.x-3&&p.x<a.x+a.w+3&&prev<=a.y+.5&&p.y>=a.y&&a.y<ground){ground=a.y;surface=a;}}
      if(p.ignore&&p.y>p.ignore.y+5)p.ignore=null;
    }
    if(p.y>=ground&&p.vy>=0){const pound=p.action==='pound'&&!p.on;if(!p.on){p.landing=animation.landingTime;if(['rise','flip','dive','pound'].includes(p.action))p.act=0;}p.y=ground;p.vy=0;p.on=true;p.surface=surface;p.air=1;
      if(pound){burst(s,p.x,p.y,'slam');s.shake=.23;sound(s,'slam');
        for(const e of s.enemies)if(alive(e)&&Math.abs(e.x-p.x)<54&&Math.abs(e.y-p.y)<32&&Math.abs(e.base-p.base)<22)damage(s,e,3,Math.sign(e.x-p.x)||1);}
    }else p.on=false;
    if(p.act<=0)p.action=p.hold?'grab':!p.on?(p.vy<0?'rise':'fall'):crouch?'crouch':p.skid?'skid':Math.abs(p.vx)>8?'run':'idle';
  }
  function collectPose(p) {
    if(!p.hold&&!p.preJump&&(p.act<=0||p.action==='rise'))act(p,'collect',.23);
  }
  function step(s,i,dt) {
    if(s.down||s.completed)return;
    s.clock+=dt;s.msgTime=Math.max(0,s.msgTime-dt);s.shake=Math.max(0,s.shake-dt);s.backup=Math.max(0,s.backup-dt);
    const before=s.scene;move(s,i,dt);if(s.scene!==before||s.completed)return;
    const p=s.p;
    if(p.hold){
      animation.attach(p,s.clock);
      if(p.releasing&&(p.action!=='caseThrow'&&p.action!=='flipThrow'||1-p.act/p.actSpan>=(p.action==='flipThrow'?2/3:.5)))releaseHeld(s);
    }
    if(p.contact&&1-p.act/p.actSpan>=(p.contact==='fire'?.50:p.contact==='kick'?1/3:.40)){
      if(p.contact==='fire'){
        s.shots.push({x:p.x+p.dir*20,y:p.y-26,base:p.base,vx:p.dir*228,t:1.6});sound(s,'fire');
      }else strikeContact(s,p.contact);
      p.contact=null;
    }
    enemies(s,dt);if(s.down)return;
    for(const o of s.cases)if(o.mode==='fly')flight(s,o,dt);
    for(const d of s.shots){
      d.t-=dt;d.x+=d.vx*dt;
      for(const e of s.enemies)if(d.t>0&&alive(e)&&e.mode!=='held'&&e.mode!=='fly'&&Math.abs(d.x-e.x)<14&&Math.abs(d.y-(e.y-19))<24&&Math.abs(d.base-e.base)<17){
        damage(s,e,1,Math.sign(d.vx));d.t=0;
      }
    }
    s.shots=s.shots.filter(d=>d.t>0);
    for(const d of s.drops){d.t+=dt;if(!d.used&&p.hp<6&&Math.abs(d.x-p.x)<16&&Math.abs(d.base-p.y)<18){p.hp++;d.used=true;collectPose(p);sound(s,'heal');}}
    for(const fx of s.effects)fx.t+=dt;s.effects=s.effects.filter(e=>e.t<.38);
    if(s.scene==='street'){
      for(const cd of s.discs)if(!cd.taken&&Math.abs(cd.x-p.x)<17&&Math.abs(cd.y-(p.y-17))<24){
        cd.taken=true;collectPose(p);s.bag++;s.score+=100;sound(s,'collect');burst(s,cd.x,cd.y,'note');notice(s,'CD collected • find a marked listener',1.8);
      }
    }else if(s.wave<3&&!s.enemies.some(alive)){
      if(s.waveWait<=0)s.waveWait=.8;s.waveWait-=dt;if(s.waveWait<=0)wave(s);
    }
    followCamera(s,dt);
  }
  const api={W,H,FLOOR,LENGTH,DOOR,tune,ledges,init,retry,step,setView,nearContact,atDoor,atMic,alive};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReturnityModel=api;
})(globalThis);
