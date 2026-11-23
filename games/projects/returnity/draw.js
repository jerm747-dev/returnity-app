'use strict';
const Art = (() => {
  const M=ReturnityModel;
  const names=['district-0.svg','district-1.svg','district-2.svg','room.svg','listener-0.svg','listener-1.svg','listener-2.svg','listener-3.svg','nigel-actions.webp','nigel-motion.webp'];
  let images={},shadowAtlas,ctx;
  async function load(canvas){
    ctx=canvas.getContext('2d',{alpha:false});
    await Promise.all(names.map(async name=>{
      const img=new Image();img.src=(globalThis.ReturnityAsset||((n)=>'assets/'+n))(name);await img.decode();
      const key=name.split('.')[0];
      if(name.endsWith('.svg')){
        // Paint the static vector set once. Every subsequent camera pan can reuse its pixels.
        const surface=document.createElement('canvas');
        surface.width=img.width;surface.height=img.height;
        surface.getContext('2d').drawImage(img,0,0);
        images[key]=surface;
      }else images[key]=img;
    }));
    const atlas=images['nigel-actions'];shadowAtlas=document.createElement('canvas');shadowAtlas.width=atlas.width;shadowAtlas.height=atlas.height;
    const c=shadowAtlas.getContext('2d');c.drawImage(atlas,0,0);c.globalCompositeOperation='source-atop';c.fillStyle='rgba(48,21,77,.90)';c.fillRect(0,0,atlas.width,atlas.height);
  }
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  function line(x,y,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
  function oval(x,y,w,h,color){ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function cast(name,x,y,h,dir=1){const a=images[name];ctx.save();ctx.translate(x,y);ctx.scale(dir,1);const w=h*a.width/a.height;ctx.drawImage(a,-w/2,-h,w,h);ctx.restore();}
  function pose(frame,x,y,height,dir=1,angle=0,shadow=false){
    const size=height/187;ctx.save();ctx.translate(x,y);ctx.scale(dir,1);
    if(angle){ctx.translate(0,-height*.5);ctx.rotate(angle);ctx.translate(0,height*.5);}
    const sheet=shadow?shadowAtlas:images[frame<22?'nigel-actions':'nigel-motion'];
    const index=frame<22?frame:frame-22;
    ctx.drawImage(sheet,(index%8)*240,Math.floor(index/8)*216,240,216,-112*size,-199*size,240*size,216*size);ctx.restore();
  }
  function disc(x,y,r,t=0){
    oval(x,y,r+1,r+1,'#171627');oval(x,y,r,r,'#b6dadc');ctx.save();ctx.translate(x,y);ctx.rotate(t);
    for(const [at,c] of [[-.8,'#fff5c3'],[1.8,'#ef98ad'],[2.75,'#86b7eb']]){ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,at,at+.7);ctx.fillStyle=c;ctx.fill();}ctx.restore();oval(x,y,Math.max(1.4,r*.26),Math.max(1.4,r*.26),'#242238');
  }
  function platform(a,cam,width){
    const x=a.x-cam,y=a.y;if(x>width+4||x+a.w<0)return;
    ctx.lineJoin='round';ctx.lineCap='round';
    for(const i of [8,a.w-18]){line(x+i,y+4,x+i,y+12,'#413b47',2.2);line(x+i,y+12,x+i+11,y+4,'#413b47',2.2);}
    round(x-1,y,a.w+2,5.6,2.6,'#4c5965','#312e3c',1.3);
    line(x+2,y+.8,x+a.w-2,y+.8,'#e9ce96',1.5);
  }
  function round(x,y,w,h,r,fill,stroke,sw=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}}
  function caseArt(o,cam,t){
    if(o.mode==='broken')return;
    ctx.save();ctx.translate(o.x-cam,o.y-8);if(o.mode==='fly')ctx.rotate(t*12*o.dir);
    round(-3,-8,6,4,1.5,'#464455','#302a37',1.3);round(-9,-6,18,14,2.6,'#446476','#302a37',1.6);
    line(-8,-1,8,-1,'#bec4bf',1.1);round(-2,-2,4,3,1,'#e6b775');ctx.restore();
  }
  function marker(x,y,done,t){
    const dy=done?0:Math.round(Math.sin(t*3)*1.2);
    ctx.save();ctx.translate(x,y+dy);ctx.beginPath();ctx.moveTo(-7,-7);ctx.lineTo(7,-7);ctx.lineTo(7,3);ctx.lineTo(3,3);ctx.lineTo(0,7);ctx.lineTo(-2,3);ctx.lineTo(-7,3);ctx.closePath();ctx.fillStyle=done?'#467768':'#f9cc79';ctx.fill();
    if(done){line(-3,-1,-1,1,'#e3f7c1',2);line(-1,1,3,-4,'#e3f7c1',2);}
    else disc(0,-2,3.5);ctx.restore();
  }
  function player(p,cam,t){
    const x=p.x-cam,ground=p.surface?.y||p.base;oval(x,ground+1,10,2.5,'#141124a6');
    if(p.hold&&p.hold.type!=='case')bad(p.hold,cam,t);
    if(p.inv>0&&Math.floor(p.inv*14)%2===0)return;
    const frame=NigelAnimation.frame(p,t);
    pose(frame,x,p.y,50,p.dir,p.action==='flip'&&!p.hold&&p.act>0?(1-p.act/p.actSpan)*Math.PI*2:0);
    if(p.act>.07&&['jab','cross','kick','dive'].includes(p.action)) {
      const k=p.action==='kick'?0:9;line(x+p.dir*14,p.y-19-k,x+p.dir*25,p.y-21-k,'#f1dca6',1);
    }
  }
  function bad(e,cam,t){
    if(e.mode==='out'&&!e.timer)return;
    const x=e.x-cam,y=e.y,h=e.boss?68:45;
    ctx.save();if(e.mode==='out')ctx.globalAlpha=Math.min(1,e.timer*2.5);
    oval(x,e.base,12,3,'#160e29aa');let frame=1+Math.floor(t*6)%6,rot=0;
    if(e.mode==='tell')frame=21;if(e.mode==='strike')frame=16;if(e.mode==='stun')frame=18;
    if(e.mode==='held'||e.mode==='fly'||e.mode==='out'){frame=11;rot=e.mode==='held'?Math.PI*.7*e.heldTilt:e.mode==='fly'?t*13:1.57;}
    const flame=e.boss?'#e586cd':'#8180be';
    ctx.shadowBlur=e.boss?5:2;ctx.shadowColor=flame;pose(frame,x,y,h,e.dir,rot,true);ctx.shadowBlur=0;
    if(!['held','fly','out'].includes(e.mode)){rect(x+e.dir*4,y-h*.78,3,1.6,e.mode==='tell'?'#fff2c4':'#ff84ad');}
    if(e.mode==='tell'){rect(x-1,y-h-9,2,4,'#ffbf5c');rect(x-1,y-h-4,2,1,'#ffbf5c');}
    if(e.flash>0){line(x-9,y-h*.5-6,x+10,y-h*.5+5,'#fff4c9',2);}
    ctx.restore();
  }
  function pickupSnack(d,t,cam){if(d.used)return;const x=d.x-cam,y=d.base-4+Math.sin(t*3)*1.1;rect(x-5,y-5,10,10,'#321d30');rect(x-4,y-4,8,8,'#a24d59');rect(x-1,y-3,2,6,'#fff1ca');rect(x-3,y-1,6,2,'#fff1ca');}
  function fx(s,cam){
    for(const d of s.shots){const sign=Math.sign(d.vx);oval(d.x-cam-sign*5,d.y,6,2,'#ee5d3e');oval(d.x-cam,d.y,4,3,'#ffc856');rect(d.x-cam-1,d.y-1,3,2,'#fff6ca');}
    for(const e of s.effects){
      const r=e.t/.38;ctx.globalAlpha=1-r;const x=e.x-cam,y=e.y;
      if(e.kind==='slam'){ctx.strokeStyle='#ffc260';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,3+47*r,2+7*r,0,0,7);ctx.stroke();}
      else for(let i=0;i<7;i++){const theta=i*.898+.24,rr=3+r*19;rect(x+Math.cos(theta)*rr,y+Math.sin(theta)*rr,2,2,e.kind==='note'?'#9ce1ce':'#ffda88');}
      ctx.globalAlpha=1;
    }
    if(s.backup>0){const time=.92-s.backup;
      for(const side of [0,1]){let x=side?s.view.width-14:14;const y=218;
        ctx.globalAlpha=Math.min(1,s.backup*4);pose(21,x+(side?3:-3),y-8,38,side?-1:1,0,true);rect(x-10,y-18,20,21,'#111526');rect(x-8,y-16,16,17,'#5b506d');oval(x,y-7,6,6,'#101422');oval(x,y-7,3,3,'#b27970');
        for(let j=0;j<3;j++){const r=Math.max(0,time*380-j*29);if(r<=0)continue;ctx.strokeStyle=j%2?'#ffda9e':'#f19261';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-7,r,side?Math.PI*.6:-Math.PI*.4,side?Math.PI*1.4:Math.PI*.4);ctx.stroke();}}
      ctx.globalAlpha=1;
    }
  }
  function drawClubRail(cam,width){
    if(cam+width<1910)return;
    for(const base of [1923,2071]){const x=base-cam;round(x,207,59,2.5,1,'#696477','#393542',1);for(let i=0;i<=54;i+=18)round(x+i,202,2.3,15,1,'#88838c','#393542',.8);}
  }
  function drawTraffic(cam,t,width){
    const x=2430-((t*49+450)%2860)-cam;if(x<-95||x>width+100)return;
    ctx.save();ctx.translate(x,265);ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(-45,-7);ctx.quadraticCurveTo(-45,-13,-35,-14);ctx.lineTo(-24,-15);ctx.quadraticCurveTo(-14,-28,2,-28);ctx.lineTo(17,-27);ctx.lineTo(30,-16);ctx.quadraticCurveTo(44,-15,45,-10);ctx.lineTo(44,-3);ctx.lineTo(-43,-3);ctx.closePath();ctx.fillStyle='#596580';ctx.fill();ctx.strokeStyle='#38303f';ctx.lineWidth=1.6;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-20,-16);ctx.quadraticCurveTo(-12,-25,1,-25);ctx.lineTo(15,-24);ctx.lineTo(23,-16);ctx.closePath();ctx.fillStyle='#a5abbc';ctx.fill();line(5,-24,6,-16,'#464155',1.2);
    for(const i of [-28,28]){oval(i,-4,7.4,7.4,'#302c39');oval(i,-4,5.4,5.4,'#c9c8cc');oval(i,-4,4.1,4.1,'#646576');for(let j=0;j<5;j++){const angle=t*3+j*Math.PI*.4;line(i,-4,i+4*Math.cos(angle),-4+4*Math.sin(angle),'#d1cdd0',.9);}oval(i,-4,1.4,1.4,'#c5c4cc');}
    round(-44,-11,7,2.5,1,'#ebc57b');round(39,-10,5,2,1,'#b56c70');ctx.restore();
  }
  function draw(s){
    if(!shadowAtlas)return;
    ctx.save();ctx.setTransform(ctx.canvas.width/s.view.width,0,0,ctx.canvas.height/s.view.height,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='medium';
    const {width,height}=s.view,top=Math.round(s.cameraY);
    ctx.fillStyle=s.scene==='street'?'#11182f':'#141a2d';ctx.fillRect(0,0,width,height);
    ctx.translate(0,-top);
    if(s.shake>0)ctx.translate(Math.round(Math.sin(s.clock*95)*s.shake*5),Math.round(Math.cos(s.clock*80)*s.shake*4));
    const cam=Math.round(s.camera),t=s.clock;
    if(s.scene==='street'){
      ctx.fillStyle='#777caa';ctx.fillRect(0,top,width,height);
      if(top+height>328){ctx.fillStyle='#797981';ctx.fillRect(0,328,width,top+height-328);}
      for(let i=0;i<3;i++){const x=i*720-cam;if(x<=width&&x+720>=0)ctx.drawImage(images['district-'+i],x,-110,720.1,438);}
      drawTraffic(cam,t,width);drawClubRail(cam,width);
      for(const a of M.ledges)platform(a,cam,width);
      for(const d of s.discs)if(!d.taken){const y=d.y+Math.sin(t*4+d.x)*2;oval(d.x-cam,y,9,9,'#e2c28b25');disc(d.x-cam,y,6,t*2);}
      for(const n of s.contacts){const x=n.x-cam;if(x<-35||x>width+35)continue;const id=Number(n.art.slice(-1));const dir=n.given||id%2===1?-1:1;oval(x,227,10,1.7,'#514d5c');cast('listener-'+id,x,226,41,dir);marker(x,177,n.given,t);}
      for(const [x,id,dir] of [[105,1,-1],[472,3,1],[1108,0,1],[1588,1,-1],[1947,3,-1],[1979,1,1],[2082,2,-1]]){
        if(x<cam-46||x>cam+width+46)continue;
        const passing=id===2||x===1588,phase=(t+(x%17))*.30;
        const drift=passing?Math.sin(phase)*13:0;
        cast('listener-'+id,x+drift-cam,218,37+Math.sin(t*(passing?2.5:1.4)+x)*.44,passing?(Math.cos(phase)>0?1:-1):dir);
      }
      for(const o of s.cases)if(o.mode!=='held')caseArt(o,cam,t);
      for(const e of s.enemies)if(e.mode!=='held')bad(e,cam,t);player(s.p,cam,t);
    }else{
      ctx.fillStyle='#302e40';ctx.fillRect(0,top,width,height);if(top+height>328){ctx.fillStyle='#8f8c93';ctx.fillRect(0,328,width,top+height-328);}ctx.drawImage(images.room,-cam,-110,480,438);
      for(const d of s.drops)pickupSnack(d,t,cam);
      const objects=[...s.cases.filter(c=>c.mode!=='held').map(o=>({depth:o.base,f:()=>caseArt(o,cam,t)})),...s.enemies.filter(e=>e.mode!=='held').map(e=>({depth:e.base,f:()=>bad(e,cam,t)})),{depth:s.p.base,f:()=>player(s.p,cam,t)}];
      objects.sort((a,b)=>a.depth-b.depth).forEach(o=>o.f());if(s.wave===3)marker(240-cam,155,false,t);
    }
    if(s.p.hold?.type==='case')caseArt(s.p.hold,cam,t);
    fx(s,cam);ctx.restore();
  }
  return {load,draw};
})();
