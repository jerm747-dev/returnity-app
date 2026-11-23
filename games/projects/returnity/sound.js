'use strict';
// A small original instrumental and action cues. Sound starts on a player gesture.
const Sound=(()=>{
  let ctx,bus,enabled=true,running=false,beat=0,next=0,scene='street';
  try{enabled=localStorage.getItem('returnity.sound')!=='off';}catch{}
  function unlock(){if(!enabled)return;try{if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();bus=ctx.createGain();bus.gain.value=.27;bus.connect(ctx.destination);}if(ctx.state==='suspended')ctx.resume().catch(()=>{});}catch{}}
  function note(f,at,len,vol,type='triangle',end=f){
    if(!ctx||!enabled||ctx.state!=='running')return;
    const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(f,at);osc.frequency.exponentialRampToValueAtTime(Math.max(28,end),at+len);
    env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(Math.max(.001,vol),at+.008);env.gain.exponentialRampToValueAtTime(.0001,at+len);
    osc.connect(env);env.connect(bus);osc.start(at);osc.stop(at+len+.01);
  }
  const bank={jump:[230,410,.11],flip:[365,620,.14],fire:[520,130,.14],throw:[230,86,.19],dive:[250,72,.15],swing:[160,76,.06],kick:[122,43,.08],hit:[104,44,.09],hurt:[180,49,.13],slam:[110,30,.23],lift:[160,270,.12],collect:[700,1080,.16],handoff:[560,870,.22],boss:[95,38,.45],heal:[440,660,.18],clear:[370,740,.32],win:[440,880,.42],backup:[98,37,.65],select:[330,500,.10]};
  function effect(k){if(!ctx||!enabled)return;const a=bank[k];if(!a)return;note(a[0],ctx.currentTime+.006,a[2],.21,['collect','handoff','heal','win'].includes(k)?'sine':'triangle',a[1]);
    if(['collect','handoff','win','backup'].includes(k))note(a[0]*1.5,ctx.currentTime+.094,a[2],.13,'sine',a[1]*1.5);}
  function tick(){
    if(!ctx||!enabled||!running||ctx.state!=='running')return;
    const now=ctx.currentTime,step=60/(scene==='street'?90:101)/2;if(next<now-.1)next=now+.03;
    while(next<now+.095){const n=beat%16,base=[65.41,77.78,58.27,69.3][Math.floor(beat/16)%4];
      if(n===0||n===6||n===10)note(115,next,.14,.36,'sine',35);
      if(n===4||n===12){note(174,next,.085,.10,'sawtooth',65);note(740,next,.045,.04,'square',260);}
      if(n%2===0)note(1900,next,.025,.024,'square',880);
      if([0,3,6,10,13].includes(n))note(base*(n===13?1.5:1),next,.24,.25,'triangle');
      if([2,7,11].includes(n))for(const r of [2,2.38,2.99])note(base*r,next,.31,.06,'sine');
      if(scene==='club'&&n%4===1)note(base*4,next,.12,.055,'triangle');next+=step;beat++;}
  }
  function play(active,level){if(active&&!running&&ctx)next=ctx.currentTime+.03;running=active;scene=level||scene;}
  function toggle(){enabled=!enabled;try{localStorage.setItem('returnity.sound',enabled?'on':'off');}catch{}if(enabled){unlock();effect('select');}else if(ctx)ctx.suspend().catch(()=>{});return enabled;}
  return {unlock,effect,tick,play,toggle,get enabled(){return enabled;}};
})();
