// Standalone pages follow the device by default; the arcade supplies its own toolbar.
(()=>{
 async function orientation(mode){
  if(mode==='auto'){try{screen.orientation?.unlock?.()}catch{}return 'Auto: follows your device.';}
  try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();if(!screen.orientation?.lock)throw Error();await screen.orientation.lock(mode);return mode+' fullscreen selected.';}
  catch{return 'Rotate your device to switch orientation. This browser does not allow orientation locking.';}
 }
 window.Jerm747Display={orientation};
 if(parent!==window)return;document.body.classList.add('has-display-toolbar');
 const bar=document.createElement('div');bar.className='standalone-display';
 bar.innerHTML='<label>Display <select aria-label="Game orientation"><option value="auto">Auto</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><button type="button">Fullscreen</button><span role="status"></span>';
 const style=document.createElement('style');style.textContent='.standalone-display{position:fixed;right:0;left:0;top:0;height:44px;z-index:100;display:flex;gap:6px;align-items:center;padding:5px 8px;border-radius:8px;background:#171322ed;color:#ffe1b2;border:1px solid #776281;font:11px system-ui}.standalone-display button,.standalone-display select{font:inherit;padding:5px;color:inherit;background:#31283e;border:1px solid #776281;border-radius:4px}.standalone-display span:empty{display:none}.standalone-display span{position:absolute;top:44px;left:0;right:0;max-width:none;background:#21182fee;padding:8px}.has-display-toolbar{padding-top:44px}.has-display-toolbar .app,.has-display-toolbar .applet{height:calc(100dvh - 44px)}.has-display-toolbar .album-match{top:44px}';document.head.append(style);document.body.append(bar);
 bar.querySelector('select').onchange=async e=>bar.querySelector('span').textContent=await orientation(e.target.value);
 bar.querySelector('button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else{await document.documentElement.requestFullscreen();await orientation(bar.querySelector('select').value)}}catch{bar.querySelector('span').textContent='Fullscreen is unavailable in this browser.'}};
})();
