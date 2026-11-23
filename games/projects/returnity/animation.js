// Both the renderer and the carried prop use the same drawing on every simulation tick.
(function (root) {
  'use strict';
  const motion = typeof module === 'object' && module.exports ? require('./motion-clips.js') : root.ReturnityMotion;
  const {clips, grips} = motion;
  const landingTime = .17;
  const liftTime = .42;
  function frameAt(clip, fraction) {
    return clip[Math.min(clip.length - 1, Math.max(0, Math.floor(clip.length * fraction)))];
  }
  function progress(p) {
    return p.actSpan > 0 ? 1 - p.act / p.actSpan : 1;
  }
  function frame(p, clock) {
    if (p.hold) {
      if (p.action === 'caseThrow' || p.action === 'flipThrow') return frameAt(clips[p.action], progress(p));
      if (p.liftAge < liftTime) return frameAt(p.hold.type === 'case' ? clips.liftCase : clips.grapple, p.liftAge / liftTime);
      const walking = p.on && p.moving;
      if (p.hold.type === 'case') return walking ? frameAt(clips.carryWalk, p.stride) : frameAt(clips.carryIdle, (clock * .85) % 1);
      return walking ? frameAt(clips.grappleWalk, p.stride) : clips.grapple.at(-1);
    }
    if (p.preJump > 0) return clips.jump[0];
    if (p.act > 0 && p.action === 'pound') {
      return clips.pound[Math.min(2, Math.floor((p.actSpan - p.act) / .048))];
    }
    if (p.act > 0 && clips[p.action] && p.action !== 'rise') {
      return frameAt(clips[p.action], progress(p));
    }
    if (!p.on) {
      if (p.jumpAge < .07 && p.vy < 0) return clips.jump[1];
      if (p.vy < -122) return clips.jump[2];
      if (p.vy < -32) return clips.jump[3];
      return p.vy <= 39 ? clips.jump[4] : clips.jump[5];
    }
    if (p.landing > 0) {
      const elapsed = landingTime - p.landing;
      if (elapsed < .048) return clips.jump[6];
      if (elapsed < .115) return clips.jump[7];
      return clips.land[2];
    }
    if (p.action === 'skid') return frameAt(clips.skid, 1 - p.skid / .13);
    if (p.action === 'crouch') return frameAt(clips.crouch, Math.min(.999, p.crouchTime / .16));
    if (p.moving) {
      const clip = p.laneDominant ? (p.laneDelta < 0 ? clips.laneUp : clips.laneDown) : (p.sprint > .38 ? clips.run : clips.walk);
      return frameAt(clip, p.stride);
    }
    return frameAt(clips.idle, (clock * .72) % 1);
  }
  function attach(p, clock) {
    const obj = p.hold;
    if (!obj) return;
    const key = frame(p, clock), grip = grips[key];
    if (!grip) return;
    const clip = obj.type === 'case' ? clips.liftCase : clips.grapple;
    const contact = liftTime / clip.length;
    const blend = Math.max(0, Math.min(1, (p.liftAge - contact) / .06));
    const gripY = grip[1] + (obj.type === 'case' ? 15 : (obj.boss ? 68 : 45) * .5);
    obj.x = p.liftOrigin.x * (1 - blend) + (p.x + p.dir * grip[0]) * blend;
    obj.y = p.liftOrigin.y * (1 - blend) + (p.y + gripY) * blend;
    obj.base = p.base;
    obj.heldTilt = blend;
  }
  const api = {frame, attach, landingTime, liftTime};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NigelAnimation = api;
})(globalThis);
