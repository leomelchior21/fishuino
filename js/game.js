/* ============================================================
   BOAT DEFINITIONS
   ============================================================ */
const BOATS = [
  {
    id:'classic', name:'JORGE', emoji:'🛥️',
    desc:'Balanced all-rounder',
    speed:3.2, depthMult:1.0, hookR:14, accel:0.30, drag:0.84,
    shield:false,
    hullColor:'#cc4400', accent:'#ffaa44', cabinColor:'#aa2800', trim:'#993300',
    statSpd:3, statDep:3, special:'BALANCED'
  },
  {
    id:'racer', name:'ZIPPY', emoji:'⚡',
    desc:'Blazing fast, shorter hook',
    speed:5.2, depthMult:0.65, hookR:12, accel:0.52, drag:0.90,
    shield:false,
    hullColor:'#cc1100', accent:'#ff5500', cabinColor:'#880800', trim:'#660400',
    statSpd:5, statDep:2, special:'SPEED'
  },
  {
    id:'deepsea', name:'DEEP FISHER', emoji:'🎣',
    desc:'Reaches the deep, moves slow',
    speed:1.8, depthMult:1.7, hookR:16, accel:0.18, drag:0.78,
    shield:false,
    hullColor:'#1144aa', accent:'#4488ff', cabinColor:'#0a2266', trim:'#0a1a66',
    statSpd:1, statDep:5, special:'DEPTH'
  },
  {
    id:'trawler', name:'IRON TRAWLER', emoji:'🛡️',
    desc:'Armored hull absorbs 1 trash hit',
    speed:2.2, depthMult:1.0, hookR:18, accel:0.22, drag:0.76,
    shield:true,
    hullColor:'#445566', accent:'#99aabb', cabinColor:'#2a3a4a', trim:'#334455',
    statSpd:2, statDep:3, special:'SHIELD'
  },
];
let selectedBoat = BOATS[0];
let _shieldActive = false;
let _gameMode = 'solo'; // 'solo' | 'race' | 'chaos' | 'endless'
let _endless = false;
let _combo=0,_comboTimer=0;
let _magnetTimer=0,_freezeTimer=0,_doubleCatches=0;
let _shake={power:0,timer:0,x:0,y:0};
let _waveTimer=0,_waveDir=1,_chaosEventTimer=0,_frenzyTimer=0;
let _makerGod=false;
let _phaseRequires={};
function phr(){return _phaseRequires}

/* ── Maker God — category groups ────────────────────────────── */
const _MG_GROUPS={
  LED_R:'_LED',LED_G:'_LED',LED_B:'_LED',
  D2:'_DIG',D4:'_DIG',D13:'_DIG',
  PWM3:'_PWM',PWM5:'_PWM',PWM9:'_PWM',
};
const _MG_CAT_MEMBERS={
  '_LED':['LED_R','LED_G','LED_B'],
  '_DIG':['D2','D4','D13'],
  '_PWM':['PWM3','PWM5','PWM9'],
};
const _MG_CAT_DEF={
  '_LED':{label:'ANY LED',  color:'#882244',glow:'#ff4488'},
  '_DIG':{label:'DIGI PIN', color:'#005588',glow:'#00aaff'},
  '_PWM':{label:'PWM PIN',  color:'#4a2288',glow:'#9966dd'},
};
function buildMGRequires(req){
  const mg={};
  for(const [k,n] of Object.entries(req)){
    const cat=_MG_GROUPS[k];
    if(cat) mg[cat]=(mg[cat]||0)+n;
    else mg[k]=n;
  }
  return mg;
}

/* ── Player color palette — unique color per player name hash ── */
const PLAYER_COLORS=['#ff4466','#4499ff','#44ee88','#ffcc00','#ff8822','#bb44ff','#00ddff','#ff66aa'];
function _playerColor(name){let h=5381;for(const c of name)h=(h*33+c.charCodeAt(0))&0x7fffffff;return PLAYER_COLORS[h%PLAYER_COLORS.length]}

/* ============================================================
   BOAT CARD UI
   ============================================================ */
function statBar(label, val){
  let pips='';
  for(let i=0;i<5;i++) pips+=`<span class="bc-stat-pip${i<val?' on':''}"></span>`;
  return `<div class="bc-stat-row"><span class="bc-stat-label">${label}</span><div class="bc-stat-bar">${pips}</div></div>`;
}

function drawBoatPreview(cvs, boat){
  const c=cvs.getContext('2d');
  c.clearRect(0,0,cvs.width,cvs.height);
  const cx=cvs.width/2, cy=cvs.height/2+6;
  // Water
  c.fillStyle='#082a45';c.fillRect(0,cy+8,cvs.width,cvs.height);
  c.fillStyle='rgba(80,160,255,.3)';
  for(let x=0;x<cvs.width;x+=4) c.fillRect(x,cy+8+Math.sin(x*.2)*1.5,4,2);
  // Hull
  const hw=20;
  c.fillStyle=boat.hullColor;
  c.fillRect(cx-hw+4,cy,hw*2-8,10);c.fillRect(cx-hw,cy+4,4,6);c.fillRect(cx+hw-4,cy+4,4,6);
  // Trim
  c.fillStyle=boat.trim;c.fillRect(cx-hw+4,cy+8,hw*2-8,3);
  // Accent
  c.fillStyle=boat.accent;c.fillRect(cx-hw+2,cy+1,hw*2-4,2);
  // Cabin
  c.fillStyle=boat.cabinColor;c.fillRect(cx-9,cy-12,18,12);
  // Window
  c.fillStyle='#55ccff';c.fillRect(cx-3,cy-9,6,6);
  c.fillStyle='rgba(255,255,255,.7)';c.fillRect(cx-2,cy-8,4,2);
  // Boat-specific decorations
  if(boat.id==='racer'){
    c.fillStyle=boat.accent+'99';c.fillRect(cx-hw+6,cy+2,8,2);c.fillRect(cx-hw+16,cy+2,5,2);
    c.fillStyle=boat.cabinColor;c.fillRect(cx-7,cy-10,14,10); // narrower cabin
  } else if(boat.id==='deepsea'){
    c.strokeStyle=boat.accent;c.lineWidth=1.5;
    c.beginPath();c.moveTo(cx-hw,cy+3);c.lineTo(cx-hw-6,cy-14);c.stroke();
    c.strokeStyle='#ffffff55';c.lineWidth=1;
    c.beginPath();c.moveTo(cx-hw-6,cy-14);c.lineTo(cx-hw+2,cy+3);c.stroke();
  } else if(boat.id==='trawler'){
    c.strokeStyle=boat.accent+'88';c.lineWidth=1;
    c.strokeRect(cx-hw+4,cy+1,7,8);c.strokeRect(cx+hw-11,cy+1,7,8);
    c.fillStyle=boat.cabinColor;c.fillRect(cx-11,cy-14,22,4); // armor roof
    c.strokeStyle=boat.accent;c.lineWidth=1;
    c.beginPath();c.moveTo(cx+8,cy-14);c.lineTo(cx+8,cy-22);c.stroke();
    c.fillStyle=boat.accent;c.fillRect(cx+6,cy-24,4,3);
  }
  // Mast line
  c.strokeStyle='#c8a060';c.lineWidth=1.5;
  c.beginPath();c.moveTo(cx+6,cy-7);c.lineTo(cx+12,cy-18);c.stroke();
}

function buildBoatCards(){
  const container=document.getElementById('boat-cards');
  if(!container)return;
  container.innerHTML='';
  BOATS.forEach(boat=>{
    const card=document.createElement('div');
    card.className='boat-card'+(boat===selectedBoat?' selected':'');
    // Canvas preview
    const cvs=document.createElement('canvas');
    cvs.width=88;cvs.height=54;
    cvs.style.cssText='width:88px;height:54px;image-rendering:pixelated';
    drawBoatPreview(cvs,boat);
    card.appendChild(cvs);
    // Name + stats — use insertAdjacentHTML so the canvas isn't wiped
    card.insertAdjacentHTML('beforeend',`<div class="bc-name">${boat.name}</div><div class="bc-stats">${statBar('SPD',boat.statSpd)}${statBar('DEP',boat.statDep)}</div><div class="bc-special">${boat.special}</div>`);
    card.addEventListener('click',()=>{
      selectedBoat=boat;
      document.querySelectorAll('.boat-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
    });
    container.appendChild(card);
  });
}

/* ============================================================
   LOBBY ANIMATION
   ============================================================ */
(function(){
  const lc=document.getElementById('lobby-canvas'),lx=lc.getContext('2d');
  lc.width=window.innerWidth;lc.height=window.innerHeight;
  window.addEventListener('resize',()=>{lc.width=window.innerWidth;lc.height=window.innerHeight;stars.forEach(s=>{s.x=Math.random()*lc.width;s.y=Math.random()*lc.height*.55})});
  const stars=Array.from({length:70},()=>({x:Math.random()*lc.width,y:Math.random()*lc.height*.55,s:Math.floor(1+Math.random()*2),off:Math.random()*Math.PI*2}));
  const lclouds=Array.from({length:5},(_,i)=>({x:i*(lc.width/5)+Math.random()*80,y:24+Math.random()*44,w:70+Math.random()*70,speed:.2+Math.random()*.25}));
  const bubbles=Array.from({length:14},()=>({x:Math.random()*lc.width,y:lc.height*.6+Math.random()*lc.height*.4,r:2+Math.random()*4,speed:.3+Math.random()*.5,life:Math.random()}));
  const lfish=[{x:lc.width*.12,vx:.85,col:'#3d7bb0'},{x:lc.width*.78,vx:-.65,col:'#6b4e9e'},{x:lc.width*.45,vx:.5,col:'#1a8855'}];
  // Jumping fish: periodically arcs out of water
  const jumpFish={active:false,x:0,vx:0,vy:0,y:0,col:'#00ccaa',timer:0,interval:4200};
  // Lightning
  const lightning={alpha:0,timer:0,interval:7000+Math.random()*5000,bolt:[]};
  // Floating circuit component icons
  const floatIcons=[{sym:'💡',x:lc.width*.15,y:0,vy:-.4,life:0},{sym:'⚡',x:lc.width*.55,y:0,vy:-.35,life:0},{sym:'🔌',x:lc.width*.82,y:0,vy:-.45,life:0}];

  function dpc(x,y,w){const h=14,b=7;lx.fillStyle='#1e3a6e';lx.fillRect(x,y+b,w,h);lx.fillRect(x+b,y,w-b*2,h+b);lx.fillRect(x+b*2,y-b,b*3,b);lx.fillRect(x+w-b*3,y-b,b*2,b)}
  function dlf(f,t,y){const fw=18,fh=10,px=f.x,py=y+Math.sin(t*1.5+f.x*.01)*4;lx.save();if(f.vx<0){lx.scale(-1,1);lx.translate(-px*2-fw,0)}lx.fillStyle=f.col;lx.fillRect(px,py,fw,fh);lx.fillRect(px-6,py+2,6,fh-4);lx.fillStyle='rgba(255,255,255,.7)';lx.fillRect(px+fw-5,py+2,3,3);lx.restore()}

  function _makeLightningBolt(sx,sy){
    const bolt=[];let x=sx,y=sy;
    while(y<sy+lc.height*.45){bolt.push({x,y});x+=(Math.random()-.5)*30;y+=14+Math.random()*12}
    return bolt;
  }

  let lastTs=0;
  function ll(ts){
    const dt=Math.min(ts-lastTs,40);lastTs=ts;
    const t=ts*.001;lx.clearRect(0,0,lc.width,lc.height);const wy=lc.height*.52;

    // Sky gradient
    ['#0d1123','#0e1428','#0f162e','#101833','#111a38','#121c3e','#131e44','#14204a'].forEach((c,i)=>{lx.fillStyle=c;lx.fillRect(0,wy/8*i,lc.width,wy/8+1)});
    // Lightning flash
    lightning.timer-=dt;
    if(lightning.timer<=0){lightning.timer=lightning.interval+Math.random()*4000;lightning.alpha=1;lightning.bolt=_makeLightningBolt(lc.width*(.2+Math.random()*.6),wy*.1)}
    if(lightning.alpha>0){
      lx.globalAlpha=Math.min(lightning.alpha*.6,.35);lx.fillStyle='#eef5ff';lx.fillRect(0,0,lc.width,wy);lx.globalAlpha=1;
      lx.save();lx.strokeStyle=`rgba(180,200,255,${lightning.alpha*.9})`;lx.lineWidth=2;lx.shadowBlur=12;lx.shadowColor='#aaccff';
      lx.beginPath();lightning.bolt.forEach((p,i)=>i===0?lx.moveTo(p.x,p.y):lx.lineTo(p.x,p.y));lx.stroke();lx.restore();
      lightning.alpha=Math.max(0,lightning.alpha-.025);
    }
    // Stars
    stars.forEach(s=>{const a=.25+.75*Math.abs(Math.sin(t+s.off));lx.globalAlpha=a;lx.fillStyle='#c8dcff';lx.fillRect(Math.floor(s.x),Math.floor(s.y),s.s,s.s)});lx.globalAlpha=1;
    // Hills
    lx.fillStyle='#0a0f1f';[[0,.85],[.08,.72],[.18,.58],[.28,.75],[.40,.62],[.52,.78],[.62,.65],[.72,.80],[.83,.67],[.93,.73],[1,.85]].forEach(([rx,ry],i)=>{if(i===0){lx.beginPath();lx.moveTo(0,wy)}else lx.lineTo(rx*lc.width,ry*wy)});lx.lineTo(lc.width,wy);lx.closePath();lx.fill();
    // Lighthouse blink
    const lhx=Math.floor(lc.width*.08),lhy=Math.floor(wy*.58);
    lx.fillStyle='#aabbcc';lx.fillRect(lhx-3,lhy-24,6,24);lx.fillStyle='#cc4400';lx.fillRect(lhx-5,lhy-28,10,6);
    const blink=Math.sin(t*2)>.5;if(blink){lx.globalAlpha=.55;lx.fillStyle='#ffee88';lx.beginPath();lx.arc(lhx,lhy-25,10,0,Math.PI*2);lx.fill();lx.globalAlpha=1}
    // Clouds
    lclouds.forEach(c=>{c.x+=c.speed;if(c.x>lc.width+180)c.x=-180;dpc(Math.floor(c.x),Math.floor(c.y),Math.floor(c.w))});
    // Water
    ['#0f3a5e','#0f3d64','#10406a','#104370','#114677','#11497d','#124c83','#125089'].forEach((c,i)=>{lx.fillStyle=c;lx.fillRect(0,wy+i*(lc.height-wy)/8,lc.width,(lc.height-wy)/8+1)});
    lx.fillStyle='rgba(100,180,255,.22)';for(let x=0;x<lc.width;x+=4){const h=Math.sin(x*.025+t*2)*5+Math.sin(x*.05+t*1.3)*2;lx.fillRect(x,wy+h,4,2)}
    // Bubbles
    bubbles.forEach(b=>{b.life+=.005*b.speed;if(b.life>1){b.life=0;b.x=Math.random()*lc.width}const by=lc.height-(b.life*(lc.height-wy));if(by<wy)return;lx.globalAlpha=.28*(1-b.life);lx.strokeStyle='#7ac5e8';lx.lineWidth=1;lx.strokeRect(Math.floor(b.x),Math.floor(by),b.r*2,b.r*2)});lx.globalAlpha=1;
    // Jumping fish
    jumpFish.timer-=dt;
    if(jumpFish.timer<=0&&!jumpFish.active){jumpFish.active=true;jumpFish.x=lc.width*(.2+Math.random()*.6);jumpFish.y=wy+10;jumpFish.vx=(Math.random()-.5)*4;jumpFish.vy=-5.5;jumpFish.col=['#00ccaa','#ee4488','#ffaa00','#00aaff'][Math.floor(Math.random()*4)];jumpFish.timer=5000+Math.random()*4000}
    if(jumpFish.active){
      jumpFish.vy+=.18;jumpFish.x+=jumpFish.vx;jumpFish.y+=jumpFish.vy;
      if(jumpFish.y<wy+30){// above waterline: draw jumping fish
        lx.save();lx.translate(jumpFish.x,jumpFish.y);lx.rotate(Math.atan2(jumpFish.vy,jumpFish.vx)-.6);
        lx.fillStyle=jumpFish.col;lx.fillRect(-9,-5,18,10);lx.fillRect(-15,-3,6,6);lx.fillStyle='rgba(255,255,255,.8)';lx.fillRect(5,-3,3,4);lx.restore();
        // splash drops
        if(Math.random()<.25)bubbles.push({x:jumpFish.x+((Math.random()-.5)*20),y:wy+4,r:1+Math.random()*2,speed:.8,life:.1});
      }
      if(jumpFish.y>wy+30)jumpFish.active=false;
    }
    // Swimming fish
    lfish.forEach(f=>{f.x+=f.vx;if(f.x<-40)f.x=lc.width+40;if(f.x>lc.width+40)f.x=-40;dlf(f,t,lc.height*.63)});
    // Seabed rocks
    lx.fillStyle='#3d2a12';lx.fillRect(0,lc.height-28,lc.width,28);
    [.1,.25,.4,.55,.7,.85].forEach(rx=>{const rw=12+Math.sin(rx*7)*8,rh=8+Math.sin(rx*5)*4;lx.fillStyle='#2a1e0d';lx.fillRect(Math.floor(rx*lc.width),lc.height-28-rh,rw,rh)});
    // Floating circuit icons
    floatIcons.forEach((fi,idx)=>{
      fi.life+=dt;fi.y=lc.height*.75+(Math.sin(fi.life*.001+idx*2.1)*12)+fi.vy*fi.life*.002;
      if(fi.life>9000){fi.life=0;fi.x=Math.random()*lc.width*.8+lc.width*.1}
      const fa=Math.min(1,fi.life/800)*Math.min(1,(9000-fi.life)/800);
      lx.globalAlpha=fa*.45;lx.font=`${Math.floor(14+Math.sin(fi.life*.0015+idx)*3)}px serif`;lx.textAlign='center';lx.fillStyle='#fff';lx.fillText(fi.sym,fi.x,fi.y);
    });lx.globalAlpha=1;
    requestAnimationFrame(ll);
  }
  requestAnimationFrame(ll);
})();

/* ============================================================
   AUDIO — pure Web Audio chiptune, no external URLs
   ============================================================ */
let _muted=false,_ac=null;
function getAC(){if(!_ac||_ac.state==='closed')_ac=new(window.AudioContext||window.webkitAudioContext)();if(_ac.state==='suspended')_ac.resume();return _ac}
document.addEventListener('pointerdown',()=>{try{getAC()}catch(e){}},{once:true});

// Core beep: frequency, waveType, duration(s), volume
function beep(f,t,d,v){if(_muted||f<=0)return;try{const ac=getAC(),o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=t;o.frequency.value=f;const n=ac.currentTime;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(0.0001,n+d);o.start(n);o.stop(n+d)}catch(e){}}

// ── CHIPTUNE BGM ENGINE ──────────────────────────────────────
// 10 themes, one per level — bass + arp + melody layers
const _BGM=[
  // L0 Dawn — D major, 100bpm, peaceful triangle
  {bpm:100,w:'triangle',v:.065,b:[147,196,165,196],m:[294,370,440,494,440,370,294,247]},
  // L1 Bright Day — C major, 138bpm, bouncy square
  {bpm:138,w:'square',v:.048,b:[131,165,196,165],m:[523,659,784,880,784,659,523,494]},
  // L2 Tropical — F major, 118bpm, triangle
  {bpm:118,w:'triangle',v:.058,b:[174,220,196,220],m:[349,440,523,587,523,440,392,349]},
  // L3 Volcanic — D minor, 158bpm, sawtooth
  {bpm:158,w:'sawtooth',v:.042,b:[147,175,131,147],m:[294,311,370,349,311,294,262,294]},
  // L4 Arctic — A minor, 82bpm, sine ambient
  {bpm:82,w:'sine',v:.062,b:[110,131,147,131],m:[220,262,330,294,262,220,247,220]},
  // L5 Moonlit — E min pentatonic, 88bpm, triangle
  {bpm:88,w:'triangle',v:.055,b:[82,98,110,98],m:[165,196,247,294,247,196,165,196]},
  // L6 Tempest — C minor, 178bpm, square
  {bpm:178,w:'square',v:.042,b:[131,156,117,131],m:[523,622,494,523,466,494,523,466]},
  // L7 Eclipse — diminished, 98bpm, sawtooth
  {bpm:98,w:'sawtooth',v:.038,b:[138,164,123,138],m:[277,311,370,330,277,311,294,277]},
  // L8 Inferno — phrygian, 198bpm, sawtooth
  {bpm:198,w:'sawtooth',v:.038,b:[196,208,175,196],m:[392,415,370,440,415,370,392,349]},
  // L9 Boss Cosmic — epic minor, 148bpm, square
  {bpm:148,w:'square',v:.052,b:[110,131,123,110],m:[220,277,330,294,247,220,294,330]},
];
let _bgmTimer=null,_bgmPhase=-1,_bgmStep=0;
function _bgmTick(){
  if(_muted||_bgmPhase<0)return;
  const th=_BGM[_bgmPhase%_BGM.length];
  const dur=60000/th.bpm/2; // 8th-note ms
  // Bass (every 2 steps, half freq = one octave down)
  if(_bgmStep%2===0)beep(th.b[(_bgmStep/2)%th.b.length]*.5,th.w,dur*.0018*1000*.001,th.v*.8);
  // Harmony note (every 4 steps)
  if(_bgmStep%4===2)beep(th.b[(_bgmStep/2)%th.b.length],th.w,dur*.0009*1000*.001,th.v*.45);
  // Melody
  beep(th.m[_bgmStep%th.m.length],th.w,dur*.0007*1000*.001,th.v);
  _bgmStep++;
}
// Simplified: pass duration as seconds
function _bgmNote(freq,wave,durS,vol){
  if(_muted||freq<=0)return;
  try{const ac=getAC(),o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=wave;o.frequency.value=freq;const n=ac.currentTime;g.gain.setValueAtTime(vol,n);g.gain.exponentialRampToValueAtTime(0.0001,n+durS);o.start(n);o.stop(n+durS)}catch(e){}
}
function startBGM(phase){
  stopBGM();if(_muted)return;
  _bgmPhase=phase;_bgmStep=0;
  const th=_BGM[phase%_BGM.length];
  const stepMs=Math.round(60000/th.bpm/2);
  // Use AudioContext scheduling for tight timing
  try{
    const ac=getAC();
    let t=ac.currentTime+.05;
    const schedule=()=>{
      if(_bgmPhase<0||_muted)return;
      const idx=_bgmStep%th.m.length;
      const bi=(_bgmStep>>1)%th.b.length;
      const sd=stepMs/1000;
      // Bass (every 2 steps)
      if(_bgmStep%2===0){const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=th.w;o.frequency.value=th.b[bi]*.5;g.gain.setValueAtTime(th.v*.8,t);g.gain.exponentialRampToValueAtTime(.0001,t+sd*1.6);o.start(t);o.stop(t+sd*1.6)}
      // Arp (every 4)
      if(_bgmStep%4===2){const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=th.w;o.frequency.value=th.b[bi];g.gain.setValueAtTime(th.v*.4,t);g.gain.exponentialRampToValueAtTime(.0001,t+sd*.8);o.start(t);o.stop(t+sd*.8)}
      // Melody
      {const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=th.w;o.frequency.value=th.m[idx];g.gain.setValueAtTime(th.v,t);g.gain.exponentialRampToValueAtTime(.0001,t+sd*.7);o.start(t);o.stop(t+sd*.7)}
      t+=sd;_bgmStep++;
      _bgmTimer=setTimeout(schedule,Math.max(0,(t-ac.currentTime-.1)*1000));
    };
    schedule();
  }catch(e){}
}
function stopBGM(){
  if(_bgmTimer){clearTimeout(_bgmTimer);_bgmTimer=null}_bgmPhase=-1;
}
function toggleMute(){
  _muted=!_muted;
  const btn=document.getElementById('btn-mute');if(btn){btn.textContent=_muted?'🔇':'🔊';btn.classList.toggle('muted',_muted);}
  if(_muted)stopBGM();else if(S.running)startBGM(S.phase);
}

// ── SFX ─────────────────────────────────────────────────────
function sCatch(){
  _bgmNote(880,'sine',.05,.22);
  setTimeout(()=>_bgmNote(1100,'sine',.04,.14),55);
  setTimeout(()=>_bgmNote(1320,'sine',.06,.18),110);
}
function sBad(){
  _bgmNote(220,'sawtooth',.08,.3);
  setTimeout(()=>_bgmNote(165,'sawtooth',.12,.25),90);
  setTimeout(()=>_bgmNote(110,'sawtooth',.18,.2),200);
}
function sLvl(){
  [[523,.0],[659,.07],[784,.14],[1047,.21],[1318,.28],[1568,.36]].forEach(([f,d])=>setTimeout(()=>_bgmNote(f,'square',.12,.2),d*1000));
}
function sGameOver(){
  [[400,.0],[330,.12],[260,.26],[196,.42],[147,.6]].forEach(([f,d])=>setTimeout(()=>_bgmNote(f,'sawtooth',.18,.28),d*1000));
}
function sTimer(){_bgmNote(660,'square',.055,.18)}
function sSonar(){_bgmNote(440,'sine',.06,.12);setTimeout(()=>_bgmNote(880,'sine',.1,.09),100);setTimeout(()=>_bgmNote(1760,'sine',.08,.06),220)}

/* ============================================================
   SCREEN FLASH — overlay for juice feedback
   ============================================================ */
let _flash={color:'#fff',alpha:0,decay:0};
function triggerFlash(color,alpha,decayMs){
  _flash.color=color||'#ffffff';
  _flash.alpha=alpha||.5;
  _flash.decay=(alpha||.5)/(decayMs||200)*16; // per frame at 60fps ~16ms
}
function _tickFlash(dt){if(_flash.alpha>0){_flash.alpha=Math.max(0,_flash.alpha-_flash.decay*(dt/16))}}
function _drawFlash(){
  if(_flash.alpha<=0)return;
  ctx.globalAlpha=_flash.alpha;ctx.fillStyle=_flash.color;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;
}

/* ============================================================
   TEACHING TIPS — shown on wrong catch
   ============================================================ */
const TEACH_TIPS={
  GND:'GND completes the circuit path — always connect it last!',
  VCC:'5V powers the circuit — wire components before adding power.',
  LED_R:'Red LED without a resistor BURNS OUT — always use 220Ω!',
  LED_G:'Green LED needs 220Ω to limit current on a 5V board.',
  LED_B:'Blue LED uses ~3.3V forward — still needs 220Ω with 5V!',
  RES_220:'220Ω resistor: standard protection for LEDs on 5V circuits.',
  RES_1K:'1kΩ resistor: pull-down or current limiter for sensors.',
  BUZZER:'Passive buzzer needs tone(pin, freq) — any digital pin works!',
  BUTTON:'Buttons need INPUT_PULLUP in your code — no extra resistor!',
  SERVO:'Servo: red wire=5V, black=GND, white/yellow=PWM signal.',
  ULTRA:'HC-SR04: Trigger pin sends pulse, Echo pin measures return.',
  D2:'D2 is digital — use digitalRead(2) or digitalWrite(2).',
  D4:'D4 is digital — great for buzzers, buttons, LED triggers.',
  D13:'D13 has a built-in LED on most Arduino boards!',
  PWM3:'PWM ~3: use analogWrite(3, 0–255) for variable output.',
  PWM5:'PWM ~5: the ~ symbol means it supports analogWrite()!',
  PWM9:'PWM ~9: ideal for servo control and LED dimming.',
  LDR:'LDR + 1kΩ resistor = voltage divider → analogRead(A0).',
};
function showTeachTip(key){
  const tip=TEACH_TIPS[key];if(!tip)return;
  const el=document.getElementById('teach-popup');if(!el)return;
  const def=CD[key]||{label:key,glow:'#aaccff',color:'#223'};
  el.innerHTML=`<span style="color:${def.glow};display:block;margin-bottom:4px">⚡ ${def.label}</span>${tip}`;
  el.style.borderColor=def.glow+'99';
  el.classList.remove('hidden','fade-out');
  clearTimeout(el._hideT);
  el._hideT=setTimeout(()=>{el.classList.add('fade-out');setTimeout(()=>el.classList.add('hidden'),500)},3200);
}

/* ============================================================
   ACHIEVEMENTS
   ============================================================ */
const _ACHIEV_DEF=[
  {id:'first_fish', icon:'🎣', name:'FIRST CATCH',     desc:'Caught your first component'},
  {id:'combo3',     icon:'🔥', name:'TRIPLE COMBO',    desc:'3 components in a row'},
  {id:'combo5',     icon:'💥', name:'QUINTET COMBO',   desc:'5 catches in a row!'},
  {id:'speed15',    icon:'⚡', name:'SPEED DEMON',     desc:'Completed a level in under 15s'},
  {id:'no_trash',   icon:'✨', name:'CLEAN FISHER',    desc:'Level completed — zero trash hits'},
  {id:'sonar5',     icon:'📡', name:'NAVIGATOR',       desc:'Used sonar 5 times in one session'},
  {id:'lvl5',       icon:'🌊', name:'DEEP DIVER',      desc:'Reached level 5'},
  {id:'boss_beat',  icon:'🐱', name:'BRIAN BUSTER',    desc:'Defeated Big Cat Brian!'},
  {id:'endless_15', icon:'♾️', name:'INFINITE CIRCUITS',desc:'Reached endless level 15'},
  {id:'perfect_lvl',icon:'⭐', name:'PERFECT LEVEL',   desc:'Completed a level without losing a life'},
];
let _unlocked=new Set();
(()=>{try{JSON.parse(localStorage.getItem('fishuino_ach')||'[]').forEach(id=>_unlocked.add(id))}catch(e){}})();
let _achievTrack={sonarUses:0,trashFreeThisLevel:true,livesAtLevelStart:2};
function _checkAchiev(id){
  if(_unlocked.has(id))return;
  _unlocked.add(id);
  try{localStorage.setItem('fishuino_ach',JSON.stringify([..._unlocked]))}catch(e){}
  const def=_ACHIEV_DEF.find(a=>a.id===id);if(def)_showAchievToast(def);
}
function _showAchievToast(def){
  const el=document.getElementById('achiev-toast');if(!el)return;
  document.getElementById('ach-icon-cell').textContent=def.icon;
  document.getElementById('ach-text-cell').innerHTML=`<div class="ach-badge">ACHIEVEMENT UNLOCKED!</div><div class="ach-name">${def.name}</div><div class="ach-desc">${def.desc}</div>`;
  el.classList.remove('hidden','ach-slide-out');
  el.classList.add('ach-slide-in');
  clearTimeout(el._t);
  el._t=setTimeout(()=>{
    el.classList.remove('ach-slide-in');el.classList.add('ach-slide-out');
    setTimeout(()=>{el.classList.add('hidden');el.classList.remove('ach-slide-out')},450);
  },3600);
  _bgmNote(1047,'square',.04,.15);setTimeout(()=>_bgmNote(1318,'square',.04,.15),80);setTimeout(()=>_bgmNote(1568,'square',.06,.18),160);
}

/* ============================================================
   GAME DATA
   ============================================================ */
const CD={
  GND:{label:'GND',color:'#3a4a5c',glow:'#7799bb',type:'power',shape:'circle'},
  VCC:{label:'5V',color:'#9e3510',glow:'#ff7722',type:'power',shape:'circle'},
  D2:{label:'D2',color:'#005588',glow:'#00aaff',type:'pin',shape:'circle'},
  D4:{label:'D4',color:'#005588',glow:'#00aaff',type:'pin',shape:'circle'},
  D13:{label:'D13',color:'#004477',glow:'#0088dd',type:'pin',shape:'circle'},
  PWM3:{label:'~3',color:'#4a2288',glow:'#9966dd',type:'pwm',shape:'diamond'},
  PWM5:{label:'~5',color:'#4a2288',glow:'#9966dd',type:'pwm',shape:'diamond'},
  PWM9:{label:'~9',color:'#4a2288',glow:'#9966dd',type:'pwm',shape:'diamond'},
  LED_R:{label:'LED R',color:'#880011',glow:'#ff2244',type:'part',shape:'circle'},
  LED_G:{label:'LED G',color:'#006633',glow:'#00cc55',type:'part',shape:'circle'},
  LED_B:{label:'LED B',color:'#0033aa',glow:'#2255ff',type:'part',shape:'circle'},
  RES_220:{label:'220Ω',color:'#885500',glow:'#ffaa00',type:'part',shape:'rect'},
  RES_1K:{label:'1kΩ',color:'#773300',glow:'#cc6622',type:'part',shape:'rect'},
  BUZZER:{label:'BUZZR',color:'#882244',glow:'#ff4488',type:'part',shape:'circle'},
  BUTTON:{label:'BTN',color:'#007766',glow:'#00ccaa',type:'part',shape:'circle'},
  SERVO:{label:'SERVO',color:'#336655',glow:'#55bb88',type:'part',shape:'rect'},
  ULTRA:{label:'HC04',color:'#1a5577',glow:'#3399bb',type:'part',shape:'rect'},
  BOOT:{label:'BOOT',color:'#2a1a0a',glow:'#554433',type:'trash',shape:'trash'},
  CAN:{label:'CAN',color:'#3a2a1a',glow:'#665544',type:'trash',shape:'trash'},
  TIRE:{label:'TIRE',color:'#111111',glow:'#333333',type:'trash',shape:'trash'},
  MAGNET:{label:'MAGNT',color:'#bb33ff',glow:'#ff88ff',type:'powerup',shape:'diamond'},
  FREEZE:{label:'FREEZ',color:'#33ccff',glow:'#88eeff',type:'powerup',shape:'diamond'},
  DOUBLE:{label:'2×SCR',color:'#ffcc00',glow:'#ffee55',type:'powerup',shape:'diamond'},
  STAR:{label:'★500',color:'#ffd700',glow:'#ffff44',type:'bonus',shape:'star'},
  LDR:{label:'LDR',color:'#446622',glow:'#aaff44',type:'part',shape:'diamond'},
};
const PHASE_TIME=[60,65,55,70,80,65,75,90,100,120];
const PH=[
  {name:'First Glow',icon:'💡',desc:'Wire an LED to a digital pin with a current-limiting resistor.',circuit:'D13 → 220Ω → LED Red → GND',tip:'Always use a resistor with an LED! 220Ω is perfect for 5V boards.',requires:{LED_R:1,RES_220:1,GND:1,D13:1}},
  {name:'LED Dimmer',icon:'🌗',desc:'PWM pins simulate analog output. Control brightness 0–255.',circuit:'PWM~9 → 220Ω → LED Green → GND',tip:'The ~ means PWM! Pins 3,5,6,9,10,11 support analogWrite().',requires:{LED_G:1,RES_220:1,GND:1,PWM9:1}},
  {name:'Buzzer Alert',icon:'🔊',desc:'A passive buzzer turns digital signals into sound.',circuit:'D4 → Buzzer (+) → GND',tip:'Try tone(4,440) for note A4!',requires:{BUZZER:1,D4:1,GND:1}},
  {name:'Button Input',icon:'🔘',desc:'Buttons read digital input! The pull-down resistor keeps the pin LOW.',circuit:'5V → Button → D2 + 1kΩ → GND',tip:'Use INPUT_PULLUP — no external resistor needed!',requires:{BUTTON:1,D2:1,RES_1K:1,VCC:1,GND:1}},
  {name:'RGB Mix',icon:'🌈',desc:'An RGB LED has 3 LEDs inside! PWM each color channel.',circuit:'~3→LED R, ~5→LED G, ~9→LED B, each via 220Ω to GND',tip:'R+G=Yellow, R+B=Purple, all three=White!',requires:{LED_R:1,LED_G:1,LED_B:1,PWM3:1,PWM5:1,PWM9:1,RES_220:1,GND:1}},
  {name:'Servo Sweep',icon:'⚙️',desc:'Servos rotate to a precise angle! Use write(angle) for 0–180°.',circuit:'Signal → ~9, Red → 5V, Black → GND',tip:'Only 3 wires: 5V power, GND, and PWM signal.',requires:{SERVO:1,PWM9:1,VCC:1,GND:1}},
  {name:'Ultrasonic',icon:'📡',desc:'HC-SR04 sends ultrasonic pulses. Distance=(time×sound)/2!',circuit:'D2→Trigger, D4→Echo, VCC→5V, GND→GND',tip:'pulseIn(echo,HIGH) ÷ 58.2 = centimeters!',requires:{ULTRA:1,D2:1,D4:1,VCC:1,GND:1}},
  {name:'Robo Ranger',icon:'🤖',desc:'Combine ultrasonic sensing with servo motor to build an obstacle-avoiding robot arm!',circuit:'HC04→D2/D4, SERVO→~9, both → 5V & GND',tip:'Read distance first, then use map() to angle the servo! Great for robots.',requires:{ULTRA:1,SERVO:1,PWM9:1,D2:1,D4:1,VCC:1,GND:1}},
  {name:'Alarm System',icon:'🚨',desc:'Ultrasonic proximity alarm! When something gets close, the LED flashes and the buzzer screams.',circuit:'HC04→D2/D4, BUZZER→D4(shared), LED R→~3, GND',tip:'Use if(distance < 20) to trigger alert. Two pins can share GND rails!',requires:{ULTRA:1,BUZZER:1,LED_R:1,PWM3:1,D2:1,D4:1,GND:1}},
  {name:'Big Cat Boss Brian',icon:'🐱',desc:'BOSS LEVEL! Build the ultimate smart light system: LDR reads ambient light, Arduino reacts with RGB glow + distance control. Brian approves only perfection.',circuit:'LDR→A0+1kΩ, HC04→D2/D4, RGB→~3/~5/~9, all→GND',tip:'analogRead(A0) gives 0–1023. Map it to PWM for dynamic color! Brian is watching.',boss:true,requires:{LDR:1,ULTRA:1,LED_R:1,LED_G:1,LED_B:1,RES_1K:1,PWM3:1,PWM5:1,PWM9:1,D2:1,D4:1,GND:1}},
];

/* ============================================================
   SESSION TRACKING
   ============================================================ */
const sessionRuns=[];let sessionBest=null,_runRecorded=false;
function addSessionRun(entry){sessionRuns.push(entry);sessionBest=sessionRuns.reduce((b,r)=>(!b||r.score>b.score)?r:b,null);renderSessionScores();if(typeof SB!=='undefined'&&entry.score>0){const _sbMode=(_gameMode==='solo'||_gameMode==='endless')?(_makerGod?'god':'meh'):_gameMode;SB.submitScore(entry.name,entry.score,entry.phase||1,_sbMode);}}
function renderSessionScores(){
  const wrap=document.getElementById('session-scores'),body=document.getElementById('ss-body');
  if(!wrap||!body)return;
  if(sessionRuns.length===0){wrap.style.display='none';return}
  wrap.style.cssText='display:block !important;width:100%;background:rgba(0,0,0,.7);border:3px solid #ffd700;box-shadow:4px 4px 0 #000;padding:12px 14px;max-height:220px;overflow-y:auto;';
  body.innerHTML='';
  [...sessionRuns].reverse().forEach(r=>{
    const isBest=(r===sessionBest);
    const phaseLabel=r.fate==='win'?'ALL 10':`LVL ${r.phase||1}`;
    const row=document.createElement('div');
    row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #223;font-size:clamp(.35rem,1.1vw,.48rem);color:'+(isBest?'#ffd700':'#aac')+';line-height:2;gap:6px;';
    row.innerHTML=`<span style="min-width:20px">${r.fate==='win'?'🏆':'💀'}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${isBest?'⭐ ':''}${r.name.toUpperCase()}</span><span style="color:#00ff88;min-width:55px;text-align:right">${r.score}</span><span style="color:#00d4ff;min-width:48px;text-align:right;font-size:.85em">${phaseLabel}</span>`;
    body.appendChild(row);
  });
}

/* ============================================================
   STATE & CANVAS
   ============================================================ */
let pName='Engineer';
const S={
  phase:0,score:0,lives:2,collected:{},running:false,
  items:[],spawnTimer:0,spawnInterval:2200,
  phaseTime:0,phaseStart:0,totalTime:0,totalBonus:0,
  paused:false,pauseStart:0,pausedElapsed:0
};
const canvas=document.getElementById('gc'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
// Expose helpers for multiplayer.js (const/let vars don't become window properties)
window.getMyBoatX=()=>canvas.width?Boat.x/canvas.width:0.5;
window.getMyHookY=()=>canvas.height?Hook.y/canvas.height:0.5;
window.getMyHookAngle=()=>Hook.angle||0;
window.getGameState=()=>S;
// Chaos mode item sync (called by MP message handlers)
window.applyChaosSpawn=(item)=>{S.items.push(item)};
window.removeChaosItem=(chaosId)=>{S.items=S.items.filter(i=>i.chaosId!==chaosId)};
const isPhone=()=>window.matchMedia('(max-width:500px)').matches;
const isTablet=()=>window.matchMedia('(hover:none) and (min-width:501px)').matches;
const isMobile=()=>window.matchMedia('(hover:none),(max-width:500px)').matches;
const HH=()=>{const el=document.getElementById('hud');return el?el.offsetHeight:34};
const WY=()=>{const mh=MH();if(mh===0)return Math.floor(canvas.height*.42);const gap=canvas.height-HH()-mh;return Math.floor(HH()+Math.max(55,gap*.30));};
const _isIPad=()=>window.matchMedia('(hover:none) and (min-width:601px)').matches;
const MH=()=>{const el=document.getElementById('mc');if(!el||getComputedStyle(el).display==='none')return 0;if(_isIPad())return 0;return el.offsetHeight};
const BOT=()=>canvas.height-MH()-28;
function resz(){canvas.width=canvas.parentElement.clientWidth;canvas.height=canvas.parentElement.clientHeight;ctx.imageSmoothingEnabled=false}
window.addEventListener('resize',resz);

/* ============================================================
   TIMER LOGIC
   ============================================================ */
function getPhaseElapsed(){
  if(!S.running&&!S.paused)return S.phaseTime*1000;
  const rawElapsed=performance.now()-S.phaseStart;
  return rawElapsed-S.pausedElapsed-(S.paused?(performance.now()-S.pauseStart):0);
}
function getPhaseSecondsLeft(){const limit=PHASE_TIME[S.phase]||60;return Math.max(0,limit-getPhaseElapsed()/1000)}
function calcTimeBonus(secondsLeft){if(secondsLeft<=0)return 0;return Math.floor((secondsLeft/(PHASE_TIME[S.phase]||60))*500)}
let _lastTimerTick=0;
function tickTimer(){
  const left=getPhaseSecondsLeft();
  const el=document.getElementById('htimer');el.textContent=Math.ceil(left);el.classList.toggle('urgent',left<=10);
  if(left<=10&&left>0){const now=Date.now();if(now-_lastTimerTick>=1000){_lastTimerTick=now;sTimer()}}
  if(left<=0&&S.running){loseLife('TIME UP! -1 ❤️');S.phaseStart=performance.now();S.pausedElapsed=0}
}

/* ============================================================
   PAUSE / HOME
   ============================================================ */
function togglePause(){
  if(!S.running&&!S.paused)return;
  S.paused=!S.paused;
  const btn=document.getElementById('btn-pause'),overlay=document.getElementById('pause-overlay');
  if(S.paused){
    S.pauseStart=performance.now();S.running=false;if(btn)btn.textContent='▶';overlay.classList.add('active');
    document.getElementById('pause-lvl').textContent=S.phase+1;
    document.getElementById('pause-score').textContent=S.score;
    document.getElementById('pause-time').textContent=Math.ceil(getPhaseSecondsLeft());
    if(_lid){cancelAnimationFrame(_lid);_lid=null}
  }else{
    S.pausedElapsed+=performance.now()-S.pauseStart;S.running=true;if(btn)btn.textContent='⏸';
    overlay.classList.remove('active');lt=performance.now();_lid=requestAnimationFrame(loop);
  }
}
function goHome(){
  if(typeof MP!=='undefined'&&MP.active)MP.reset();
  document.getElementById('countdown-overlay').classList.add('h');
  if(!_runRecorded&&(S.phase>0||S.score>0)){
    _runRecorded=true;const elapsed=S.running?(performance.now()-S.phaseStart-S.pausedElapsed)/1000:0;
    addSessionRun({name:pName,score:S.score,totalTime:S.totalTime+elapsed,bonus:S.totalBonus,fate:'over'});
  }
  if(PH.length>10){PH.splice(10);PHASE_TIME.splice(10)}
  stopLoop();S.paused=false;
  document.getElementById('pause-overlay').classList.remove('active');
  const _bp=document.getElementById('btn-pause');if(_bp)_bp.textContent='⏸';
  ['mgo','mwn','brf','mlv'].forEach(id=>document.getElementById(id).classList.add('h'));
  document.getElementById('gs').classList.remove('active');
  document.getElementById('lobby').classList.add('active');
  renderSessionScores();
  if(typeof SB!=='undefined')SB.refreshLeaderboard();
}

/* ============================================================
   BOAT & HOOK — physics
   ============================================================ */
const Boat={
  w:48,h:14,speed:3.2,accel:0.30,drag:0.84,
  x:0,y:0,baseY:0,draft:0,roll:0,prevX:0,vx:0,
  init(){
    this.speed=selectedBoat.speed;
    this.accel=selectedBoat.accel||0.30;
    this.drag=selectedBoat.drag||0.84;
    this.x=canvas.width/2;
    this.baseY=WY()-this.h*.6;
    this.y=this.baseY;
    this.prevX=this.x;this.vx=0;
    this.draft=0;this.roll=0;
  }
};

const Hook={
  angle:0,av:0,ll:60,tl:60,lv:0,
  minL:38,maxL:0,
  x:0,y:0,radius:14,rox:14,roy:-22,
  grav:.006,damp:.984,ls:2.8,lbx:0,
  turbX:0,turbY:0,turbTimer:0,heavyTension:0,waterVelX:0,
  get tx(){return Boat.x+this.rox},
  get ty(){return Boat.y+this.roy},
  _u(){this.x=this.tx+Math.sin(this.angle)*this.ll;this.y=this.ty+Math.cos(this.angle)*this.ll},
  init(){
    this.angle=0;this.av=0;this.ll=this.minL;this.tl=this.minL;this.lv=0;
    this.radius=selectedBoat.hookR;
    this.lbx=Boat.x;
    this.maxL=(canvas.height-WY()-MH()-18)*selectedBoat.depthMult;
    this.turbX=0;this.turbY=0;this.waterVelX=0;this.heavyTension=0;
    this._u();
  },
  update(dt){
    const dtN=dt/16.67;
    this.maxL=(canvas.height-WY()-MH()-22)*selectedBoat.depthMult;
    if(iD())this.tl=Math.min(this.maxL,this.tl+this.ls);
    if(iU())this.tl=Math.max(this.minL,this.tl-this.ls);
    const lineDelta=this.tl-this.ll;
    const springK=0.12,springDamp=0.78;
    this.lv=(this.lv+lineDelta*springK)*springDamp;
    this.ll+=this.lv*dtN;
    this.ll=Math.max(this.minL,Math.min(this.maxL,this.ll));
    const depthRatio=Math.min(1,(this.ll-this.minL)/Math.max(1,this.maxL-this.minL));
    const bvx=Boat.x-this.lbx;this.lbx=Boat.x;
    this.av+=(bvx*.016)/Math.max(this.ll,18);
    this.av-=this.grav*Math.sin(this.angle);
    const baseDamp=this.damp-(depthRatio*.003);
    const reelingDrag=Math.abs(this.lv)*.008,boatDrag=Math.abs(bvx)*.012;
    this.av*=Math.max(0.94,baseDamp-reelingDrag-boatDrag);
    this.turbTimer-=dt;
    if(this.turbTimer<=0){this.turbX=(Math.random()-.5)*.005;this.turbTimer=250+Math.random()*400}
    this.av+=this.turbX*depthRatio;
    if(this.heavyTension>0){this.av*=(.97-this.heavyTension*.02);this.heavyTension=Math.max(0,this.heavyTension-.5)}
    if(Math.abs(this.angle)>.85){this.angle=Math.sign(this.angle)*.85;this.av*=-.3}
    this.angle+=this.av;
    this._u();
    const loadSink=depthRatio*3.5,tensionSink=this.heavyTension*.4;
    Boat.draft+=(loadSink+tensionSink-Boat.draft)*.06;
    Boat.y=Boat.baseY+Boat.draft;
    Boat.roll+=(this.angle*.18-Boat.roll)*.08;
  }
};

/* ============================================================
   SONAR SYSTEM
   ============================================================ */
const Sonar={
  active:false,radius:0,maxRadius:0,alpha:0,cooldown:0,COOLDOWN:6000,highlightTimer:0,rings:[],
  trigger(cx,cy){
    if(this.cooldown>0)return;
    this.active=true;this.alpha=1;this.radius=0;this.maxRadius=Math.max(canvas.width,canvas.height)*.8;
    this.cx=cx;this.cy=cy;this.cooldown=this.COOLDOWN;this.highlightTimer=1800;
    this.rings=[{r:0,a:1},{r:0,a:.6},{r:0,a:.3}];
    sSonar();
    const _bs=document.getElementById('btn-sonar');if(_bs)_bs.classList.add('sonar-active');
    const mob=document.getElementById('btn-sonar-mob');if(mob){mob.style.borderColor='#00ffff';mob.classList.remove('ready')}
  },
  update(dt){
    if(this.cooldown>0){
      this.cooldown=Math.max(0,this.cooldown-dt);
      if(this.cooldown===0){
        const _bs2=document.getElementById('btn-sonar');if(_bs2)_bs2.classList.remove('sonar-active');
        const mob=document.getElementById('btn-sonar-mob');if(mob){mob.style.borderColor='';mob.classList.add('ready')}
        showHudAlert('SONAR READY!');
      }
    }
    if(this.highlightTimer>0)this.highlightTimer=Math.max(0,this.highlightTimer-dt);
    this.rings.forEach((ring,i)=>{ring.r+=(2.5+i*.8)*dt*.06;ring.a=Math.max(0,(1-ring.r/this.maxRadius)*.8)});
    this.rings=this.rings.filter(r=>r.a>0);
    if(this.rings.length===0)this.active=false;
  },
  draw(){
    if(!this.active&&this.rings.length===0)return;
    this.rings.forEach(ring=>{
      if(ring.r<=0)return;
      ctx.save();ctx.globalAlpha=ring.a;ctx.strokeStyle='#00e5ff';ctx.lineWidth=2;
      ctx.shadowBlur=12;ctx.shadowColor='#00d4ff';
      ctx.beginPath();ctx.arc(this.cx,this.cy,ring.r,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    });
  }
};
function triggerSonar(){
  Sonar.trigger(Boat.x,Boat.y);
  _achievTrack.sonarUses++;
  if(_achievTrack.sonarUses>=5)_checkAchiev('sonar5');
}

/* ============================================================
   OCEAN CURRENTS
   ============================================================ */
const OceanCurrents={
  bands:[],particles:[],
  init(){
    const wy=WY(),bot=BOT(),depth=bot-wy;
    this.bands=[
      {y:wy+depth*.1,h:depth*.25,vx:.4+Math.random()*.3},
      {y:wy+depth*.4,h:depth*.25,vx:(Math.random()>.5?1:-1)*(1.0+Math.random()*.5)},
      {y:wy+depth*.72,h:depth*.22,vx:(Math.random()>.5?1:-1)*(1.5+Math.random()*.8)},
    ];
    this.particles=Array.from({length:40},()=>this._spawnParticle());
  },
  _spawnParticle(){
    const band=this.bands[Math.floor(Math.random()*this.bands.length)];
    return{x:Math.random()*canvas.width,y:band.y+Math.random()*band.h,vx:band.vx,band,life:Math.random(),len:8+Math.random()*16};
  },
  getBandAt(y){for(const b of this.bands)if(y>=b.y&&y<=b.y+b.h)return b;return null},
  update(dt){
    this.particles.forEach(p=>{p.x+=p.vx*(dt*.05);p.life+=dt*.0003;if(p.life>1||p.x<-50||p.x>canvas.width+50){Object.assign(p,this._spawnParticle());p.life=0;if(p.vx>0)p.x=-10;else p.x=canvas.width+10}});
    Hook.waterVelX=(this.getBandAt(Hook.y)||{vx:0}).vx;
  },
  draw(){
    this.bands.forEach(b=>{ctx.save();ctx.globalAlpha=.04;ctx.fillStyle=b.vx>0?'#0055ff':'#ff5500';ctx.fillRect(0,b.y,canvas.width,b.h);ctx.restore()});
    ctx.save();
    this.particles.forEach(p=>{const a=Math.sin(p.life*Math.PI)*.35;ctx.globalAlpha=a;ctx.strokeStyle='#80c8ff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.floor(p.x),Math.floor(p.y));ctx.lineTo(Math.floor(p.x-p.vx*p.len*.5),Math.floor(p.y));ctx.stroke()});
    ctx.restore();
  }
};

/* ============================================================
   FISH AI
   ============================================================ */
const FishAI={
  fish:[],
  TYPES:{small:{w:14,h:7,speed:2.2,color:'#cc4422',glint:'#ff7755',stealRadius:22},big:{w:22,h:12,speed:1.1,color:'#3377aa',glint:'#66aaff',stealRadius:35}},
  init(){
    this.fish=[];const wy=WY();
    for(let i=0;i<3+Math.floor(Math.random()*2);i++)this.fish.push(this._spawn('small',wy));
    for(let i=0;i<1+Math.floor(Math.random()*2);i++)this.fish.push(this._spawn('big',wy));
  },
  _spawn(type,wy){
    const T=this.TYPES[type];
    return{type,w:T.w,h:T.h,speed:T.speed*(0.8+Math.random()*.4),color:T.color,glint:T.glint,stealRadius:T.stealRadius,x:Math.random()<.5?-T.w-10:canvas.width+T.w+10,y:wy+50+Math.random()*(canvas.height-wy-80),vx:(Math.random()<.5?1:-1)*T.speed*(0.8+Math.random()*.4),vy:0,phase:Math.random()*Math.PI*2,stealing:false,stealTimer:0,sonarGlow:255,fadeDelay:4000+Math.random()*5000,born:0};
  },
  update(dt,wy){
    const t=Date.now()*.001;
    this.fish.forEach(f=>{
      f.y+=Math.sin(t*2+f.phase)*.5;f.x+=f.vx*(dt*.06);
      if(f.x<-f.w-20||f.x>canvas.width+f.w+20){f.x=f.vx>0?-f.w-10:canvas.width+f.w+10;f.y=wy+50+Math.random()*(canvas.height-wy-80)}
      f.y=Math.max(wy+10,Math.min(canvas.height-50,f.y));
      if(!f.stealing&&Hook.heavyTension>0){const dx=Hook.x-f.x,dy=Hook.y-f.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<f.stealRadius*2){const angle=Math.atan2(dy,dx);f.vx=Math.cos(angle)*f.speed;if(dist<f.stealRadius){f.stealing=true;f.stealTimer=1200;Hook.heavyTension=0;showHudAlert('FISH STOLE IT! 🐟');fb('STOLEN!',false);beep(300,'sawtooth',.2,.3);f.vx=f.vx<0?-f.speed*2:f.speed*2}}}
      if(f.stealing){f.stealTimer-=dt;if(f.stealTimer<=0)f.stealing=false}
      f.born=(f.born||0)+dt;if(f.born>f.fadeDelay)f.sonarGlow=Math.max(0,f.sonarGlow-dt*.035);
    });
  },
  draw(wy){
    const t=Date.now()*.001;
    this.fish.forEach(f=>{
      const sonarAlpha=f.sonarGlow/255,visAlpha=f.stealing?0.9:(0.06+sonarAlpha*0.94);if(visAlpha<.01)return;
      const fx=Math.floor(f.x),fy=Math.floor(f.y+Math.sin(t*2+f.phase)*3);
      ctx.save();ctx.globalAlpha=visAlpha;
      if(sonarAlpha>.7&&!f.stealing){ctx.shadowBlur=10;ctx.shadowColor=f.color}
      if(f.vx<0){ctx.translate(fx,fy);ctx.scale(-1,1)}else ctx.translate(fx,fy);
      ctx.fillStyle=f.color;ctx.fillRect(0,0,f.w,f.h);ctx.fillRect(-Math.floor(f.w*.4),Math.floor(f.h*.15),Math.floor(f.w*.4),Math.floor(f.h*.7));
      ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillRect(Math.floor(f.w*.75),Math.floor(f.h*.2),3,3);ctx.fillStyle='#000';ctx.fillRect(Math.floor(f.w*.76),Math.floor(f.h*.22),2,2);
      ctx.fillStyle=f.glint;ctx.globalAlpha*=.4;ctx.fillRect(Math.floor(f.w*.2),1,Math.floor(f.w*.3),2);
      if(f.stealing){ctx.globalAlpha=.7;ctx.fillStyle='#ff3300';ctx.fillRect(-2,-2,f.w+4,f.h+4)}
      ctx.restore();
    });
  }
};

/* ============================================================
   ECOSYSTEM
   ============================================================ */
const Ecosystem={
  seaweed:[],crabs:[],bubbles:[],biolumin:[],ambientFish:[],
  init(){
    const wy=WY(),bot=BOT();
    this.seaweed=Array.from({length:10},()=>({x:20+Math.random()*(canvas.width-40),h:25+Math.random()*55,phase:Math.random()*Math.PI*2}));
    this.crabs=Array.from({length:4},()=>({x:Math.random()*canvas.width,vx:(Math.random()-.5)*.4,phase:Math.random()*Math.PI*2}));
    this.bubbles=Array.from({length:20},()=>({x:Math.random()*canvas.width,y:bot-Math.random()*(bot-wy),r:1+Math.random()*3,speed:.3+Math.random()*.5,life:Math.random()}));
    this.biolumin=Array.from({length:18},()=>({x:Math.random()*canvas.width,y:bot-Math.random()*(bot-wy)*.45,r:1+Math.random()*2,phase:Math.random()*Math.PI*2,color:`hsl(${160+Math.random()*80},100%,70%)`}));
    this.ambientFish=Array.from({length:6},()=>({x:Math.random()*canvas.width,y:bot-20-Math.random()*40,vx:(Math.random()>.5?1:-1)*.5,phase:Math.random()*Math.PI*2,col:['#204060','#403060','#103040'][Math.floor(Math.random()*3)]}));
  },
  update(dt){
    const t=Date.now()*.001,bot=BOT();
    this.bubbles.forEach(b=>{b.y-=b.speed*(dt*.06);b.life+=dt*.0004;if(b.y<WY()||b.life>1){b.y=bot-2;b.x=Math.random()*canvas.width;b.life=0}});
    this.crabs.forEach(c=>{c.x+=c.vx*(dt*.06);c.phase+=dt*.005;if(c.x<10||c.x>canvas.width-10)c.vx*=-1});
    this.ambientFish.forEach(f=>{f.x+=f.vx*(dt*.06);f.phase+=dt*.004;if(f.x<-20)f.x=canvas.width+20;if(f.x>canvas.width+20)f.x=-20;f.y=bot-20+Math.sin(t*1.2+f.phase)*8});
  },
  draw(){
    const t=Date.now()*.001,bot=BOT();
    this.seaweed.forEach(sw=>{for(let i=0;i<sw.h;i+=7){const sway=Math.sin(t*.8+sw.phase+i*.08)*5*(i/sw.h),bright=Math.floor(15+15*(i/sw.h));ctx.fillStyle=`hsl(135,45%,${bright}%)`;const w=Math.max(2,4-i*(3/sw.h));ctx.fillRect(Math.floor(sw.x+sway-w/2),bot-i-7,w,8);if(i>sw.h*.4&&i%14<7){ctx.fillStyle=`hsl(130,40%,${bright+5}%)`;ctx.fillRect(Math.floor(sw.x+sway+3),bot-i-4,5,3);ctx.fillRect(Math.floor(sw.x+sway-8),bot-i-4,5,3)}}});
    this.crabs.forEach(c=>{const cx=Math.floor(c.x),cy=bot-6;ctx.fillStyle='#8b2500';ctx.fillRect(cx-6,cy-4,12,6);ctx.fillRect(cx-10,cy-5,5,4);ctx.fillRect(cx+5,cy-5,5,4);ctx.fillStyle='#7a2000';for(let i=-2;i<=2;i+=2)ctx.fillRect(cx+i*2,cy,2,4+Math.abs(Math.sin(c.phase+i))*2);ctx.fillStyle='#fff';ctx.fillRect(cx-3,cy-5,2,2);ctx.fillRect(cx+1,cy-5,2,2)});
    this.bubbles.forEach(b=>{const a=.25*(1-b.life*.7);if(a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#7ac5e8';ctx.lineWidth=1;ctx.strokeRect(Math.floor(b.x),Math.floor(b.y),Math.ceil(b.r*2),Math.ceil(b.r*2));ctx.restore()});
    const deepZone=bot-(canvas.height-WY())*.45;
    this.biolumin.forEach(p=>{if(p.y<deepZone)return;const a=.15+.35*Math.abs(Math.sin(t*1.5+p.phase));ctx.save();ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fillRect(Math.floor(p.x+Math.sin(t+p.phase)*4),Math.floor(p.y+Math.cos(t*.7+p.phase)*3),p.r*2,p.r*2);ctx.restore()});
    this.ambientFish.forEach(f=>{ctx.save();ctx.globalAlpha=.3;if(f.vx<0){ctx.translate(Math.floor(f.x),Math.floor(f.y));ctx.scale(-1,1)}else ctx.translate(Math.floor(f.x),Math.floor(f.y));ctx.fillStyle=f.col;ctx.fillRect(0,0,10,5);ctx.fillRect(-4,1,4,3);ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(7,1,2,2);ctx.restore()});
  }
};

/* ============================================================
   PARTICLES
   ============================================================ */
const Particles={
  list:[],
  spawn(x,y,color,count){
    count=count||12;
    for(let i=0;i<count;i++){
      const ang=Math.random()*Math.PI*2,spd=1.5+Math.random()*3.5;
      this.list.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-1.5,color,size:2+Math.floor(Math.random()*3),life:0,maxLife:350+Math.random()*300});
    }
  },
  confetti(cx,cy,count){
    const cols=['#ff4444','#44ff88','#ffd700','#00d4ff','#ff66ff','#ff8800','#00ffcc'];
    count=count||55;
    for(let i=0;i<count;i++){
      const ang=Math.random()*Math.PI*2,spd=2.5+Math.random()*5.5;
      this.list.push({x:cx||canvas.width/2,y:cy||canvas.height*.25,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-4.5,color:cols[i%cols.length],size:3+Math.floor(Math.random()*4),life:0,maxLife:900+Math.random()*700});
    }
  },
  update(dt){
    this.list.forEach(p=>{p.x+=p.vx*(dt*.06);p.y+=p.vy*(dt*.06);p.vy+=0.06*(dt*.06);p.life+=dt});
    this.list=this.list.filter(p=>p.life<p.maxLife);
  },
  draw(){
    this.list.forEach(p=>{const a=Math.max(0,1-p.life/p.maxLife);ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.fillRect(Math.floor(p.x),Math.floor(p.y),p.size,p.size)});
    ctx.globalAlpha=1;
  }
};

/* ============================================================
   WAKE TRAIL
   ============================================================ */
const WakeTrail={
  foam:[],
  update(dt){
    const mv=Math.abs(Boat.x-Boat.prevX);
    if(mv>.4&&Math.random()<mv*.25){
      const s=(Math.random()-.5)*Boat.w*.5;
      this.foam.push({x:Boat.x+s,y:Boat.y+Boat.h,vx:(Math.random()-.5)*.6,vy:-.15-Math.random()*.3,life:0,maxLife:280+Math.random()*220});
    }
    this.foam.forEach(f=>{f.x+=f.vx*(dt*.06);f.y+=f.vy*(dt*.06);f.vy+=0.008*(dt*.06);f.life+=dt});
    this.foam=this.foam.filter(f=>f.life<f.maxLife);
  },
  draw(){
    this.foam.forEach(f=>{const a=(1-f.life/f.maxLife)*.55;ctx.globalAlpha=a;ctx.fillStyle='#c4eaff';ctx.fillRect(Math.floor(f.x),Math.floor(f.y),2,2)});
    ctx.globalAlpha=1;
  }
};

/* ============================================================
   INPUT
   ============================================================ */
const K={};
document.addEventListener('keydown',e=>{
  K[e.key]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)&&document.activeElement?.tagName!=='INPUT')e.preventDefault();
  if(e.key==='Escape'&&S.running)togglePause();
  if(e.key==='m'||e.key==='M')toggleMute();
  if(e.key===' '&&S.running&&document.activeElement?.tagName!=='INPUT')triggerSonar();
});
document.addEventListener('keyup',e=>{K[e.key]=false});
const MK={u:false,d:false,l:false,r:false};
function _bindDpad(padId){
  const pad=document.getElementById(padId);if(!pad)return;
  pad.addEventListener('touchstart',_dpadTouch,{passive:false});
  pad.addEventListener('touchmove',_dpadTouch,{passive:false});
  pad.addEventListener('touchend',_dpadRelease,{passive:false});
  pad.addEventListener('touchcancel',_dpadRelease,{passive:false});
  pad.querySelectorAll('.db[data-dir]').forEach(btn=>{
    btn.addEventListener('mousedown',()=>{MK[btn.dataset.dir]=true;btn.classList.add('pressed')});
    btn.addEventListener('mouseup',()=>{MK[btn.dataset.dir]=false;btn.classList.remove('pressed')});
    btn.addEventListener('mouseleave',()=>{MK[btn.dataset.dir]=false;btn.classList.remove('pressed')});
  });
}
function _getBtnAt(pad,x,y){const els=pad.querySelectorAll('.db[data-dir]');for(const el of els){const r=el.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return el}return null}
const _activeTouches={};
function _dpadTouch(e){
  e.preventDefault();const pad=e.currentTarget;
  Array.from(e.changedTouches).forEach(t=>{
    const btn=_getBtnAt(pad,t.clientX,t.clientY);
    const prev=_activeTouches[t.identifier];
    if(prev){MK[prev.dir]=false;const old=document.getElementById(prev.btnId);if(old)old.classList.remove('pressed')}
    if(btn){const dir=btn.dataset.dir;MK[dir]=true;btn.classList.add('pressed');_activeTouches[t.identifier]={dir,btnId:btn.id}}
    else delete _activeTouches[t.identifier];
  });
}
function _dpadRelease(e){
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t=>{
    const prev=_activeTouches[t.identifier];
    if(prev){MK[prev.dir]=false;const old=document.getElementById(prev.btnId);if(old)old.classList.remove('pressed')}
    delete _activeTouches[t.identifier];
  });
}
function initJoysticks(){_bindDpad('dpad-left');_bindDpad('dpad-right')}
document.addEventListener('DOMContentLoaded',()=>{initJoysticks();buildBoatCards();if(typeof SB!=='undefined')SB.refreshLeaderboard();});
const iL=()=>K['ArrowLeft']||K['a']||K['A']||MK.l;
const iR=()=>K['ArrowRight']||K['d']||K['D']||MK.r;
const iU=()=>K['ArrowUp']||K['w']||K['W']||MK.u;
const iD=()=>K['ArrowDown']||K['s']||K['S']||MK.d;

/* ============================================================
   ITEMS
   ============================================================ */
const cp=()=>PH[S.phase];
function getPool(){
  const pool=[];
  Object.keys(phr()).forEach(k=>{
    const members=_MG_CAT_MEMBERS[k];
    if(members)members.forEach(m=>pool.push(m,m,m));
    else pool.push(k,k,k);
  });
  Object.keys(CD).forEach(k=>{if(CD[k].type!=='trash'&&CD[k].type!=='powerup')pool.push(k)});
  pool.push('BOOT','BOOT','CAN','CAN','TIRE');
  if(S.phase>=1){pool.push('MAGNET');pool.push('FREEZE')}
  if(S.phase>=3)pool.push('DOUBLE');
  return pool;
}
function spawn(){
  // In chaos mode, only the host spawns items (clients receive via network)
  if(_gameMode==='chaos'&&typeof MP!=='undefined'&&MP.active&&MP.started&&!MP.isHost)return;
  const pool=getPool(),key=pool[Math.floor(Math.random()*pool.length)],def=CD[key];
  const wy=WY(),my=canvas.height-MH()-18;
  // Keep items away from the hook's starting position (near waterline directly below boat)
  const safeX=Hook.x,safeY=Hook.y,safeR=60;
  let ix,iy,tries=0;
  do{ix=70+Math.random()*(canvas.width-140);iy=wy+28+Math.random()*Math.max(8,my-wy-55);tries++}
  while(tries<12&&Math.hypot(ix-safeX,iy-safeY)<safeR);
  const item={key,def,x:ix,y:iy,vx:(Math.random()-.5)*1.3,vy:(Math.random()-.5)*.8,radius:def.type==='trash'?20:16,life:0,maxLife:10000+Math.random()*12000,caught:false,wobble:Math.random()*Math.PI*2,sonarGlow:255,fadeDelay:3000+Math.random()*4000,chaosId:Math.random().toString(36).slice(2,9)};
  S.items.push(item);
  // Chaos host broadcasts item to all clients
  if(_gameMode==='chaos'&&typeof MP!=='undefined'&&MP.active&&MP.started&&MP.isHost)MP.chaosSpawn(item);
}

/* ============================================================
   ENV DATA
   ============================================================ */
let _envData=null;
function getEnv(){
  if(!_envData){_envData={
    corals:Array.from({length:8},()=>({x:Math.random()*canvas.width,type:Math.floor(Math.random()*3),h:20+Math.random()*30,color:['#cc2244','#cc6600','#9900cc','#006699','#00aa44'][Math.floor(Math.random()*5)]})),
    rocks:Array.from({length:12},()=>({x:Math.random()*canvas.width,w:8+Math.random()*20,h:6+Math.random()*12,color:['#1a1208','#221a0e','#181208'][Math.floor(Math.random()*3)]})),
    bgFish:Array.from({length:3},()=>({x:Math.random()*canvas.width,y:0,vx:(Math.random()>.5?1:-1)*.4,col:['#3d5577','#6b3d77','#1a5544'][Math.floor(Math.random()*3)]})),
  }}
  return _envData;
}

/* ============================================================
   PIXEL HELPERS
   ============================================================ */
function px_rect(x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(Math.floor(x),Math.floor(y),w,h)}
function px_text(txt,x,y,col,sz){ctx.fillStyle='#000';ctx.font=`${sz}px 'Press Start 2P',monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,x+1,y+1);ctx.fillStyle=col;ctx.fillText(txt,x,y)}

/* ============================================================
   SKY SCENES — 10 fully distinct visual themes, one per level
   Each has sky(wy,hh,t,cw) and terrain(wy,hh,t,cw) methods.
   _envData must be non-null before calling (call getEnv() first).
   ============================================================ */
function _ensureStars(hh,wy,cw){
  if(!_envData.stars)_envData.stars=Array.from({length:50},()=>({x:Math.floor(Math.random()*cw),y:hh+Math.floor(Math.random()*(wy-hh-10)),off:Math.random()*Math.PI*2}));
}
function _ensureClouds(hh,wy,cw){
  if(!_envData.gameClouds)_envData.gameClouds=Array.from({length:5},()=>({x:Math.random()*cw,y:hh+10+Math.random()*30,w:60+Math.random()*90,speed:.12+Math.random()*.18}));
}
function _ensureEmbers(hh,wy,cw){
  if(!_envData.embers)_envData.embers=Array.from({length:30},()=>({x:Math.random()*cw,y:hh+Math.random()*(wy-hh),sp:.3+Math.random()*1.1,ph:Math.random()*Math.PI*2,sz:Math.random()>.6?3:2}));
}
const SKY_SCENES=[
  /* L1 ── DAWN  pink/amber sunrise, lighthouse on rolling hills */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#0a0d2a');g.addColorStop(.45,'#3d1830');g.addColorStop(.78,'#8b3520');g.addColorStop(1,'#d4681e');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Sun half-disc on horizon
    const sx=Math.floor(cw*.62);
    ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#ffaa33';ctx.beginPath();ctx.arc(sx,wy,90,Math.PI,0);ctx.fill();
    ctx.globalAlpha=.55;ctx.fillStyle='#ffcc44';ctx.beginPath();ctx.arc(sx,wy,32,Math.PI,0);ctx.fill();ctx.restore();
    // Fading stars
    _ensureStars(hh,wy,cw);
    _envData.stars.forEach(s=>{ctx.globalAlpha=.08+.12*Math.abs(Math.sin(t+s.off));px_rect(s.x,s.y,1,1,'#ffd8aa')});ctx.globalAlpha=1;
  },terrain(wy,hh,t,cw){
    // Gentle coastal hills
    ctx.fillStyle='#0d1a08';
    const pts=[[0,1],[.1,.72],[.2,.78],[.35,.6],[.5,.74],[.65,.58],[.8,.7],[.92,.66],[1,.76]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
    // Lighthouse
    const lx=Math.floor(cw*.65),lb=Math.floor(hh+(wy-hh)*.58);
    ctx.fillStyle='#dde8ee';ctx.fillRect(lx-4,lb-22,8,22);
    ctx.fillStyle='#cc3300';ctx.fillRect(lx-5,lb-28,10,7);
    ctx.fillStyle='#ffff88';ctx.globalAlpha=.4+.25*Math.sin(t*2);ctx.fillRect(lx-2,lb-25,4,3);ctx.globalAlpha=1;
  }},
  /* L2 ── BRIGHT DAY  blue sky, fluffy clouds, windmill coast */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#1a4fa0');g.addColorStop(.5,'#3d88cc');g.addColorStop(1,'#7ab8dd');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Sun
    const sx=Math.floor(cw*.78),sy=Math.floor(hh+(wy-hh)*.2);
    ctx.fillStyle='#ffe233';ctx.fillRect(sx-10,sy-10,20,20);
    ctx.globalAlpha=.18;ctx.fillStyle='#ffee88';ctx.fillRect(sx-18,sy-18,36,36);ctx.globalAlpha=1;
    // Puffy clouds
    _ensureClouds(hh,wy,cw);
    _envData.gameClouds.forEach(c=>{
      c.x+=c.speed;if(c.x>cw+c.w+20)c.x=-(c.w+20);
      const cx2=Math.floor(c.x),cy2=Math.floor(c.y),cw2=Math.floor(c.w);
      ctx.globalAlpha=.88;ctx.fillStyle='#e8f4ff';
      ctx.fillRect(cx2,cy2+6,cw2,10);ctx.fillRect(cx2+8,cy2,cw2-16,12);ctx.fillRect(cx2+18,cy2-6,cw2-36,8);
      ctx.fillStyle='#c0d8f0';ctx.fillRect(cx2,cy2+14,cw2,2);
    });ctx.globalAlpha=1;
  },terrain(wy,hh,t,cw){
    ctx.fillStyle='#0d2008';
    const pts=[[0,1],[.12,.76],[.25,.82],[.38,.68],[.52,.76],[.68,.7],[.8,.78],[.92,.72],[1,.8]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
    // Windmill
    const wx=Math.floor(cw*.38),wbase=Math.floor(hh+(wy-hh)*.68);
    ctx.fillStyle='#556';ctx.fillRect(wx-2,wbase-20,4,20);
    ctx.fillStyle='#778';
    for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.6;ctx.fillRect(Math.floor(wx+Math.cos(a)*10-1),Math.floor(wbase-20+Math.sin(a)*10-3),2,6)}
  }},
  /* L3 ── TROPICAL ISLAND  vivid blue, palm island, seabirds */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#0055cc');g.addColorStop(.6,'#1198ee');g.addColorStop(1,'#44ccee');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Bright sun
    const sx=Math.floor(cw*.78),sy=Math.floor(hh+(wy-hh)*.16);
    ctx.fillStyle='#ffe033';ctx.fillRect(sx-11,sy-11,22,22);
    ctx.globalAlpha=.22;ctx.fillStyle='#ffdd00';ctx.fillRect(sx-20,sy-20,40,40);ctx.globalAlpha=1;
    // Seabirds (V-shapes)
    [.28,.40,.47].forEach((bx,i)=>{
      const by=Math.floor(hh+(wy-hh)*(.28+i*.07)+Math.sin(t+i*1.7)*4);
      ctx.strokeStyle='#003388';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(bx*cw-7,by);ctx.lineTo(bx*cw,by-4);ctx.lineTo(bx*cw+7,by);ctx.stroke();
    });
  },terrain(wy,hh,t,cw){
    // Sandy island strip
    ctx.fillStyle='#c8a44a';ctx.fillRect(Math.floor(cw*.28),wy-9,Math.floor(cw*.44),10);
    ctx.fillStyle='#d4b560';ctx.fillRect(Math.floor(cw*.33),wy-14,Math.floor(cw*.34),7);
    // Palm trees
    [[.42,.62],[.57,.54]].forEach(([tx,th])=>{
      const px=Math.floor(tx*cw),py=Math.floor(hh+(wy-hh)*th);
      const sway=Math.sin(t*.8)*3;
      ctx.fillStyle='#7a5c28';for(let i=0;i<22;i+=4)ctx.fillRect(Math.floor(px+Math.sin(i*.25)*2-2+sway*.1*i/22),py+i,4,4);
      ctx.fillStyle='#1a5c1a';
      [[-13,-5,8],[-7,-13,7],[0,-17,6],[7,-13,7],[13,-5,8]].forEach(([fx,fy,fw])=>{
        ctx.fillRect(Math.floor(px+fx+sway*.4),py+fy,fw,4);ctx.fillRect(Math.floor(px+fx*1.2+sway*.7),py+fy-4,fw-2,4);
      });
    });
    // Green hills behind
    ctx.fillStyle='#0d2010';
    const pts=[[0,1],[.14,.74],[.28,.8],[.3,.58],[.38,.56],[.62,.58],[.7,.56],[.72,.78],[.86,.72],[1,1]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
  }},
  /* L4 ── VOLCANIC  crimson sky, erupting volcano, ash clouds, embers */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#180200');g.addColorStop(.4,'#4a0a00');g.addColorStop(.8,'#aa2a00');g.addColorStop(1,'#ff5500');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Ash clouds (drifting left)
    _ensureClouds(hh,wy,cw);
    _envData.gameClouds.forEach(c=>{
      c.x-=c.speed*.6;if(c.x<-c.w-20)c.x=cw+c.w+20;
      const cx2=Math.floor(c.x),cy2=Math.floor(c.y),cw2=Math.floor(c.w);
      ctx.globalAlpha=.55;ctx.fillStyle='#281000';
      ctx.fillRect(cx2,cy2+4,cw2,12);ctx.fillRect(cx2+8,cy2-3,cw2-16,12);
    });ctx.globalAlpha=1;
    // Ember particles rising
    _ensureEmbers(hh,wy,cw);
    _envData.embers.forEach(e=>{
      e.y-=e.sp;if(e.y<hh){e.y=wy-4;e.x=Math.random()*cw}
      ctx.globalAlpha=.45+.45*Math.sin(t*3+e.ph);
      ctx.fillStyle=e.ph<1.6?'#ff4400':'#ff9900';ctx.fillRect(Math.floor(e.x+Math.sin(t*1.5+e.ph)*4),Math.floor(e.y),e.sz,e.sz);
    });ctx.globalAlpha=1;
  },terrain(wy,hh,t,cw){
    ctx.fillStyle='#180400';
    const vtop=Math.floor(hh+(wy-hh)*.26);
    const pts=[[0,1],[.12,.82],[.28,.7],[.44,.28],[.55,0],[.66,.28],[.78,.7],[.9,.8],[1,.88]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(vtop+(wy-vtop)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
    // Crater lava glow
    const gl=.5+.35*Math.sin(t*1.8);ctx.globalAlpha=gl;
    ctx.fillStyle='#ff5500';ctx.fillRect(Math.floor(cw*.5-12),vtop,24,5);
    ctx.fillStyle='#ffaa00';ctx.fillRect(Math.floor(cw*.5-6),vtop+1,12,3);ctx.globalAlpha=1;
    // Lava streams down sides
    ctx.globalAlpha=.55;ctx.fillStyle='#ff4400';
    ctx.fillRect(Math.floor(cw*.48),vtop+4,3,Math.floor((wy-vtop)*.55));
    ctx.fillRect(Math.floor(cw*.6),vtop+12,3,Math.floor((wy-vtop)*.42));ctx.globalAlpha=1;
  }},
  /* L5 ── ARCTIC FJORD  cold night sky, aurora borealis, snow peaks */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#000510');g.addColorStop(.3,'#001020');g.addColorStop(.7,'#002030');g.addColorStop(1,'#003040');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Aurora ribbons
    [0,1,2].forEach(i=>{
      const ry=hh+(wy-hh)*(.22+i*.14);
      const col=i===1?[80,0,255]:[0,220,130];
      ctx.globalAlpha=.10+.07*Math.abs(Math.sin(t*.5+i*1.2));
      for(let x=0;x<cw;x+=4){
        const wave=Math.sin(x*.015+t*.7+i*2)*14+Math.sin(x*.028+t*.4+i)*6;
        ctx.fillStyle=`rgb(${col[0]},${col[1]},${col[2]})`;
        ctx.fillRect(x,Math.floor(ry+wave),4,5);
      }
    });ctx.globalAlpha=1;
    // Stars
    _ensureStars(hh,wy,cw);
    _envData.stars.forEach(s=>{ctx.globalAlpha=.5+.5*Math.abs(Math.sin(t+s.off));px_rect(s.x,s.y,1,1,'#aaddff')});ctx.globalAlpha=1;
  },terrain(wy,hh,t,cw){
    ctx.fillStyle='#081220';
    const pts=[[0,1],[.06,.82],[.14,.48],[.2,.62],[.3,.32],[.38,.52],[.46,.28],[.53,.44],[.6,.25],[.66,.42],[.74,.6],[.82,.44],[.9,.64],[.96,.74],[1,.8]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
    // Snow caps
    ctx.fillStyle='#ddeeff';
    [[.14,.48],[.3,.32],[.46,.28],[.6,.25],[.66,.42]].forEach(([rx,ry])=>{
      const px=Math.floor(rx*cw),py=Math.floor(hh+(wy-hh)*ry);
      ctx.fillRect(px-7,py,14,5);ctx.fillRect(px-4,py-4,8,4);ctx.fillRect(px-2,py-7,4,3);
    });
  }},
  /* L6 ── MOONLIT NIGHT  deep blue, full moon, glassy water */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#000308');g.addColorStop(.5,'#000a18');g.addColorStop(1,'#001225');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Full moon
    const mx=Math.floor(cw*.28),my=Math.floor(hh+(wy-hh)*.28);
    ctx.globalAlpha=.12;ctx.fillStyle='#99ccee';ctx.fillRect(mx-22,my-22,44,44);
    ctx.globalAlpha=1;ctx.fillStyle='#cce8ff';ctx.fillRect(mx-13,my-13,26,26);
    ctx.fillStyle='#b0d2ee';ctx.fillRect(mx-5,my-9,5,4);ctx.fillRect(mx+3,my-2,4,4);ctx.fillRect(mx-7,my+4,4,3);
    // Moon shimmer on water
    ctx.globalAlpha=.1;
    for(let i=0;i<5;i++){const sw=38-i*7;ctx.fillStyle='#cce8ff';ctx.fillRect(Math.floor(cw*.28-sw/2+Math.sin(t+i)*4),wy-2-i*2,Math.floor(sw),2)}ctx.globalAlpha=1;
    // Dense stars
    _ensureStars(hh,wy,cw);
    _envData.stars.forEach((s,i)=>{ctx.globalAlpha=.25+.75*Math.abs(Math.sin(t+s.off));px_rect(s.x,s.y,i%4===0?2:1,i%4===0?2:1,'#c0dcff')});ctx.globalAlpha=1;
  },terrain(wy,hh,t,cw){
    ctx.fillStyle='#030a10';
    const pts=[[0,1],[.1,.68],[.22,.73],[.38,.6],[.54,.66],[.7,.58],[.84,.68],[.96,.62],[1,.7]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
    // Single lighthouse with moon-glint
    const lx=Math.floor(cw*.7),lb=Math.floor(hh+(wy-hh)*.58);
    ctx.fillStyle='#1a2a38';ctx.fillRect(lx-4,lb-20,8,20);
    ctx.fillStyle='#aaccee';ctx.globalAlpha=.25+.2*Math.sin(t*1.5);ctx.fillRect(lx-2,lb-22,4,3);ctx.globalAlpha=1;
  }},
  /* L7 ── TEMPEST  black stormy sky, lightning, jagged cliffs */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#060606');g.addColorStop(.5,'#0d1418');g.addColorStop(1,'#141c24');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Storm cloud masses
    _ensureClouds(hh,wy,cw);
    _envData.gameClouds.forEach((c,i)=>{
      c.x+=(i%2?1:-1)*c.speed*.8;if(c.x>cw+c.w+20)c.x=-(c.w+20);if(c.x<-c.w-20)c.x=cw+c.w+20;
      const cx2=Math.floor(c.x),cy2=Math.floor(c.y+hh+(wy-hh)*.22),cw2=Math.floor(c.w*1.6);
      ctx.globalAlpha=.8;ctx.fillStyle=i%2===0?'#181b22':'#111316';
      ctx.fillRect(cx2,cy2,cw2,18);ctx.fillRect(cx2+6,cy2-10,cw2-12,12);ctx.fillRect(cx2+14,cy2+16,cw2-28,6);
    });ctx.globalAlpha=1;
    // Lightning bolt
    if(!_envData.lightning)_envData.lightning={timer:0,x:0,on:false};
    _envData.lightning.timer-=16;
    if(_envData.lightning.timer<=0){_envData.lightning.timer=2200+Math.random()*4500;_envData.lightning.x=cw*(.2+Math.random()*.6);_envData.lightning.on=true;setTimeout(()=>{if(_envData)_envData.lightning.on=false},140)}
    if(_envData.lightning.on){
      const lx=_envData.lightning.x;ctx.globalAlpha=.9;ctx.strokeStyle='#ccddff';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(lx,hh);ctx.lineTo(lx+10,hh+(wy-hh)*.32);ctx.lineTo(lx-5,hh+(wy-hh)*.54);ctx.lineTo(lx+8,hh+(wy-hh)*.74);ctx.lineTo(lx,wy);ctx.stroke();
      // Flash
      ctx.globalAlpha=.06;ctx.fillStyle='#aabbff';ctx.fillRect(0,hh,cw,wy-hh);ctx.globalAlpha=1;
    }
  },terrain(wy,hh,t,cw){
    ctx.fillStyle='#040608';
    const pts=[[0,1],[.05,.62],[.1,.75],[.17,.44],[.23,.58],[.3,.38],[.38,.52],[.46,.36],[.55,.5],[.63,.33],[.72,.52],[.8,.42],[.88,.6],[.95,.72],[1,.66]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
  }},
  /* L8 ── TOTAL ECLIPSE  pitch black, corona ring, many revealed stars */
  {sky(wy,hh,t,cw){
    ctx.fillStyle='#000';ctx.fillRect(0,hh,cw,wy-hh);
    // Corona glow rings
    const ex=Math.floor(cw*.5),ey=Math.floor(hh+(wy-hh)*.36),pulse=1+.04*Math.sin(t*.35);
    ctx.save();
    [[70,.04,'#ffeeaa'],[55,.07,'#ffeeaa'],[42,.10,'#ffddaa'],[30,.14,'#ffcc88']].forEach(([r,a,col])=>{ctx.globalAlpha=a;ctx.fillStyle=col;ctx.beginPath();ctx.arc(ex,ey,r*pulse,0,Math.PI*2);ctx.fill()});
    // Corona rays
    ctx.globalAlpha=.18;ctx.strokeStyle='#ffeeaa';ctx.lineWidth=1;
    for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r1=28*pulse,r2=(44+Math.sin(i*2.7)*6)*pulse;ctx.beginPath();ctx.moveTo(ex+Math.cos(a)*r1,ey+Math.sin(a)*r1);ctx.lineTo(ex+Math.cos(a)*r2,ey+Math.sin(a)*r2);ctx.stroke()}
    // Moon disc
    ctx.globalAlpha=1;ctx.fillStyle='#000000';ctx.beginPath();ctx.arc(ex,ey,24*pulse,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // Stars revealed by eclipse
    _ensureStars(hh,wy,cw);
    _envData.stars.forEach((s,i)=>{ctx.globalAlpha=.5+.5*Math.abs(Math.sin(t+s.off));px_rect(s.x,s.y,i%4===0?2:1,i%4===0?2:1,'#eeeebb')});ctx.globalAlpha=1;
  },terrain(wy,hh,t,cw){
    ctx.fillStyle='#000102';
    // Flat dark horizon with silhouetted ruins
    const pts=[[0,1],[.18,.9],[.38,.92],[.58,.9],[.78,.92],[1,.9]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
    // Broken columns
    [[.22,.9],[.42,.88],[.62,.9],[.78,.88]].forEach(([rx,ry])=>{
      const px=Math.floor(rx*cw),py=Math.floor(hh+(wy-hh)*ry);
      ctx.fillStyle='#060606';ctx.fillRect(px-3,py-14,7,14);ctx.fillRect(px-5,py-16,11,3);
    });
  }},
  /* L9 ── INFERNO  dark crimson sky, ember rain, lava-cracked cliffs */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#040000');g.addColorStop(.4,'#180000');g.addColorStop(.78,'#4e0000');g.addColorStop(1,'#a81200');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Lava glow on horizon
    ctx.globalAlpha=.4;
    const lg=ctx.createLinearGradient(0,wy-22,0,wy);lg.addColorStop(0,'rgba(255,60,0,0)');lg.addColorStop(1,'rgba(255,60,0,1)');
    ctx.fillStyle=lg;ctx.fillRect(0,wy-22,cw,22);ctx.globalAlpha=1;
    // Heavy ember rain
    _ensureEmbers(hh,wy,cw);
    _envData.embers.forEach(e=>{
      e.y-=e.sp;if(e.y<hh){e.y=wy;e.x=Math.random()*cw}
      ctx.globalAlpha=.55+.45*Math.sin(t*4+e.ph);
      ctx.fillStyle=e.ph<1.6?'#ff3300':'#ff8800';ctx.fillRect(Math.floor(e.x+Math.sin(t*1.2+e.ph)*3),Math.floor(e.y),e.sz,e.sz);
    });ctx.globalAlpha=1;
  },terrain(wy,hh,t,cw){
    ctx.fillStyle='#0a0000';
    const pts=[[0,1],[.07,.66],[.14,.74],[.22,.5],[.3,.64],[.4,.46],[.48,.58],[.57,.4],[.65,.55],[.74,.44],[.82,.62],[.9,.54],[.97,.7],[1,.74]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
    // Lava cracks
    ctx.globalAlpha=.5+.25*Math.sin(t*2.2);ctx.fillStyle='#ff4400';
    [[.22,.5],[.57,.4],[.74,.44]].forEach(([rx,ry])=>{
      const px=Math.floor(rx*cw),py=Math.floor(hh+(wy-hh)*ry);
      ctx.fillRect(px-1,py,3,12);ctx.fillRect(px+2,py+5,2,8);
    });ctx.globalAlpha=1;
  }},
  /* L10 ── BOSS COSMIC  alien purple void, nebula wisps, dimensional spires */
  {sky(wy,hh,t,cw){
    const g=ctx.createLinearGradient(0,hh,0,wy);
    g.addColorStop(0,'#000003');g.addColorStop(.3,'#06001a');g.addColorStop(.7,'#150030');g.addColorStop(1,'#280048');
    ctx.fillStyle=g;ctx.fillRect(0,hh,cw,wy-hh);
    // Nebula colour blobs
    [[.18,.32,80,'rgba(160,0,255,.05)'],[.5,.52,100,'rgba(0,80,255,.06)'],[.76,.24,70,'rgba(255,0,160,.05)']].forEach(([nx,ny,nr,nc])=>{
      const gx=Math.floor(cw*nx),gy=Math.floor(hh+(wy-hh)*ny);
      ctx.globalAlpha=1;ctx.fillStyle=nc;
      for(let i=0;i<6;i++)ctx.fillRect(Math.floor(gx-nr/2+i*nr/5+Math.sin(t*.3+i)*6),Math.floor(gy+Math.cos(t*.2+i)*8),Math.floor(nr/4),6);
    });
    // Multi-colour stars
    _ensureStars(hh,wy,cw);
    const sc2=['#ff88ff','#8888ff','#88ffee','#ffffff','#ffaaee'];
    _envData.stars.forEach((s,i)=>{ctx.globalAlpha=.3+.7*Math.abs(Math.sin(t+s.off));px_rect(s.x,s.y,i%5===0?3:i%3===0?2:1,i%5===0?3:i%3===0?2:1,sc2[i%sc2.length])});ctx.globalAlpha=1;
    // Dimensional rift
    ctx.globalAlpha=.18+.1*Math.sin(t*1.4);ctx.strokeStyle='#cc00ff';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(Math.floor(cw*.46),hh);ctx.lineTo(Math.floor(cw*.49),Math.floor(hh+(wy-hh)*.42));ctx.lineTo(Math.floor(cw*.44),Math.floor(hh+(wy-hh)*.68));ctx.lineTo(Math.floor(cw*.47),wy);ctx.stroke();ctx.globalAlpha=1;
  },terrain(wy,hh,t,cw){
    ctx.fillStyle='#08000f';
    const pts=[[0,1],[.04,.72],[.1,.8],[.16,.38],[.22,.55],[.28,.22],[.34,.4],[.4,.56],[.46,.33],[.52,.5],[.58,.28],[.64,.46],[.7,.62],[.76,.4],[.82,.58],[.88,.48],[.94,.68],[1,.72]];
    ctx.beginPath();ctx.moveTo(0,wy);pts.forEach(([rx,ry])=>ctx.lineTo(Math.floor(rx*cw),Math.floor(hh+(wy-hh)*ry)));ctx.lineTo(cw,wy);ctx.closePath();ctx.fill();
    // Purple glowing spire tips
    [[.16,.38],[.28,.22],[.46,.33],[.58,.28],[.76,.4]].forEach(([rx,ry])=>{
      const px=Math.floor(rx*cw),py=Math.floor(hh+(wy-hh)*ry);
      ctx.globalAlpha=.35+.2*Math.sin(t*1.6+rx*10);ctx.fillStyle='#cc00ff';ctx.fillRect(px-2,py,4,5);
      ctx.globalAlpha=.08;ctx.fillRect(px-7,py-3,14,5);
    });ctx.globalAlpha=1;
  }},
];

/* ============================================================
   UNDERWATER SCENARIOS — one per level
   ============================================================ */
const SCENARIOS=[
  {waterBase:'#082a3a',waterTint:'rgba(0,60,140,0.07)',  seabed:'#2e3c1a', coralA:'#cc2244', coralB:'#ff4466'}, // L1 dawn reef
  {waterBase:'#083a28',waterTint:'rgba(0,80,40,0.09)',   seabed:'#1a2c0e', coralA:'#006633', coralB:'#00cc55'}, // L2 kelp forest
  {waterBase:'#0a0828',waterTint:'rgba(30,0,80,0.11)',   seabed:'#15101e', coralA:'#9900cc', coralB:'#cc44ff'}, // L3 trench
  {waterBase:'#280800',waterTint:'rgba(90,20,0,0.09)',   seabed:'#1a0800', coralA:'#cc4400', coralB:'#ff6600'}, // L4 lava
  {waterBase:'#041830',waterTint:'rgba(0,50,110,0.13)',  seabed:'#0a1520', coralA:'#0055aa', coralB:'#0088ff'}, // L5 arctic
  {waterBase:'#040e20',waterTint:'rgba(0,30,80,0.10)',   seabed:'#081020', coralA:'#00ccff', coralB:'#55eeff'}, // L6 night glow
  {waterBase:'#080818',waterTint:'rgba(25,25,60,0.12)',  seabed:'#121230', coralA:'#7755ff', coralB:'#aa88ff'}, // L7 storm
  {waterBase:'#010104',waterTint:'rgba(0,0,18,0.18)',    seabed:'#050508', coralA:'#223366', coralB:'#446699'}, // L8 eclipse
  {waterBase:'#180200',waterTint:'rgba(50,0,0,0.16)',    seabed:'#0a0000', coralA:'#cc2200', coralB:'#ff4400'}, // L9 inferno
  {waterBase:'#080010',waterTint:'rgba(15,0,35,0.22)',   seabed:'#060010', coralA:'#ff00aa', coralB:'#ff55dd'}, // L10 boss
];
function getScenario(){return SCENARIOS[Math.min(S.phase,SCENARIOS.length-1)]}

/* ============================================================
   DRAW BG
   ============================================================ */
function drawBG(){
  const wy=WY(),t=Date.now()*.001,hh=HH(),cw=canvas.width;
  getEnv(); // ensure _envData is initialised before scene functions access it
  const scene=SKY_SCENES[S.phase%SKY_SCENES.length];
  scene.sky(wy,hh,t,cw);
  scene.terrain(wy,hh,t,cw);
  // Water body — base color from scenario
  const sc=getScenario();
  const wh2=canvas.height-wy;
  for(let i=0;i<8;i++){const frac=i/8;ctx.fillStyle=sc.waterBase||'#082a45';ctx.globalAlpha=.9+frac*.1;px_rect(0,wy+i*wh2/8,canvas.width,wh2/8+1,sc.waterBase||'#082a45')}ctx.globalAlpha=1;
  OceanCurrents.draw();
  // Scenario water tint
  const bot=BOT();
  ctx.fillStyle=sc.waterTint;ctx.fillRect(0,wy,canvas.width,bot-wy);
  // Depth fog — gets darker with depth
  const fogGrad=ctx.createLinearGradient(0,wy,0,bot);
  fogGrad.addColorStop(0,'rgba(0,6,18,0)');
  fogGrad.addColorStop(.5,'rgba(0,6,18,0.07)');
  fogGrad.addColorStop(1,'rgba(0,6,18,0.32)');
  ctx.fillStyle=fogGrad;ctx.fillRect(0,wy,canvas.width,bot-wy);
  ctx.fillStyle='rgba(80,160,255,.22)';for(let x=0;x<canvas.width;x+=4){const wh=Math.sin(x*.02+t*2)*5+Math.sin(x*.04+t*1.4)*2;ctx.fillRect(x,Math.floor(wy+wh),4,3)}
  for(let i=0;i<8;i++){const sx=(i*113+Math.sin(t*2+i)*20+canvas.width*10)%canvas.width,sy=wy+Math.sin(t*2+i*.7)*4,sa=.15+.5*Math.abs(Math.sin(t*3+i));ctx.globalAlpha=sa;px_rect(Math.floor(sx),Math.floor(sy),3,1,'#a0d8ff')}ctx.globalAlpha=1;
  ctx.globalAlpha=.04;ctx.fillStyle='#001020';for(let y=wy;y<canvas.height;y+=4)ctx.fillRect(0,y,canvas.width,2);ctx.globalAlpha=1;
  const env=getEnv();
  env.bgFish.forEach(f=>{f.y=wy+40+Math.sin(t+f.x*.01)*18;f.x+=f.vx;if(f.x<-30)f.x=canvas.width+30;if(f.x>canvas.width+30)f.x=-30;ctx.save();ctx.globalAlpha=.25;if(f.vx<0){ctx.translate(Math.floor(f.x),Math.floor(f.y));ctx.scale(-1,1)}else ctx.translate(Math.floor(f.x),Math.floor(f.y));px_rect(0,0,12,6,f.col);px_rect(-5,1,5,4,f.col);px_rect(10,1,3,2,'rgba(255,255,255,.5)');ctx.restore()});
  Ecosystem.draw();
  env.corals.forEach(cr=>{const base=bot;ctx.fillStyle=cr.color;if(cr.type===0){for(let i=0;i<cr.h;i+=4){const w=Math.max(2,8-i*.15);ctx.fillRect(Math.floor(cr.x-w/2),base-i,w,4)}ctx.fillRect(Math.floor(cr.x-10),base-cr.h,6,4);ctx.fillRect(Math.floor(cr.x+4),base-cr.h+4,6,4)}else if(cr.type===1){for(let ix=-1;ix<=1;ix++){const bx=cr.x+ix*10;for(let iy=0;iy<cr.h;iy+=4)ctx.fillRect(Math.floor(bx-2),base-iy,4,4);ctx.fillRect(Math.floor(bx-6),base-cr.h,12,8)}}else{ctx.fillRect(Math.floor(cr.x-1),base-cr.h,2,cr.h);for(let i=4;i<cr.h;i+=8){ctx.fillRect(Math.floor(cr.x-8),base-i,8,2);ctx.fillRect(Math.floor(cr.x),base-i,8,2)}}});
  px_rect(0,bot,canvas.width,28,sc.seabed);
  env.rocks.forEach(r=>px_rect(Math.floor(r.x-r.w/2),bot-r.h,Math.floor(r.w),Math.floor(r.h),r.color));
  ctx.globalAlpha=.3;for(let x=0;x<canvas.width;x+=8){ctx.fillStyle='#5a3a18';ctx.fillRect(x+(Math.sin(x*.07)*4|0),bot,2,2)}ctx.globalAlpha=1;
  FishAI.draw(WY());
}

/* ============================================================
   WATER REFLECTION
   ============================================================ */
function drawWaterReflection(){
  const wy=WY(),{x,y,w,h}=Boat,cx=Math.floor(x),hw=Math.floor(w/2),reflY=wy+4,t=Date.now()*.001;
  ctx.save();ctx.globalAlpha=.18;ctx.translate(cx,reflY);ctx.scale(1,-0.5);
  ctx.fillStyle=selectedBoat.hullColor;ctx.fillRect(-hw+4,-4,w-8,h);ctx.fillRect(-hw,-2,4,h-4);ctx.fillRect(hw-4,-2,4,h-4);
  ctx.fillStyle=selectedBoat.cabinColor;ctx.fillRect(-10,-18,20,14);ctx.restore();
  ctx.save();ctx.globalAlpha=.08;
  for(let i=0;i<6;i++){ctx.fillStyle='#0a2a4a';ctx.fillRect(cx-hw+Math.sin(t*2.5+i*1.1)*4,reflY+i*4,w+4,3)}
  ctx.restore();
}

/* ============================================================
   DRAW BOAT — per-boat visuals
   ============================================================ */
function drawBoat(){
  const boat=selectedBoat;
  const{x,y,w,h,roll}=Boat;
  const cx=Math.floor(x),cy=Math.floor(y),hw=Math.floor(w/2);
  ctx.save();
  ctx.translate(cx,cy+h/2);ctx.rotate(roll);ctx.translate(-cx,-(cy+h/2));
  // Shadow
  ctx.globalAlpha=.28;px_rect(cx-hw+3,cy+h+2,w,4,'#000');ctx.globalAlpha=1;
  // Hull
  px_rect(cx-hw+4,cy,w-8,h,boat.hullColor);
  px_rect(cx-hw,cy+4,4,h-4,boat.hullColor);
  px_rect(cx+hw-4,cy+4,4,h-4,boat.hullColor);
  px_rect(cx-hw+4,cy+h-4,w-8,4,boat.trim);
  px_rect(cx-hw+2,cy+2,w-4,3,boat.accent);
  px_rect(cx-hw+6,cy+4,w-12,h-7,boat.hullColor);
  // Waterline
  ctx.globalAlpha=.35;ctx.fillStyle='#60a8d8';ctx.fillRect(cx-hw+4,cy+h-2,w-8,2);ctx.globalAlpha=1;
  // Cabin base
  px_rect(cx-10,cy-16,20,14,boat.cabinColor);
  px_rect(cx-8,cy-14,16,10,boat.cabinColor+'cc');
  // Window
  px_rect(cx-3,cy-12,6,6,'#55ccff');
  px_rect(cx-2,cy-11,4,2,'rgba(255,255,255,.7)');

  // ── Boat-specific decorations ──
  if(boat.id==='racer'){
    // Speed stripes
    px_rect(cx-hw+8,cy+2,10,2,boat.accent+'aa');
    px_rect(cx-hw+20,cy+2,6,2,boat.accent+'66');
    // Narrower, lower cabin
    px_rect(cx-7,cy-13,14,11,boat.cabinColor);
    px_rect(cx-3,cy-11,6,6,'#55ccff');
    // Spoiler
    px_rect(cx+hw-8,cy-4,6,3,boat.accent);
  } else if(boat.id==='deepsea'){
    // Fishing rod mounted on bow
    ctx.strokeStyle=boat.accent;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(cx-hw,cy+2);ctx.lineTo(cx-hw-10,cy-26);ctx.stroke();
    ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(cx-hw-10,cy-26);ctx.lineTo(cx-hw+2,cy+4);ctx.stroke();
    // Blue deck stripe
    px_rect(cx-hw+4,cy,w-8,2,boat.accent+'55');
    // Wide cabin
    px_rect(cx-12,cy-16,24,14,boat.cabinColor);
    px_rect(cx-3,cy-12,6,6,'#55ccff');
  } else if(boat.id==='trawler'){
    // Armor side plates
    ctx.strokeStyle=boat.accent+'88';ctx.lineWidth=1;
    ctx.strokeRect(cx-hw+4,cy+2,8,h-3);
    ctx.strokeRect(cx+hw-12,cy+2,8,h-3);
    // Armored cabin with thicker roof
    px_rect(cx-12,cy-18,24,4,boat.cabinColor);
    px_rect(cx-10,cy-14,20,12,boat.cabinColor);
    // Radar antenna
    ctx.strokeStyle=boat.accent;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(cx+8,cy-18);ctx.lineTo(cx+8,cy-28);ctx.stroke();
    px_rect(cx+5,cy-30,6,3,boat.accent);
    // Shield glow when active
    if(_shieldActive){
      const pulse=.15+.1*Math.sin(Date.now()*.006);
      ctx.save();ctx.globalAlpha=pulse;ctx.strokeStyle='#aabbcc';ctx.lineWidth=3;
      ctx.shadowBlur=12;ctx.shadowColor='#aabbff';
      ctx.strokeRect(cx-hw-4,cy-22,w+8,h+26);
      ctx.restore();
    }
  }

  // Sonar-ready indicator light (cabin roof, left corner)
  const _sr=Sonar.cooldown===0;
  const _lb=_sr&&Math.sin(Date.now()*.008)>0;
  ctx.globalAlpha=_lb?1:(_sr?.25:.15);
  ctx.shadowBlur=_lb?10:0;ctx.shadowColor='#00ff88';
  px_rect(cx-12,cy-19,5,5,_sr?'#00ff88':'#002211');
  ctx.shadowBlur=0;ctx.globalAlpha=1;

  // Mast line to rod
  ctx.strokeStyle='#c8a060';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(cx+8,cy-9);ctx.lineTo(Hook.tx,Hook.ty);ctx.stroke();
  // Fisherman
  px_rect(cx+2,cy-28,8,8,'#e8aa88');
  px_rect(cx+2,cy-28,8,3,'#663311');
  px_rect(cx+1,cy-20,10,8,'#1a8855');
  px_rect(cx+9,cy-18,4,4,'#e8aa88');
  // Player name above own boat
  if(typeof pName!=='undefined'&&pName&&typeof MP!=='undefined'&&MP.started)px_text(pName,cx,cy-40,'#ffffff',7);
  ctx.restore();
}

/* ============================================================
   GHOST BOATS — other players' boats in race mode
   ============================================================ */
function drawGhostBoats(){
  if(typeof MP==='undefined'||!MP.started)return;
  const ghosts=MP.getGhostBoats();if(!ghosts||!ghosts.length)return;
  const{w,h}=Boat,hw=Math.floor(w/2),wy=WY();
  ghosts.forEach(p=>{
    if(p.status==='out')return;
    const bx=Math.floor((p.boatX||0.5)*canvas.width);
    const by=wy-h*.6;
    const pc=_playerColor(p.name);
    const dark=pc+'bb';
    ctx.save();
    // Hook line — solid, player-colored
    if(p.hookY!=null){
      const hkx=bx+8,hky=Math.floor(p.hookY*canvas.height);
      ctx.strokeStyle=pc+'99';ctx.lineWidth=1.5;
      ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(bx+8,by);ctx.lineTo(hkx,hky);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=pc;
      ctx.fillRect(hkx-3,hky-2,6,4);ctx.fillRect(hkx-1,hky+2,2,5);ctx.fillRect(hkx+2,hky+4,4,2);
    }
    // Hull — player's unique color, full opacity
    ctx.fillStyle=pc;
    ctx.fillRect(bx-hw+4,by,w-8,h);ctx.fillRect(bx-hw,by+4,4,h-4);ctx.fillRect(bx+hw-4,by+4,4,h-4);
    ctx.fillStyle=dark;ctx.fillRect(bx-10,by-16,20,14);
    ctx.fillStyle='#55ccff';ctx.fillRect(bx-3,by-12,6,6);
    ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(bx-2,by-11,4,2);
    // Player name — same size as asset labels
    px_text(p.name.slice(0,8),bx,by-24,pc,7);
    ctx.restore();
  });
}

/* ============================================================
   RACE BAR — top-5 row below HUD during race
   ============================================================ */
function updateRaceBar(){
  const bar=document.getElementById('race-bar'),body=document.getElementById('race-bar-body');
  if(!bar||!body)return;
  if(typeof MP==='undefined'||!MP.started){bar.style.display='none';return}
  bar.style.display='flex';
  const sorted=MP.getSortedPlayers().slice(0,5);
  body.innerHTML='';
  sorted.forEach((p,i)=>{
    const icon=p.status==='win'?'🏆':p.status==='out'?'💀':'';
    const me=p.name===pName;
    const boat=(window.BOATS||BOATS).find(b=>b.id===p.boat);
    const el=document.createElement('div');el.className='rb-entry'+(me?' me':'');
    el.innerHTML=`<span class="rb-rank">${icon||i+1}</span><span class="rb-boat">${boat?.emoji||'🛥️'}</span><span class="rb-name">${p.name.slice(0,6)}</span><span class="rb-score">${p.score}</span>`;
    body.appendChild(el);
    if(i<sorted.length-1){const sep=document.createElement('span');sep.className='rb-sep';sep.textContent='│';body.appendChild(sep)}
  });
}

/* ============================================================
   RACE WAITING / ROUND-END OVERLAYS
   ============================================================ */
function _renderRaceWaitBoard(targetId){
  const bd=document.getElementById(targetId);if(!bd||typeof MP==='undefined')return;
  const sorted=MP.getSortedPlayers();bd.innerHTML='';
  sorted.forEach(p=>{
    const icon=p.status==='win'?'🏆':p.status==='out'?'💀':p.status==='ready'?'✓':'⏳';
    const r=document.createElement('div');r.className='rre-row';
    r.innerHTML=`<span class="rre-name">${icon} ${p.name.slice(0,10)}</span><span class="rre-score">${p.score}</span><span class="rre-status">L${p.phase}</span>`;
    bd.appendChild(r);
  });
}
function showRaceWaiting(title,msg,icon){
  const el=document.getElementById('race-waiting');if(!el)return;
  document.getElementById('rw-icon').textContent=icon||'⏳';
  document.getElementById('rw-title').textContent=title||'WAITING…';
  document.getElementById('rw-msg').textContent=msg||'';
  _renderRaceWaitBoard('rw-board');
  el.classList.remove('h');
}
function showRaceRoundEnd(winnerName){
  document.getElementById('race-waiting').classList.add('h');
  const el=document.getElementById('race-round-end');if(!el)return;
  const banner=document.getElementById('rre-winner-banner');
  if(winnerName&&banner){banner.textContent='🏆 '+winnerName+' WINS THE ROUND!';banner.style.display='block'}
  else if(banner)banner.style.display='none';
  _renderRaceWaitBoard('rre-ranks');
  const btn=document.getElementById('rre-ready-btn');
  const hostBtn=document.getElementById('rre-host-start-btn');
  const wm=document.getElementById('rre-waiting-msg');
  const isChaos=typeof MP!=='undefined'&&MP.chaosMode;
  if(isChaos){
    if(MP.isHost){
      if(btn)btn.style.display='none';
      if(hostBtn)hostBtn.style.display='';
      if(wm)wm.style.display='none';
    }else{
      if(btn)btn.style.display='none';
      if(hostBtn)hostBtn.style.display='none';
      if(wm){wm.style.display='block';wm.textContent='🎣 Waiting for host to start next level…';}
    }
  }else{
    if(btn){btn.style.display='';btn.disabled=false;}
    if(hostBtn)hostBtn.style.display='none';
    if(wm)wm.style.display='none';
  }
  el.classList.remove('h');
}

function drawLine(){
  const tx=Hook.tx,ty=Hook.ty,hx=Hook.x,hy=Hook.y;
  const slack=Math.max(0,Hook.lv),sag=(Hook.ll*.018)+slack*2.5;
  const stretch=Math.abs(Hook.lv);
  const r=Math.min(255,Math.floor(200+stretch*30)),g=Math.min(255,Math.floor(215-stretch*40));
  ctx.strokeStyle=`rgba(${r},${g},235,.6)`;ctx.lineWidth=stretch>.5?2:1;ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(tx,ty);ctx.quadraticCurveTo((tx+hx)/2,(ty+hy)/2+sag,hx,hy);ctx.stroke();
}

function drawHook(){
  const hx=Math.floor(Hook.x),hy=Math.floor(Hook.y);
  ctx.strokeStyle='#c8e4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(hx,hy-4,6,Math.PI*.1,Math.PI*1.1);ctx.lineTo(hx+6,hy+8);ctx.stroke();
  ctx.globalAlpha=.4;px_rect(hx-2,hy-8,3,3,'#88ccff');ctx.globalAlpha=1;
  const tb=Date.now()*.002;
  for(let i=0;i<3;i++){const bx=hx+Math.sin(tb*1.3+i*2.1)*5,by=hy-9-((tb*20+i*11)%26),ba=Math.max(0,.3-((tb*20+i*11)%26)/65);ctx.globalAlpha=ba;ctx.strokeStyle='#66aaff';ctx.lineWidth=1;ctx.strokeRect(Math.floor(bx),Math.floor(by),3,3)}ctx.globalAlpha=1;
}

/* ============================================================
   DRAW ITEMS
   ============================================================ */
function _drawItemArt(ipx,ipy,r,key,def){
  ctx.save();
  switch(key){
    // ── LEDs: dome + lens + leads ──
    case 'LED_R':case 'LED_G':case 'LED_B':{
      const lc=def.color,lg=def.glow;
      ctx.shadowBlur=14;ctx.shadowColor=lg;
      ctx.fillStyle=lc+'dd';ctx.beginPath();
      ctx.arc(ipx,ipy-2,r*.85,Math.PI,0);ctx.lineTo(ipx+r*.85,ipy+6);ctx.lineTo(ipx-r*.85,ipy+6);ctx.closePath();ctx.fill();
      ctx.fillStyle=lg+'aa';ctx.beginPath();ctx.arc(ipx,ipy-4,r*.38,0,Math.PI*2);ctx.fill();// lens
      ctx.strokeStyle=lg;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(ipx,ipy-2,r*.85,Math.PI,0);ctx.lineTo(ipx+r*.85,ipy+6);ctx.lineTo(ipx-r*.85,ipy+6);ctx.closePath();ctx.stroke();
      ctx.strokeStyle=lc+'aa';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(ipx-4,ipy+6);ctx.lineTo(ipx-4,ipy+r+8);ctx.stroke();ctx.beginPath();ctx.moveTo(ipx+4,ipy+6);ctx.lineTo(ipx+4,ipy+r+10);ctx.stroke();
      break;}
    // ── Resistors: body + color bands ──
    case 'RES_220':case 'RES_1K':{
      const bw=r*2.4,bh=r*.85;
      ctx.shadowBlur=8;ctx.shadowColor=def.glow;
      ctx.fillStyle='#c8a020';ctx.fillRect(ipx-bw/2,ipy-bh/2,bw,bh);// body
      ctx.strokeStyle=def.glow;ctx.lineWidth=1.5;ctx.strokeRect(ipx-bw/2,ipy-bh/2,bw,bh);
      const bands=key==='RES_220'?['#880000','#333','#880000','#c8a000']:['#884400','#333','#990000','#c8a000'];
      bands.forEach((c,i)=>{ctx.fillStyle=c;ctx.fillRect(ipx-bw/2+4+i*(bw-12)/4,ipy-bh/2,3,bh)});
      ctx.strokeStyle='#aaa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ipx-bw/2,ipy);ctx.lineTo(ipx-bw/2-8,ipy);ctx.stroke();ctx.beginPath();ctx.moveTo(ipx+bw/2,ipy);ctx.lineTo(ipx+bw/2+8,ipy);ctx.stroke();
      break;}
    // ── Button: square chassis + dome center ──
    case 'BUTTON':{
      ctx.shadowBlur=10;ctx.shadowColor=def.glow;
      ctx.fillStyle=def.color+'cc';ctx.fillRect(ipx-r*.9,ipy-r*.9,r*1.8,r*1.8);
      ctx.strokeStyle=def.glow;ctx.lineWidth=2;ctx.strokeRect(ipx-r*.9,ipy-r*.9,r*1.8,r*1.8);
      ctx.fillStyle=def.glow+'cc';ctx.beginPath();ctx.arc(ipx,ipy,r*.45,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ffffff88';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ipx,ipy,r*.45,0,Math.PI*2);ctx.stroke();
      break;}
    // ── Buzzer: circle + speaker arcs ──
    case 'BUZZER':{
      ctx.shadowBlur=12;ctx.shadowColor=def.glow;
      ctx.fillStyle=def.color+'cc';ctx.beginPath();ctx.arc(ipx,ipy,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=def.glow;ctx.lineWidth=2;ctx.beginPath();ctx.arc(ipx,ipy,r,0,Math.PI*2);ctx.stroke();
      [r*.3,r*.52,r*.76].forEach(ar=>{ctx.globalAlpha*=.75;ctx.strokeStyle=def.glow;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(ipx+4,ipy,ar,-.65,.65);ctx.stroke()});
      break;}
    // ── Servo: motor block + shaft ──
    case 'SERVO':{
      ctx.shadowBlur=10;ctx.shadowColor=def.glow;
      ctx.fillStyle=def.color+'cc';ctx.fillRect(ipx-r*1.4,ipy-r*.85,r*2.8,r*1.7);
      ctx.strokeStyle=def.glow;ctx.lineWidth=1.5;ctx.strokeRect(ipx-r*1.4,ipy-r*.85,r*2.8,r*1.7);
      ctx.fillStyle=def.glow+'88';ctx.beginPath();ctx.arc(ipx,ipy,r*.4,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ipx,ipy);ctx.lineTo(ipx,ipy-r*.85);ctx.stroke();// shaft
      break;}
    // ── Ultrasonic: PCB + two transducer eyes ──
    case 'ULTRA':{
      ctx.shadowBlur=10;ctx.shadowColor=def.glow;
      ctx.fillStyle=def.color+'cc';ctx.fillRect(ipx-r*1.3,ipy-r*.75,r*2.6,r*1.5);
      ctx.strokeStyle=def.glow;ctx.lineWidth=1.5;ctx.strokeRect(ipx-r*1.3,ipy-r*.75,r*2.6,r*1.5);
      [-r*.6,r*.6].forEach(ox=>{ctx.fillStyle=def.glow+'99';ctx.beginPath();ctx.arc(ipx+ox,ipy,r*.38,0,Math.PI*2);ctx.fill();ctx.strokeStyle=def.glow;ctx.lineWidth=1;ctx.beginPath();ctx.arc(ipx+ox,ipy,r*.38,0,Math.PI*2);ctx.stroke()});
      break;}
    // ── LDR: diamond with eye/lens ──
    case 'LDR':{
      ctx.shadowBlur=12;ctx.shadowColor=def.glow;
      ctx.fillStyle=def.color+'cc';ctx.beginPath();ctx.moveTo(ipx,ipy-r);ctx.lineTo(ipx+r*.85,ipy);ctx.lineTo(ipx,ipy+r);ctx.lineTo(ipx-r*.85,ipy);ctx.closePath();ctx.fill();
      ctx.strokeStyle=def.glow;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ipx,ipy-r);ctx.lineTo(ipx+r*.85,ipy);ctx.lineTo(ipx,ipy+r);ctx.lineTo(ipx-r*.85,ipy);ctx.closePath();ctx.stroke();
      ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.ellipse(ipx,ipy,r*.35,r*.55,0,0,Math.PI*2);ctx.fill();// lens
      break;}
    // ── Arduino pins (D2,D4,D13,PWM): PCB pin header ──
    case 'D2':case 'D4':case 'D13':case 'PWM3':case 'PWM5':case 'PWM9':{
      ctx.shadowBlur=10;ctx.shadowColor=def.glow;
      // Header body
      ctx.fillStyle='#1a1a2e';ctx.fillRect(ipx-r*.7,ipy-r*.55,r*1.4,r*1.1);
      ctx.strokeStyle=def.glow;ctx.lineWidth=1.5;ctx.strokeRect(ipx-r*.7,ipy-r*.55,r*1.4,r*1.1);
      // Pin dots
      [-r*.28,r*.28].forEach(ox=>{ctx.fillStyle=def.glow+'cc';ctx.fillRect(ipx+ox-2,ipy-2,4,4)});
      // PWM label gets ~ prefix visual
      if(key.startsWith('PWM')){ctx.fillStyle=def.glow+'88';ctx.fillRect(ipx-r*.6,ipy+r*.3,r*1.2,3)}
      break;}
    // ── Power pins (GND/VCC): circle connector ──
    case 'GND':case 'VCC':{
      ctx.shadowBlur=14;ctx.shadowColor=def.glow;
      ctx.beginPath();ctx.arc(ipx,ipy,r+4,0,Math.PI*2);ctx.fillStyle=def.glow+'18';ctx.fill();
      ctx.beginPath();ctx.arc(ipx,ipy,r,0,Math.PI*2);ctx.fillStyle=def.color+'dd';ctx.fill();
      ctx.strokeStyle=def.glow;ctx.lineWidth=2;ctx.beginPath();ctx.arc(ipx,ipy,r,0,Math.PI*2);ctx.stroke();
      // Inner indicator
      if(key==='GND'){ctx.strokeStyle=def.glow+'88';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ipx-5,ipy+2);ctx.lineTo(ipx+5,ipy+2);ctx.moveTo(ipx-3,ipy+5);ctx.lineTo(ipx+3,ipy+5);ctx.moveTo(ipx-1,ipy+8);ctx.lineTo(ipx+1,ipy+8);ctx.stroke()}
      else{ctx.fillStyle=def.glow+'99';ctx.fillRect(ipx-3,ipy-6,6,3);ctx.fillRect(ipx-6,ipy-3,12,3)}// + symbol
      break;}
    // ── Powerups: diamond with sparkle ──
    default:
      if(def.shape==='diamond'){
        ctx.shadowBlur=16;ctx.shadowColor=def.glow;
        ctx.fillStyle=def.color+'cc';ctx.beginPath();ctx.moveTo(ipx,ipy-r);ctx.lineTo(ipx+r,ipy);ctx.lineTo(ipx,ipy+r);ctx.lineTo(ipx-r,ipy);ctx.closePath();ctx.fill();
        ctx.strokeStyle=def.glow;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ipx,ipy-r);ctx.lineTo(ipx+r,ipy);ctx.lineTo(ipx,ipy+r);ctx.lineTo(ipx-r,ipy);ctx.closePath();ctx.stroke();
        ctx.fillStyle='#ffffff55';ctx.fillRect(ipx-3,ipy-r*.5,2,r*.4);// shine
      }else if(def.shape==='rect'){
        ctx.shadowBlur=8;ctx.shadowColor=def.glow;
        const rw=r*2,rh=r*1.2;ctx.fillStyle=def.color+'cc';ctx.fillRect(ipx-rw/2,ipy-rh/2,rw,rh);ctx.strokeStyle=def.glow;ctx.lineWidth=2;ctx.strokeRect(ipx-rw/2,ipy-rh/2,rw,rh);
      }else{
        ctx.shadowBlur=14;ctx.shadowColor=def.glow;
        ctx.beginPath();ctx.arc(ipx,ipy,r+5,0,Math.PI*2);ctx.fillStyle=def.glow+'22';ctx.fill();
        ctx.beginPath();ctx.arc(ipx,ipy,r,0,Math.PI*2);ctx.fillStyle=def.color+'dd';ctx.fill();ctx.strokeStyle=def.glow;ctx.lineWidth=2;ctx.stroke();
      }
  }
  ctx.restore();
}

function drawItem(it){
  if(it.caught)return;
  const{x,y,radius:r,def,key,life,maxLife,wobble}=it;
  const lifeA=Math.min(1,life/500)*Math.min(1,(maxLife-life)/1000);if(lifeA<=.01)return;
  const sonarAlpha=it.sonarGlow/255,a=lifeA*(0.65+sonarAlpha*.35);if(a<=.005)return;
  const t=Date.now()*.001;
  // Bite pulse: when hook is close to a required component, make it throb
  const ph2=cp(),needed=ph2.requires[key]&&(S.collected[key]||0)<ph2.requires[key];
  const distToHook=Math.hypot(Hook.x-x,Hook.y-y);
  const bitePulse=needed&&distToHook<120?(.5+.5*Math.sin(t*8))*.4:0;
  const ipx=Math.floor(x+Math.sin(t*.8+wobble)*2),ipy=Math.floor(y+Math.cos(t*.6+wobble)*1.5);
  ctx.save();ctx.globalAlpha=a;
  if(sonarAlpha>.7||bitePulse>.1){
    const pulse=bitePulse>.1?bitePulse:Math.sin(Date.now()*.015)*.5+.5;
    ctx.shadowBlur=10+pulse*12;ctx.shadowColor=def.type==='trash'?'#ff3300':(bitePulse>.1?def.glow:'#00ffff');
  }
  if(def.type==='trash'){
    ctx.fillStyle=def.color;ctx.beginPath();
    for(let i=0;i<6;i++){const ang=(i/6)*Math.PI*2,rr=r*(.6+.4*Math.sin(i*2.3+wobble));i===0?ctx.moveTo(ipx+Math.cos(ang)*rr,ipy+Math.sin(ang)*rr):ctx.lineTo(ipx+Math.cos(ang)*rr,ipy+Math.sin(ang)*rr)}
    ctx.closePath();ctx.fill();ctx.strokeStyle='#ff3300aa';ctx.lineWidth=2;ctx.stroke();
    const _te={BOOT:'👢',CAN:'🥫',TIRE:'🛞'}[key]||'🗑️';
    ctx.font=`${r*1.1}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(_te,ipx,ipy);
  }else if(def.type==='bonus'){
    // Jackpot star — spinning gold star
    const spin=Date.now()*.0015;const sr=r*(1+.12*Math.sin(Date.now()*.003));
    ctx.shadowBlur=28;ctx.shadowColor='#ffd700';ctx.fillStyle='#ffd700';
    ctx.beginPath();
    for(let i=0;i<10;i++){const ang=i/10*Math.PI*2+spin-Math.PI/2;const rad=i%2===0?sr:sr*.42;ctx.lineTo(ipx+Math.cos(ang)*rad,ipy+Math.sin(ang)*rad)}
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='#fff8aa';ctx.lineWidth=1.5;ctx.stroke();
    ctx.shadowBlur=0;
    px_text('★500',ipx,ipy+r+13,'#ffd700',8);
  }else{
    _drawItemArt(ipx,ipy,r,key,def);
    px_text(def.label,ipx,ipy+r+11,'#ffffff',def.label.length>4?6:def.label.length>3?7:8);
  }
  ctx.restore();
}

/* ============================================================
   HUD
   ============================================================ */
let _hudAlertTimer=0;
function showHudAlert(msg){const el=document.getElementById('hud-alert');if(!el)return;el.textContent=msg;el.style.opacity='1';_hudAlertTimer=2000}
function tickHudAlert(dt){if(_hudAlertTimer>0){_hudAlertTimer-=dt;if(_hudAlertTimer<=0){const el=document.getElementById('hud-alert');if(el)el.style.opacity='0';_hudAlertTimer=0}}}
function rHUD(){
  const ph=cp();
  document.getElementById('hpn').textContent=ph.name.toUpperCase();
  document.getElementById('hln').textContent=_endless&&S.phase>=10?`${S.phase+1}/∞`:`${S.phase+1}/${PH.length}`;
  document.getElementById('hsc').textContent=S.score;
  const re=document.getElementById('hreq');re.innerHTML='';
  Object.entries(phr()).forEach(([k,n])=>{
    const g=S.collected[k]||0,def=_MG_CAT_DEF[k]||CD[k],d=document.createElement('div');d.className='ri';
    let ds='';for(let i=0;i<n;i++)ds+=`<span class="rd${i<g?' f':''}"></span>`;
    d.innerHTML=`${ds}<span>${def.label}</span>`;re.appendChild(d);
  });
  const le=document.getElementById('hlv');le.innerHTML='';
  const maxHearts=Math.max(3,S.lives+1);
  for(let i=0;i<maxHearts;i++){const d=document.createElement('div');d.className='heart '+(i<=S.lives?'alive':'dead');le.appendChild(d)}
}
function updateHudMetrics(){
  const sonarEl=document.getElementById('hsonar');
  if(sonarEl){
    if(Sonar.cooldown>0){sonarEl.textContent=Math.ceil(Sonar.cooldown/1000)+'s';sonarEl.style.color='#556677';const mob=document.getElementById('btn-sonar-mob');if(mob)mob.style.opacity='.5'}
    else{sonarEl.textContent='READY';sonarEl.style.color='#00d4ff';const mob=document.getElementById('btn-sonar-mob');if(mob)mob.style.opacity='1'}
  }
  const pw=document.getElementById('hpow');
  if(pw){
    let t='';
    if(_magnetTimer>0)t+='🧲'+Math.ceil(_magnetTimer/1000)+'s ';
    if(_freezeTimer>0)t+='⏳'+Math.ceil(_freezeTimer/1000)+'s ';
    if(_doubleCatches>0)t+='⭐×'+_doubleCatches+' ';
    if(_combo>=2)t+='🔥×'+_combo+' ';
    pw.textContent=t.trim();pw.style.display=t?'block':'none';
  }
}
function fb(text,good){const el=document.getElementById('cf');el.textContent=text;el.className='';void el.offsetWidth;el.className=good?'sg':'sb'}
function triggerShake(power,dur){_shake.power=power||7;_shake.timer=dur||480}

/* ============================================================
   COLLISION & LOGIC
   ============================================================ */
function checkColl(){
  const ph=cp();
  for(let i=S.items.length-1;i>=0;i--){
    const it=S.items[i];if(it.caught)continue;
    if(Math.hypot(Hook.x-it.x,Hook.y-it.y)<Hook.radius+it.radius){
      it.caught=true;const{key,def}=it;
      // Chaos mode: broadcast removal to all other players
      if(_gameMode==='chaos'&&typeof MP!=='undefined'&&MP.active&&MP.started)MP.chaosCatch(it.chaosId);
      if(def.type==='trash'){
        // Iron Trawler shield absorbs first trash hit
        if(_shieldActive){
          _shieldActive=false;
          Particles.spawn(it.x,it.y,'#aabbcc',14);
          triggerFlash('#aaccff',.3,250);
          showHudAlert('🛡️ SHIELD BLOCKED IT!');fb('🛡️ BLOCKED!',true);
          _bgmNote(440,'square',.08,.25);_bgmNote(660,'square',.1,.2);
        } else {
          Particles.spawn(it.x,it.y,'#ff3300',14);
          triggerFlash('#ff0000',.4,380);
          _achievTrack.trashFreeThisLevel=false;
          loseLife('TRASH! -50');S.score=Math.max(0,S.score-50);
        }
      } else if(def.type==='bonus'){
        S.score+=500;rHUD();
        Particles.spawn(it.x,it.y,'#ffd700',28);triggerFlash('#ffd70099',.5,600);
        showHudAlert('⭐ JACKPOT! +500!');fb('⭐ +500!',true);
        beep(880,'sine',.3,.6);S.items.splice(i,1);return;
      } else if(def.type==='powerup'){
        Particles.spawn(it.x,it.y,def.glow,16);
        if(key==='MAGNET'){_magnetTimer=8000;showHudAlert('🧲 MAGNET! 8s');fb('🧲 MAGNET!',true);beep(660,'sine',.2,.4)}
        else if(key==='FREEZE'){_freezeTimer=10000;showHudAlert('⏳ TIME FROZEN! 10s');fb('⏳ FREEZE!',true);beep(440,'sine',.15,.3);setTimeout(()=>beep(880,'sine',.15,.2),120)}
        else if(key==='DOUBLE'){_doubleCatches=5;showHudAlert('⭐ SCORE ×2! Next 5');fb('⭐ ×2 SCORE!',true);beep(880,'square',.15,.35)}
        rHUD();S.items.splice(i,1);return;
      } else {
        const _cat=_makerGod?_MG_GROUPS[key]:null;
        const _rk=(phr()[key]||0)>0?key:(_cat&&(phr()[_cat]||0)>0?_cat:null);
        const nd=_rk?(phr()[_rk]||0):0,col=_rk?(S.collected[_rk]||0):0;
        if(nd>0&&col<nd){
          S.collected[_rk||key]=(S.collected[_rk||key]||0)+1;
          _combo++;_comboTimer=2500;
          const dbl=_doubleCatches>0?(_doubleCatches--,true):false;
          const comboBonus=_combo>=3?Math.min(Math.floor(_combo/2),5)*50:0;
          const earned=100*(dbl?2:1)+comboBonus;
          S.score+=earned;sCatch();
          Particles.spawn(it.x,it.y,def.glow,16);
          triggerFlash(def.glow+'66',.45,220);
          // Achievements
          _checkAchiev('first_fish');
          if(_combo>=3)_checkAchiev('combo3');
          if(_combo>=5)_checkAchiev('combo5');
          chkDone();
        } else {
          Particles.spawn(it.x,it.y,'#ff3300',10);
          triggerFlash('#ff0000',.35,350);
          _achievTrack.trashFreeThisLevel=false;
          showTeachTip(key);
          loseLife('WRONG! -50');S.score=Math.max(0,S.score-50);
        }
      }
      rHUD();S.items.splice(i,1);return;
    }
  }
  if(Sonar.highlightTimer>0){
    const sonarRange=Sonar.maxRadius*(1-Sonar.highlightTimer/1800);
    S.items.forEach(it=>{const d=Math.hypot(it.x-Sonar.cx,it.y-Sonar.cy);if(d<sonarRange+80){it.sonarGlow=255;it.fadeDelay=it.life+6000}});
    FishAI.fish.forEach(f=>{const d=Math.hypot(f.x-Sonar.cx,f.y-Sonar.cy);if(d<sonarRange+80)f.sonarGlow=255});
  }
}

/* ── Circuit Preview ────────────────────────────────────────── */
function showCircuitPreview(ph,onDone){
  const overlay=document.getElementById('circuit-preview');
  const cvs=document.getElementById('circuit-preview-canvas');
  if(!overlay||!cvs){setTimeout(onDone,0);return}
  overlay.classList.remove('h');
  const W=Math.min(window.innerWidth*.86,480),H=150;
  cvs.width=W;cvs.height=H;
  const c=cvs.getContext('2d');c.imageSmoothingEnabled=false;
  const keys=Object.keys(ph.requires);const n=keys.length;
  const slot=W/(n+1);let step=0;
  function draw(){
    c.clearRect(0,0,W,H);
    if(step>1){// connecting dashes
      c.strokeStyle='#00d4ff55';c.lineWidth=2;c.setLineDash([5,5]);
      c.beginPath();c.moveTo(slot*.5,H/2);c.lineTo(slot*(Math.min(step,n)+.5),H/2);c.stroke();c.setLineDash([]);
    }
    keys.forEach((k,i)=>{
      if(i>=step)return;
      const def=CD[k];const cx=slot*(i+1),cy=H/2;
      c.shadowBlur=18;c.shadowColor=def.glow;
      c.fillStyle=def.color;c.beginPath();c.arc(cx,cy,16,0,Math.PI*2);c.fill();c.shadowBlur=0;
      c.strokeStyle=def.glow;c.lineWidth=2;c.beginPath();c.arc(cx,cy,16,0,Math.PI*2);c.stroke();
      const fs=def.label.length>4?4:def.label.length>3?5:6;
      c.fillStyle='#fff';c.font=`${fs}px 'Press Start 2P',monospace`;c.textAlign='center';c.textBaseline='middle';c.fillText(def.label,cx,cy);
      if(i<n-1&&i<step-1){// arrow
        c.fillStyle='#00d4ff88';c.fillRect(cx+19,cy-1,slot-38,2);
        c.beginPath();c.moveTo(cx+slot-20,cy-5);c.lineTo(cx+slot-14,cy);c.lineTo(cx+slot-20,cy+5);c.fillStyle='#00d4ff';c.fill();
      }
    });
  }
  const iv=setInterval(()=>{
    step++;draw();
    if(step>n){clearInterval(iv);setTimeout(()=>{overlay.classList.add('h');if(onDone)onDone()},1100)}
  },380);
  draw();
}

function chkDone(){
  const ph=cp();
  if(!Object.entries(phr()).every(([k,n])=>(S.collected[k]||0)>=n))return;
  S.running=false;
  const secondsLeft=getPhaseSecondsLeft(),bonus=calcTimeBonus(secondsLeft);
  S.score+=bonus;S.totalBonus+=bonus;S.totalTime+=getPhaseElapsed()/1000;sLvl();
  // Achievements
  if(secondsLeft>=(PHASE_TIME[S.phase]||60)-15)_checkAchiev('speed15');
  if(_achievTrack.trashFreeThisLevel)_checkAchiev('no_trash');
  if(S.lives>=_achievTrack.livesAtLevelStart)_checkAchiev('perfect_lvl');
  if(S.phase>=4)_checkAchiev('lvl5');
  triggerFlash('#00ff88',.5,500);
  Particles.confetti(canvas.width/2,canvas.height*.3,60);
  if(typeof MP!=='undefined'&&MP.active&&MP.started&&(_gameMode==='race'||_gameMode==='chaos')){MP.roundWin(S.score,S.phase);showRaceWaiting('ROUND WIN! ⚡','Waiting for others…','🏆');return;}
  if(typeof MP!=='undefined'&&MP.active)MP.onLevelDone(S.score,S.phase);
  const det=document.getElementById('lvl-score-detail');
  det.innerHTML=`<span>BASE</span> +${Object.keys(phr()).reduce((a,k)=>a+(phr()[k]*100),0)} &nbsp; `;
  if(bonus>0)det.innerHTML+=`<span class="bonus">⚡ SPEED BONUS +${bonus}</span>`;
  else det.innerHTML+=`<span>⏱ NO BONUS (time ran out)</span>`;
  // Show circuit preview, then level complete
  showCircuitPreview(ph,()=>{
    setTimeout(()=>{
      document.getElementById('mlt').textContent='✓ '+ph.name;
      document.getElementById('mld').textContent=ph.desc;
      document.getElementById('mcp').textContent='⚡ '+ph.circuit;
      document.getElementById('mtp').textContent=ph.tip?'💡 '+ph.tip:'';
      document.getElementById('mlv').classList.remove('h');
    },350);
  });
}

function loseLife(r){
  _combo=0;_comboTimer=0;
  triggerShake(8,500);triggerFlash('#ff0000',.42,400);
  S.lives--;sBad();fb(r,false);
  document.body.classList.remove('df');void document.body.offsetWidth;document.body.classList.add('df');
  setTimeout(()=>document.body.classList.remove('df'),550);
  if(S.lives<0){
    S.running=false;sGameOver();
    const elapsed=getPhaseElapsed()/1000,totalTime=S.totalTime+elapsed;
    if(!_runRecorded){_runRecorded=true;addSessionRun({name:pName,score:S.score,totalTime,bonus:S.totalBonus,fate:'over',phase:S.phase+1})}
    if(typeof MP!=='undefined'&&MP.active&&MP.started&&(_gameMode==='race'||_gameMode==='chaos')){MP.roundOut(S.score);showRaceWaiting('ELIMINATED! 💀','Watching the race…','👀');rHUD();return;}
    if(typeof MP!=='undefined'&&MP.active)MP.onDied(S.score);
    const mins=Math.floor(totalTime/60),secs=String(Math.floor(totalTime%60)).padStart(2,'0');
    document.getElementById('go-score-detail').innerHTML=`<span>⏱ TIME:</span> ${mins>0?mins+'m':''}${secs}s &nbsp; <span class="bonus">⚡ BONUSES: +${S.totalBonus}</span>`;
    setTimeout(()=>{document.getElementById('gov').textContent=S.score;document.getElementById('gom').textContent='Better luck, '+pName+'! Avoid the trash.';document.getElementById('mgo').classList.remove('h')},350);
  }
  rHUD();
}

/* ============================================================
   GAME LOOP
   ============================================================ */
/* ============================================================
   CHAOS EVENTS — host fires, broadcasts to all clients
   ============================================================ */
const _CHAOS_EVENTS=[{type:'wave'},{type:'charge'},{type:'frenzy'},{type:'jackpot'},{type:'anchor'}];

window.applyChaosEvent=function(ev){
  if(ev.type==='wave'){
    _waveDir=ev.dir||1;_waveTimer=5000;
    showHudAlert('🌊 ROGUE WAVE '+(ev.dir>0?'→':'←')+'!');
    triggerShake(5,600);triggerFlash('#4499ff44',.35,400);
  }else if(ev.type==='charge'){
    const ct=S.items.filter(i=>i.def.type==='trash').length;
    S.items=S.items.filter(i=>i.def.type!=='trash');
    if(ct>0){S.score+=ct*40;rHUD()}
    showHudAlert('💥 DEPTH CHARGE! Trash cleared!');
    triggerFlash('#ff880077',.4,500);triggerShake(8,800);
    Particles.confetti(canvas.width/2,canvas.height*.5,50);
  }else if(ev.type==='frenzy'){
    _frenzyTimer=8000;
    showHudAlert('🐠 FISH FRENZY! Bonus items!');
    triggerFlash('#44ff8844',.3,400);
  }else if(ev.type==='jackpot'){
    showHudAlert('⭐ JACKPOT STAR appeared! 500 pts!');
    triggerFlash('#ffd70066',.4,500);
  }else if(ev.type==='anchor'){
    S.items.forEach(it=>{it.vx=0;it.vy=0});
    showHudAlert('⚓ ANCHOR DROP! All items frozen!');
    triggerFlash('#aabbcc44',.3,400);triggerShake(4,400);
  }
};

function spawnJackpot(){
  const def=CD.STAR;if(!def)return;
  const wy=WY(),my=canvas.height-MH()-18;
  const ix=80+Math.random()*(canvas.width-160),iy=wy+40+Math.random()*Math.max(20,my-wy-80);
  const item={key:'STAR',def,x:ix,y:iy,vx:0,vy:0,radius:22,life:0,maxLife:5000,caught:false,wobble:Math.random()*Math.PI*2,sonarGlow:255,fadeDelay:1000,chaosId:Math.random().toString(36).slice(2,9)};
  S.items.push(item);
  if(_gameMode==='chaos'&&typeof MP!=='undefined'&&MP.active&&MP.started&&MP.isHost)MP.chaosSpawn(item);
}

function fireChaosEvent(){
  const ev={...(_CHAOS_EVENTS[Math.floor(Math.random()*_CHAOS_EVENTS.length)])};
  if(ev.type==='wave')ev.dir=Math.random()<.5?1:-1;
  if(ev.type==='frenzy')for(let i=0;i<6;i++)spawn(); // host spawns & broadcasts via chaosSpawn
  if(ev.type==='jackpot')spawnJackpot();
  window.applyChaosEvent(ev);
  if(typeof MP!=='undefined'&&MP.active&&MP.started)MP.sendChaosEvent(ev);
}

let lt=0,_lid=null;
function update(dt){
  Boat.prevX=Boat.x;
  if(iL())Boat.vx-=Boat.accel;
  if(iR())Boat.vx+=Boat.accel;
  Boat.vx=Math.max(-Boat.speed,Math.min(Boat.speed,Boat.vx));
  Boat.vx*=Boat.drag;
  if(Math.abs(Boat.vx)<0.05)Boat.vx=0;
  Boat.x+=Boat.vx;
  Boat.x=Math.max(Boat.w*.5+10,Math.min(canvas.width-Boat.w*.5-10,Boat.x));
  Boat.baseY=WY()-Boat.h*.6;
  Hook.update(dt);OceanCurrents.update(dt);Ecosystem.update(dt);FishAI.update(dt,WY());Sonar.update(dt);tickHudAlert(dt);updateHudMetrics();
  Particles.update(dt);WakeTrail.update(dt);
  // Screen shake tick
  if(_shake.timer>0){_shake.timer=Math.max(0,_shake.timer-dt);const p=_shake.power*(_shake.timer/480);_shake.x=Math.round((Math.random()-.5)*p*2);_shake.y=Math.round((Math.random()-.5)*p*2);}else{_shake.x=0;_shake.y=0}
  // Combo timeout
  if(_comboTimer>0){_comboTimer-=dt;if(_comboTimer<=0){_combo=0;_comboTimer=0}}
  // Freeze powerup — freezes the phase clock
  if(_freezeTimer>0){_freezeTimer=Math.max(0,_freezeTimer-dt);S.pausedElapsed+=dt;if(_freezeTimer===0)showHudAlert('⏳ UNFROZEN!')}
  // Magnet powerup — attract required items toward hook
  if(_magnetTimer>0){
    _magnetTimer=Math.max(0,_magnetTimer-dt);
    const ph=cp();
    S.items.forEach(it=>{
      if(it.def.type==='powerup'||it.def.type==='trash')return;
      const _mc=_makerGod?_MG_GROUPS[it.key]:null;
      const _mrk=(phr()[it.key]||0)>0?it.key:(_mc&&(phr()[_mc]||0)>0?_mc:null);
      if(!_mrk||(S.collected[_mrk]||0)>=(phr()[_mrk]||0))return;
      const dx=Hook.x-it.x,dy=Hook.y-it.y,dist=Math.sqrt(dx*dx+dy*dy);
      if(dist>24&&dist<380){it.vx+=(dx/dist)*.12;it.vy+=(dy/dist)*.12;const spd=Math.sqrt(it.vx*it.vx+it.vy*it.vy);if(spd>2.5){it.vx=(it.vx/spd)*2.5;it.vy=(it.vy/spd)*2.5}}
    });
    if(_magnetTimer===0)showHudAlert('🧲 MAGNET EXPIRED');
  }
  // Chaos: rogue wave drift
  if(_waveTimer>0){_waveTimer=Math.max(0,_waveTimer-dt);S.items.forEach(it=>{it.vx+=_waveDir*.07;const s=Math.abs(it.vx);if(s>4)it.vx=(it.vx/s)*4});if(_waveTimer===0)showHudAlert('🌊 WAVE PASSED!')}
  // Chaos: fish frenzy HUD countdown
  if(_frenzyTimer>0){_frenzyTimer=Math.max(0,_frenzyTimer-dt);if(_frenzyTimer===0)showHudAlert('🐠 FRENZY OVER!')}
  // Chaos: host fires timed events
  if(_gameMode==='chaos'&&_chaosEventTimer>0&&typeof MP!=='undefined'&&MP.isHost&&MP.started){_chaosEventTimer-=dt;if(_chaosEventTimer<=0){fireChaosEvent();_chaosEventTimer=25000+Math.random()*15000}}
  const wy=WY(),my=canvas.height-MH()-16;

  S.items.forEach(it=>{
    it.x+=it.vx;it.y+=it.vy;it.life+=dt;
    if(it.x<it.radius||it.x>canvas.width-it.radius)it.vx*=-1;
    if(it.y<wy+it.radius||it.y>my-it.radius)it.vy*=-1;
    it.x=Math.max(it.radius,Math.min(canvas.width-it.radius,it.x));
    it.y=Math.max(wy+it.radius,Math.min(my-it.radius,it.y));
    if(it.life>it.fadeDelay)it.sonarGlow=Math.max(0,it.sonarGlow-dt*.04);
  });
  S.items=S.items.filter(it=>!it.caught&&it.life<it.maxLife);
  if(S.items.length>22)S.items.splice(0,S.items.length-22);
  S.spawnTimer+=dt;if(S.spawnTimer>S.spawnInterval){S.spawnTimer=0;if(S.items.length<16)spawn();S.spawnInterval=Math.max(800,S.spawnInterval-6)}
  tickTimer();updateRaceBar();_tickFlash(dt);
  if(typeof MP!=='undefined')MP.tick(dt);
}

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(_shake.x||_shake.y){ctx.save();ctx.translate(_shake.x,_shake.y)}
  drawBG();drawWaterReflection();WakeTrail.draw();S.items.forEach(drawItem);drawLine();drawHook();drawGhostBoats();drawBoat();Sonar.draw();Particles.draw();_drawFlash();
  if(_shake.x||_shake.y)ctx.restore();
}

function loop(ts){if(!S.running)return;const dt=Math.min(ts-lt,50);lt=ts;update(dt);checkColl();render();_lid=requestAnimationFrame(loop)}
function stopLoop(){S.running=false;if(_lid){cancelAnimationFrame(_lid);_lid=null}stopBGM();}

/* ============================================================
   BRIEFING & FLOW
   ============================================================ */
function showBrf(idx){
  const ph=PH[idx];
  document.getElementById('bpn2').textContent=(_endless&&idx>=10)?'ENDLESS LVL '+(idx+1):'LEVEL '+(idx+1)+' OF '+PH.length;
  document.getElementById('bico').textContent=ph.icon;
  document.getElementById('btit').textContent=ph.name;
  document.getElementById('bdsc').textContent=ph.desc;
  document.getElementById('btime-val').textContent='TIME LIMIT: '+(PHASE_TIME[idx]||60)+'s';
  let bossBanner=document.getElementById('boss-banner');
  if(ph.boss){
    if(!bossBanner){bossBanner=document.createElement('div');bossBanner.id='boss-banner';bossBanner.className='boss-banner';document.getElementById('brf').querySelector('.mb3.bb').insertBefore(bossBanner,document.querySelector('.brf-title-row'))}
    bossBanner.textContent='⚠ BOSS LEVEL — BIG CAT BRIAN AWAITS ⚠';
  } else {if(bossBanner)bossBanner.remove()}
  const te=document.getElementById('btgs');te.innerHTML='';
  const effReqs=_makerGod?buildMGRequires(ph.requires):ph.requires;
  Object.entries(effReqs).forEach(([k,c])=>{
    const def=_MG_CAT_DEF[k]||CD[k],chip=document.createElement('span');chip.className='btc';
    chip.style.cssText='background:'+def.color+'33;border-color:'+def.glow+'88;color:'+def.glow;
    chip.innerHTML=(c>1?'<strong>'+c+'×</strong> ':'')+def.label;te.appendChild(chip);
  });
  document.getElementById('brf').classList.remove('h');
  // In race mode only host can launch — hide button for clients
  const brfBtn=document.querySelector('.brf-actions .pixel-btn');
  let brfWait=document.getElementById('brf-wait-msg');
  if(!brfWait){brfWait=document.createElement('p');brfWait.id='brf-wait-msg';brfWait.style.cssText='font-size:clamp(.3rem,1vw,.42rem);color:#667788;margin:8px 0 0;display:none';document.querySelector('.brf-actions').appendChild(brfWait)}
  if(typeof MP!=='undefined'&&MP.active&&MP.started&&(_gameMode==='race'||_gameMode==='chaos')){
    if(MP.isHost){brfBtn.style.display='';brfWait.style.display='none'}
    else{brfBtn.style.display='none';brfWait.style.display='block';brfWait.textContent='⏳ Waiting for host to start…'}
  } else {brfBtn.style.display='';brfWait.style.display='none'}
}

function initPhase(){
  S.collected={};S.items=[];S.spawnTimer=0;S.spawnInterval=Math.max(1100,2200-S.phase*140);
  S.phaseStart=performance.now();S.pausedElapsed=0;_lastTimerTick=0;_envData=null;
  _combo=0;_comboTimer=0;_magnetTimer=0;_freezeTimer=0;_doubleCatches=0;
  _shake.timer=0;_shake.x=0;_shake.y=0;
  _waveTimer=0;_frenzyTimer=0;
  if(_gameMode==='chaos')_chaosEventTimer=20000;
  _phaseRequires=_makerGod?buildMGRequires(cp().requires):cp().requires;
  Particles.list=[];WakeTrail.foam=[];
  Boat.init();Hook.init();OceanCurrents.init();Ecosystem.init();FishAI.init();
  Sonar.cooldown=0;
  _achievTrack.trashFreeThisLevel=true;_achievTrack.livesAtLevelStart=S.lives;
  for(let i=0;i<9;i++)spawn();
  rHUD();
}

function launchPhase(){
  document.getElementById('brf').classList.add('h');document.getElementById('mlv').classList.add('h');
  if(typeof MP!=='undefined'&&MP.active&&MP.started&&MP.isHost)MP.broadcastLaunch();
  if(_lid){cancelAnimationFrame(_lid);_lid=null}
  const _lp=document.getElementById('btn-pause');if(_lp)_lp.textContent='⏸';
  // Start a pre-game render loop (no game logic, just visuals) then countdown
  S.running=false;
  lt=performance.now();
  function preLoop(ts){const dt=Math.min(ts-lt,50);lt=ts;
    Boat.baseY=WY()-Boat.h*.6;Boat.y=Boat.baseY+Boat.draft;
    Hook.update(dt);OceanCurrents.update(dt);Ecosystem.update(dt);FishAI.update(dt,WY());
    WakeTrail.update(dt);Particles.update(dt);render();
    _lid=requestAnimationFrame(preLoop);
  }
  _lid=requestAnimationFrame(preLoop);
  const cdEl=document.getElementById('countdown-overlay');
  const numEl=document.getElementById('countdown-num');
  cdEl.classList.remove('h');
  let n=3;
  numEl.textContent=n;numEl.className='';void numEl.offsetWidth;
  const tick=setInterval(()=>{
    n--;
    if(n>0){numEl.textContent=n;numEl.className='';void numEl.offsetWidth;numEl.className=''}
    else if(n===0){numEl.textContent='GO!';numEl.className='go';void numEl.offsetWidth;numEl.className='go'}
    else{
      clearInterval(tick);
      cdEl.classList.add('h');
      if(_lid){cancelAnimationFrame(_lid);_lid=null}
      S.running=true;S.paused=false;S.phaseStart=performance.now();S.pausedElapsed=0;
      startBGM(S.phase);
      lt=performance.now();_lid=requestAnimationFrame(loop);
    }
  },1000);
}

function startGame(){
  pName=document.getElementById('pin').value.trim()||'Fisherman';
  _shieldActive=selectedBoat.shield;
  _achievTrack.sonarUses=0;_achievTrack.trashFreeThisLevel=true;
  stopLoop();S.phase=0;S.score=0;S.lives=2;S.totalTime=0;S.totalBonus=0;_runRecorded=false;
  document.getElementById('lobby').classList.remove('active');
  document.getElementById('gs').classList.add('active');
  // Wire MP callbacks
  window.onMPRoundEnd=function(winner){
    stopLoop();
    document.getElementById('race-waiting').classList.add('h');
    showRaceRoundEnd(winner);
  };
  window.onMPNextRound=function(){
    document.getElementById('race-round-end').classList.add('h');
    document.getElementById('race-waiting').classList.add('h');
    nextPhase();
  };
  window.onMPRoundAnnounce=function(msg){
    const el=document.getElementById('rw-msg');if(el)el.textContent=msg;
    _renderRaceWaitBoard('rw-board');
  };
  resz();initPhase();showBrf(0);
  setTimeout(initJoysticks,80);
}


function nextPhase(){
  S.phase++;document.getElementById('mlv').classList.add('h');
  if(S.phase===3){S.lives=Math.min(S.lives+1,5);showHudAlert('❤️ +1 LIFE BONUS!');setTimeout(()=>fb('❤️ +1 LIFE!',true),200);rHUD()}
  else if(S.phase===6){S.lives=Math.min(S.lives+2,5);showHudAlert('❤️❤️ +2 LIVES BONUS!');setTimeout(()=>fb('❤️❤️ +2 LIVES!',true),200);rHUD()}
  // Trawler shield refreshes each level
  if(selectedBoat.shield)_shieldActive=true;
  if(_endless&&S.phase>=14)_checkAchiev('endless_15');
  // Endless: generate new phase beyond level 10
  if(_endless&&S.phase>=PH.length){
    const ep=generateEndlessPhase(S.phase);
    PH.push(ep);
    PHASE_TIME.push(ep._timeLimit||Math.max(30,70-(S.phase-10)*3));
  }
  if(S.phase>=PH.length){
    const totalTime=S.totalTime,mins=Math.floor(totalTime/60),secs=String(Math.floor(totalTime%60)).padStart(2,'0');
    if(!_runRecorded){_runRecorded=true;addSessionRun({name:pName,score:S.score,totalTime,bonus:S.totalBonus,fate:'win',phase:10})}
    document.getElementById('wv').textContent=S.score;document.getElementById('wbonus').textContent='+'+S.totalBonus;
    document.getElementById('wtotal').textContent=(mins>0?mins+'m':'')+secs+'s';
    document.getElementById('wm').textContent='All 10 circuits built, '+pName+'! You defeated Big Cat Brian!';
    _checkAchiev('boss_beat');
    Particles.confetti(canvas.width/2,canvas.height*.3,80);
    triggerFlash('#ffd700',.6,600);
    if(typeof MP!=='undefined'&&MP.active)MP.onWin(S.score);
    document.getElementById('mwn').classList.remove('h');return;
  }
  initPhase();showBrf(S.phase);
}

function restartGame(){
  ['mgo','mwn','brf','countdown-overlay'].forEach(id=>document.getElementById(id).classList.add('h'));
  _shieldActive=selectedBoat.shield;
  // Trim any endless-generated phases back to the original 10
  if(PH.length>10){PH.splice(10);PHASE_TIME.splice(10)}
  stopLoop();S.phase=0;S.score=0;S.lives=2;S.totalTime=0;S.totalBonus=0;_runRecorded=false;
  initPhase();showBrf(0);
}

/* ============================================================
   ENDLESS PHASE GENERATOR
   ============================================================ */
const _ENDLESS_TITLES=[
  {name:'Advanced LED Grid',icon:'💡',desc:'Multi-LED circuit with PWM control.',tip:'Use analogWrite() for smooth dimming!'},
  {name:'Mystery Signal',icon:'🔮',desc:'Combine sensors and output devices.',tip:'Think about INPUT vs OUTPUT modes.'},
  {name:'Chaos Circuit',icon:'🔥',desc:'Speed and precision required!',tip:'Map sensors to PWM for dynamic control.'},
  {name:'Expert Build',icon:'🤖',desc:'Only the best engineers complete this.',tip:'Combine digital and analog techniques.'},
  {name:'Power Network',icon:'⚡',desc:'Multi-component power management.',tip:'Each component needs its own current path.'},
  {name:'Sensor Fusion',icon:'📡',desc:'Multiple sensors working together.',tip:'Read all inputs before triggering outputs.'},
  {name:'Ultra Challenge',icon:'⭐',desc:'The ultimate Arduino test!',tip:'Plan your circuit before you start fishing.'},
];
function generateEndlessPhase(phaseIdx){
  const diff=Math.floor((phaseIdx-10)/2); // increases every 2 levels
  const reqCount=Math.min(3+diff,9);
  const timeLimit=Math.max(30,70-diff*5);
  // Build a random requires object from all non-trash non-powerup items
  const allParts=Object.keys(CD).filter(k=>CD[k].type!=='trash'&&CD[k].type!=='powerup');
  // Always include GND, and pick the rest randomly
  const chosen=['GND'];
  const others=allParts.filter(k=>k!=='GND').sort(()=>Math.random()-.5);
  for(let i=0;i<Math.min(reqCount-1,others.length);i++)chosen.push(others[i]);
  const requires={};
  chosen.forEach(k=>{requires[k]=1+(Math.random()<.25?1:0)});
  const t=_ENDLESS_TITLES[phaseIdx%_ENDLESS_TITLES.length];
  return{name:t.name,icon:t.icon,desc:t.desc,circuit:chosen.map(k=>CD[k].label).join(' → '),tip:t.tip,requires,_timeLimit:timeLimit};
}

/* ============================================================
   MODE SELECTION
   ============================================================ */
/* ---- helpers ---- */
function _showOverlay(id,show){const el=document.getElementById(id);if(el)el.style.display=show?'flex':'none';}

function chooseSolo(){
  _gameMode='solo';_endless=false;_makerGod=false;
  _showOverlay('mode-overlay',false);
  _showOverlay('diff-overlay',true);
  _showOverlay('lc',false);
}
function pickDifficulty(d){
  _makerGod=d==='god';
  _showOverlay('diff-overlay',false);
  document.getElementById('mp-panel').style.display='none';
  const lcLeft=document.querySelector('.lc-left');if(lcLeft)lcLeft.style.display='';
  document.getElementById('bst').style.display='';
  document.getElementById('nh2').style.display='';
  document.getElementById('lc-mode-badge').textContent=_makerGod?'⚡ MAKER GOD':'🎣 SOLO';
  document.getElementById('lc-mode-badge').style.color=_makerGod?'#ffd700':'#00ff88';
  _showOverlay('lc',true);
}
function diffBack(){
  _showOverlay('diff-overlay',false);
  _showOverlay('mode-overlay',true);
}
function lcBack(){
  _showOverlay('lc',false);
  if(_gameMode==='solo'&&!_endless){_showOverlay('diff-overlay',true);}
  else{_showOverlay('mode-overlay',true);}
}
function chooseMulti(){
  _gameMode='race';_endless=false;
  _showOverlay('mode-overlay',false);
  document.getElementById('mp-panel').style.display='';
  const lcLeft=document.querySelector('.lc-left');if(lcLeft)lcLeft.style.display='';
  document.getElementById('bst').style.display='none';
  document.getElementById('nh2').style.display='none';
  document.getElementById('lc-mode-badge').textContent='⚡ RACE';
  document.getElementById('lc-mode-badge').style.color='#ffd700';
  _showOverlay('lc',true);
}
function chooseChaos(){
  _gameMode='chaos';_endless=false;
  _showOverlay('mode-overlay',false);
  document.getElementById('mp-panel').style.display='';
  document.getElementById('bst').style.display='none';
  document.getElementById('nh2').style.display='none';
  document.getElementById('lc-mode-badge').textContent='🔥 CHAOS';
  document.getElementById('lc-mode-badge').style.color='#ff6600';
  if(typeof MP!=='undefined')MP.initChaos();
  const lcLeft=document.querySelector('.lc-left');if(lcLeft)lcLeft.style.display='none';
  _showOverlay('lc',true);
}
function chooseEndless(){
  _gameMode='solo';_endless=true;
  _showOverlay('mode-overlay',false);
  document.getElementById('mp-panel').style.display='none';
  document.getElementById('bst').style.display='';
  document.getElementById('nh2').style.display='';
  document.getElementById('lc-mode-badge').textContent='♾️ ENDLESS';
  document.getElementById('lc-mode-badge').style.color='#cc44ff';
  _showOverlay('lc',true);
}
function chooseBack(){
  _gameMode='solo';_endless=false;_makerGod=false;
  if(typeof MP!=='undefined'&&MP.active)MP.reset();
  _showOverlay('lc',false);
  _showOverlay('diff-overlay',false);
  _showOverlay('mode-overlay',true);
}

/* ============================================================
   NAME GATE
   ============================================================ */
function nc(){
  const val=document.getElementById('pin').value.trim();
  const bst=document.getElementById('bst');
  if(bst.style.display!=='none')bst.disabled=val.length===0;
  const nh=document.getElementById('nh2');nh.textContent=val?'ready, '+val+'!':'type your name to begin';nh.classList.toggle('ok',val.length>0);
}
(function(){
  document.getElementById('pin').addEventListener('keydown',e=>{
    const bst=document.getElementById('bst');
    if(e.key==='Enter'&&bst.style.display!=='none'&&!bst.disabled)startGame();
  });
})();
