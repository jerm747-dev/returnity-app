(() => {
'use strict';
const $ = selector => document.querySelector(selector);
// Where "Play the music" goes: the site's music player. On a Sound Arcade site that is /#/music.
const MUSIC_URL = '/#/music';
document.querySelectorAll('[data-music]').forEach(link => { link.href = MUSIC_URL; });
const crew=[
 ['cocoa','Cocoa Block','Steady steps, three D.C. stars.','#dbb599'],
 ['crown','Crown Cap','A quick red crest on tiny boots.','#e8a9aa'],
 ['peach','Peach Skip','A little spring under that stem.','#f0bf88'],
 ['marker','Green Marker','Quick patrol, bright white shoes.','#a9cbbb'],
 ['shield','Shield Shuffle','Waits a beat, then speeds up.','#afc0ce']
];
for(const [index,[type,name,copy,swatch]] of crew.entries()){
 const card=document.createElement('article');card.className='card';card.style.setProperty('--swatch',swatch);
 card.innerHTML='<div class="card-face"><span class="cardno">NO. 0'+(index+1)+'</span><canvas width="248" height="200" aria-hidden="true"></canvas></div><div class="card-caption"><h3>'+name+'</h3><p>'+copy+'</p></div>';
 $('#gallery').append(card);const c=card.querySelector('canvas').getContext('2d');c.scale(4,4);Cast.drawCritter(c,type,31,43,{phase:index*.5});
}

const launcher = $('#game-launcher');
const gameFrame = $('#game-frame');
const help = $('#help');

function openGame() {
 if (help.open) help.close();
 gameFrame.src = 'highway-encore/index.html?embedded=1&autostart=1';
 launcher.showModal();
 gameFrame.focus();
}

document.querySelectorAll('[data-play]').forEach(button => button.onclick = openGame);
document.querySelectorAll('[data-help]').forEach(button => button.onclick = () => help.showModal());
$('[data-close-help]').onclick = () => help.close();
$('#return-to-page').onclick = () => launcher.close();
help.addEventListener('click', event => { if (event.target === help) help.close(); });
launcher.addEventListener('close', () => {
 gameFrame.src = 'about:blank';
});
})();
