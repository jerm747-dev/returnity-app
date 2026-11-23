'use strict';
(() => {
 const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
 const M=ReturnityModel,screen=$('#screen'),sheet=$('#sheet'),overlay=$('#overlay'),cabinet=$('#cabinet');
 const opening=$('#opening'),film=$('#film'),hud=$('#hud'),touch=$('#touchdeck'),status=$('#status'),announce=$('#announce');
 const coarse=window.matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
 let state=M.init(),playing=true,ready=false,panel='',returnPanel='',layout=(coarse||matchMedia('(max-width: 540px) and (orientation: portrait)').matches)?'touch':'keyboard',lastInput=layout;
 let lastTime=0,tank=0,gamepad=null,lastPad={},guideLayout=layout,intro=true,introTime=0,skipRequested=false,waitForPadRelease=false;
 const asset=globalThis.ReturnityAsset||((name)=>'assets/'+name);
 const sequence=Opening.mount(film,asset);
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const keyboard=new Set(),touchKeys=new Set(),physical={},pressed=new Set(),released=new Set();
 const actions=['left','right','up','down','jump','strike','shot','special'];
 const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'jump',KeyZ:'jump',KeyX:'strike',KeyC:'shot',KeyV:'special'};
 const controls={
  keyboard:{move:'← → ↑ ↓',jump:'Z',strike:'X',shot:'C',special:'V',pause:'Esc',confirm:'Enter'},
  gamepad:{move:'D-pad / stick',jump:'A / south',strike:'X / west',shot:'B / east',special:'Y / north',pause:'Start',confirm:'A'},
  touch:{move:'D-pad',jump:'C',strike:'B',shot:'FIRE',special:'A',pause:'Ⅱ',confirm:'Tap'}
 };
 const descriptions=[['move','Move'],['jump','Jump'],['strike','Strike / lift'],['shot','Fireball'],['special','Call backup']];
 function updateLegend(){
   $$('.tabs [data-layout]').forEach(b=>{const selected=b.dataset.layout===layout;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
   $('#legend').innerHTML=descriptions.map(([k,label])=>{
     const vals=k==='move'&&layout==='keyboard'?['←','↑','↓','→']:[controls[layout][k]];
     return '<span class="legend-item"><span class="keys">'+vals.map(v=>'<span class="key '+k+'">'+v+'</span>').join('')+'</span>'+label+'</span>';
   }).join('');
 }
 function rememberInput(kind){if(lastInput!==kind){lastInput=kind;layout=kind;updateLegend();}updateTouch();}
 function updateTouch(){
   const hidden=false;
   if(touch.hidden!==hidden){touch.hidden=hidden;fitScreen();}
   touch.inert=!!panel;touch.classList.toggle('inactive',!!panel);
 }
 function fitScreen(){
   if(!playing)return;
   const box=screen.getBoundingClientRect();
   if(box.width<1||box.height<1)return;
   // Frame about a panel and a half of the previous camera while respecting the ends of the venue.
   const maxWidth=state.scene==='club'?M.W:1120;
   const scale=Math.max(box.width/maxWidth,Math.min(box.height/322,box.width/301));
   const width=Math.round(box.width/scale),height=Math.round(box.height/scale);
   const thumbs=!touch.hidden&&matchMedia('(orientation:landscape)').matches;
   const canvas=$('#world');
   const density=Math.min(window.devicePixelRatio||1,2,2304/Math.max(box.width,box.height));
   const px=Math.max(1,Math.round(box.width*density)),py=Math.max(1,Math.round(box.height*density));
   if(canvas.width!==px||canvas.height!==py){canvas.width=px;canvas.height=py;}
   const deckHeight=touch.getBoundingClientRect().height;
   const reserve=thumbs?Math.min(.43,(deckHeight+8)/box.height+.025):Math.min(.50,(deckHeight+24)/box.height+.07);
   M.setView(state,width,height,thumbs,reserve);Art.draw(state);
 }
 new ResizeObserver(fitScreen).observe(screen);
 screen.addEventListener('pointerdown',e=>{if(playing&&!panel&&e.pointerType==='touch'&&layout==='gamepad')rememberInput('touch');});
 function setLayout(v){layout=v;lastInput=v;guideLayout=v;updateLegend();updateTouch();}
 $$('[data-layout]').forEach(b=>b.onclick=()=>setLayout(b.dataset.layout));updateLegend();
 function setAction(name,value){if(!name||!!physical[name]===value)return;physical[name]=value;(value?pressed:released).add(name);}
 function recompute(){for(const a of actions){const fromKeys=[...keyboard].some(k=>keyMap[k]===a);const fromTouch=touchKeys.has(a);setAction(a,fromKeys||fromTouch||!!gamepad?.[a]);}}
 function resetInput(){keyboard.clear();controller.clear();gamepad=null;for(const a of actions)physical[a]=false;pressed.clear();released.clear();state.holdUsed=true;state.holdTime=0;}
 function focusFirst(){requestAnimationFrame(()=>{const b=sheet.querySelector('[data-primary]')||sheet.querySelector('button');(b||sheet).focus({preventScroll:true});});}
 function panelAction(id,label,primary=false){return '<button data-action="'+id+'" '+(primary?'data-primary ':'')+'class="'+(primary?'primary':'secondary')+'">'+label+'</button>';}
 function storyArt(type){return '<div class="story-still '+type+'" aria-hidden="true"><img src="'+asset((type==='win'?'suit':'closet')+'.webp')+'" alt=""></div>';}
 function story(type,tag,title,copy,buttons){return storyArt(type)+'<div class="sheet-tag">'+tag+'</div><h2 id="sheet-title">'+title+'</h2><p>'+copy+'</p><div class="sheet-actions">'+buttons+'</div>';}
 function guideMarkup(){
   const m=controls[guideLayout], rows=[['Walk / build up to a run',m.move],['Jump / flip',m.jump+' / twice'],['Dive / ground pound','Air + '+m.strike+' / ↓'],['Drop through a ledge','↓ + '+m.jump],['Strike / three-hit combo','Tap '+m.strike],['Lift case / grapple enemy','Hold '+m.strike],['Throw what you’re holding',m.strike+' or '+m.shot],['Give CD / take mic',m.strike],['Fireball',m.shot],['Call backup · one charge',m.special],['Pause',m.pause]];
   return '<div class="sheet-tag">CONTROL DECK</div><h2 id="sheet-title">Move list</h2><div class="guide-tabs tabs">'+Object.keys(controls).map(k=>'<button data-guide-layout="'+k+'" class="'+(k===guideLayout?'selected':'')+'">'+k[0].toUpperCase()+k.slice(1)+'</button>').join('')+'</div><table class="guide-table"><tbody>'+rows.map(([a,b])=>'<tr><td>'+a+'</td><td>'+b+'</td></tr>').join('')+'</tbody></table><div class="sheet-actions">'+panelAction('closeguide','Back',true)+'</div>';
 }
 function renderPanel(name){
   let html;
   if(name==='street')html=story('street','STAGE 01  /  CLOSET STUDIO NIGEL','The first pressing','Nigel recorded his music in a friend’s closet. Now he has to get his music into people’s hands. Collect three silver CDs, give one to each marked listener, then head to the open mic.',panelAction('continue','Continue',true));
   if(name==='venue')html=story('venue','OPEN MIC  /  THE LISTENING ROOM','Before the mic','The CDs are out. Before Nigel can step onstage, he has to face his own FEAR. Move up and down the floor. Hold strike to grab a shadow, then tap again to flip it.',panelAction('continue','Enter the floor',true));
   if(name==='win')html=story('win','STAGE 01  /  CLEAR','The mic is yours.','Nigel stepped onstage. His next chapter takes him into Charlotte’s venues as Suit Nigel.',panelAction('restart','Play again',true)+panelAction('opening','Replay opening'));
   if(name==='down')html='<div class="sheet-tag">TRY AGAIN</div><h2 id="sheet-title">Catch your breath.</h2><p>'+(state.scene==='club'?'Your CD deliveries are complete. Pick up at the open mic entrance.':'Start a fresh run from the closet studio.')+'</p><div class="sheet-actions">'+panelAction('retry','Retry '+(state.scene==='club'?'venue':'street'),true)+panelAction('opening','Replay opening')+'</div>';
   if(name==='pause')html='<div class="sheet-tag">STAGE 01  /  PAUSED</div><h2 id="sheet-title">On a break</h2><p>'+missionText()+'</p><div class="sheet-actions">'+panelAction('continue','Resume',true)+panelAction('guide','Controls')+panelAction('sound',Sound.enabled?'Mute sound':'Enable sound')+panelAction('full',full.lastElementChild.textContent)+panelAction('opening','Replay opening')+'</div>';
   if(name==='guide')html=guideMarkup();
   if(name==='loading')html='<div class="sheet-tag">SOUND ARCADE</div><h2 id="sheet-title">Loading the stage…</h2>';
   if(name==='failed')html='<div class="sheet-tag">SOUND ARCADE</div><h2 id="sheet-title">Stage assets unavailable</h2><p>Reload to try loading the game art again.</p><div class="sheet-actions">'+panelAction('reload','Reload',true)+'</div>';
   sheet.innerHTML=html||'';
   if(['street','venue','win'].includes(name)&&lastInput==='gamepad'){const button=sheet.querySelector('[data-primary]');button.insertAdjacentHTML('afterbegin','<span class="confirm-symbol" aria-hidden="true">A</span>');}
   if(name==='win'){const stats=document.createElement('p');stats.className='clear-stats';stats.textContent='3 / 3 CDs delivered   ·   Score '+state.score.toLocaleString();sheet.querySelector('.sheet-actions').before(stats);}
 }
 function show(name){
   resetInput();panel=name;overlay.hidden=!name;hud.inert=!!name;
   status.textContent=playing?(name==='pause'||name==='guide'?'PAUSED':name==='win'?'STAGE CLEAR':'IN GAME'):'READY';
   Sound.play(playing&&!intro&&!name,state.scene);updateTouch();if(name==='venue'||name==='street')fitScreen();if(name)$('#prompt').hidden=true;
   if(name){renderPanel(name);focusFirst();announce.textContent=$('#sheet-title')?.textContent||'';}
 }
 function finishIntro(){
   if(!intro)return;
   if(!ready){skipRequested=true;return;}
   intro=false;opening.hidden=true;hud.hidden=false;opening.style.removeProperty('--fade');
   resetInput();show('');fitScreen();updateHUD();announce.textContent=missionText();document.activeElement?.blur();
 }
 function start(){state=M.init();lastMission='';lastHealth=-1;intro=true;finishIntro();}
 function replayOpening(){
   const finished=state.completed||state.down;
   if(finished){state=M.init();lastMission='';lastHealth=-1;}
   intro=true;introTime=0;skipRequested=false;show('');
   opening.hidden=false;announce.textContent='Opening panorama';hud.hidden=true;$('#prompt').hidden=true;$('#boss').hidden=true;
   opening.style.setProperty('--fade','1');
   sequence.draw(0,reduceMotion.matches);$('#skip').focus({preventScroll:true});
 }
 function skip(){if(!intro)return;Sound.unlock();finishIntro();}
 $('#skip').onclick=skip;
 film.addEventListener('pointerdown',skip);
 // Consume the opening tap before the controller registers a held action.
 touch.addEventListener('pointerdown',e=>{if(intro){e.preventDefault();e.stopPropagation();skip();}},true);
 touch.addEventListener('click',e=>{if(intro){e.preventDefault();e.stopPropagation();skip();}},true);
 window.addEventListener('keydown',e=>{if(intro&&!panel&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(keyMap[e.code]||['Escape','KeyP','Enter'].includes(e.code))){e.preventDefault();e.stopImmediatePropagation();skip();}},true);
 function openGuide(){returnPanel=panel;guideLayout=layout;show('guide');}
 function take(id){
   Sound.unlock();if(id==='continue'){Sound.effect('select');show('');document.activeElement?.blur();return;}
   if(id==='guide'){openGuide();return;}if(id==='closeguide'){const back=returnPanel;show(back);return;}
   if(id==='sound'){Sound.toggle();updateSound();renderPanel('pause');focusFirst();return;}if(id==='full'){full.click();return;}
   if(id==='restart'){start();return;}if(id==='opening'){replayOpening();return;}if(id==='reload'){location.reload();return;}
   if(id==='retry'){M.retry(state);consume();return;}
 }
 sheet.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.guideLayout){guideLayout=b.dataset.guideLayout;renderPanel('guide');sheet.querySelector('[data-guide-layout="'+guideLayout+'"]').focus();}else take(b.dataset.action);});
 $('#pause').onclick=()=>show('pause');
 function updateSound(){const b=$('#sound');b.setAttribute('aria-pressed',Sound.enabled);b.classList.toggle('muted',!Sound.enabled);$('#sound-label').textContent=Sound.enabled?'Sound on':'Sound off';}updateSound();$('#sound').onclick=()=>{Sound.toggle();updateSound();};
 const full=$('#fullscreen');
 function setFull(){const active=!!document.fullscreenElement||cabinet.classList.contains('expanded');full.lastElementChild.textContent=active?'Exit fullscreen':'Fullscreen';full.setAttribute('aria-pressed',active);if(panel==='pause'){const b=sheet.querySelector('[data-action=full]');if(b)b.textContent=full.lastElementChild.textContent;}}
 full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(cabinet.classList.contains('expanded'))cabinet.classList.remove('expanded');else if(cabinet.requestFullscreen)await cabinet.requestFullscreen();else cabinet.classList.add('expanded');}catch{cabinet.classList.toggle('expanded');}setFull();};
 document.addEventListener('fullscreenchange',setFull);
 function pauseKey(){if(panel==='guide'){take('closeguide');return;}if(!playing)return;if(panel==='pause'){take('continue');return;}if(!panel)show('pause');}
 function cycleFocus(dir){const scope=sheet;const btn=Array.from(scope.querySelectorAll('button'));if(btn.length){const n=btn.indexOf(document.activeElement);btn[(n+dir+btn.length)%btn.length].focus({preventScroll:true});}}
 window.addEventListener('keydown',e=>{
   if(e.metaKey||e.ctrlKey||e.altKey)return;
   if(panel&&e.key==='Tab'){const buttons=[...sheet.querySelectorAll('button')];if(buttons.length&&(e.shiftKey&&document.activeElement===buttons[0]||!e.shiftKey&&document.activeElement===buttons.at(-1))){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0].focus();}return;}
   if(e.code==='Escape'||e.code==='KeyP'){if(!e.repeat){e.preventDefault();pauseKey();}return;}
   if(!playing||panel){if(panel&&e.code==='KeyZ'&&!e.repeat){e.preventDefault();sheet.querySelector('[data-primary]')?.click();}return;}
   if(keyMap[e.code]){e.preventDefault();if(!e.repeat){Sound.unlock();rememberInput('keyboard');keyboard.add(e.code);recompute();}}
 });
 window.addEventListener('keyup',e=>{if(keyboard.delete(e.code)){e.preventDefault();recompute();}});
 const controller=EncoreInput.mount({
   root:touch, enabled:()=>playing&&!panel&&!touch.hidden,
   press(key){Sound.unlock();rememberInput('touch');touchKeys.add(key);recompute();},
   release(key){touchKeys.delete(key);recompute();}
 });
 let lastDevice='',rumblePad=null,releaseConfirm=false;
 function pollPad(){
   let pads;try{pads=navigator.getGamepads?.();}catch{return;}
   const pad=pads&&Array.from(pads).find(Boolean);
   if(!pad){if(lastDevice){lastDevice='';gamepad=null;lastPad={};recompute();}return;}
   if(lastDevice!==pad.id){lastDevice=pad.id;lastPad={};}rumblePad=pad;
   const b=i=>!!pad.buttons[i]?.pressed, x=pad.axes[0]||0,y=pad.axes[1]||0;
   const now={jump:b(0),strike:b(2),shot:b(1),special:b(3),left:b(14)||x<-.32,right:b(15)||x>.32,up:b(12)||y<-.32,down:b(13)||y>.32,start:b(9)};
   const edge=k=>now[k]&&!lastPad[k];const used=Object.keys(now).some(edge);
   if(used){rememberInput('gamepad');Sound.unlock();}
   if(intro&&!panel){
     if(used){waitForPadRelease=true;skip();}
     lastPad=now;return;
   }
   if(waitForPadRelease){lastPad=now;if(Object.values(now).some(Boolean))return;waitForPadRelease=false;}
   if(panel||!playing){
     if(edge('down')||edge('right'))cycleFocus(1);
     if(edge('up')||edge('left'))cycleFocus(-1);
     if(edge('jump')||edge('start')){
       releaseConfirm=now.jump;
       if(panel){const el=document.activeElement;if(sheet.contains(el)&&el.tagName==='BUTTON')el.click();else sheet.querySelector('[data-primary]')?.click();}

     }else if(edge('shot'))pauseKey();
     gamepad=null;
   }else if(edge('start')){show('pause');}else{gamepad={...now,jump:now.jump&&!releaseConfirm};recompute();}
   if(!now.jump)releaseConfirm=false;
   lastPad=now;
 }
 function feedback(id){if(!['hit','slam','backup','handoff','lift'].includes(id))return;
   if(lastInput==='gamepad')try{rumblePad?.vibrationActuator?.playEffect('dual-rumble',{duration:id==='backup'?130:42,strongMagnitude:id==='slam'?.35:.13,weakMagnitude:.22})?.catch(()=>{});}catch{}
   else if(lastInput==='touch')navigator.vibrate?.(id==='backup'?45:12);
 }
 function consume(){const events=state.events.splice(0);for(const e of events){if(e.type==='sound'){Sound.effect(e.value);feedback(e.value);}if(e.type==='panel')show(e.value);}}
 function missionText(){
   if(state.scene==='club')return state.wave===3?'Take the mic at center stage':state.wave===2?'Face FEAR':'Clear the floor';
   const p=state.p;const targets=state.bag?state.contacts.filter(n=>!n.given):state.discs.filter(d=>!d.taken);
   const target=targets.reduce((near,n)=>!near||Math.abs(n.x-p.x)<Math.abs(near.x-p.x)?n:near,null);
   return (state.delivered===3?'Open mic':state.bag?'Find a listener':'Find a CD')+' '+((target?.x??M.DOOR)>=p.x?'→':'←')+' · '+state.delivered+'/3 delivered';
 }
 let lastMission='',lastHealth=-1;
 function setText(el,value){if(el.textContent!==value)el.textContent=value;}
 function updateHUD(){
   const p=state.p,m=controls[lastInput];setText($('#place'),state.scene==='club'?'OPEN MIC':'ON THE STREET');
   const mission=missionText();setText($('#objective'),mission+' · Backup '+state.special);
   if(lastMission!==mission){lastMission=mission;announce.textContent=mission;}
   if(lastHealth!==p.hp){lastHealth=p.hp;$('#health').innerHTML=Array.from({length:6},(_,i)=>'<i class="'+(i<p.hp?'full':'')+'"></i>').join('');$('#health').setAttribute('aria-label',p.hp+' of 6 health');}
   const b=state.enemies.find(e=>e.boss&&M.alive(e));$('#boss').hidden=!b;if(b)$('#boss i').style.width=(100*b.hp/b.maxHp)+'%';
   let msg=state.msgTime>0?state.message:'';
   if(p.hold)msg=m.strike+' · Throw';
   else if(M.atMic(state))msg=m.strike+' · Take the mic';
   else if(M.atDoor(state))msg=state.delivered===3?m.strike+' · Enter open mic':'Deliver all 3 CDs to enter';
   else if(M.nearContact(state)&&state.bag)msg=m.strike+' · Give a CD';
   else if(!msg&&state.cases.some(c=>c.mode==='rest'&&Math.abs(c.x-p.x)<26&&Math.abs(c.y-p.y)<16))msg='Hold '+m.strike+' · Lift case';
   else if(!msg&&state.scene==='club'&&state.enemies.some(e=>M.alive(e)&&(!e.boss||e.mode==='stun')&&Math.abs(e.x-p.x)<32&&Math.abs(e.base-p.base)<17))msg='Hold '+m.strike+' · Grapple';
   else if(!msg&&state.clock<6)msg=m.jump+' · Jump twice to reach the CDs';
   $('#prompt').hidden=!msg||!!panel;setText($('#prompt'),msg);
 }
 function suspended(){resetInput();lastPad={};if(playing&&!panel&&!intro)show('pause');}
 document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden)suspended();});window.addEventListener('blur',suspended);
 function frame(now){
   const elapsed=(now-(lastTime||now))/1000;pollPad();tank=Math.min(.085,tank+Math.min((now-(lastTime||now))/1000,.085));lastTime=now;
   if(intro&&ready&&!panel){
     tank=0;if(!document.hidden)introTime+=elapsed;
     const duration=reduceMotion.matches?2.8:8.45;
     const exit=Math.min(1,Math.max(0,(introTime-duration+.72)/.72));
     sequence.draw(introTime,reduceMotion.matches);
     opening.style.setProperty('--fade',1-exit);
     if(introTime>=duration)finishIntro();
   }else if(playing&&!panel&&ready){while(tank>=1/60&&!panel){const input={...physical};for(const k of pressed)input[k+'Press']=true;for(const k of released)input[k+'Release']=true;
     M.step(state,input,1/60);pressed.clear();released.clear();consume();tank-=1/60;}
     Sound.tick();Art.draw(state);updateHUD();
   }else tank=0;
   requestAnimationFrame(frame);
 }
 sequence.draw(0,reduceMotion.matches);
 const castReady=Promise.all(Opening.art.map(name=>{const im=new Image();im.src=asset(name+'.webp');return im.decode();}));
 Promise.all([Art.load($('#world')),castReady]).then(()=>{ready=true;fitScreen();if(skipRequested)finishIntro();}).catch(()=>{intro=false;opening.hidden=true;show('failed');});
 requestAnimationFrame(frame);
})();
