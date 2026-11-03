/* Returnity road cast. Origins are at the ground, with positive X facing right. */
(() => {
  'use strict';

  const ink = '#231928';
  const ivory = '#fff2c8';
  const gold = '#ffd256';
  const magenta = '#ef3b88';
  const teal = '#38cfbc';
  const skin = '#aa5a39';
  const skinLight = '#d3834e';
  const night = '#25233a';
  const paths = new Map();

  function shape(ctx, data, fill, stroke = null, width = 1) {
    let path = paths.get(data);
    if (!path) {
      path = new Path2D(data);
      paths.set(data, path);
    }
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(path);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke(path);
    }
  }

  function ellipse(ctx, x, y, rx, ry, color, edge = null, width = 1) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function gesture(ctx, points, color, width) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function sneaker(ctx, x, y, angle, far) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    shape(ctx, 'M-4 -7 L4 -8 L6 -3 Q10 -2 13 0 L13 3 L-5 3 L-6 0 Z', far ? '#574659' : '#f4dfb5', ink, 2.7);
    shape(ctx, 'M-4 -6 L1 -6 L1 -1 L3 1 L-4 1 Z', far ? '#943063' : magenta);
    shape(ctx, 'M2 -5 L5 -5 L6 -2 L9 -1 L7 1 L3 -1 Z', night);
    shape(ctx, 'M-4 2 L4 2 L9 1 L12 1', null, far ? '#bb9ba1' : ivory, 1.5);
    shape(ctx, 'M3 -4 L5 -3 M4 -2.5 L6 -1.5', null, ivory, 1);
    ctx.restore();
  }

  function leg(ctx, hip, knee, ankle, shoeAngle, far) {
    const joints = [hip, knee, ankle];
    gesture(ctx, joints, ink, 11);
    gesture(ctx, joints, far ? '#332c40' : '#3a344a', 7.7);
    gesture(ctx, [[knee[0] - 1, knee[1]], [ankle[0] - 1, ankle[1] - 3]], far ? '#4b3b53' : '#655367', 1.7);
    gesture(ctx, [[hip[0] + 2, hip[1] + 2], [hip[0] * .60 + knee[0] * .40 + 2, hip[1] * .60 + knee[1] * .40]], far ? '#6a344e' : magenta, 1.8);
    sneaker(ctx, ankle[0], ankle[1] + 2, shoeAngle, far);
  }

  function arm(ctx, shoulder, elbow, hand, far, mic) {
    gesture(ctx, [shoulder, elbow, hand], ink, 8.4);
    gesture(ctx, [shoulder, elbow, hand], far ? '#312339' : night, 6.2);
    gesture(ctx, [shoulder, [(shoulder[0] + elbow[0]) / 2, (shoulder[1] + elbow[1]) / 2], elbow], far ? '#963958' : magenta, 3.6);
    const cuff = [elbow[0] * .31 + hand[0] * .69, elbow[1] * .31 + hand[1] * .69];
    gesture(ctx, [elbow, cuff], far ? '#97684b' : teal, 2);
    gesture(ctx, [cuff, hand], far ? '#9d5e45' : skinLight, 4.7);
    if (mic) {
      ctx.save();
      ctx.translate(hand[0], hand[1]);
      ctx.rotate(-.96);
      shape(ctx, 'M-1.3 4 L-2 -6 L2 -6 L1.3 4 Z', '#737685', ink, 1);
      ellipse(ctx, 0, -7, 2.6, 3.4, '#a9b5bb', ink, 1.1);
      shape(ctx, 'M-1.8 -8 L1.7 -8 M-2 -6.9 L1.7 -6.9', null, '#465062', .55);
      ctx.restore();
    }
    ellipse(ctx, hand[0], hand[1], 3.3, 3.7, far ? skin : skinLight, ink, 1.05);
  }

  function jacket(ctx) {
    shape(ctx, 'M-7 -84 Q-14 -83 -16 -77 L-13 -62 L-14 -44 Q-1 -39 13 -45 L11 -68 L15 -77 Q13 -83 5 -84 Z', night, ink, 3);
    shape(ctx, 'M-6 -82 Q0 -76 6 -82 L8 -45 Q1 -43 -7 -45 L-5 -62 Z', ivory, ink, 1.2);
    shape(ctx, 'M-6 -64 L-3 -49 L5 -47 L-6 -47 Z', '#d6ab85');
    shape(ctx, 'M-13 -77 L-8 -83 L-6 -79 L-7 -64 L-10 -62 L-8 -51 L-12 -46 L-12 -59 Z', '#423952');
    shape(ctx, 'M-13 -76 Q-6 -71 -11 -66 Q-15 -62 -11 -59 M-12 -55 Q-8 -53 -12 -49', null, magenta, 2.8);
    shape(ctx, 'M-14 -72 Q-9 -70 -13 -68 M-12 -61 L-10 -59', null, teal, 1.7);
    shape(ctx, 'M7 -82 L11 -78 L8 -67 L10 -56 L9 -47', null, gold, 1.4);
    shape(ctx, 'M10 -74 Q15 -69 10 -65 M10 -61 Q14 -58 10 -54', null, magenta, 2.3);
    shape(ctx, 'M-5 -82 Q0 -74 6 -81', null, '#b7863a', 1.7);
    shape(ctx, 'M1 -77 L2 -75', null, gold, 1.1);
    shape(ctx, 'M-2 -74 Q1 -76 4 -74 L4 -71 Q1 -69 -1 -71 Z M0 -69 Q2 -71 4 -69 L4 -67 Q1 -65 0 -67 Z', '#263546', '#c39343', .9);
    shape(ctx, 'M0 -73 L2 -73 M1 -68 L3 -68', null, '#93cdcc', .75);
  }

  function head(ctx) {
    shape(ctx, 'M-5 -89 L-4 -80 Q0 -76 6 -81 L5 -92 Z', skin, ink, 1.7);
    // Irregular crown of curls keeps the silhouette distinct at its native size.
    shape(ctx, 'M-11 -99 Q-18 -100 -16 -106 Q-20 -109 -17 -113 Q-18 -117 -14 -118 Q-15 -124 -10 -123 Q-8 -128 -4 -125 Q-1 -130 3 -126 Q7 -129 9 -125 Q15 -126 15 -121 Q20 -121 17 -116 Q21 -112 17 -109 Q18 -105 14 -103 L11 -98 Z', '#262235', ink, 2);
    shape(ctx, 'M-15 -113 Q-16 -119 -12 -117 Q-14 -122 -9 -121 M-6 -123 Q-4 -126 -1 -124 M4 -123 Q7 -126 9 -122 M12 -119 Q16 -120 15 -116 M-15 -108 Q-13 -109 -12 -108', null, '#47415d', 2.1);
    shape(ctx, 'M-15 -117 L-13 -119 M-9 -123 L-7 -124 M2 -126 L4 -126 M11 -122 L14 -122', null, '#c89150', 1);
    shape(ctx, 'M-10 -110 Q-7 -117 3 -117 Q11 -117 13 -110 L13 -106 L16 -103 L14 -101 L14 -96 Q13 -89 6 -87 Q0 -85 -5 -90 L-9 -96 Q-14 -96 -13 -101 Q-13 -104 -10 -103 Z', skinLight, ink, 1.8);
    shape(ctx, 'M-10 -105 L-7 -101 L-7 -94 L-4 -92 L-2 -95 Q4 -91 11 -94 L14 -97 Q15 -90 8 -87 Q1 -84 -5 -88 Q-11 -92 -10 -99 Q-13 -101 -10 -102 Z', '#3c2930');
    shape(ctx, 'M-6 -110 Q-4 -115 5 -115 L11 -113 L4 -114 L-3 -111 Z', '#e9a361');
    shape(ctx, 'M-8 -104 Q-6 -107 -4 -104', null, '#8f5039', 1.2);
    shape(ctx, 'M-4 -107 Q-1 -109 2 -107 M7 -108 Q10 -110 12 -108', null, '#30212a', 1.8);
    shape(ctx, 'M-3 -104 Q-1 -105 2 -104 M8 -105 Q10 -106 12 -105', null, '#f4c697', 1.6);
    ellipse(ctx, 1.2, -104.4, .8, 1.05, ink);
    ellipse(ctx, 10.5, -105.1, .78, 1.05, ink);
    shape(ctx, 'M6 -105 L7 -101 L9 -101', null, '#8e4b39', 1.1);
    shape(ctx, 'M1 -96 Q4 -99 7 -98 L10 -98 L12 -97', null, '#422932', 1.45);
    shape(ctx, 'M3 -94 Q7 -93 10 -95', null, '#eb9b7b', 1.35);
    ellipse(ctx, -10, -98.5, 1.15, 1.15, gold, '#674137', .5);
  }

  function drawNige(ctx, x, soleY, options = {}) {
    const {facing = 1, phase = 0, action = 'idle', ducking = false, powered = false, invulnerable = false, time = 0} = options;
    const pace = Math.sin(phase);
    const moving = !ducking && (action === 'run' || action === 'carry');
    const rising = action === 'jump';
    const falling = action === 'fall';
    const air = rising || falling;
    const celebrating = action === 'celebrate';
    const bounce = moving ? -Math.abs(pace) * 2.5 : Math.sin(time * 3) * .7;
    ctx.save();
    ctx.translate(x, soleY);
    ctx.scale(facing < 0 ? -.5 : .5, .5);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (invulnerable && Math.sin(time * 35) > .3) ctx.globalAlpha *= .57;
    if (powered) {
      const spin = time * 3;
      for (let i = 0; i < 5; i++) {
        const angle = spin + i * Math.PI * 2 / 5;
        const xx = Math.cos(angle) * 25;
        const yy = -62 + Math.sin(angle) * 48;
        gesture(ctx, [[xx - 2.8, yy], [xx + 2.8, yy]], ivory, 1.3);
        gesture(ctx, [[xx, yy - 3.4], [xx, yy + 3.4]], gold, 1.6);
      }
    }

    let legs;
    if (ducking) {
      legs = [[[-5, -14], [-21, -12], [-13, -5], 0], [[5, -14], [21, -12], [14, -5], 0]];
    } else if (air) {
      legs = rising ? [[[-5, -45], [-15, -35], [-23, -35], .35], [[5, -44], [21, -44], [16, -32], -.18]]
                    : [[[-5, -45], [-9, -32], [-14, -20], .26], [[5, -45], [17, -33], [15, -13], -.12]];
    } else if (moving) {
      legs = [-1, 1].map(side => {
        const stride = pace * side;
        const lift = Math.max(0, -Math.cos(phase) * side);
        return [[side * 4, -44 + bounce], [side * 4 + 6 + stride * 10, -25 - 7 * lift],
          [side * 3 + stride * 22, -5 - lift * 13], stride * -.21 + lift * .30];
      });
    } else {
      legs = [[[-5, -44], [-8, -23], [-9, -5], 0], [[5, -44], [8, -22], [7, -5], 0]];
    }
    leg(ctx, ...legs[0], true);
    leg(ctx, ...legs[1], false);

    ctx.translate(moving ? 2 : 0, bounce + (ducking ? 30 : 0));
    if (moving) {
      ctx.translate(0, -45);
      ctx.rotate(.068);
      ctx.translate(0, 45);
    }
    let backElbow = [-17, -61], backHand = [-17, -52];
    let frontElbow = [16, -66], frontHand = [8, -84];
    if (moving) {
      backElbow = [-13 + pace * 11, -64];
      backHand = [backElbow[0] + 7 + pace * 4, -68 - pace * 5];
      frontElbow = [10 - pace * 12, -63];
      frontHand = [frontElbow[0] + 8 - pace * 6, -69 + pace * 5];
    }
    if (air || celebrating) {
      backElbow = [-19, rising || celebrating ? -84 : -71];
      backHand = [-24, rising || celebrating ? -96 : -77];
      frontElbow = [20, rising || celebrating ? -89 : -75];
      frontHand = [24, rising || celebrating ? -103 : -83];
    }
    if (action === 'carry') {
      backElbow = [-21, -95]; backHand = [-16, -123];
      frontElbow = [23, -95]; frontHand = [17, -123];
    }
    arm(ctx, [-10, -78], backElbow, backHand, true, action === 'idle');
    jacket(ctx);
    head(ctx);
    arm(ctx, [9, -78], frontElbow, frontHand, false, celebrating);
    ctx.restore();
  }

  function boot(ctx, x, y, fill, sole) {
    ctx.save();
    ctx.translate(x, y);
    shape(ctx, 'M-3.5 -5 L1.5 -5 L2.2 -3.2 Q6 -3.8 7 -1.5 Q7.8 .2 5.4 .5 L-3 .5 Q-5 .5 -4.2 -2 Z', fill, ink, 1.45);
    shape(ctx, 'M-3.5 -.5 Q1 .2 6 -.6', null, sole, .95);
    shape(ctx, 'M1.5 -3.2 L3.2 -2.5', null, sole, .75);
    ctx.restore();
  }

  function eyes(ctx, x, y, slant = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(slant);
    ellipse(ctx, -3.3, 0, 2.8, 3.15, ivory, ink, 1);
    ellipse(ctx, 3.25, -.2, 2.65, 3.25, ivory, ink, 1);
    ellipse(ctx, -2.35, .05, 1.08, 2.03, ink);
    ellipse(ctx, 4.1, -.2, 1.04, 2.05, ink);
    ctx.restore();
  }

  function star(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    shape(ctx, 'M0 -1.7 L.55 -.55 L1.8 -.4 L.85 .46 L1.08 1.7 L0 1.08 L-1.08 1.7 L-.85 .46 L-1.8 -.4 L-.55 -.55 Z', '#c78962');
    ctx.restore();
  }

  function cocoa(ctx) {
    shape(ctx, 'M-17 -9 L-17 -22 L-13 -24 L-13 -29 L7 -31 L14 -28 L14 -24 L17 -22 L17 -9 L10 -6 L-10 -6 Z', '#6c3b38', ink, 2.1);
    shape(ctx, 'M-16 -21 L-10 -23 L13 -25 L16 -22 L10 -20 L-11 -18 Z', '#b8754e');
    shape(ctx, 'M-12 -28 L7 -30 L12 -28 L-7 -25 Z', '#d7976a');
    shape(ctx, 'M-13 -27 L-8 -24 L-8 -21 L-13 -23 Z', '#8a4a42');
    shape(ctx, 'M-10 -18 L10 -20 L11 -8 L-10 -7 Z', '#935646');
    shape(ctx, 'M10 -20 L16 -22 L16 -10 L11 -8 Z', '#75413d');
    shape(ctx, 'M-7 -26 L10 -28', null, '#835047', .55);
    star(ctx, -3, -23.2); star(ctx, 1.3, -23.7); star(ctx, 5.6, -24.2);
    eyes(ctx, 1, -14.1, -.07);
    shape(ctx, 'M-5 -17.5 L0 -16.8 M3 -17.5 L6 -18.1', null, ink, 1.25);
    shape(ctx, 'M2 -9.5 Q4 -8.5 6 -10', null, ink, 1);
    shape(ctx, 'M-14 -14 L-12.5 -15 M-14.3 -11.7 L-12.8 -12.7', null, '#ad7456', .8);
  }

  function crown(ctx) {
    shape(ctx, 'M-17 -25 Q-18 -28 -15 -27 L-8 -21 L-3 -30 Q-2 -33 0 -30 L5 -22 L13 -29 Q15 -30 15 -27 L14 -12 L12 -7 L-13 -7 L-16 -12 Z', '#cb4151', ink, 2.1);
    shape(ctx, 'M-15 -24 L-9 -19 L-3 -28 L-1 -27 L-8 -16 Z', '#fd8f72');
    shape(ctx, 'M7 -21 L13 -26 L12 -17 L8 -15 Z', '#f57468');
    shape(ctx, 'M-15 -12 Q-1 -10 14 -14 L13 -8 Q0 -5 -13 -8 Z', '#9c3247', ink, .9);
    shape(ctx, 'M-14 -11 Q0 -9 13 -13', null, gold, 1.5);
    shape(ctx, 'M-3 -22 L-1 -25 L1 -22 L-1 -20 Z', gold, '#672b42', .7);
    eyes(ctx, 1.5, -15.6, -.08);
    shape(ctx, 'M-3 -17.7 L.1 -17.3 M4 -18.4 L7 -19', null, ink, 1);
    shape(ctx, 'M3 -9 Q5 -8.3 6 -9.4', null, ivory, .85);
    ellipse(ctx, -9.4, -8.6, .85, .7, gold);
    ellipse(ctx, 9, -9.1, .85, .7, gold);
  }

  function peach(ctx) {
    shape(ctx, 'M-17 -11 Q-18 -21 -10 -25 Q-5 -28 -1 -25 Q4 -28 10 -25 Q18 -21 16 -11 Q15 -7 11 -6.8 L-12 -6.8 Q-16 -7 -17 -11 Z', '#f18a49', ink, 2.1);
    shape(ctx, 'M-13 -12 Q-17 -22 -8 -24 Q-5 -25 -4 -23 Q-12 -20 -13 -12 Z', '#ffc173');
    shape(ctx, 'M11 -22 Q17 -16 13 -9 L9 -8 L4 -8 Q12 -13 11 -22 Z', '#d75546');
    shape(ctx, 'M-1 -25 Q3 -23 2 -21', null, '#b85237', 1.35);
    shape(ctx, 'M-1 -25 Q.2 -29 3 -32', null, ink, 2.1);
    shape(ctx, 'M1 -27 Q2 -32 10 -32 Q7 -26 1 -27 Z', '#63b589', ink, 1.15);
    eyes(ctx, .8, -15.1, .08);
    ellipse(ctx, -8, -12.1, 2.5, 1.1, '#f07455');
    ellipse(ctx, 8.6, -11.5, 1.9, .95, '#fa9b64');
    shape(ctx, 'M1 -10.4 Q3 -8.4 5.5 -10.5', null, ink, 1.1);
    ellipse(ctx, -10, -15, .5, .45, '#bd6344'); ellipse(ctx, -8.3, -16.1, .5, .45, '#bd6344');
  }

  function marker(ctx) {
    shape(ctx, 'M-18 -14 L-1 -31 Q0 -32 1.3 -31 L17 -16 Q18 -15 17.6 -13 L15 -7 L-14 -7 Z', '#30866e', ink, 2.05);
    shape(ctx, 'M-15.5 -14 L0 -29 L15.2 -14.4 L13.8 -9 L-12.8 -9 Z', '#31977a', '#cfecd0', 1.25);
    shape(ctx, 'M0 -27.2 L3.9 -23.5 L2 -23.5 L2 -21 L-.6 -21 L-.6 -23 L-3.1 -23 Z', '#bce8c4');
    eyes(ctx, .5, -15.3, -.05);
    shape(ctx, 'M-5.4 -17.8 Q-2.6 -19 .1 -17.8 M3 -18.1 L5 -19', null, ink, 1.1);
    shape(ctx, 'M1 -10.9 L5 -11.3', null, '#173e3e', 1.1);
    ellipse(ctx, -11.8, -12.5, .7, .7, ivory); ellipse(ctx, 12, -12.7, .7, .7, ivory);
  }

  function shield(ctx) {
    shape(ctx, 'M-17 -26 Q-12 -24 -8 -29 Q-4 -27 0 -31 Q5 -27 8 -29 Q12 -25 16 -27 Q18 -17 14 -8 Q7 -6 -1 -6 L-13 -7 Q-18 -15 -17 -26 Z', '#486997', ink, 2.05);
    shape(ctx, 'M-14.5 -24 Q-11 -23 -8 -26.5 Q-4 -25 0 -28.5 Q5 -25 8 -26.5 Q12 -23 14.2 -24.5 L14 -20 L-14.5 -19 Z', '#cf4c58', ivory, .95);
    shape(ctx, 'M-14 -17 Q-14 -11 -11.5 -9.2 L11.6 -9.2 Q13 -12 13.7 -17', null, '#a8c7d6', 1);
    eyes(ctx, .8, -14.2, -.04);
    shape(ctx, 'M-5 -17.5 L-.7 -17 M3 -17.2 L7.5 -18', null, ink, 1.2);
    shape(ctx, 'M.9 -9.1 Q4 -8.4 6 -9.6', null, ink, .95);
    shape(ctx, 'M-11 -21.5 L-9 -21.5 M10 -22 L11.5 -22', null, '#f7a78a', .85);
  }

  const critters = {
    cocoa: {body: cocoa, shoe: '#845455', sole: '#e0b38a'},
    crown: {body: crown, shoe: '#85374b', sole: '#efb160'},
    peach: {body: peach, shoe: '#a85a41', sole: '#f5c278'},
    marker: {body: marker, shoe: ivory, sole: '#92c8bb'},
    shield: {body: shield, shoe: '#455a74', sole: '#c8d7cb'}
  };

  function drawCritter(ctx, type, x, soleY, options = {}) {
    const {phase = 0, facing = 1, flipped = false} = options;
    const cast = critters[type] || critters.cocoa;
    const stride = Math.sin(phase);
    ctx.save();
    ctx.translate(x, soleY);
    ctx.scale(facing < 0 ? -1 : 1, 1);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (flipped) {
      ctx.translate(0, -16);
      ctx.rotate(Math.PI);
      ctx.translate(0, 16);
    }
    for (const side of [-1, 1]) {
      const xx = side * 7 + side * stride * 2.2;
      const yy = -.6 - Math.max(0, side * stride) * 1.8;
      gesture(ctx, [[side * 7, -8.8], [xx - .5, yy - 4.4]], ink, 3.2);
      boot(ctx, xx, yy, cast.shoe, cast.sole);
    }
    ctx.translate(0, -Math.abs(stride) * .75);
    cast.body(ctx);
    ctx.restore();
  }

  globalThis.Cast = Object.freeze({drawNige, drawCritter});
})();
