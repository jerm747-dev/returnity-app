/* Painted scenery for the Returnity highway. All dimensions are in game space. */
(() => {
  'use strict';
  const tiles = new Map();
  const sceneHeight = 432;
  const mod = (x, span) => ((x % span) + span) % span;
  const clamp = value => Math.min(1, Math.max(0, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

  function rect(c, color, x, y, w, h) {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  }
  function shape(c, color, points) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
    c.closePath();
    c.fill();
  }
  function disc(c, color, x, y, radius) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fill();
  }
  function makeTile(key, w, h, paint) {
    if (!tiles.has(key)) {
      const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      paint(canvas.getContext('2d'));
      tiles.set(key, canvas);
    }
    return tiles.get(key);
  }
  function tileRow(c, tile, offset, y, width) {
    const first = -Math.floor(mod(offset, tile.width));
    for (let x = first; x < width; x += tile.width) c.drawImage(tile, x, y);
  }
  const hills = (c, fill, top, amp, offset, width) => {
    const knots = [0, 6, 4, 16, 20, 15, 17, 5, 8, 2, 12, 7, 0];
    const step = 54, period = (knots.length - 1) * step;
    const start = -Math.floor(mod(offset, period));
    c.fillStyle = fill;
    c.beginPath(); c.moveTo(start, 440);
    for (let x = start; x <= width + period; x += period) {
      for (let i = 0; i < knots.length; i++) c.lineTo(x + i * step, top - amp * knots[i]);
    }
    c.lineTo(width + period, 440); c.closePath(); c.fill();
  };

  function skyWash(c) {
    const grad = c.createLinearGradient(0, 0, 0, 335);
    grad.addColorStop(0, '#b56b92'); grad.addColorStop(.28, '#dd8490');
    grad.addColorStop(.54, '#f29b87'); grad.addColorStop(.84, '#ffbd84'); grad.addColorStop(1, '#ffd391');
    c.fillStyle = grad; c.fillRect(0, 0, 256, sceneHeight);
    // A light stochastic ink texture. The generated tile is painted only once.
    let state = 364;
    const rand = n => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % n; };
    for (let i = 0; i < 6700; i++) {
      rect(c, i % 3 ? 'rgba(73,29,81,.055)' : 'rgba(255,237,180,.12)', rand(256), rand(360), 1, 1);
    }
  }
  function paintSun(c) {
    // The clipped bands are transparent: the real sky shows through the record.
    const sun = c.createLinearGradient(0, 0, 0, 126);
    sun.addColorStop(0, '#ffe4a0'); sun.addColorStop(.55, '#ffcf80'); sun.addColorStop(1, '#ffb578');
    disc(c, sun, 64, 64, 59);
    for (const [y, h] of [[70,1],[78,2],[88,3],[99,4],[111,5]]) c.clearRect(0,y,128,h);
    c.strokeStyle = 'rgba(255,224,159,.45)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(64,64,63,3.36,5.35); c.stroke();
  }
  function cloud(c, x, y, scale, shade) {
    c.save(); c.translate(x,y); c.scale(scale,scale);
    const steps = [0,9, 12,9, 16,5, 35,5, 39,2, 62,2, 65,0, 75,0, 78,4, 96,4, 100,7, 117,7, 122,9, 106,10, 109,12, 21,12, 25,10];
    shape(c,shade,steps); rect(c,shade,130,7,16,2); rect(c,shade,-16,13,26,2); c.restore();
  }
  function skylineBase(c) {
    rect(c,'#a46682',0,133,576,65);
    const widths = [24,10,31,14,25,36,15,27,22,37,18,28,16,25,46,31,13,40,20,30,44,34];
    let x = 0;
    for (let i = 0; x < 576; i++) {
      const w = widths[i % widths.length], h = 8 + (i * 31 + 19) % 39;
      rect(c,'#aa7189',x,134-h,w-2,h+2);
      if (i % 4 === 0) rect(c,'#aa7189',x+w/3,130-h,w/2,5);
      x += w;
    }
  }
  const skylineInk = '#8c5779', skylineLight = '#c7818c', skylineDeep = '#785071';
  function dcCity(c) {
    skylineBase(c);
    // Obelisk with a narrow lit face, and the low civic avenue.
    shape(c,skylineInk,[91,155, 96,62, 101,50, 106,62, 109,155]);
    shape(c,skylineLight,[101,50, 106,62, 109,155, 104,155, 101,63]);
    rect(c,skylineInk,82,151,38,7);
    for (const [x,y,w] of [[8,128,34],[39,118,43],[143,125,48],[185,114,43],[249,127,31],[434,122,54],[500,113,60]]) {
      rect(c,skylineInk,x,y,w,157-y); rect(c,skylineDeep,x,y+6,w,2);
      for(let wx=x+4;wx<x+w-3;wx+=7) rect(c,skylineLight,wx,y+12,2,8);
    }
    // Layer a stylized Capitol-like dome over its two colonnaded wings.
    c.save(); c.translate(330,145);
    rect(c,skylineInk,-79,-17,159,27); rect(c,skylineInk,-62,-22,124,6);
    rect(c,skylineInk,-33,-36,66,29); rect(c,skylineDeep,-30,-40,60,6);
    shape(c,skylineInk,[-24,-40,-24,-49,-20,-52,-18,-58,-11,-65,-7,-70,7,-70,11,-65,18,-58,20,-52,24,-49,24,-40]);
    rect(c,skylineInk,-4,-80,8,12); rect(c,skylineInk,-6,-81,12,2); rect(c,skylineInk,-1,-89,2,9);
    shape(c,skylineLight,[5,-69,10,-64,16,-57,18,-53,15,-53,10,-59]);
    rect(c,skylineLight,-24,-43,48,2); rect(c,skylineLight,-82,-17,164,2);
    for (let x=-76;x<77;x+=9) rect(c,skylineLight,x,-12,2,9);
    c.restore(); rect(c,skylineInk,0,154,576,55);
  }
  function crownCity(c) {
    skylineBase(c);
    // From beveled art-deco stair steps to a high three-point crown at its core.
    const towers = [[5,34,48],[41,24,69],[69,39,79],[111,35,56],[149,49,82],[204,37,108],[246,39,65],[289,49,98],[344,31,85],[382,48,68],[434,28,59],[467,47,85],[521,48,54]];
    for (let i=0;i<towers.length;i++) {
      const [x,w,h]=towers[i], y=157-h;
      rect(c,skylineInk,x,y+9,w,h-9); rect(c,skylineInk,x+3,y+4,w-6,8); rect(c,skylineInk,x+7,y,w-14,7);
      rect(c,skylineDeep,x+w-6,y+10,6,h-10);
      for(let wx=x+6;wx<x+w-8;wx+=8) for(let wy=y+16;wy<147;wy+=13) {
        if((i+wx+wy)%3!==0) rect(c,skylineLight,wx,wy,2,4);
      }
      if(i===5||i===7) {
        shape(c,skylineInk,[x+4,y+5,x+4,y-19,x+13,y-8,x+w/2,y-31,x+w-12,y-8,x+w-4,y-19,x+w-4,y+5]);
        rect(c,skylineLight,x+5,y+1,w-10,2);
      }
    }
    rect(c,skylineInk,0,153,576,56);
  }
  function orchard(c) {
    // A water tower and low farm roofs leave headroom for the forward road.
    rect(c,'#ac7388',0,144,576,62);
    for(const [x,y] of [[95,135],[169,129],[303,137],[440,130],[494,135]]) {
      rect(c,skylineInk,x,y,36,22); shape(c,skylineInk,[x-5,y,x+2,y-7,x+17,y-15,x+38,y-3,x+41,y]);
      rect(c,skylineLight,x+8,y+4,4,5);
    }
    c.save(); c.translate(232,150);
    shape(c,skylineInk,[-19,-60,19,-60,17,-39,7,-33,-7,-33,-17,-39]);
    shape(c,skylineInk,[-22,-61,0,-73,22,-61]); rect(c,skylineLight,-19,-57,38,3);
    for(const x of [-13,10]) shape(c,skylineInk,[x,-37,x+3,-37,x+6,0,x,0]);
    shape(c,skylineInk,[-11,-30,13,-6,11,-4,-12,-26]);
    shape(c,skylineInk,[12,-28,-10,-5,-13,-5,11,-32]); c.restore();
    rect(c,skylineInk,0,153,576,56);
  }
  function tree(c, x, y, scale, fruit = false) {
    c.save(); c.translate(x,y); c.scale(scale,scale);
    const wood = '#5e4168', leaves = '#835274', shade = '#714b70';
    rect(c,wood,-2,-24,5,26);
    shape(c,wood,[-1,-15,-11,-25,-9,-25,1,-20,9,-29,12,-28,3,-15]);
    shape(c,leaves,[-19,-25,-19,-31,-16,-31,-14,-36,-8,-38,-8,-40,0,-40,4,-42,13,-40,14,-36,19,-34,20,-29,17,-25,14,-25,11,-21,4,-21,0,-23,-6,-21,-12,-21,-15,-25]);
    shape(c,shade,[-19,-28,-10,-27,-5,-23,3,-26,10,-24,17,-29,20,-29,17,-25,14,-25,11,-21,4,-21,0,-23,-6,-21,-12,-21,-15,-25]);
    if(fruit) {rect(c,'#ef9a7e',-11,-33,3,3);rect(c,'#f2ab80',4,-36,3,3);rect(c,'#de8b7f',8,-29,4,3);}
    c.restore();
  }
  function paintWayside(c, fruit) {
    for (const [x,y,s] of [[14,58,.77],[62,60,1.02],[103,61,.69],[193,60,.57],[246,58,.80],[354,61,.67],[412,59,.89],[458,61,.62]]) tree(c,x,y,s,fruit);
    shape(c,'#694969',[0,59,49,60,66,58,106,58,136,60,166,61,188,58,218,57,247,59,284,60,333,56,384,59,424,57,460,58,480,60,480,100,0,100]);
    // The far shoulder includes a second horizon and sparse guard rails.
    rect(c,'#b37b8a',0,65,480,2); rect(c,'#835873',0,67,480,2);
    for (let x=1;x<480;x+=24) rect(c,'#634463',x,69,2,6);
  }
  function drawSky(c, width, height, cameraX=0, time=0, progress=0) {
    c.save();
    const scale = height / sceneHeight, view = width / scale;
    c.scale(scale,scale); c.imageSmoothingEnabled = false;
    const cx = cameraX / scale;
    tileRow(c,makeTile('sky',256,sceneHeight,skyWash),0,0,view);
    const sunX = Math.round(view * .72 - Math.min(52,cx*.009));
    c.drawImage(makeTile('sun',128,128,paintSun),sunX-64,41);
    const clouds = makeTile('cloud',700,125, ctx => {
      cloud(ctx,36,40,.69,'#e297a0'); cloud(ctx,298,32,.88,'#e6a0a5'); cloud(ctx,537,69,.58,'#edaaa2');
      cloud(ctx,129,90,1.2,'#efa6a0'); cloud(ctx,390,108,.48,'#f3b198');
    });
    tileRow(c,clouds,cx*.08,7,view);
    hills(c,'#d18b95',232,1.25,cx*.12,view);
    hills(c,'#c48390',251,1.51,cx*.16+202,view);
    const city = smooth((progress-.25)/.16), peach = smooth((progress-.58)/.15);
    const layers = [[1-city,'dc',dcCity],[city*(1-peach),'crown',crownCity],[peach,'orchard',orchard]];
    for(const [alpha,key,paint] of layers) {
      if(alpha<=0) continue;
      c.globalAlpha=alpha;
      tileRow(c,makeTile(key,576,204,paint),cx*.235,117,view);
    }
    c.globalAlpha=1;
    hills(c,'#946382',295,1.24,cx*.33+80,view);
    hills(c,'#805876',310,1.09,cx*.4,view);
    tileRow(c,makeTile(peach>.47?'avenuePeach':'avenue',480,100,ctx=>paintWayside(ctx,peach>.47)),cx*.49,256,view);
    // Maintain a valley beneath gaps with quiet horizontal bands of distant water.
    rect(c,'#51435f',0,350,view,82);
    rect(c,'#6b5b77',0,363,view,3); rect(c,'#5d596f',0,390,view,5);
    const shimmer=makeTile('water',192,42,ctx=>{
      [[9,6,41],[68,8,17],[110,15,52],[20,27,24],[99,33,24],[135,32,31]].forEach(([x,y,w])=>rect(ctx,'#8d7083',x,y,w,1));
    });
    tileRow(c,shimmer,cx*.2,359,view); c.restore();
  }
  function pavement(c) {
    rect(c,'#3c324f',0,0,128,15);
    rect(c,'#c8c4aa',0,0,128,2); rect(c,'#92a8a9',0,2,128,2);
    rect(c,'#66506a',0,4,128,1);
    rect(c,'#e9b777',12,6,37,2); rect(c,'#e9b777',77,6,37,2);
    rect(c,'#463650',0,10,128,1);
    [[6,8],[56,9],[71,6],[119,9],[17,11],[35,5],[90,10]].forEach(([x,y])=>rect(c,'#786473',x,y,2,1));
    rect(c,'#252741',0,12,128,3);
  }
  function retainingWall(c) {
    rect(c,'#3a324c',0,0,112,54);
    // Irregular rows of cut masonry, with just enough edge light to reveal the joints.
    for(let row=0;row<3;row++) {
      const shift = row%2 ? -28 : 0, y=row*18;
      for(let x=shift;x<112;x+=56) {
        const face = (x/28+row)%3 ? '#484055' : '#504457';
        rect(c,face,x+1,y+1,54,15); rect(c,'#594b5f',x+2,y+1,52,1);
        rect(c,'#392f46',x+1,y+15,54,2); rect(c,'#645164',x+7,y+6,8,1);
        rect(c,'#3e354b',x+29,y+11,7,1);
      }
    }
  }
  function drawRoad(c, screenX, topY, width, height, worldX=0, kind='ground') {
    if (width <= 0 || height <= 0) return;
    c.save(); c.translate(Math.round(screenX),Math.round(topY));
    c.beginPath(); c.rect(0,0,width,height); c.clip(); c.imageSmoothingEnabled=false;
    const road=makeTile('pavement',128,15,pavement);
    tileRow(c,road,worldX,0,width);
    if (kind === 'ledge') {
      rect(c,'#27263f',0,11,width,Math.min(16,height-11));
      rect(c,'#588c90',0,12,width,3); rect(c,'#426875',0,15,width,4);
      rect(c,'#313749',0,19,width,4); rect(c,'#233040',0,22,width,2);
      for(let x=6;x<width-2;x+=23) {rect(c,'#26394b',x,15,4,4);rect(c,'#9db6a2',x,15,2,2);}
      rect(c,'#9aab9e',0,3,2,12); rect(c,'#2e414e',width-3,3,3,14);
    } else {
      const masonry = makeTile('masonry',112,54,retainingWall);
      for(let y=21;y<height;y+=54) tileRow(c,masonry,worldX,y,width);
      rect(c,'#6d797e',0,15,width,2); rect(c,'#454557',0,17,width,3);
      rect(c,'#2f2d43',0,20,width,4);
      for(let x=-mod(worldX,112);x<width;x+=112) {
        rect(c,'#3a334a',x+4,23,9,height-23); rect(c,'#625263',x+4,24,2,height-24);
      }
      rect(c,'#665668',0,23,2,height-23); rect(c,'#2e293f',width-3,20,3,height-20);
      rect(c,'#514355',2,14,4,7); rect(c,'#514355',width-6,14,4,7);
    }
    c.restore();
  }

  const estate = {
    ink:'#3b3049', brick:'#a85e64', sun:'#d48477', light:'#eaaa87',
    dark:'#7c4b5e', roof:'#3f646d', shingle:'#508086', copper:'#d5ad7f',
    pane:'#ffd584', paneHot:'#ffebb0'
  };
  function windowPane(c,x,y,w,h,arched = false) {
    const p=estate;
    rect(c,p.ink,x-2,y-2,w+4,h+5);
    if(arched) {rect(c,p.ink,x,y-4,w,3);rect(c,p.copper,x+2,y-3,w-4,2);}
    rect(c,p.pane,x,y,w,h); rect(c,p.paneHot,x,y,Math.max(2,Math.floor(w/2)),h-2);
    rect(c,p.dark,x+Math.floor(w/2),y,1,h);
    rect(c,p.dark,x,y+Math.floor(h*.52),w,1);rect(c,p.light,x-3,y+h+1,w+6,2);
  }
  function drawEstate(c) {
    const p=estate;
    c.translate(103,187); // local artwork coordinates use the road as the baseline
    // Estate wings: steep slate mansard, chimneys, and three lit dormers.
    rect(c,p.ink,-89,-86,220,84); rect(c,p.brick,-86,-82,215,80);
    rect(c,p.dark,-82,-62,99,59); rect(c,p.brick,-80,-60,94,53);
    rect(c,p.ink,-78,-112,9,25); rect(c,p.dark,-76,-112,5,23);rect(c,p.copper,-80,-114,12,3);
    rect(c,p.ink,101,-122,9,26);rect(c,p.dark,104,-122,4,24);rect(c,p.copper,99,-124,13,3);
    shape(c,p.ink,[-95,-76,-82,-106,-67,-112,109,-112,125,-104,138,-76]);
    shape(c,p.roof,[-90,-79,-79,-104,-67,-107,109,-107,123,-101,133,-79]);
    shape(c,'#38505e',[104,-107,122,-101,134,-78,112,-78]);
    for(let y=-103;y< -78;y+=6) {
      for(let x=-73+(y%4);x<112;x+=13) rect(c,p.shingle,x,y,6,1);
    }
    rect(c,p.copper,-70,-111,178,2);
    for(const x of [-67,-41,104]) {
      shape(c,p.ink,[x-8,-87,x-8,-98,x,-105,x+8,-98,x+8,-87]);
      shape(c,p.light,[x-6,-89,x-6,-97,x,-102,x+6,-97,x+6,-89]);windowPane(c,x-3,-97,6,7);
    }
    rect(c,p.ink,-94,-78,228,5);rect(c,p.light,-94,-78,228,2);
    rect(c,p.light,-85,-41,213,3);rect(c,p.dark,-85,-38,213,3);
    for(const x of [-72,-48,-24,98,121]) {windowPane(c,x-4,-63,8,14,true);windowPane(c,x-4,-27,8,16);}
    // A tall square tower with a short crenellated lantern; the flag sits forward of it.
    rect(c,p.ink,20,-142,66,138);rect(c,p.brick,23,-139,59,133);
    rect(c,p.sun,23,-139,43,132);rect(c,p.dark,66,-139,15,133);
    for(let y=-126;y<-11;y+=13) {rect(c,p.light,23,y,6,3);rect(c,p.brick,62,y,5,3);rect(c,p.brick,74,y+4,7,3);}
    rect(c,p.ink,16,-145,74,8); rect(c,p.copper,17,-145,71,3);
    rect(c,p.ink,18,-158,70,14); rect(c,p.brick,21,-155,64,10);
    for(let x=18;x<85;x+=12) {
      rect(c,p.ink,x,-167,9,13); rect(c,p.sun,x+2,-165,5,10);rect(c,p.light,x+1,-166,7,2);
    }
    rect(c,p.light,21,-150,64,2);
    for(const x of [33,48,71]) windowPane(c,x,-129,7,15,true);
    rect(c,p.dark,20,-103,65,4);rect(c,p.light,20,-105,65,3);
    for(const x of [33,49,72])windowPane(c,x,-93,7,15,true);
    // Warm arched entrance, one doorframe and two rows of broad stone steps.
    rect(c,p.ink,32,-48,23,42); rect(c,p.ink,35,-52,17,7);
    rect(c,p.copper,34,-47,19,39);rect(c,p.copper,37,-50,13,6);
    rect(c,p.dark,37,-43,13,34);rect(c,p.pane,37,-45,13,8);
    rect(c,p.ink,43,-45,1,35);rect(c,p.paneHot,46,-26,2,2);
    for(const [x,y,w] of [[25,-8,39],[20,-5,49],[13,-2,63]]) {rect(c,p.ink,x,y,w,3);rect(c,p.light,x,y,w,1);}
    rect(c,p.ink,-88,-4,101,4);rect(c,p.ink,76,-4,54,4);
    // Shrubs anchor the exterior to the route; their plain foliage frames the steps.
    for(const [x,w] of [[-99,32],[-57,35],[92,42],[134,29]]) {
      shape(c,'#355661',[x,0,x,-7,x+4,-9,x+5,-14,x+10,-16,x+14,-13,x+19,-15,x+w-4,-10,x+w,-6,x+w,0]);
      rect(c,'#60918c',x+5,-12,5,2);rect(c,'#60918c',x+16,-10,5,2);
    }
  }
  function drawTower(c,screenX,groundY,time=0,raised=false) {
    const x=Math.round(screenX),y=Math.round(groundY);
    c.save(); c.translate(x,y); c.imageSmoothingEnabled=false;
    c.drawImage(makeTile('mansion',277,193,drawEstate),-103,-187);
    // Flagpole in front, with its flag to the left so its silhouette clears the tower.
    rect(c,estate.ink,-3,-173,6,172);rect(c,'#eaba7b',-2,-172,2,169);
    rect(c,'#736777',0,-172,2,169);disc(c,estate.ink,0,-175,5);disc(c,'#ffc879',-1,-176,3);
    rect(c,estate.ink,-8,-5,16,5);rect(c,'#d59a7a',-7,-5,14,2);
    const raise=typeof raised==='number'?clamp(raised):raised?1:0;
    const fy=-117-raise*51, wave=Math.sin(time*4.0), tail=wave*2;
    shape(c,estate.ink,[-3,fy,-14,fy+1,-24,fy-2,-43,fy-3+tail,-36,fy+5+tail,-43,fy+14+tail,-26,fy+14,-16,fy+17,-3,fy+15]);
    shape(c,'#e96878',[-4,fy+2,-14,fy+3,-25,fy,-40,fy-1+tail,-34,fy+5+tail,-40,fy+12+tail,-26,fy+12,-16,fy+15,-4,fy+13]);
    shape(c,'#ffcc7c',[-7,fy+4,-13,fy+5,-22,fy+3,-19,fy+7,-26,fy+10,-16,fy+10,-10,fy+12,-12,fy+8]);
    c.restore();
  }
  globalThis.RoadArt=Object.freeze({drawSky,drawRoad,drawTower});
})();
