/* Image-based street renderer; source atlases remain editable and unmodified. */
(() => {
'use strict';
const images={};
const files={street:'street-day.png',pedestrians:'pedestrians-atlas.png',...Object.fromEntries(Object.entries(SpriteData).map(([k,v])=>[k,v.file]))};
function load(){return Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{
 const image=new Image();image.onload=()=>{images[key]=image;resolve()};image.onerror=()=>reject(new Error('Could not load '+file));image.src='assets/'+file;
})));}
function crop(ctx,key,rect,x,y,w,h){ctx.drawImage(images[key],...rect,x,y,w,h)}
function player(ctx,p,time){
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.facing,1);
 if(p.flip){
  const f=SpriteData.tuck.frame,w=91,h=104;
  ctx.translate(0,-67);ctx.rotate(p.flipAngle);
  crop(ctx,'tuck',f,-w/2,-h/2,w,h);
 }else if(!p.grounded){
  const f=SpriteData.jump.frame,h=112,w=f[2]/f[3]*h;
  ctx.rotate(p.vy>100?.055:0);crop(ctx,'jump',f,-w*.48,-h,w,h);
 }else if(Math.abs(p.vx)>9&&!p.duck){
  const key=Math.abs(p.vx)>215?'run':'walk',index=Math.floor(p.phase*16)%16;
  const f=SpriteData[key].frames[index],scale=128/291;
  const cell=images[key].width/4,col=index%4;
  const anchor=(col+.5)*cell-f[0];
  crop(ctx,key,f,-anchor*scale,-f[3]*scale,f[2]*scale,f[3]*scale);
 }else if(p.duck){
  const f=SpriteData.tuck.frame,h=88,w=f[2]/f[3]*h;
  crop(ctx,'tuck',f,-w*.5,-h,w,h);
 }else{
  const f=SpriteData.idle.frame,h=128-(p.land>0?4:0),w=f[2]/f[3]*h;
  crop(ctx,'idle',f,-w*.5,-h,w,h);
 }
 ctx.restore();
}
function pedestrian(ctx,npc,frozen=false){
 const frame=frozen?0:Math.floor(npc.phase)%4;
 ctx.save();ctx.translate(npc.x,npc.y);ctx.scale(npc.dir,1);
 const scale=126/212;
 crop(ctx,'pedestrians',[frame*192,npc.type*224,192,224],-96*scale,-212*scale,192*scale,224*scale);
 ctx.restore();
}
function portrait(ctx,who,npcType=1){
 ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
 const w=ctx.canvas.width,h=ctx.canvas.height;
 ctx.fillStyle=who==='nige'?'#1b4038':'#353b47';ctx.fillRect(0,0,w,h);
 if(who==='nige'){
  const f=SpriteData.walk.frames[0];crop(ctx,'walk',[f[0]+30,f[1],85,105],w*.05,0,w*.95,h*1.22);
 }else{crop(ctx,'pedestrians',[npcType?67:74,npcType*224+8,63,78],0,0,w,h*1.08)}
}
function rounded(ctx,x,y,w,h,r=4){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function wood(ctx,p){
 const h=32;
 ctx.save();ctx.translate(p.x,p.y);
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ba8850');g.addColorStop(1,'#745138');
 rounded(ctx,0,0,p.w,h,3);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#422e27';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#d3b078';ctx.fillRect(1,0,p.w-2,4);
 ctx.strokeStyle='#5a3c2d';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(1,15);ctx.lineTo(p.w-1,15);ctx.stroke();
 for(const x of [7,p.w-13]){ctx.fillStyle='#454340';ctx.fillRect(x,3,6,h-5);ctx.fillStyle='#b9a57a';ctx.fillRect(x+2,6,2,2);ctx.fillRect(x+2,24,2,2)}
 ctx.restore();
}
function render(ctx,s,w,h){
 const cam=s.camera;
 ctx.fillStyle='#b5d6e3';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(-cam.x,-cam.y);
 ctx.drawImage(images.street,0,0,1672,941);
 for(const p of s.platforms){
  if(p.kind==='wood')wood(ctx,p);
  else {
   ctx.fillStyle='#ffe9a36b';ctx.fillRect(p.x,p.y-2,p.w,3);
   ctx.fillStyle='#67472977';ctx.fillRect(p.x,p.y+1,p.w,2);
  }
 }
 for(const b of s.blocks){
  ctx.save();if(b.used)ctx.filter='saturate(.32) brightness(.82)';
  const f=SpriteData.gold.frame,dy=b.bump>0?Math.sin(b.bump/.24*Math.PI)*7:0;
  crop(ctx,'gold',f,b.x,b.y-dy,b.w,b.h);ctx.restore();
  if(!b.used){const shine=Math.sin(s.time*2.4+b.x)*.5+.5;ctx.fillStyle='rgba(255,246,199,'+(shine*.8)+')';ctx.fillRect(b.x+5,b.y+4,11,2);}
 }
 for(const npc of s.walkers){
  ctx.fillStyle='#27363025';ctx.beginPath();ctx.ellipse(npc.x,npc.y+1,22,4,0,0,Math.PI*2);ctx.fill();
  pedestrian(ctx,npc,s.encounter.status==='talking'&&npc.id===s.encounter.partner);
  if(s.encounter.status==='available'&&npc.id===s.encounter.partner){
   const x=npc.x,y=npc.y-151+Math.sin(s.time*2.5)*2;
   rounded(ctx,x-17,y-13,34,23,8);ctx.fillStyle='#fbebc7';ctx.fill();ctx.strokeStyle='#755c39';ctx.lineWidth=1.2;ctx.stroke();
   ctx.fillStyle='#4e4a38';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(x+i*6,y-2,1.5,0,Math.PI*2);ctx.fill()}
  }
 }
 const p=s.player;
 if(p.grounded){ctx.fillStyle='#1b242c30';ctx.beginPath();ctx.ellipse(p.x,p.y+1,24,4,0,0,Math.PI*2);ctx.fill()}
 player(ctx,p,s.time);
 for(const a of s.particles){ctx.globalAlpha=Math.min(1,a.life*2);ctx.fillStyle='#ffe58a';ctx.font='bold 18px Georgia';ctx.fillText('♪',a.x,a.y)}ctx.globalAlpha=1;
 // Quiet end-of-block sign; reaching it never interrupts exploration.
 ctx.fillStyle='#29473c';rounded(ctx,1500,718,138,30,3);ctx.fill();ctx.fillStyle='#ffedc4';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('END OF THE BLOCK  →',1569,737);ctx.textAlign='start';
 ctx.restore();
}
globalThis.StreetArt={load,render,portrait};
})();
