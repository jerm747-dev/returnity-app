// Shared by the website and Android shell. Change only the presentation of the live game.
(() => {
 const settings={shown:localStorage.getItem('arcade.controls.shown')!=='off',follow:localStorage.getItem('arcade.controls.follow')==='on'};
 const exclude=new Set(['gs-fighter-iii','gs-fighter-3','gs-fighter-2','groove-squad-get-down','get-down','beat-room','sound-test','controller-check']);
 let frame,host,game,board=false,override=null,button,shadow,style,guestStyle,raf=0,guestWindow;
 const held=new Set();let lastHighlights=[],lastStick=null,lastSignature='';
 const keyMap={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'b',Enter:'b',KeyJ:'b',KeyK:'a',ShiftLeft:'a',KeyF:'x',KeyG:'y'};
 function keyboard(e){if(keyMap[e.code]){if(e.type==='keydown')held.add(e.code);else held.delete(e.code)}}
 function clear(){held.clear();for(const e of lastHighlights)e.removeAttribute('data-input-lit');lastHighlights=[];lastStick?.style.removeProperty('translate');lastStick=null;lastSignature=''}
 function listen(w,on){if(!w)return;for(const type of ['keydown','keyup','blur'])w[on?'addEventListener':'removeEventListener'](type,type==='blur'?clear:keyboard,true)}
 function show(){return override??(board?false:settings.shown)}
 function eligible(){return !!frame&&!exclude.has(game)&&!/fighter|get-down/i.test(game)}
 const boards={
 'plugin-twist':`
 .applet{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;padding:0!important;display:grid!important;grid-template: minmax(0,1fr) 30px / 1fr!important;gap:0!important}
 .applet>.top,.applet>.storage,.applet>.controls,.applet>.bottom{display:none!important}.applet .arena{grid-area:1/1!important;display:grid!important;place-items:center!important;padding:0!important;width:100%!important;height:100%!important;min-height:0!important;container-type:size}
 .applet #board{width:min(100cqw,100cqh)!important;height:min(100cqw,100cqh)!important;max-width:none!important;max-height:none!important;margin:0!important}.applet .stats{grid-area:2/1!important;display:flex!important;flex-flow:row nowrap!important;align-items:center!important;justify-content:center!important;gap:8px!important;padding:1px 35px!important;font-size:11px!important}.stats>*{margin:0!important;font-size:inherit!important}`,
 'album-match':`
 .album-match.am-v33:has(.match-grid){position:fixed!important;inset:0!important;height:100%!important;width:100%!important;padding:0!important;margin:0!important;max-width:none!important;display:grid!important;grid-template:minmax(0,1fr) 30px / minmax(0,1fr)!important;gap:0!important;align-items:center!important;overflow:hidden!important}
 .am-v33:has(.match-grid)>:not(.match-grid):not(.match-status):not(.match-settings):not(.am-result){display:none!important}
 .am-v33 .match-grid{grid-area:1/1!important;width:min(100vw,calc(100dvh - 30px))!important;height:min(100vw,calc(100dvh - 30px))!important;max-width:none!important;max-height:none!important;align-self:center!important;justify-self:center!important;margin:0!important;box-sizing:border-box!important}
 .am-v33 .match-status{grid-area:2/1!important;display:flex!important;justify-content:center!important;gap:7px!important;align-items:center!important;padding:1px 36px!important;margin:0!important;font-size:11px!important;min-height:0!important}.match-status>*{font-size:inherit!important}`,
 'word-search':`
 .app{position:fixed!important;inset:0!important;display:block!important;margin:0!important;padding:0!important;height:100%!important;max-width:none!important}.app>header,.app>.toolbar,.app>progress,.focus-bar,.board-panel>.bottom,.board-panel>.status{display:none!important}
 .content,.board-panel,.grid-scroll{position:absolute!important;inset:0 0 30px!important;padding:0!important;margin:0!important;width:100%!important;height:auto!important;display:grid!important;place-items:center!important;border:0!important}.board-panel,.grid-scroll{inset:0!important}.grid-scroll{container-type:size}.grid{width:min(100cqw,100cqh)!important;min-width:0!important;max-width:none!important}.grid .cell{font-size:clamp(10px,4cqi,34px)!important}
 .words-panel{position:fixed!important;inset:auto 42px 0 5px!important;height:28px!important;display:block!important;overflow:auto!important;margin:0!important;padding:0!important;border:0!important}.words-panel h2,.words-panel p{display:none!important}.word-list{display:flex!important;flex-wrap:nowrap!important;white-space:nowrap!important;gap:12px!important;width:max-content!important;margin:0!important;padding:3px!important}.word-list li{font-size:12px!important}`
 };
 const guestControls={
   'pulse-runner':'.device .left-wing,.device .right-wing', 'wave-run-747':'#stick,#btnA,#btnB',
   'plugin-twist':'.applet .controls','album-match':'.am-controls,.am-how',
   'flight-control-deck':'#controller-tools,#controller-view,#left,#right,.center-fire',
   'encore':'#game .deck','cd-man':'#game .deck,#cd-touch','big-bowl-smash':'.controls.deck','catalog-clash':'.climb-deck','gs-fighter-2':'#controller,.gd-ov-controller',
   'tic-tac-steel':'#controller-guide'
 };
 function apply(){
   if(!frame)return;
   let doc;try{doc=frame.contentDocument}catch{return}if(!doc?.head)return;
   listen(guestWindow,false);guestWindow=doc.defaultView;listen(guestWindow,true);
   if(!guestStyle||guestStyle.ownerDocument!==doc){guestStyle=doc.createElement('style');doc.head.append(guestStyle)}
   const hidden=!show(),selectors=guestControls[game]||'.touch-controls,.touch-pad,.actionpad,.dpad,[data-touch-controls]';
   doc.documentElement.toggleAttribute('data-arcade-full-board',board);
   const pocketRules=doc.querySelector('style[data-pocket-layout]');
   if(pocketRules)pocketRules.disabled=board||hidden;
   guestStyle.textContent=(hidden?selectors+'{display:none!important}':'')+(hidden&&game==='pulse-runner'?'.immersive .bezel{bottom:24px!important}.immersive .bezel-full{top:100%!important}':'')+(board?boards[game]||'':'')+'[data-input-lit]{filter:brightness(1.6)!important;outline:2px solid #ffda83!important}';
   host.classList.toggle('j747-clear-deck',hidden||board);frame.classList.toggle('j747-clear-frame',hidden||board);
   if(button){button.hidden=!board||!eligible();button.textContent='Controls';button.setAttribute('aria-pressed',String(show()))}
   clear();startPoll();
 }
 function startPoll(){if(!raf&&frame&&settings.follow&&show())raf=requestAnimationFrame(poll)}
 function poll(){
   raf=0;if(!frame||!settings.follow||!show())return;startPoll();
   if(document.hidden||frame.inert||frame.hidden||frame.contentWindow?.ArcadeGameClock?.held){if(lastSignature)clear();return}
   let p;try{p=Array.from(window.Arcade?.pads?.()||navigator.getGamepads?.()||[]).find(Boolean)}catch{}
   const keys=new Set([...held].map(k=>keyMap[k]));
   const map={0:'b',1:'a',2:'x',3:'y',12:'up',13:'down',14:'left',15:'right'};
   for(const [i,k] of Object.entries(map))if(p?.buttons[i]?.pressed)keys.add(k);
   const x=(+(keys.has('right'))-keys.has('left'))||(Math.abs(p?.axes[0]||0)>.17?p.axes[0]:0);
   const y=(+(keys.has('down'))-keys.has('up'))||(Math.abs(p?.axes[1]||0)>.17?p.axes[1]:0);
   if(Math.abs(x)>.4)keys.add(x<0?'left':'right');if(Math.abs(y)>.4)keys.add(y<0?'up':'down');
   const sig=[...keys].sort().join()+':'+x.toFixed(2)+','+y.toFixed(2);if(sig===lastSignature)return;
   for(const e of lastHighlights)e.removeAttribute('data-input-lit');lastHighlights=[];lastSignature=sig;
   shadow=host.querySelector('j747-pocket-surface')?.shadowRoot;
   const doc=frame.contentDocument, pulse={a:'dive',b:'fire',x:'melee',y:'grenade'};
   for(const k of keys){const selectors=['[data-key="'+k+'"]','.pad-'+k];
     const facePosition={a:'right',b:'bottom',x:'left',y:'top'}[k];
     if(facePosition)selectors.push('.face-'+facePosition);
     if(game==='pulse-runner'&&pulse[k])selectors.push('[data-action="'+pulse[k]+'"]');
     if(game==='wave-run-747'&&['a','b'].includes(k))selectors.push(k==='b'?'#btnA':'#btnB');
     if(game==='album-match'&&pulse[k])selectors.push('[aria-label="Swap '+({a:'right',b:'down',x:'left',y:'up'})[k]+'"]');
     for(const scope of [shadow,doc])for(const el of scope?.querySelectorAll(selectors.join(','))||[]){el.setAttribute('data-input-lit','');lastHighlights.push(el)}
   }
   const stick=(shadow?.querySelector('.pocket-stick:not([hidden]) span')?.getClientRects().length&&shadow.querySelector('.pocket-stick span'))||doc?.getElementById('knob');
   if(stick&&!(doc?.querySelector('#stick:active')||shadow?.querySelector('.pocket-stick:active'))){stick.style.translate=x*38+'% '+y*38+'%';lastStick=stick}
 }
 function cycle(){if(!eligible())return false;board=!board;override=null;apply();return true}
 function attach(next,id,container){
   if(frame===next&&game===id){apply();return}
   clear();listen(guestWindow,false);guestWindow=null;if(frame){frame.removeEventListener('load',apply);frame.classList.remove('j747-clear-frame')}
   if(guestStyle?.ownerDocument){const d=guestStyle.ownerDocument;d.documentElement.removeAttribute('data-arcade-full-board');const st=d.querySelector('style[data-pocket-layout]');if(st)st.disabled=false}
   guestStyle?.remove();guestStyle=null;host?.classList.remove('j747-clear-deck');button?.remove();
   frame=next;host=container;game=id;board=false;override=null;if(!frame)return;
   if(!style){style=document.createElement('style');style.textContent=`
   .j747-clear-deck>j747-pocket-surface{visibility:hidden!important}
   :is(#session,.game-stack).j747-clear-deck.j747-clear-deck > iframe.j747-clear-frame{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;transform:none!important;margin:0!important;border:0!important}
   .j747-controls-light{position:absolute;right:max(2px,env(safe-area-inset-right));bottom:max(1px,env(safe-area-inset-bottom));font:600 10px system-ui;color:white;background:#273332ed;border:1px solid #86988d;border-radius:5px;z-index:7;height:25px;padding:2px 5px}
   `;document.head.append(style);listen(window,true)}
   button=document.createElement('button');button.type='button';button.className='j747-controls-light';button.title='Restore controls and regular view';button.onclick=()=>{board=false;override=true;apply()};host.append(button);
   const root=host.querySelector('j747-pocket-surface')?.shadowRoot;
   if(root&&!root.querySelector('[data-input-style]')){const css=document.createElement('style');css.dataset.inputStyle='';css.textContent='[data-input-lit]{filter:brightness(1.7)!important;outline:2px solid #ffda83!important}';root.append(css)}
   frame.addEventListener('load',apply);apply();
 }
 window.Jerm747PlayView={attach,cycle,eligible,get board(){return board},get shown(){return show()},get follow(){return settings.follow},
   set(name,on){settings[name]=on;localStorage.setItem('arcade.controls.'+name,on?'on':'off');if(name==='shown'){if(board&&on)board=false;override=null;}apply()},
   onFull(active){if(!eligible())return false;if(!board&&active)return cycle();if(board){cycle();return false}return false}
 };
})();

/* Cabinet system controls. All game options call the original game's controls. */
window.createPocketGameMenu=function(host,api){
  const panel=document.createElement('section');
  panel.className='j747-game-menu';panel.hidden=true;panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Pocket Player game menu');host.append(panel);
  let state='',lab=null,frame=null,game='',isPocket=false,ownedClock=false,lastButtons=[],ticker=0,axesHeld=false,wasPocket=false;
  const starts={
    'beat-room':'#beat-start','wave-run-747':'#menu:not([hidden]) #startBtn,#resumeBtn',
    'pulse-runner':'#launch,#primary',
    'cyborg-coliseum':'#poster:not([hidden]) #start','flight-control-deck':'#mission-start',
    'gs-fighter-2':'#gs-boot button,#lobby #start','gs-fighter-3':'#press-start','groove-squad-get-down':'#lobby #start',
    'encore':'#press-start,#selector button[data-mode]','sumi-sudoku':'#titleResume','big-bowl-smash':'#go',
    'catalog-clash':'.chapter-text button',
    'cd-man':'#game[data-panel="title"] #primary'
  };
  const settings={
    'sumi-sudoku':'[data-lv],#artSel,#themeToggle,#fxBtn,#fxSpeed,#breakBtn,#tNew,#tUndo,#tHint',
    'tic-tac-steel':'#boardNav:not([hidden]) #allBoards,[data-variant],[data-mode],#lvRow button,[data-human],#tSwap,#tNeg,[data-surf],[data-wall],[data-marks],#sound,#haptics,#motion,#lampBtn,#newRound,#newSeries',
    'flight-control-deck':'#controller-view,#controller-mode,#modes',
    'plugin-twist':'#pair,#trio,#corner,#hint,#new,#help',
    'beat-room':'.pad-mapping .btn-row button',
    'album-match':'.match-actions button:not([aria-label^="Swap"]),.am-how button',
    'wave-run-747':'#resetBtn,#seaSeg button,#skySeg button',
    'cyborg-coliseum':'#mission-zoom,#mission-melee,#mission-grab,#audio,#recenter',
    'cd-man':'#audio,#instructions','encore':'#audio,#instructions',
    'word-search':'#new,#help-button,#hint,#zoom',
    'pulse-runner':'#audio,#changeOperator','big-bowl-smash':'#bSound,#bMenu',
    'gs-fighter-2':'#haptic','groove-squad-get-down':'#haptic'
  };
  const visible=e=>e&&!e.disabled&&!e.closest('[hidden],[inert]')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
  const doc=()=>{try{return frame?.contentDocument}catch{return null}};

  function maskSystem(w) {
    const nav=w?.navigator;if(!nav || typeof nav.getGamepads!=='function'||nav.getGamepads.pocketMask)return;
    const read=nav.getGamepads.bind(nav);
    function filtered(){
      return Array.from(read()||[],pad=>{
        if(!pad||(!pad.buttons[8]?.pressed && !pad.buttons[9]?.pressed))return pad;
        const buttons=Array.from(pad.buttons,(v,i)=>i===8||i===9?{pressed:false,touched:false,value:0}:v);
        return {id:pad.id,index:pad.index,connected:pad.connected,mapping:pad.mapping,timestamp:pad.timestamp,axes:pad.axes,buttons,vibrationActuator:pad.vibrationActuator,hapticActuators:pad.hapticActuators};
      });
    }
    filtered.pocketMask=true;try{Object.defineProperty(nav,'getGamepads',{configurable:true,value:filtered})}catch{}
  }
  function controlStart(){const d=doc();if(!d)return null;const sel=starts[game];if(!sel)return null;return [...d.querySelectorAll(sel)].find(visible)}
  function layout(){const f=frame?.getBoundingClientRect(),h=host.getBoundingClientRect();if(!f)return;
    panel.style.left=f.left-h.left+'px';panel.style.top=f.top-h.top+'px';panel.style.width=f.width+'px';panel.style.height=f.height+'px'}
  function close(){if(!state)return;state='';panel.hidden=true;panel.replaceChildren();lab=null;
    if(ownedClock){ownedClock=false;window.ArcadeSessions?.release(frame)}frame?.focus({preventScroll:true});}
  function rows(){return [...panel.querySelectorAll('button:not(:disabled)')]}
  function button(label,act){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=act;panel.append(b);return b}
  function title(label){const h=document.createElement('strong');h.textContent=label;panel.append(h)}
  function display(which){
    if(!frame)return;
    if(!state){api.release();window.ArcadeSessions?.hold(frame);ownedClock=true}
    state=which;panel.hidden=false;panel.replaceChildren();layout();
    title(which==='paused'?'Paused':which==='lab'?'Haptic Workshop':'Game options');
    button(which==='paused'?'Resume':'Back to game',close);
    if(which==='paused'){rows()[0].focus();return}
    if(which==='lab'){
      lab=document.createElement('iframe');lab.title='Pocket controller workshop';lab.allow='gamepad; fullscreen';
      lab.src='/workshops/pocket/index.html?hud=1';panel.append(lab);lab.focus();return;
    }
    const d=doc();
    if(d && settings[game])for(const e of d.querySelectorAll(settings[game])){
      if(e.disabled||e.type==='hidden')continue;
      const name=()=> (e.getAttribute('aria-label')||e.title||e.textContent.trim().replace(/\s+/g,' ')||e.id);
      const value=()=>e.tagName==='SELECT'?(e.selectedOptions[0]?.text||''):e.type==='range'?e.value:e.getAttribute('aria-pressed')==='true'?'On':'';
      const label=()=>e.tagName==='SELECT'?(e.getAttribute('aria-label')||e.id)+' · '+value():e.type==='range'?'Effect speed · '+value():name()+(value()?' · '+value():'');
      const b=button(label(),()=>{
        if(e.tagName==='SELECT'){e.selectedIndex=(e.selectedIndex+1)%e.options.length;e.dispatchEvent(new Event('change',{bubbles:true}))}
        else if(e.type==='range'){if(+e.value>=+e.max)e.value=e.min;else e.stepUp();e.dispatchEvent(new Event('input',{bubbles:true}))}
        else e.click();
        if(['modes','help','new','instructions','breakBtn','bMenu','changeOperator','mission-grab'].includes(e.id)||game==='album-match')close();
        else {const index=rows().indexOf(b);display('options');rows()[index]?.focus()}
      });
    }
    const original=api.legacy();if(original && !['cyborg-coliseum','flight-control-deck','pulse-runner','wave-run-747','plugin-twist'].includes(game))button(original,()=>{close();api.oldSelect()});
    if(isPocket)button('Direction · '+api.direction(),()=>{api.switchDirection();display('options')});
    button('Haptic Workshop',()=>display('lab'));
    button('Arcade HUD',()=>{close();api.hud()});
    rows()[0]?.focus({preventScroll:true});
  }
  // A game can claim Select during play (Wave Run switches its camera); otherwise Select opens options.
  function gameSelect(){const d=doc();try{return !!d?.defaultView?.PocketSelect?.()}catch{return false}}
  function start(){
    if(state){close();return}
    const d=doc();if(!d)return;
    if(d.defaultView.PocketTitleStart?.())return;
    const e=controlStart();if(e){e.click();return}
    display('paused');
  }
  function navigate(action,down=true){
    if(!state)return false;
    if(!down)return true;
    if(action==='select'||action==='b'){if(state==='lab')display('options');else close();return true}
    if(state==='lab')return true;
    const list=rows(),i=list.indexOf(document.activeElement);
    if(action==='a')list[Math.max(i,0)]?.click();
    if(['left','up','right','down'].includes(action))list[(i+(['left','up'].includes(action)?-1:1)+list.length)%list.length]?.focus();
    return true;
  }
  function poll(){
    ticker=requestAnimationFrame(poll);if(!frame||frame.hidden||document.hidden){lastButtons=[];return}
    let pad;try{pad=Array.from(window.Arcade?.pads?.()||navigator.getGamepads?.()||[]).find(Boolean)}catch{}
    if(!pad){lastButtons=[];return}
    // An open native HUD owns hardware input including any Game Settings modal.
    if(api.blocked()){lastButtons=pad.buttons.map(b=>!!b.pressed);return}
    const a=pad.buttons.map(b=>!!b.pressed);
    [12,13,14,15].forEach((i,n)=>a[i] ||= [-(pad.axes[1]||0),pad.axes[1]||0,-(pad.axes[0]||0),pad.axes[0]||0][n]>.6);
    if(a[8]&&!lastButtons[8]){if(state)navigate('select');else if(!gameSelect())display('options')}
    else if(a[9]&&!lastButtons[9])start();
    else if(state)for(const [i,k] of [[12,'up'],[13,'down'],[14,'left'],[15,'right'],[0,'a'],[1,'b']])if(a[i]&&!lastButtons[i]){navigate(k);break}
    lastButtons=a;
  }
  function key(e){if(!state)return;const k={ArrowDown:'down',ArrowUp:'up',ArrowRight:'right',ArrowLeft:'left',Escape:'b'}[e.key];
    if(k){e.preventDefault();navigate(k)}}
  function message(e){if(e.origin!==location.origin||e.source!==lab?.contentWindow)return;
    if(e.data?.type==='pocket-workshop-back')display('options');
    if(e.data?.type==='pocket-workshop-applied')window.Jerm747Pocket.refreshControls();}
  window.addEventListener('message',message);panel.addEventListener('keydown',key);window.addEventListener('resize',layout);ticker=requestAnimationFrame(poll);
  const obs=new ResizeObserver(layout);obs.observe(host);
  return {get open(){return !!state},layout,close,start,navigate,options:()=>state?close():(gameSelect()||display('options')),
    axes(x,y){if(!state)return false;const mag=Math.max(Math.abs(x),Math.abs(y));if(mag<.3)axesHeld=false;else if(mag>.55&&!axesHeld){axesHeld=true;navigate(Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'up':'down')}return true},
    sync(f,id,on){if(f!==frame||id!==game||wasPocket!==on)close();if(!on&&f)try{maskSystem(f.contentWindow)}catch{}frame=f;game=id;isPocket=wasPocket=on;if(state)layout()},
    destroy(){close();cancelAnimationFrame(ticker);obs.disconnect();window.removeEventListener('resize',layout);window.removeEventListener('message',message);panel.remove()}
  };
};

/* 747 Pocket: the original molded Encore Handheld controls adapted to an
   existing arcade frame. The playing document never changes parents. */
(() => {
  'use strict';
  const stylesheet = new URL('pocket-shell.css' + new URL(document.currentScript.src).search, document.currentScript.src).href;
  // Folder this script was loaded from, so the Pocket works from /pocket/ or a client site's games/pocket/.
  const base = new URL('.', document.currentScript.src).href;
  // Site-level options (a client site can set these before or after this script loads):
  //   defaultFinish  finish used by "Game default" when a game has no finish of its own
  //   skins          { gameId: finish } per-game defaults
  //   labels         { finish: label } renames in menus, e.g. {auto: 'Returnity Edition'}
  //   bezelTitle     text above the screen
  const site = {defaultFinish:'', skins:{}, labels:{}, bezelTitle:'JERM747 ARCADE', ...(window.Jerm747PocketConfig || {})};
  const faces = [
    ['y', 'top', '#b9c6ff'], ['x', 'left', '#ffa7cc'],
    ['a', 'right', '#ffdc91'], ['b', 'bottom', '#9ef0dc']
  ];
  // Keep the finish current when another tab or a restored page changes it.
  function restoreFinish() {
    let stored;
    try { stored = localStorage.getItem(finishKey); } catch { return; }
    const next = valid(stored) ? stored : 'auto';
    if (finish === next) return;
    finish = next;
    window.dispatchEvent(new Event('pocket-finish-change'));
  }
  window.addEventListener('pageshow', event => { if (event.persisted) restoreFinish(); });
  window.addEventListener('storage', event => {
    if (event.key === finishKey || event.key === null) restoreFinish();
  });
  const controlsKey='jerm747.pocket.controls.v1';
  function readControls(){
    try{
      const v=JSON.parse(localStorage.getItem(controlsKey)||'{}');
      const legacy=localStorage.getItem('747.pocket.workshop.v1.level');
      return {mode:v.mode==='stick'?'stick':'pad',level:['off','light','firm'].includes(v.level)?v.level:['off','light','firm'].includes(legacy)?legacy:'light'};
    }catch{return {mode:'pad',level:'light'};}
  }
  let controls=readControls();
  function refreshControls(){
    controls=readControls();
    window.dispatchEvent(new Event('pocket-controls-change'));
  }
  function saveControls(next){
    const value={mode:next.mode==='stick'?'stick':'pad',level:['off','light','firm'].includes(next.level)?next.level:'light'};
    try{localStorage.setItem(controlsKey,JSON.stringify(value));}catch{}
    controls=value;
    window.dispatchEvent(new Event('pocket-controls-change'));
  }
  window.addEventListener('storage',e=>{if(e.key===controlsKey||e.key===null)refreshControls();});
  window.addEventListener('pageshow',e=>{if(e.persisted)refreshControls();});
  let lastHaptic=-Infinity;
  function touchPulse(){
    if(controls.level==='off'||performance.now()-lastHaptic<45)return;
    lastHaptic=performance.now();
    const light=controls.level==='light', duration=light?12:28;
    try{
      if(typeof window.EncoreAndroid?.rumble==='function')window.EncoreAndroid.rumble(duration,light?18:44);
      else navigator.vibrate?.(duration);
    }catch{}
  }
  const skins = {'wave-run-747':'ice', 'returnity':'returnity-amber'};
  const finishKey = 'jerm747.pocket.finish.v1';
  const finishes = Object.freeze({auto: 'Game default', classic: 'Classic Gray', ice: 'Ice Blue', 'returnity-amber': 'Returnity Edition', 'returnity-violet': 'Returnity Violet'});
  const finishLabel = value => site.labels?.[value] || finishes[value] || '';
  function configure(next = {}) {
    Object.assign(site, next || {});
    window.dispatchEvent(new Event('pocket-finish-change'));
  }
  const valid = value => Object.prototype.hasOwnProperty.call(finishes, value);
  let finish = 'auto';
  try {
    const saved = localStorage.getItem(finishKey);
    if (valid(saved)) finish = saved;
  } catch {}
  function setFinish(value) {
    if (!valid(value) || finish === value) return;
    finish = value;
    try { localStorage.setItem(finishKey, value); } catch {}
    window.dispatchEvent(new Event('pocket-finish-change'));
  }
  function skinFor(gameId) {
    if (finish === 'auto') return site.skins?.[gameId] || skins[gameId] || site.defaultFinish || '';
    return finish === 'classic' ? '' : finish;
  }
  const actions = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'l', 'r', 'select'];
  const sectors = [['right'], ['up','right'], ['up'], ['up','left'],
                   ['left'], ['down','left'], ['down'], ['down','right']];
  const padMarkup = `<div class="dpad" role="group" aria-label="Eight-way direction pad. Slide toward a corner to combine two directions.">
        <svg class="controller-defs" aria-hidden="true" width="0" height="0"><defs>
          <linearGradient id="padBevel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8c9196"/><stop offset=".18" stop-color="#50565d"/><stop offset=".49" stop-color="#252a30"/><stop offset=".72" stop-color="#101419"/><stop offset="1" stop-color="#06080b"/></linearGradient>
          <linearGradient id="padFace" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#383d43"/><stop offset=".45" stop-color="#272d33"/><stop offset="1" stop-color="#181d23"/></linearGradient>
          <linearGradient id="padLit" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#48655f"/><stop offset=".45" stop-color="#2a4842"/><stop offset="1" stop-color="#182d2c"/></linearGradient>
          <filter id="padGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="12" result="noise"/><feColorMatrix in="noise" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".48"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="SourceGraphic" mode="soft-light"/></filter>
        </defs></svg>
        <svg class="direction-ring" viewBox="0 0 200 200" aria-hidden="true"><path data-directions="up" d="M70.95 10.60 A94 94 0 0 1 129.05 10.60"/><path data-directions="up right" d="M142.68 16.25 A94 94 0 0 1 183.75 57.32"/><path data-directions="right" d="M189.40 70.95 A94 94 0 0 1 189.40 129.05"/><path data-directions="down right" d="M183.75 142.68 A94 94 0 0 1 142.68 183.75"/><path data-directions="down" d="M129.05 189.40 A94 94 0 0 1 70.95 189.40"/><path data-directions="down left" d="M57.32 183.75 A94 94 0 0 1 16.25 142.68"/><path data-directions="left" d="M10.60 129.05 A94 94 0 0 1 10.60 70.95"/><path data-directions="up left" d="M16.25 57.32 A94 94 0 0 1 57.32 16.25"/></svg>
        <span class="pad-well" aria-hidden="true"></span>
        <button class="pad-up" data-key="up" aria-label="Up" aria-pressed="false"><svg viewBox="0 0 100 116" aria-hidden="true" focusable="false"><path class="cap-edge" d="M17 4 Q3 5 3 21 L3 75 Q3 88 14 94 L43 111 Q50 115 57 111 L86 94 Q97 88 97 75 L97 21 Q97 5 83 4 Z"/><path class="cap-face" d="M19 10 Q11 11 11 23 L11 73 Q11 81 19 86 L46 101 Q50 104 54 101 L81 86 Q89 81 89 73 L89 23 Q89 11 81 10 Z"/><path class="cap-sheen" d="M18 13 Q13 15 13 24 L13 72 M20 12 L79 12 Q85 13 86 23"/><path class="cap-foot" d="M18 88 L44 104 Q50 108 56 104 L83 88"/></svg></button>
        <button class="pad-right" data-key="right" aria-label="Move right" aria-pressed="false"><svg viewBox="0 0 100 116" aria-hidden="true" focusable="false"><path class="cap-edge" d="M17 4 Q3 5 3 21 L3 75 Q3 88 14 94 L43 111 Q50 115 57 111 L86 94 Q97 88 97 75 L97 21 Q97 5 83 4 Z"/><path class="cap-face" d="M19 10 Q11 11 11 23 L11 73 Q11 81 19 86 L46 101 Q50 104 54 101 L81 86 Q89 81 89 73 L89 23 Q89 11 81 10 Z"/><path class="cap-sheen" d="M18 13 Q13 15 13 24 L13 72 M20 12 L79 12 Q85 13 86 23"/><path class="cap-foot" d="M18 88 L44 104 Q50 108 56 104 L83 88"/></svg></button>
        <button class="pad-down" data-key="down" aria-label="Down" aria-pressed="false"><svg viewBox="0 0 100 116" aria-hidden="true" focusable="false"><path class="cap-edge" d="M17 4 Q3 5 3 21 L3 75 Q3 88 14 94 L43 111 Q50 115 57 111 L86 94 Q97 88 97 75 L97 21 Q97 5 83 4 Z"/><path class="cap-face" d="M19 10 Q11 11 11 23 L11 73 Q11 81 19 86 L46 101 Q50 104 54 101 L81 86 Q89 81 89 73 L89 23 Q89 11 81 10 Z"/><path class="cap-sheen" d="M18 13 Q13 15 13 24 L13 72 M20 12 L79 12 Q85 13 86 23"/><path class="cap-foot" d="M18 88 L44 104 Q50 108 56 104 L83 88"/></svg></button>
        <button class="pad-left" data-key="left" aria-label="Move left" aria-pressed="false"><svg viewBox="0 0 100 116" aria-hidden="true" focusable="false"><path class="cap-edge" d="M17 4 Q3 5 3 21 L3 75 Q3 88 14 94 L43 111 Q50 115 57 111 L86 94 Q97 88 97 75 L97 21 Q97 5 83 4 Z"/><path class="cap-face" d="M19 10 Q11 11 11 23 L11 73 Q11 81 19 86 L46 101 Q50 104 54 101 L81 86 Q89 81 89 73 L89 23 Q89 11 81 10 Z"/><path class="cap-sheen" d="M18 13 Q13 15 13 24 L13 72 M20 12 L79 12 Q85 13 86 23"/><path class="cap-foot" d="M18 88 L44 104 Q50 108 56 104 L83 88"/></svg></button>
        <span class="pad-center" aria-hidden="true"></span>
      </div>`;

  function mount(host, options = {}) {
    const root = document.createElement('j747-pocket-surface');
    root.hidden = true;
    root.style.cssText = 'position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none';
    const shadow = root.attachShadow({mode:'open'});
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    const finishSheet = link.cloneNode();
    finishSheet.href = stylesheet.replace('pocket-shell.css', 'pocket-ice.css');
    const amberSheet = link.cloneNode();
    amberSheet.href = stylesheet.replace('pocket-shell.css', 'pocket-amber.css');
    const violetSheet = link.cloneNode();
    violetSheet.href = stylesheet.replace('pocket-shell.css', 'pocket-violet.css');
    shadow.append(link, finishSheet, amberSheet, violetSheet);

    const shell = document.createElement('div');
    shell.className = 'safe';
    shell.innerHTML = `
      <section class="device deck" aria-label="747 Pocket handheld">
        <div class="shell-body" aria-hidden="true"></div>
        <div class="shoulders">
          <button type="button" class="shoulder shoulder-l" data-key="l"><span>L</span><small></small></button>
          <button type="button" class="shoulder shoulder-r" data-key="r"><small></small><span>R</span></button>
        </div>
        <div class="cartridge-slot">
          <div class="cartridge"><div class="cart-label"><img alt="" hidden><strong></strong></div>
          <button class="eject" type="button" data-command="eject" aria-label="Eject cartridge and return to shelf" title="Eject cartridge"><span aria-hidden="true">⏏</span></button></div>
        </div>
        <div class="bezel">
          <div class="bezel-head">
            <span class="led-group" aria-hidden="true"><i class="led power"></i><b>PWR</b></span>
            <span class="bezel-title"></span>
            <button class="guide-button" type="button" data-command="help" aria-label="Pocket controls guide" title="Controller guide">?</button>
          </div>
          <div class="screen" aria-hidden="true"></div>
        </div>
        <div class="wordmark" aria-hidden="true"><img src="${base}wordmark.svg?v=200" alt=""></div>
        <div class="direction-control">${padMarkup}<div class="pocket-stick" role="group" aria-label="Analog joystick" hidden><span></span></div></div>
        <div class="faces">
          ${faces.map(([key,position,color])=>`<button type="button" class="face face-${position}" data-key="${key}" style="--c:${color}"><span class="button-face"><span class="face-letter">${key.toUpperCase()}</span><span class="action-name"></span></span></button>`).join('')}
        </div>
        <div class="system-row"><button class="system-btn" type="button" data-command="eject" aria-label="Return to cabinet"><i></i><span>CABINET</span></button>
          <button class="system-btn" type="button" data-key="select"><i></i><span>SELECT</span></button>
          <button class="system-btn" type="button" data-command="menu" aria-label="Start, pause or resume"><i></i><span>START</span></button>
          <button class="system-btn" type="button" data-command="screen" aria-label="Switch to full game view"><i></i><span>SCREEN</span></button>
        </div>
        <div class="grille" aria-hidden="true"></div>
      </section>
      <dialog class="guide" aria-label="747 Pocket controls">
        <h2>747 Pocket controls</h2><p></p><dl></dl><button type="button" data-command="close-guide">Back to game</button>
      </dialog>`;
    shadow.append(shell);
    host.append(root);

    const $ = selector => shell.querySelector(selector);
    const device = $('.device'), pad = $('.dpad'), guide = $('.guide');
    const buttonMap = new Map([...shell.querySelectorAll('[data-key]')].map(b => [b.dataset.key, b]));
    const buttonRims = [...shell.querySelectorAll('[data-directions]')];
    const owners = new Map(), pulseTimers = new Set();
    let held = new Set(), active = false, destroyed = false, latestSize = '';
    let labels = {}, hint = '', cartridge = {title: '', cover: '', id: ''};
    let restorePosition = null, guideOpen = false;

    let flightMode=null;
    const currentMode=()=>cartridge.id==='flight-control-deck'?(flightMode||'stick'):controls.mode;
    const cycleMode=()=>{const mode=currentMode()==='stick'?'pad':'stick';if(cartridge.id==='flight-control-deck'){flightMode=mode;showControl()}else saveControls({...controls,mode})};
    const stick=$('.pocket-stick');
    let stickPointer=null,stickSector='';
    function resetStick(){
      stickPointer=null;stickSector='';stick.style.setProperty('--x','0%');stick.style.setProperty('--y','0%');
      options.onAxes?.(0,0);
    }
    function showControl(){
      dragging.clear();releaseInput();
      pad.hidden=currentMode()==='stick';stick.hidden=!pad.hidden;updateGuide();
    }
    function steerStick(e){
      const r=stick.getBoundingClientRect(), dx=(e.clientX-r.left-r.width/2)/(r.width*.36),dy=(e.clientY-r.top-r.height/2)/(r.height*.36);
      const length=Math.hypot(dx,dy),gain=length>.14?Math.min(1,(length-.14)/.86)/length:0;
      const x=dx*gain,y=dy*gain;
      stick.style.setProperty('--x',(x*48)+'%');stick.style.setProperty('--y',(y*48)+'%');
      const keys=length>.29?sectors[(Math.round(Math.atan2(-dy,dx)/(Math.PI/4))+8)%8]:[];
      if(keys.length&&keys.join()!==stickSector&&e.pointerType==='touch')touchPulse();
      stickSector=keys.join();
      const usesAxes=options.onAxes?.(x,y);
      reconcile('stick',usesAxes?[]:keys);
    }
    stick.addEventListener('pointerdown',e=>{
      if(!mayInput()||stickPointer!==null||e.button!==0)return;
      stickPointer=e.pointerId;e.preventDefault();stick.setPointerCapture(e.pointerId);steerStick(e);
    });
    stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer&&mayInput())steerStick(e);});
    function reconcile(source, keys = []) {
      const nextKeys = keys.filter(key => !buttonMap.get(key)?.disabled);
      if (nextKeys.length) owners.set(source,nextKeys);
      else owners.delete(source);
      const next = new Set([...owners.values()].flat());
      const old = held;
      if(typeof source==='string' && source.startsWith('pointer:') && touchIds.has(source.slice(8)) && [...next].some(k=>!old.has(k)))touchPulse();
      held = next;
      for (const key of old) if (!next.has(key)) options.onInput?.(key, false);
      for (const key of next) if (!old.has(key)) options.onInput?.(key, true);
      for (const [key,button] of buttonMap) {
        button.classList.toggle('held', next.has(key));
        button.setAttribute('aria-pressed', String(next.has(key)));
      }
      for (const rim of buttonRims) {
        rim.classList.toggle('lit',rim.dataset.directions.split(' ').every(key=>next.has(key)));
      }
    }
    function releaseInput() {
      for (const t of pulseTimers) clearTimeout(t);
      pulseTimers.clear();
      resetStick();owners.clear();
      reconcile(null);
    }
    function closeGuide() {
      if (!guideOpen) return;
      guideOpen = false;
      if (guide.open) guide.close();
      options.onGuideChange?.(false);
      if (active) $('.guide-button').focus({preventScroll:true});
    }
    function release() { releaseInput(); closeGuide(); }
    function mayInput() { return active && !guideOpen && !document.hidden; }

    function padKeys(event) {
      const rect = pad.getBoundingClientRect();
      const dx = event.clientX - rect.left - rect.width/2, dy = event.clientY - rect.top - rect.height/2;
      const radius = rect.width/2;
      if (!radius || Math.hypot(dx,dy) < .18*radius || Math.hypot(dx,dy) > 1.12*radius) return [];
      return sectors[(Math.round(Math.atan2(-dy,dx)/(Math.PI/4)) + 8) % 8];
    }
    const dragging = new Set(), touchIds=new Set();
    shell.addEventListener('pointerdown', event => {
      if (!mayInput() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const onPad = event.target.closest('.dpad');
      const button = event.target.closest('[data-key]');
      if (!onPad && (!button || button.disabled)) return;
      const owner = onPad || button;
      if(event.pointerType==='touch')touchIds.add(String(event.pointerId));
      event.preventDefault();
      try { owner.setPointerCapture(event.pointerId); } catch {}
      if (onPad) dragging.add(event.pointerId);
      reconcile('pointer:' + event.pointerId, onPad ? padKeys(event) : [button.dataset.key]);
    });
    pad.addEventListener('pointermove', event => {
      if (!dragging.has(event.pointerId)) return;
      event.preventDefault();
      reconcile('pointer:' + event.pointerId, mayInput() ? padKeys(event) : []);
    });
    function lift(event) {
      if(event.pointerId===stickPointer){resetStick();reconcile('stick');}
      touchIds.delete(String(event.pointerId));
      dragging.delete(event.pointerId);
      if (owners.has('pointer:' + event.pointerId)) reconcile('pointer:' + event.pointerId);
    }
    shadow.addEventListener('lostpointercapture', lift, true);
    window.addEventListener('pointerup', lift, true);
    window.addEventListener('pointercancel', lift, true);
    // Include real keyboard use and assistive activation of the hardware.
    for (const type of ['keydown','keyup']) {
      shell.addEventListener(type, event => {
        const button = event.target.closest('[data-key]');
        if (!button || button.disabled || !mayInput() || ![' ','Enter'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        reconcile('keyboard:'+event.key, type === 'keydown' ? [button.dataset.key] : []);
      });
    }
    shell.addEventListener('focusout', event => {
      if (!event.target.closest('[data-key]')) return;
      reconcile('keyboard: '); reconcile('keyboard:Enter');
    });
    shell.addEventListener('contextmenu', event => event.preventDefault());
    function updateGuide() {
      $('.guide p').textContent = hint;
      $('.guide p').hidden = !hint;
      const rows = [[currentMode()==='stick'?'Joystick':'D-pad', labels.dpad || (controls.mode==='stick'?'Tilt to move':'Eight-way direction pad')]];
      for (const key of ['a','b','x','y','l','r','select']) {
        if (!buttonMap.get(key).disabled) rows.push([key.toUpperCase(), labels[key] || key.toUpperCase()]);
      }
      rows.push(['START','Start, pause or resume'], ['SCREEN','Return to full game view'], ['⏏','Eject cartridge to shelf']);
      const dl = $('.guide dl');
      dl.replaceChildren();
      for (const [key,value] of rows) {
        const term=document.createElement('dt'), desc=document.createElement('dd');
        term.textContent=key; desc.textContent=value; dl.append(term,desc);
      }
    }
    shell.addEventListener('click', event => {
      const b = event.target.closest('button');
      if (!b || b.disabled || !active) return;
      if (b.dataset.command) {
        if (b.dataset.command === 'close-guide') { closeGuide();return; }
        if (guideOpen) return;
        releaseInput(); dragging.clear();
        if (b.dataset.command === 'menu') options.onMenu?.();
        if (b.dataset.command === 'eject') options.onEject?.();
        if (b.dataset.command === 'screen') options.onExit?.();
        if (b.dataset.command === 'help') {
          updateGuide();
          guideOpen=true;
          guide.showModal();
          options.onGuideChange?.(true);
        }
        return;
      }
      if (event.detail === 0 && mayInput() && b.dataset.key) {
        const source=Symbol('assist');
        reconcile(source,[b.dataset.key]);
        const t=setTimeout(()=>{pulseTimers.delete(t);reconcile(source);},110);
        pulseTimers.add(t);
      }
    });
    guide.addEventListener('cancel', event=>{event.preventDefault(); closeGuide();});
    guide.addEventListener('keydown', event=>{
      if (event.key === 'Escape') { event.stopPropagation();event.preventDefault();closeGuide(); }
    });
    guide.addEventListener('close', closeGuide);
    function setLabels(next = {}) {
      releaseInput(); dragging.clear();
      labels = {...next, select:'Game options'};
      for (const [key,b] of buttonMap) {
        const dir = sectors.some(s=>s.length===1 && s[0]===key);
        const label = String(labels[key] || '').trim();
        b.disabled = !dir && !label;
        b.setAttribute('aria-label', label ? key.toUpperCase()+' — '+label : key.toUpperCase());
        b.title = label || key.toUpperCase();
        const caption=b.querySelector('.action-name, small');
        if (caption) caption.textContent = label;
        const letter=b.querySelector('.face-letter');
        if (letter) letter.classList.toggle('solo',!label);
      }
      updateGuide();
    }
    function setProfile(profile = {}) { hint=profile?.hint||'';setLabels(profile?.labels || {}); }
    function applyFinish() {
      const skin = skinFor(cartridge.id);
      $('.wordmark img').src=base+(skin==='ice'||skin==='returnity-violet'?'wordmark.svg':'wordmark-light.svg')+'?v=200';
      $('.bezel-title').textContent=site.bezelTitle||'';
      device.setAttribute('aria-label',skin==='returnity-amber'?'Returnity Pocket Player':'747 Pocket handheld');
      if (skin) { device.dataset.skin = skin; root.dataset.skin = skin; }
      else { delete device.dataset.skin; delete root.dataset.skin; }
    }
    window.addEventListener('pocket-finish-change', applyFinish);
    function setCartridge(next = {}) {
      const title=String(next?.title||'');
      const cover=String(next?.cover||'');
      const img=$('.cart-label img');
      if (cover !== cartridge.cover) {
        img.hidden=true; img.removeAttribute('src');
        if (cover) {
          try {
            const url=new URL(cover,document.baseURI);
            if (url.origin===location.origin || url.protocol==='file:' && location.protocol==='file:') img.src=url.href;
          } catch {}
        }
      }
      if(cartridge.id!==String(next?.id||''))flightMode=null;
      cartridge={title,cover,id:String(next?.id||'')};
      applyFinish();
      $('.cart-label strong').textContent=title || '747 Pocket';
      $('.cart-label').title=title;
      $('.eject').setAttribute('aria-label',title?'Eject '+title+' and return to shelf':'Eject cartridge and return to shelf');
    }
    $('.cart-label img').addEventListener('load', e=>{e.target.hidden=false});
    $('.cart-label img').addEventListener('error', e=>{e.target.hidden=true});
    function setBox(el, x, y, w, h) {
      Object.assign(el.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
    }
    function measure() {
      if (!active || destroyed) return;
      const width=shell.clientWidth, height=shell.clientHeight;
      if (!width || !height) return;
      const wide=width>height;
      const u=wide ? Math.min(width/202,height/92,6) : Math.min(width/100,height/150);
      const sw=wide ? Math.min(width-86*u,(height-16*u)*4/3) : 90*u, sh=sw*3/4;
      const dw=wide ? sw+86*u : 100*u, dh=wide ? sh+16*u : 150*u;
      const sx=wide ? 43*u : 5*u, sy=wide ? 13*u : 16*u;
      device.style.setProperty('--cart-lift',wide ? '0px' : Math.max(0,Math.min(14*u,(height-dh)/2-3*u))+'px');
      const x=shell.offsetLeft+(width-dw)/2+sx, y=shell.offsetTop+(height-dh)/2+sy;
      const signature=[x,y,sw,sh,wide].join(',');
      if (signature===latestSize) return;
      latestSize=signature;
      device.classList.toggle('wide',wide);
      Object.assign(device.style,{width:dw+'px',height:dh+'px',fontSize:u+'px'});
      setBox($('.bezel'),sx-2*u,sy-5*u,sw+4*u,sh+7*u);
      setBox($('.screen'),2*u,5*u,sw,sh);
      setBox($('.direction-control'),wide?3*u:6*u,wide?dh/2-16*u:98*u,36*u,36*u);
      setBox($('.faces'),wide?dw-41*u:52*u,wide?dh/2-23*u:95*u,40*u,40*u);
      setBox($('.wordmark'),wide?2*u:7*u,wide?dh/2+23*u:86*u,wide?39*u:84*u,6*u);
      setBox($('.system-row'),wide?dw-42*u:15*u,wide?dh/2+22*u:137*u,wide?40*u:65*u,9*u);
      const cssNames=['x','y','w','h'];
      [x,y,sw,sh].forEach((n,i)=>host.style.setProperty('--pocket-screen-'+cssNames[i],n+'px'));
      options.onResize?.({x,y,width:sw,height:sh,layout:wide?'wide':'tall'});
    }
    const observer=window.ResizeObserver ? new ResizeObserver(measure) : null;
    observer?.observe(host);observer?.observe(shell);
    link.addEventListener('load',measure);
    window.addEventListener('resize',measure);
    function reset() {dragging.clear();release();}
    function visible(){if (document.hidden) reset();}
    window.addEventListener('blur',reset);
    window.addEventListener('pagehide',reset);
    document.addEventListener('visibilitychange',visible);
    function setActive(enabled) {
      if (destroyed) return;
      enabled=Boolean(enabled);
      if (enabled===active) {if(enabled)measure();return;}
      active=enabled;
      if (enabled && getComputedStyle(host).position==='static') {
        restorePosition=host.style.position; host.style.position='relative';
      }
      root.hidden=!active;
      host.classList.toggle('j747-pocket-active',active);
      latestSize='';
      if (active) {flightMode=null;showControl();measure();}
      else {
        reset();
        for (const key of ['x','y','w','h'])host.style.removeProperty('--pocket-screen-'+key);
        if (restorePosition!==null) {host.style.position=restorePosition;restorePosition=null;}
      }
    }
    setLabels(Object.fromEntries(actions.map(k=>[k,k.toUpperCase()])));
    setCartridge();
    window.addEventListener('pocket-controls-change',showControl);
    showControl();
    return {
      setActive,setLabels,setProfile,setCartridge,cycleMode,currentMode,release:reset,
      destroy() {
        if(destroyed)return;
        setActive(false);destroyed=true;reset();observer?.disconnect();
        window.removeEventListener('pointerup',lift,true);window.removeEventListener('pointercancel',lift,true);
        window.removeEventListener('resize',measure);window.removeEventListener('blur',reset);
        window.removeEventListener('pagehide',reset);document.removeEventListener('visibilitychange',visible);
        window.removeEventListener('pocket-finish-change', applyFinish);
        window.removeEventListener('pocket-controls-change',showControl);
        root.remove();
      }
    };
  }
  window.Jerm747Pocket = {mount, finishes, finishLabel, configure, getFinish: () => finish, setFinish, skinFor, getControls:()=>({...controls}),saveControls,refreshControls};
})();

/* 747 Pocket controls. Attach only inside the currently playing, same-origin game. */
(() => {
  'use strict';
  const blank = {a:'',b:'',x:'',y:'',l:'',r:'',select:''};
  const direction = {up:12,down:13,left:14,right:15};
  const arrow = {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  const standard = {a:0,b:1,x:2,y:3,l:4,r:5,select:8,start:9,...direction};
  const aliases = {'gs-fighter-iii':'gs-fighter-3',flight:'flight-control-deck','get-down':'groove-squad-get-down'};
  const profile = (mode, labels, hint, buttons={}) => ({mode,labels:{...blank,...labels},hint,buttons:{...standard,...buttons}});
  const fight = profile('pad',{a:'Jump',b:'Kick',x:'Punch',y:'V-wave',l:'Guard',r:'High',select:'Music'},
    'D-pad moves and ducks. Hold R for high strikes. Custom game bindings still apply.');
  const storyFight = profile('pad', {...fight.labels, select:'Low'},
    'D-pad moves and ducks. X punches, B kicks. Hold R for high or Select for low. Y fires a V-Wave.', {select:6});
  const climb = profile('pad',{a:'Jump / OK'},'D-pad moves. A selects a story or jumps on the mountain.');
  const focusProfile = profile('focus',{a:'Use',b:'Back'},'Move between controls with the D-pad. Press A to use the focused control, or touch the screen.');
  const profiles = {
    'encore':profile('pad',{a:'Jump',b:'Flip',x:'Fire',y:'Talk',l:'Speed',r:'Flip',select:'Light'},
      'Hold L to run. Combine Jump and Flip for the game’s special moves. A confirms menus.',{x:7,y:6,r:2,select:11}),
    'cd-man':profile('pad',{a:'Jump',b:'Lift',x:'Throw',y:'Run lock',l:'Speed',r:'Speed'},
      'D-pad moves. X throws a light pulse. B lifts or throws a carried item. Hold L to run.'),
    'big-bowl-smash':profile('pad',{a:'Hurdle',b:'Dive',x:'Speed',y:'Stiff arm',l:'Speed',r:'Dive',select:'Sound'},
      'D-pad moves. Hold a direction when diving; hold X for speed. A confirms menu choices.'),
    'tic-tac-steel':profile('pad',{a:'Mark',b:'Back',y:'Options'},
      'D-pad chooses a square or an Ultimate board. A confirms. Y opens game options.'),
    'sumi-sudoku':profile('pad',{a:'Write',b:'Erase',x:'Notes',y:'Options',l:'Digit −',r:'Digit +'},
      'D-pad chooses a cell. L and R choose 1–9, A writes, and X toggles notes.'),
    'flight-control-deck':profile('pad',{a:'Center',b:'Shield',x:'Fire',y:'Warp',l:'Boost',r:'Brake',select:'View'},
      'D-pad steers. A launches from the mission screen. Use the touch display to aim or change flight settings.',{x:7,select:10}),
    'cyborg-coliseum':profile('pad',{a:'Grab / jump',b:'Melee',x:'Fire',y:'Arc lance',l:'Ascend',r:'Descend',select:'Fire'},
      'D-pad moves. X fires the chest cannon. Y cracks a core. A grabs or delivers. Select changes the melee strike or camera.',{x:7,l:10,r:11,select:7}),
    'catalog-clash':climb,
    'gs-fighter-3':profile('pad',{a:'Mid kick',b:'High kick',x:'Mid punch',y:'High punch',l:'Guard',r:'V-wave',select:'Jump'},
      'D-pad moves; A confirms menus. Touch fighter select for the opponent. Custom game bindings still apply.',{l:5,r:7,select:10}),
    'gs-fighter-2':fight, 'groove-squad-get-down':fight,
    'word-search':profile('word',{a:'Mark',b:'Clear',x:'Hint',y:'Pause',l:'Help',r:'Zoom',select:'Puzzle'},
      'D-pad moves the letter cursor. A marks each end of a word. Diagonals and finger tracing both work.'),
    'plugin-twist':profile('plugin',{a:'Swap / left',b:'Right',x:'Mode',y:'Hint',l:'Corner',select:'Help'},
      'D-pad chooses a token. A swaps a pair or twists left, B twists right. X changes mode.'),
    'album-match':profile('album',{a:'Swap →',b:'Swap ↓',x:'Swap ←',y:'Swap ↑'},
      'D-pad moves the tile cursor. Use the four face buttons to swap in that direction; A confirms on result screens.'),
    'beat-room':profile('pad',{a:'Use / play',b:'Sections',x:'− / clear',y:'+ / set',l:'Previous',r:'Next',select:'Pad mode'},
      'L/R choose a section, A enters, B goes back. D-pad moves. In a section L/R browse controls or pages. Select plays your mapped pads.'),
    'wave-run-747':profile('pad',{a:'Gas',b:'Brake',x:'Brake',y:'Reset',l:'Brake',r:'Gas',select:'View'},
      'D-pad steers; Up adds throttle. Hold A or R for gas, B or L to brake. Y puts you back on the course. Start pauses with the full pause screen. Select switches between Chase and Rider camera.',{l:6,r:7,select:9}),
    'pulse-runner':profile('pad',{a:'Fire',b:'Dive',x:'Melee',y:'Grenade',l:'Run',r:'Fire',select:'Start'},
      'D-pad moves and picks an operator. A or R fires, B dives, X strikes, Y throws a grenade. Hold L to run. Select launches or pauses.',{r:7,select:9}),
    'controller-check':profile('focus',{a:'Use',b:'Back'},'The checker reads the connected physical controller. D-pad and A navigate test options.'),
  };
  const defaultProfile = focusProfile;
  // A site can describe its own games: register('returnity', {labels:{a:'Jump'}, hint:'...', buttons:{a:0}}).
  function register(id, spec = {}) {
    if (!id) return;
    // START is the Pocket's own button; a registered game receives it as controller button 9.
    profiles[id] = profile(spec.mode === 'focus' ? 'focus' : 'pad', {start:'Start', ...(spec.labels || {})}, String(spec.hint || ''), spec.buttons || {});
  }
  function gameProfile(id, doc) {
    if (id === 'catalog-clash' && doc?.location.pathname.endsWith('catalog-clash-level10.html')) return storyFight;
    return profiles[aliases[id] || id] || defaultProfile;
  }
  const controlsSelector = 'button:not([disabled]),summary,select:not([disabled]),input:not([disabled]):not([type="hidden"]),a[href]';
  function usable(element) {
    return element && !element.closest('[hidden],[inert],details:not([open]) > :not(summary)') && element.getClientRects().length;
  }
  function focus(element) {
    element?.focus({preventScroll:true});
    element?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  }
  function moveControl(scope, action) {
    const items = [...scope.querySelectorAll(controlsSelector)].filter(usable);
    if (!items.length) return;
    const current = scope.ownerDocument.activeElement, index = items.indexOf(current);
    const step = action === 'up' || action === 'left' ? -1 : 1;
    if (index >= 0 && ['left','right'].includes(action)) {
      if (current.tagName === 'SELECT') {
        const options = [...current.options].filter(o => !o.disabled);
        const i = options.indexOf(current.selectedOptions[0]);
        if (options.length) {
          current.value = options[(i+step+options.length)%options.length].value;
          current.dispatchEvent(new current.ownerDocument.defaultView.Event('change',{bubbles:true}));
        }
        return;
      }
      if (current.type === 'range') {
        step > 0 ? current.stepUp() : current.stepDown();
        current.dispatchEvent(new current.ownerDocument.defaultView.Event('input',{bubbles:true}));return;
      }
    }
    if (action in arrow) focus(items[index < 0 ? 0 : (index + step + items.length) % items.length]);
    else if (action === 'a') {
      const el = index < 0 ? items[0] : current;
      focus(el);
      if (el.tagName !== 'SELECT') el.click();
    } else if (action === 'b') {
      if (scope.matches('dialog[open]')) {
        const ev = new scope.ownerDocument.defaultView.Event('cancel',{cancelable:true});
        if (scope.dispatchEvent(ev)) scope.close();
      } else {
        const back = items.find(el => /^(back|resume|cancel|close)\b/i.test((el.getAttribute('aria-label') || el.textContent).trim()));
        back?.click();
      }
    }
  }
  function keyTap(el, key) {
    if (!el) return;
    const W = el.ownerDocument.defaultView;
    for (const type of ['keydown','keyup']) {
      const ev = new W.KeyboardEvent(type,{key,code:key,bubbles:true,cancelable:true});
      // This Escape belongs to the word grid. The cabinet's Escape binding checks defaultPrevented.
      if (key==='Escape') ev.preventDefault();
      el.dispatchEvent(ev);
    }
  }
  function click(doc, selector) { const el=doc.querySelector(selector); if (el && !el.disabled) el.click(); }
  function puzzleInput(doc, mode, action) {
    const dialog = Array.from(doc.querySelectorAll('dialog[open]')).pop();
    const menu = dialog || (mode==='album' && doc.querySelector('.match-settings,.am-result'));
    if (menu) { moveControl(menu,action);return; }
    if (mode==='focus') { moveControl(doc.body,action);return; }
    if (mode==='word') {
      const cell = doc.activeElement?.matches('#grid .cell') ? doc.activeElement : (doc.querySelector('#grid .cell[tabindex="0"]') || doc.querySelector('#grid .cell'));
      if (action in arrow || action==='a' || action==='b') {
        if (!cell || doc.body.classList.contains('word-paused')) return;
        focus(cell);keyTap(cell,arrow[action] || (action==='a'?'Enter':'Escape'));
        doc.activeElement?.scrollIntoView?.({block:'nearest',inline:'nearest'});
      } else {
        const target={x:'#hint',y:'#pause-game',l:'#help-button',r:doc.body.classList.contains('puzzle-focus')?'#exit-focus':'#zoom',select:'#new'}[action];
        if (target) click(doc,target);
      }
      return;
    }
    if (mode==='plugin') {
      if (action in arrow) {keyTap(doc.querySelector('#board .anchor') || doc.body,arrow[action]);return}
      const target={a:'#left',b:'#right',x:doc.querySelector('#pair')?.getAttribute('aria-pressed')==='true'?'#trio':'#pair',y:'#hint',l:'#corner',select:'#help'}[action];
      if (target) click(doc,target);
      return;
    }
    if (mode==='album') {
      const tile=doc.querySelector('.match-tile.is-cursor') || doc.querySelector('.match-tile');
      if (!tile) return;
      if (action in arrow) {focus(tile);keyTap(tile,arrow[action]);return}
      const dir={a:'right',b:'down',x:'left',y:'up'}[action];
      if (dir) click(doc,'button[aria-label="Swap '+dir+'"]');
    }
  }
  function create({getFrame,getGameId}) {
    let active=false, game='', guest=null, reader=null, nextRepeat=null;
    let stickX=0,stickY=0;
    const held = new Map(), pending = new Map(), touched = new Set();
    function releaseAll() {
      stickX=0;stickY=0;held.clear();touched.clear();
      for(const t of pending.values()) clearTimeout(t);
      pending.clear();clearTimeout(nextRepeat);nextRepeat=null;
    }
    function detach() {
      if (!reader) return;
      const {nav, wrapper, prior} = reader;
      if (nav.getGamepads === wrapper) {
        try { if (prior) Object.defineProperty(nav,'getGamepads',prior);else delete nav.getGamepads; } catch {}
      }
      reader=null;
    }
    function install(w) {
      const nav=w.navigator;
      if (reader?.nav===nav && nav.getGamepads===reader.wrapper) return;
      detach();
      const prior=Object.getOwnPropertyDescriptor(nav,'getGamepads');
      const native=typeof nav.getGamepads==='function' ? nav.getGamepads.bind(nav) : ()=>[];
      function wrapper() {
        let pads;try{pads=Array.from(native()||[])}catch{pads=[]}
        if (!active) return pads;
        const slot=Math.max(0,pads.findIndex(p=>p && p.connected!==false));
        const real=pads[slot];
        // The cabinet consumes Start and Select once, including physical pads.
        const pressedSlots=new Set(Array.from(held.values(), binding=>binding.index));
        const buttons=Array.from({length:Math.max(17,real?.buttons?.length || 0)},(_,i)=>{
          const pressed=pressedSlots.has(i);
          if(i===8||i===9){return {pressed,touched:pressed,value:pressed?1:0}}
          return pressed ? {pressed:true,touched:true,value:1} : real?.buttons?.[i] || {pressed:false,touched:false,value:0};
        });
        const axes=Array.from({length:Math.max(4,real?.axes?.length || 0)},(_,i)=>real?.axes?.[i] || 0);
        if(stickX||stickY){axes[0]=stickX;axes[1]=stickY;
          // These games use the standard D-pad for menu steps; Wave Run reads continuous axes.
          if(game!=='wave-run-747'){
            for(const [axis,index] of [[-stickY,12],[stickY,13],[-stickX,14],[stickX,15]])if(axis>.48)buttons[index]={pressed:true,touched:true,value:1};
          }
        }
        if (held.has('left')||held.has('right')) axes[0]=Number(held.has('right'))-Number(held.has('left'));
        if (held.has('up')||held.has('down')) axes[1]=Number(held.has('down'))-Number(held.has('up'));
        pads[slot]={id:real?.id || '747 Pocket',index:real?.index ?? slot,connected:true,mapping:real?.mapping || 'standard',
          timestamp:w.performance.now(),buttons,axes,vibrationActuator:real?.vibrationActuator,hapticActuators:real?.hapticActuators || []};
        return pads;
      }
      try {Object.defineProperty(nav,'getGamepads',{configurable:true,value:wrapper});reader={nav,prior,wrapper};} catch {}
    }
    function sync() {
      const id=getGameId() || '';
      let current=null;
      if (active) {try {current=getFrame()?.contentDocument || null;} catch {}}
      if (current!==guest || game!==id) {releaseAll();detach();guest=current;game=id;}
      if (guest) install(guest.defaultView);
    }
    function getProfile() {
      let doc;try {doc=getFrame()?.contentDocument;}catch{}
      const {labels,hint}=gameProfile(getGameId() || '',doc);
      return {labels:{...labels},hint};
    }
    function input(action,down) {
      if (!active || !(action in standard)) return;
      sync();if (!guest) return;
      if (!down) {
        touched.delete(action);
        if (action in arrow) {clearTimeout(nextRepeat);nextRepeat=null;}
        const bind=held.get(action);
        if (bind) {
          // A short tap must survive at least one normal gamepad polling frame.
          const delay=Math.max(0,65-(performance.now()-bind.at));
          clearTimeout(pending.get(action));
          if (delay) pending.set(action,setTimeout(()=>{held.delete(action);pending.delete(action)},delay));
          else held.delete(action);
        }
        return;
      }
      if (touched.has(action)) return;
      touched.add(action);
      const p=gameProfile(game,guest);
      if (!(action in arrow) && !p.labels[action]) return;
      if (p.mode==='pad') {
        // Cyborg's title starts only on hardware Start; the Pocket Start button is the visor.
        const start=game==='cyborg-coliseum' && action==='a' && guest.querySelector('#start');
        if (start && usable(start)) {start.click();return}
        clearTimeout(pending.get(action));pending.delete(action);
        held.set(action,{at:performance.now(), index:p.buttons[action]});
      } else {
        puzzleInput(guest,p.mode,action);
        if (action in arrow) {
          clearTimeout(nextRepeat);
          const repeat=()=>{if (!active || !touched.has(action))return;sync();if(!guest||!touched.has(action))return;
            puzzleInput(guest,p.mode,action);nextRepeat=setTimeout(repeat,135);};
          nextRepeat=setTimeout(repeat,400);
        }
      }
    }
    function axes(x,y){
      if(!active)return false;
      sync();if(!guest||gameProfile(game,guest).mode!=='pad')return false;
      stickX=x;stickY=y;return true;
    }
    return {axes,activate(){active=true;sync()},deactivate(){active=false;releaseAll();detach();guest=null;game='';},sync,input,releaseAll,getProfile};
  }
  window.Jerm747PocketInput=Object.freeze({create,register});
})();

/* Embed 747 Pocket around an existing arcade iframe. The game stays in its document. */
(() => {
  'use strict';
  const layouts = {
    'word-search': [4/3, 560], 'album-match': [4/3, 680], 'plugin-twist': [4/3, 660],
    'sumi-sudoku': [4/3, 720], 'tic-tac-steel': [4/3, 660], 'big-bowl-smash': [4/3, 680],
    'beat-room': [4/3, 760], 'controller-check': [4/3, 660]
  };
  const aliases = {'gs-fighter-iii':'gs-fighter-3','get-down':'groove-squad-get-down','flight':'flight-control-deck'};
  const storageKey = id => 'jerm747.pocket.view.v1.' + (aliases[id] || id);
  const defaultViewKey = 'jerm747.pocket.view.v1.default';
  // Hide duplicate touch decks only when the game has a mapped replacement.
  // Menus, board cells, camera regions, and additional on-screen actions stay interactive.
  const guestStyles = {
'sumi-sudoku':`
  html,body{overflow:hidden!important}
  .app{box-sizing:border-box!important;width:100vw!important;height:100dvh!important;max-width:none!important;padding:3px!important;margin:0!important;display:grid!important;grid-template:1fr / minmax(0,1fr) minmax(90px,24%)!important;gap:5px!important}
  .app header,.app .stats,.app .settings,.tools,#controller-guide{display:none!important}
  .boardWrap,.app .side{grid-column:auto!important;grid-row:auto!important;align-self:center;min-width:0}
  .board{width:min(99dvh,100%)!important;min-width:0!important}.app .side{display:block!important}.pad{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:3px!important}.pad button{height:clamp(28px,15dvh,64px)!important}
`,
'album-match':`
 .album-match{padding:3px!important;inset:0!important;overflow:hidden!important}.am-v33{display:grid!important;height:100dvh!important;box-sizing:border-box;grid-template-columns:minmax(0,1fr) minmax(78px,20%);grid-template-rows:auto 1fr auto;align-items:center;gap:3px}
 .am-v33 header,.am-objective,.am-selection,.am-progress,.am-how,.match-guide,.match-help,.am-controls,.match-actions,.am-scores{display:none!important}
 .am-v33 .match-grid{grid-column:1;grid-row:1/4;box-sizing:border-box;width:min(99dvh,100%)!important;max-width:none!important;padding:3px!important;gap:2px!important;margin:auto!important}.match-row{gap:2px!important}.match-status,.match-message{grid-column:2;overflow-wrap:anywhere}.match-status{display:grid!important;padding:2px!important}
`,
'plugin-twist':`
 html,body{overflow:hidden!important}.applet{box-sizing:border-box!important;height:100dvh!important;width:100%!important;max-width:none!important;margin:0!important;padding:3px!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(74px,19%)!important;grid-template-rows:1fr!important;gap:4px!important}
 .applet .top,.storage,.applet .controls,.applet .bottom{display:none!important}.applet .stats{grid-area:1/2;display:flex;flex-direction:column;align-self:center}.applet .arena{grid-area:1/1;width:100%;height:100%;min-height:0;padding:0!important;display:grid;place-items:center}.applet #board{width:min(98dvh,100%)!important;max-height:100%!important}
`,
'tic-tac-steel':`
      html,body {overflow:hidden!important;margin:0!important;padding:0!important}
      .app {position:fixed!important;inset:0;display:block!important;margin:0!important;padding:0!important;max-width:none!important}
      .app > :not(.plateWrap):not(.status),.lamp,#controller-guide {display:none!important}
      .app .plateWrap {position:absolute;inset:0;display:grid;grid-template-columns:1fr;grid-template-rows:1fr;place-items:center;padding:0;margin:0}
      .app .plateWrap .plate {grid-area:1/1;box-sizing:border-box;width:calc(min(100vw,100dvh) - 6px)!important;height:auto;min-width:0!important;max-width:none!important;aspect-ratio:1;margin:0!important}
      .app .board-nav,.app > .status {position:absolute;right:1px;width:max(0px,calc((100vw - 100dvh) / 2 - 2px));box-sizing:border-box;margin:0;padding:2px;min-height:0;z-index:4;text-align:center}
      .app .board-nav {top:2px;display:flex;flex-direction:column;align-items:stretch;gap:6px}
      .app .board-nav button {padding:5px 1px}
      .app > .status {bottom:3px;font-size:clamp(11px,2dvh,16px);line-height:1.15}
      .app .board-nav strong,.app .board-nav button {font-size:clamp(11px,2dvh,16px)}
    `,
'cyborg-coliseum':`
 html,body,main,.cab{margin:0!important;padding:0!important;width:100%!important;height:100%!important;max-width:none!important;overflow:hidden!important}
 body>header,.bar,.deck-head,.deck,footer,.sector,.aux,.eyeline,.playhud button{display:none!important}#screen{position:fixed!important;inset:0!important;height:100%!important;width:100%!important;aspect-ratio:auto!important;border:0!important}#poster small kbd{display:none}
`,
'flight-control-deck':`#drawer,#controller-tools,#controller-view,#controller-mode,#controller-pause,#left,#right,.foot,.center-fire,#mission-help,.race-input #race-throttle{display:none!important}#deck{inset:0!important;width:100%!important;height:100dvh!important;max-width:none!important}#deck canvas{height:100%!important}.race-input:after{display:none!important}`,

    // The board stays touchable. Give the grid most of the aperture and let
    // the word bank and the original toolbar scroll independently.
    'word-search':`
      .app {min-height:0!important;height:100dvh;padding:5px!important;gap:4px!important;}
      .app>header {padding:3px 8px;gap:4px;flex-wrap:nowrap;}
      .app>header h1 {font-size:19px;margin:0}
      .app>header .eyebrow,.app>header .small,.app>progress,.board-panel .bottom,.words-panel>p {display:none}
      .app .stats {font-size:14px;gap:8px;white-space:nowrap;}
      .toolbar {flex-wrap:nowrap;overflow-x:auto;flex-shrink:0;min-height:26px;gap:3px;}
      .toolbar button {white-space:nowrap;font-size:12px;padding:3px 6px;}
      .content {min-height:0!important;grid-template-columns:minmax(0,2.2fr) minmax(0,1fr)!important;grid-template-rows:1fr!important;gap:4px;}
      .board-panel {padding:3px!important;gap:3px;}
      .status {min-height:14px;line-height:1.15;font-size:12px;margin:0;}
      .word-list {grid-template-columns:1fr!important;gap:4px;overflow:auto;}
      .word-list li {font-size:clamp(13px,2.7vw,17px);line-height:1.15;white-space:normal;}
      .words-panel h2 {font-size:16px;margin:5px 8px;}
      .cell:focus-visible {outline:2px solid #ffe6a5;outline-offset:-2px;}
      .puzzle-focus .content {grid-template-columns:1fr!important;}
      .puzzle-focus .words-panel {display:none}
    `,
    'encore':'#game .deck {display:none!important}',
    'cd-man':'#game .deck {display:none!important}',
    'big-bowl-smash':'.controls.deck {display:none!important}',
    'catalog-clash':'.climb-deck {display:none!important}',
    'wave-run-747':'.pad {display:none!important}',
    // Pulse Runner ships inside its own Pocket Player page. In the arcade
    // Pocket, only its game screen is shown; the outer handheld supplies the controls.
    'pulse-runner':`
      html,body {overflow:hidden!important;background:#000!important}
      .top,.sectionhead,footer,.shell-body,.screw,.cartridge-slot,.left-wing,.right-wing,.bezel-head,.bezel-foot {display:none!important}
      main {padding:0!important;margin:0!important;width:100%!important;max-width:none!important}
      .console-stage {position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;max-width:none!important;min-width:0!important;margin:0!important;padding:0!important;display:block!important;background:#000!important}
      .device.deck {position:absolute!important;inset:0!important;width:100%!important;height:100%!important;padding:0!important;border-radius:0!important;display:block!important;transform:none!important}
      .device .bezel {position:absolute!important;inset:0!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important}
      .device .display {position:absolute!important;inset:0!important;width:100%!important;height:100%!important;aspect-ratio:auto!important;border-radius:0!important;border:0!important}
    `
  };
  function create(host, options) {
    let frame = null, gameId = '', guest = null, active = false, held = false, guideOpen = false, aperture = null;
    const remembered = new Map();
    const input = window.Jerm747PocketInput.create({getFrame:()=>frame, getGameId:()=>gameId});
    let menu;
    const shell = window.Jerm747Pocket.mount(host, {
      onAxes(x,y){if(menu?.axes(x,y))return true;return active&&!held&&!guideOpen&&!document.hidden && input.axes(x,y);},
      onInput(action, down) {
        if(!active||held||guideOpen||document.hidden)return;
        if(menu?.navigate(action,down))return;
        if(action==='select'){if(down)menu.options();return}
        input.input(action,down);
      },
      onMenu: () => { if (active && !held) menu.start(); },
      onEject: () => { if (active && !held) options.onEject(); },
      onGuideChange(open) {
        guideOpen = !!open;
        if (open) input.releaseAll();
        options.onGuideChange?.(guideOpen,frame);
      },
      onExit: () => { if (active && !held) setActive(false); },
      onResize(rect) { aperture = rect; sizeFrame(); }
    });
    menu=window.createPocketGameMenu(host,{
      release:()=>input.releaseAll(),blocked:()=>held||guideOpen,
      hud:()=>options.onMenu(),direction:()=>shell.currentMode()==='stick'?'Joystick':'D-pad',switchDirection:()=>shell.cycleMode(),
      legacy:()=>input.getProfile()?.labels?.select,
      oldSelect:()=>{input.input('select',true);setTimeout(()=>input.input('select',false),90)}
    });
    function sizeFrame() {
      if (!active || !frame || !aperture?.width || !aperture.height) return;
      const {x,y,width,height} = aperture;
      const [ratio,minWidth] = gameId==='pulse-runner' ? [width/height,800] : layouts[gameId] || [16/9,800];
      const fittedWidth = Math.min(width, height * ratio);
      const logicalWidth = Math.max(minWidth, Math.ceil(fittedWidth));
      const logicalHeight = logicalWidth / ratio;
      const scale = fittedWidth / logicalWidth;
      const style = frame.style;
      style.setProperty('--pocket-left', (x+(width-fittedWidth)/2)+'px');
      style.setProperty('--pocket-top', (y+(height-logicalHeight*scale)/2)+'px');
      style.setProperty('--pocket-width', logicalWidth+'px');
      style.setProperty('--pocket-height', logicalHeight+'px');
      style.setProperty('--pocket-scale', String(scale));
    }
    function restoreGuest() {
      if (guest) guest.remove();
      guest = null;
    }
    function restoreFrame() {
      restoreGuest();
      if (!frame) return;
      frame.classList.remove('j747-pocket-viewport');
      for (const prop of ['left','top','width','height','scale']) frame.style.removeProperty('--pocket-'+prop);
    }
    function sync() {
      if (!active || !frame) return;
      let doc;
      try { doc = frame.contentDocument; } catch { /* The shell also supports touch-only embeds. */ }
      if (guest && guest.ownerDocument !== doc) restoreGuest();
      const rules = 'kbd,.key-hints,.keyboard-hints,.keyboard-hint,.key-guide,.control-hint-key,[data-keyboard-hint]{display:none!important}'+(guestStyles[gameId]||'');
      if (rules && doc?.head && !guest) {
        guest = doc.createElement('style');guest.dataset.pocketLayout='';guest.textContent=rules;doc.head.append(guest);guest.disabled=window.Jerm747PlayView.board||!window.Jerm747PlayView.shown;
        // Let canvas games re-measure for the new layout.
        try {doc.defaultView.dispatchEvent(new doc.defaultView.Event('resize'));} catch {}
      }
      frame.classList.add('j747-pocket-viewport');
      input.sync();
      shell.setProfile(input.getProfile());
      sizeFrame();menu.layout();
    }
    function setActive(on, save=true) {
      on = !!on && !!frame;
      if (save && gameId) {
        remembered.set(gameId,on);
        try {localStorage.setItem(storageKey(gameId),on?'on':'off');localStorage.setItem(defaultViewKey,on?'on':'off');} catch {}
      }
      if (on !== active) {
        active = on;
        if (on) {
          input.activate();
          shell.setActive(true);
          sync();
        } else {
          shell.release();
          input.deactivate();
          restoreFrame();
          shell.setActive(false);
        }
      } else if (on) sync();
      menu.sync(frame,gameId,active);options.onChange?.(active);
    }
    function setGame(next, id, cartridge) {
      id = aliases[id] || id || '';
      window.Jerm747PlayView.attach(next,id,host);
      if (next === frame && id === gameId) {menu.sync(frame,gameId,active);sync(); return;}
      setActive(false,false);
      frame = next; gameId = next ? id : ''; held = false;menu.sync(frame,gameId,false);
      if (!frame) return;
      if (cartridge) shell.setCartridge({
        id:gameId, title:cartridge.title || (frame.title || gameId),
        cover:cartridge.cover ? new URL(cartridge.cover,location.href).href : ''
      });
      let prefer = remembered.get(gameId);
      if (prefer === undefined) {
        // A game without its own choice follows the last Pocket Player choice.
        try {prefer = (localStorage.getItem(storageKey(gameId)) ?? localStorage.getItem(defaultViewKey)) === 'on';} catch {}
      }
      // A Pocket page launch explicitly opens this cartridge in its advertised finish.
      // Ordinary arcade links keep the player's existing per-game view choice.
      const launch = /^#\/play\/([a-z0-9._-]+)\?pocket=(ice|classic|returnity-amber|returnity-violet)$/.exec(location.hash);
      if (launch && (aliases[launch[1]] || launch[1]) === gameId) {
        window.Jerm747Pocket.setFinish(launch[2]);
        setActive(true);
        history.replaceState(history.state, '', location.pathname + location.search + '#/play/' + launch[1]);
      } else {
        setActive(prefer,false);
      }
    }
    function setHeld(on) {
      held = !!on;
      if (!active) return;
      if (held) {shell.release(); input.releaseAll();} else sync();
    }
    const blur = () => { if (active) {shell.release(); input.releaseAll();} };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('blur',blur);
    document.addEventListener('visibilitychange',visibility);
    return {
      get active(){return active;},systemStart:()=>menu.start(),systemOptions:()=>menu.options(),get systemOpen(){return menu.open},get guideOpen(){return guideOpen||menu.open;}, closeGuide(){if(menu.open){menu.close();return true}if(!guideOpen)return false;shell.release();return true;}, setGame, setActive, setHeld, sync,
      toggle(){if(frame)setActive(!active);},
      destroy(){setGame(null,'');menu.destroy();shell.destroy();window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);}
    };
  }
  window.Jerm747PocketHost = {create};
})();
