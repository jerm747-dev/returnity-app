'use strict';
const Opening = (() => {
  const groups = [
    ['afroman','zach','max','carlos'],
    ['pink','street-villain','lil','promoter'],
    ['closet','suit','folk','atlanta','blue']
  ];
  const ratios = {afroman:.623,zach:.705,max:.643,carlos:.667,pink:.455,'street-villain':.639,lil:.555,promoter:.881,closet:.650,suit:.592,folk:.636,atlanta:.675,blue:.638};
  const art = ['afterhours','overlook','returnity-type',...groups.flat()];
  const clip = n => Math.max(0,Math.min(1,n));
  const num = n => Number(n.toFixed(2));
  const ink = '#302c3d';
  const smooth = n => { n=clip(n); return n*n*(3-2*n); };

  // Each pair of curves describes a continuous walking surface. The same center
  // function positions the soles and the slab joints, including after rotation.
  function layout(width,height) {
    const compact=width/height<1.2;
    const scale=Math.min(width, height*1.78);
    const tall=width<height*.78;
    const H=height,W=width;
    const street = {
      x:[.169,.396,.624,.835],
      size:(tall?[.475,.45,.385,.34]:[.335,.37,.335,.295]).map(h=>scale*h),
      center:x=>tall ? H*(.54+.22*(1-x)**2) : H*((compact?.75:.82)-.105*x-.025*Math.sin(x*Math.PI)),
      half:x=>Math.max(scale*(.087-.046*x),tall?H*(.059-.027*x):0),
      curb:x=>scale*(.023-.013*x)
    };
    const turn=compact?1.11:1.13;
    const hero = {
      x:compact?[.235,.435,.609,.758,.904]:[.528,.662,.770,.860,.943],
      size:(compact?[.547,.433,.354,.292,.236]:[.332,.274,.223,.187,.152]).map(h=>(compact?Math.min(W,H*.715):scale)*h),
      center:x=>H*(compact?.458:.475)+Math.max(0,turn-x)**2*(compact?.341*H:.938*H),
      // On tall phones the bend is steeper in screen coordinates. Widen the
      // approach there so both sneakers still land inside the nearest slab.
      half:x=>Math.max(H*.022,(compact?.032*H:.033*H)+Math.max(0,turn-x)*(compact?.177*H:.20*H)),
      curb:x=>Math.max(scale*.005,scale*(.012+.026*Math.max(0,1-x)))
    };
    return {W,H,scale,compact,street,hero};
  }

  function curvePoints(W,fn,a=-.035,b=1.035) {
    const count=32;
    return Array.from({length:count+1},(_,i)=>{
      const x=a+(b-a)*i/count;return num(W*x)+' '+num(fn(x));
    });
  }
  function curve(W,fn,a,b){return 'M'+curvePoints(W,fn,a,b).join(' L');}
  function band(W,upper,lower,fill,stroke='none',weight=0) {
    return '<path d="M'+curvePoints(W,upper).join(' L')+' L'+curvePoints(W,lower).reverse().join(' L')+'Z" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+num(weight)+'" stroke-linejoin="round"/>';
  }
  function stroke(d,color,width,extra='') {
    return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+num(width)+'" stroke-linecap="round" stroke-linejoin="round" '+extra+'/>';
  }

  function pavement(view,terrace) {
    const {W,H,scale} = view;
    const path=terrace?view.hero:view.street;
    const back=x=>path.center(x)-path.half(x);
    const lip=x=>path.center(x)+path.half(x);
    const edge=x=>lip(x)+path.curb(x);
    const outer=scale*.0035;
    let s='';
    if (terrace) {
      // The high side is an actual masonry embankment. A second, lower walk at
      // its foot gives the viewer a scale cue for the height of the overlook.
      const base=x=>edge(x)+scale*(.094+.085*Math.max(0,1-x));
      s+=band(W,base,()=>H+scale*2,'#62616e');
      s+=band(W,base,x=>base(x)+scale*.016,'#4c4957');
      s+=band(W,edge,base,'#805b56',ink,outer);
      s+=band(W,edge,x=>edge(x)+path.curb(x)*.44,'#654952');
      for (const [a,b,f] of [[.38,.56,.44],[.59,.75,.68],[.73,.86,.34],[.87,1.01,.63]]) {
        const at=x=>edge(x)+(base(x)-edge(x))*f;
        s+=stroke(curve(W,at,a,b),'#614b52',outer*.64);
        const joint=a+(b-a)*.52;
        s+=stroke('M'+num(W*joint)+' '+num(at(joint))+'v'+num((base(joint)-edge(joint))*.10),'#614b52',outer*.64);
      }
      // A planted strip sits at the foot of the retaining wall and follows its
      // turn. Keep these silhouettes below the cast, including on a tall screen.
      const at=x=>base(x)+scale*(.019-.009*x);
      s+=stroke(curve(W,at,.63,1.02),'#514d58',outer*1.3);
      for (const [x,span] of [[.736,.074],[.909,.059],[.984,.040]]) {
        const cx=W*x,cy=at(x),w=span*W,h=Math.min(w*.63,scale*.043);
        s+='<path transform="translate('+num(cx)+' '+num(cy)+') scale('+num(w/100)+' '+num(h/42)+')" d="M-52 1Q-48-11-37-10Q-37-22-23-21Q-15-36-2-29Q12-47 26-30Q40-30 41-16Q53-14 51-4Q36 2 14 3Q-23 7-52 1Z" fill="#49635c" stroke="#383b45" stroke-width="2.6" stroke-linejoin="round"/>';
      }
    } else {
      s+=band(W,edge,()=>H+scale,'#656575');
      s+=band(W,edge,x=>edge(x)+scale*.012,'#504f61');
      const mark=x=>edge(x)+H*(.18+.09*(1-x));
      for(const [a,b] of [[-.04,.15],[.32,.53],[.71,.88]]) {
        const stripe='M'+curvePoints(W,mark,a,b).join(' L')+' L'+curvePoints(W,x=>mark(x)+scale*.009,a,b).reverse().join(' L')+'Z';
        s+='<path d="'+stripe+'" fill="#a29b94"/>';
      }
    }
    s+=band(W,back,lip,terrace?'#b3a7a8':'#aaa5af',ink,outer);
    s+=band(W,lip,edge,terrace?'#92838c':'#8e8994',ink,outer);
    const joints=terrace?[.16,.37,.535,.667,.777,.864,.934,1.00]:[.07,.27,.45,.61,.755,.88,.98];
    for (const x of joints) {
      const offset=(terrace?.043:.045)*Math.max(.28,1.08-x);
      s+=stroke('M'+num((x-offset)*W)+' '+num(back(x-offset)+outer)+' L'+num((x+offset)*W)+' '+num(lip(x+offset)-outer),'#847a87',outer*.63);
      s+=stroke('M'+num((x+offset)*W)+' '+num(lip(x+offset)+outer*.65)+' v'+num(path.curb(x+offset)-outer*1.2),'#756b78',outer*.56);
    }
    // Paint on the outer curb follows its contour; it stays off the actors' shoes.
    s+=stroke(curve(W,x=>lip(x)-outer*1.5),'#d5c9bb',outer*.73);
    if(terrace)s+=stroke(curve(W,x=>lip(x)-outer*1.5,.18,1.025),'#ffe1a2',outer*.90,'data-trace="" pathLength="1"');
    return s;
  }

  function make(width,height,asset,still=false) {
    const view=layout(width,height),{W,H,compact}=view;
    const img=(name,x,y,w,h,fit='none')=>'<image href="'+asset(name+'.webp')+'" x="'+num(x)+'" y="'+num(y)+'" width="'+num(w)+'" height="'+num(h)+'" preserveAspectRatio="'+fit+'"/>';
    function plate(name) {
      const high=name==='overlook';
      const aspect=high?1672/941:1942/809;
      const sky=high?'#5749ad':'#6d70d3';
      // Overscan the painted roofs horizontally. Align the street in the
      // painting with the foreground, even when the phone turns upright.
      const imageH=Math.max(W/aspect,H*(compact?(high?.52:.62):.77));
      const bottom=H*(compact?(high?.602:.735):(high?.94:.79));
      const imageW=imageH*aspect,left=(W-imageW)*(high?.315:.56),top=bottom-imageH;
      return '<rect width="'+W+'" height="'+H+'" fill="'+sky+'"/>'+
        '<rect x="0" y="'+num(bottom-1)+'" width="'+W+'" height="'+H+'" fill="'+(high?'#767681':'#787888')+'"/>'+
        img(name,left,top,imageW,imageH);
    }
    function cast(group,k) {
      const p=k===2?view.hero:view.street;
      const poses=group.map((name,i)=>{
        const x=p.x[i],h=p.size[i],w=h*ratios[name],foot=p.center(x),cx=x*W;
        const shadow='<ellipse cx="'+num(cx+w*.015)+'" cy="'+num(foot+h*.002)+'" rx="'+num(w*.43)+'" ry="'+num(h*.014)+'" fill="#5e5363" opacity=".65"/>';
        return '<g data-figure="'+i+'">'+shadow+img(name,cx-w/2,foot-h,w,h)+'</g>';
      }).reverse().join('');
      return '<g data-cast="'+k+'" opacity="'+(still&&k===2?1:0)+'">'+poses+'</g>';
    }
    const titleW=compact?Math.min(W*.80,H*.63):Math.min(W*.36,H*.80);
    const minHead=Math.min(...view.hero.x.map((x,i)=>view.hero.center(x)-view.hero.size[i]));
    const tx=compact?W*.075:W*.043;
    const ty=compact?Math.min(H*.215,minHead-titleW*270/1150-H*.029):H*.424;
    const title='<g data-wordmark="" opacity="'+(still?1:0)+'"><g transform="translate('+num(tx)+' '+num(ty)+')"><rect x="'+num(titleW*.022)+'" y="'+num(-titleW*.077)+'" width="'+num(titleW*.261)+'" height="'+num(titleW*.066)+'" rx="'+num(titleW*.033)+'" fill="#302535"/><text x="'+num(titleW*.151)+'" y="'+num(-titleW*.031)+'" text-anchor="middle" font-family="DejaVu Sans,sans-serif" font-weight="bold" letter-spacing="'+num(titleW*.003)+'" font-size="'+num(titleW*.039)+'" fill="#ffedde">NIGE HOOD</text>'+img('returnity-type',0,0,titleW,titleW*270/1150)+'</g></g>';
    const sidewalk=still?'':'<g data-set="street">'+plate('afterhours')+pavement(view,false)+cast(groups[0],0)+cast(groups[1],1)+'</g>';
    const terrace='<g data-set="terrace" opacity="'+(still?1:0)+'">'+plate('overlook')+pavement(view,true)+cast(groups[2],2)+title+'</g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Nige Hood’s Returnity. The cast gathers on a club sidewalk, then five eras of Nigel share a curved terrace above the neighborhood.">'+sidewalk+terrace+'</svg>';
  }
  function mount(container,asset) {
    let width=0,height=0,groups=[],terrace,street,trace,word;
    function draw(t,reduce) {
      const w=container.clientWidth,h=container.clientHeight;
      if(!w||!h)return;
      if(w!==width||h!==height){
        width=w;height=h;container.innerHTML=make(w,h,asset);
        groups=[...container.querySelectorAll('[data-cast]')].map(g=>({g,figs:[...g.querySelectorAll('[data-figure]')]}));
        terrace=container.querySelector('[data-set="terrace"]');street=container.querySelector('[data-set="street"]');
        trace=container.querySelector('[data-trace]');word=container.querySelector('[data-wordmark]');
      }
      if(reduce)t=7.5;
      const change=smooth((t-3.98)/.58);
      terrace.setAttribute('opacity',change);terrace.style.display=change?'':'none';
      street.style.display=change===1?'none':'';
      const start=[0,2.15,4.2],end=[2.5,4.55,10];
      for(const [k,{g,figs}] of groups.entries()){
        const a=clip((t-start[k])/.28)*clip((end[k]-t)/.28);
        g.setAttribute('opacity',a);g.style.display=a?'':'none';
        if(!a)continue;
        for(const f of figs){
          const i=Number(f.dataset.figure),p=smooth((t-start[k]-i*(k===2?.245:.085))/.38);
          f.setAttribute('opacity',p);
        }
      }
      const line=clip((t-4.17)/1.5);trace.style.strokeDasharray='1';trace.style.strokeDashoffset=1-line;trace.style.opacity=line?'1':'0';
      const hit=clip((t-5.82)/.36);word.setAttribute('opacity',clip(hit*3));word.setAttribute('transform','translate(0 '+num(-Math.min(w,h)*.013*(1-hit)**2)+')');
    }
    return {draw};
  }
  return {art,make,mount};
})();
if(typeof module!=='undefined')module.exports=Opening;
