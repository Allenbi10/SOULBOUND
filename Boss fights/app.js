const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

const bosses = [
  {name:'Verdant Warden',title:'THE ROOTED CROWN',avatar:'◈',hp:6,difficulty:'NORMAL',color:'#cbf265',bg:'#101a14',desc:'VINEBOUND SENTINEL',pattern:'vines'},
  {name:'Neon Requiem',title:'THE LAST SIGNAL',avatar:'△',hp:7,difficulty:'HARD',color:'#9d7cff',bg:'#141022',desc:'SPECTRAL BROADCAST',pattern:'neon'},
  {name:'Ash Titan',title:'THE FALLING SUN',avatar:'✹',hp:9,difficulty:'BRUTAL',color:'#ff6b55',bg:'#1d1210',desc:'HEART OF THE CALDERA',pattern:'ash'}
];

const MIN_BOSS_WAVES = 3;
const MAX_BOSS_WAVES = 6;
const WAVE_LENGTH = 900;
const NEON_LINE_LENGTH = 550;
const PLAYER_MAX_HP = 5;
let selected = 0;
let state = {};
let lastTime = 0;

function initBoss(index = selected) {
  selected = index;
  const b = bosses[selected];
  state = {phase:'player',bossHp:b.hp,maxHp:b.hp,playerHp:PLAYER_MAX_HP,soul:{x:380,y:230},keys:{},cursor:0,cursorDir:1,patternTimer:0,pattern:null,wave:0,wavesLeft:0,wavesTotal:0,hazards:[],projectiles:[],particles:[],turn:1,over:false,won:false};
  updateUI();
}

function startFight(index) {
  initBoss(index);
  $('mainMenu').classList.add('view-hidden');
  $('fightScreen').classList.remove('view-hidden');
  $('runStatus').textContent = 'COMBAT ACTIVE';
}

function updateUI() {
  const b = bosses[selected];
  $('bossName').textContent=b.name; $('bossTitle').textContent=b.title; $('bossAvatar').textContent=b.avatar; $('bossAvatar').style.color=b.color;
  $('bossHpText').textContent=`${state.bossHp} / ${state.maxHp}`; $('bossHpFill').style.width=`${Math.max(0,state.bossHp/state.maxHp*100)}%`;
  $('playerHpText').textContent=`${state.playerHp} / ${PLAYER_MAX_HP}`; $('playerHpFill').style.width=`${Math.max(0,state.playerHp/PLAYER_MAX_HP*100)}%`;
  $('turnLabel').textContent=state.phase==='player'?'YOUR TURN':state.phase==='boss'?`BOSS WAVE ${state.wave} / ${state.wavesTotal}`:state.over?'FIGHT OVER':'YOUR TURN';
  $('arenaHint').textContent=state.phase==='boss'?'DODGE THE TELEGRAPH':'ATTACK WHEN READY'; $('strikeBtn').disabled=state.phase!=='player'||state.over;
}

function draw(){ const b=bosses[selected];ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=b.bg;ctx.fillRect(0,0,canvas.width,canvas.height);drawGrid();drawPattern();drawSoul();drawParticles();requestAnimationFrame(draw); }
function drawGrid(){ ctx.strokeStyle='rgba(160,190,170,.07)';ctx.lineWidth=1;for(let x=20;x<760;x+=38){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,460);ctx.stroke();}for(let y=18;y<460;y+=38){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(760,y);ctx.stroke();}ctx.strokeStyle='rgba(203,242,101,.32)';ctx.lineWidth=2;ctx.strokeRect(17,17,726,426);ctx.strokeStyle='rgba(203,242,101,.12)';ctx.lineWidth=1;ctx.strokeRect(24,24,712,412); }
function drawBoss(b){ const pulse=1+Math.sin(Date.now()/280)*.035,cx=675,cy=105,r=42*pulse;ctx.save();ctx.shadowBlur=22;ctx.shadowColor=b.color;ctx.strokeStyle=b.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=.15;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=b.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-25,cy);ctx.lineTo(cx+25,cy);ctx.moveTo(cx,cy-25);ctx.lineTo(cx,cy+25);ctx.stroke();ctx.font='22px Space Grotesk';ctx.textAlign='center';ctx.fillStyle=b.color;ctx.fillText(b.avatar,cx,cy+8);ctx.restore();ctx.font='10px DM Mono';ctx.fillStyle='rgba(236,233,223,.55)';ctx.fillText(b.name.toUpperCase(),cx,cy+72); }

function predictedTarget(){
  const s=state.soul,k=state.keys,lead=220;
  const dx=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0);
  const dy=(k.s||k.arrowdown?1:0)-(k.w||k.arrowup?1:0);
  return {x:Math.max(55,Math.min(705,s.x+dx*lead)),y:Math.max(60,Math.min(405,s.y+dy*lead))};
}

function drawPattern(){
  ctx.save();
  for(const a of state.hazards){
    const alpha=Math.max(.14,a.life/a.maxLife)*(.55+Math.sin(Date.now()/90)*.12);
    ctx.globalAlpha=alpha;ctx.strokeStyle=state.pattern?.color||bosses[selected].color;ctx.fillStyle=state.pattern?.color||bosses[selected].color;ctx.lineWidth=3;
    if(a.type==='line'){ctx.beginPath();ctx.moveTo(a.x1,a.y1);ctx.lineTo(a.x2,a.y2);ctx.stroke();ctx.globalAlpha=alpha*.2;ctx.lineWidth=22;ctx.stroke();}
    else{ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=alpha+.15;ctx.strokeStyle='#fff4d1';ctx.lineWidth=2;ctx.stroke();}
  }
  for(const p of state.projectiles){ctx.globalAlpha=.9;ctx.fillStyle='#ffb347';ctx.shadowBlur=12;ctx.shadowColor='#ff6b55';ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function drawSoul(){ const s=state.soul;ctx.save();ctx.shadowBlur=15;ctx.shadowColor='#ff5263';ctx.fillStyle='#ff5263';ctx.translate(s.x,s.y);ctx.rotate(Math.PI/4);ctx.fillRect(-8,-8,16,16);ctx.restore(); }
function drawParticles(){ for(const p of state.particles){ctx.globalAlpha=p.life/30;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);p.x+=p.vx;p.y+=p.vy;p.life--;}state.particles=state.particles.filter(p=>p.life>0);ctx.globalAlpha=1; }

function makePattern(){
  const b=bosses[selected],t=state.turn+state.wave,target=predictedTarget(),attacks=[];
  const count=Math.min(8,2+state.turn+state.wave);
  const circleLife=(b.pattern==='neon'||b.pattern==='ash')?WAVE_LENGTH+1000:WAVE_LENGTH;
  const lineLife=b.pattern==='neon'?NEON_LINE_LENGTH:WAVE_LENGTH;
  const addLine=(x,y,horizontal=false)=>attacks.push(horizontal?{type:'line',x1:35,y1:y,x2:725,y2:y,life:lineLife,maxLife:lineLife}:{type:'line',x1:x,y1:42,x2:x,y2:420,life:lineLife,maxLife:lineLife});
  const addCircle=(x,y,r)=>attacks.push({type:'area',x,y,r,life:circleLife,maxLife:circleLife});
  addLine(target.x,target.y);
  for(let i=1;i<count;i++){
    const angle=(i/count)*Math.PI*2+t*.7;
    const distance=70+(i%3)*55;
    const x=Math.max(55,Math.min(705,target.x+Math.cos(angle)*distance));
    const y=Math.max(60,Math.min(405,target.y+Math.sin(angle)*distance));
    if((i+t)%2===0||b.pattern==='neon') addLine(x,y,i%3===0);
    else addCircle(x,y,30+selected*8+(i%3)*8);
  }
  if(b.pattern==='vines'&&state.wave%2===0) addLine(target.x,target.y,true);
  if(b.pattern==='ash'&&state.wave>2) addCircle(target.x,target.y,55+state.wave*4);
  return {attacks,color:b.color};
}

function spawnTrackingProjectiles(){
  if(bosses[selected].pattern!=='ash')return;
  const count=2;
  for(let i=0;i<count;i++){
    const angle=(i/count)*Math.PI*2+state.turn;
    state.projectiles.push({x:380+Math.cos(angle)*330,y:230+Math.sin(angle)*180,life:500,speed:0.325});
  }
}

function beginBossTurn(){ state.phase='boss';state.wave=1;state.wavesTotal=MIN_BOSS_WAVES+Math.floor(Math.random()*(MAX_BOSS_WAVES-MIN_BOSS_WAVES+1));state.wavesLeft=state.wavesTotal;state.hazards=[];state.projectiles=[];state.pattern=makePattern();state.hazards.push(...state.pattern.attacks);state.patternTimer=bosses[selected].pattern==='neon'?NEON_LINE_LENGTH:WAVE_LENGTH;spawnTrackingProjectiles();updateUI(); }
function resolveWave(){
  const s=state.soul;let hit=false;const currentAttacks=state.pattern?.attacks||[];const activeHazards=[...currentAttacks,...state.hazards.filter(a=>a.type==='area'&&!currentAttacks.includes(a))];
  for(const a of activeHazards){if(a.type==='line'){const vertical=Math.abs(a.x1-a.x2)<4;hit ||= vertical?Math.abs(s.x-a.x1)<18:Math.abs(s.y-a.y1)<18;}else hit ||= Math.hypot(s.x-a.x,s.y-a.y)<a.r+12;}
  if(hit){state.playerHp--;burst(s.x,s.y,'#ff6b55',12);if(state.playerHp<=0)return lose();}
  state.wavesLeft--;
  if(state.wavesLeft>0){state.wave++;state.pattern=makePattern();state.hazards.push(...state.pattern.attacks);state.patternTimer=bosses[selected].pattern==='neon'?NEON_LINE_LENGTH:WAVE_LENGTH;spawnTrackingProjectiles();updateUI();}
  else{state.pattern=null;state.projectiles=[];state.phase='player';state.turn++;updateUI();}
}

function strike(){ if(state.phase!=='player'||state.over)return;const pos=state.cursor;let damage=0;if(pos>=47&&pos<=53)damage=2;else if(pos>=41&&pos<=59)damage=1;if(damage){state.bossHp=Math.max(0,state.bossHp-damage);burst(380,134,bosses[selected].color,damage===2?22:12);}else burst(380,134,'#ff6b55',7);if(state.bossHp<=0)return win();beginBossTurn(); }
function win(){ state.over=true;state.won=true;state.phase='over';updateUI();showOverlay('CROWN BROKEN',selected<2?'NEXT BOSS':'RUN COMPLETE','CONTINUE',()=>selected<2?startFight(selected+1):backToMenu()); }
function lose(){ state.over=true;state.phase='over';updateUI();showOverlay('SOUL SHATTERED','TRY AGAIN','RESTART',()=>initBoss(selected)); }
function showOverlay(title,sub,button,fn){ const o=$('gameOverlay');o.innerHTML=`<div class="overlay-title">${title}</div><div class="overlay-sub">${sub}</div><button class="overlay-btn">${button} <span>→</span></button>`;o.classList.remove('hidden');o.querySelector('button').onclick=()=>{o.classList.add('hidden');fn();}; }
function burst(x,y,color,n){ for(let i=0;i<n;i++)state.particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:20+Math.random()*20,color}); }

function step(dt){
  for(const a of state.hazards)a.life-=dt;
  state.hazards=state.hazards.filter(a=>a.life>0);
  if(state.phase==='boss'){
    state.patternTimer-=dt;
    for(const p of state.projectiles){
      p.life-=dt;
      const dx=state.soul.x-p.x,dy=state.soul.y-p.y,distance=Math.hypot(dx,dy)||1;
      p.x+=(dx/distance)*p.speed*dt;p.y+=(dy/distance)*p.speed*dt;
      if(distance<14){state.playerHp--;burst(state.soul.x,state.soul.y,'#ff6b55',8);p.life=0;updateUI();if(state.playerHp<=0)return lose();}
    }
    state.projectiles=state.projectiles.filter(p=>p.life>0);
    if(state.patternTimer<=0)resolveWave();
  }
  if(state.phase==='player'&&!state.over){state.cursor+=state.cursorDir*dt*.09;if(state.cursor>=100){state.cursor=100;state.cursorDir=-1;}if(state.cursor<=0){state.cursor=0;state.cursorDir=1;}}
  if(state.phase==='boss'&&!state.over){const k=state.keys,s=state.soul,spd=dt*.18;s.x+=(k.d||k.arrowright?spd:0)-(k.a||k.arrowleft?spd:0);s.y+=(k.s||k.arrowdown?spd:0)-(k.w||k.arrowup?spd:0);s.x=Math.max(35,Math.min(725,s.x));s.y=Math.max(40,Math.min(420,s.y));}
  if($('timingCursor'))$('timingCursor').style.left=`calc(${state.cursor}% - 1px)`;
}
function loop(t){ const dt=Math.min(40,t-lastTime||16);lastTime=t;step(dt);requestAnimationFrame(loop); }

function makeCards(){ const wrap=$('bossSelect');wrap.innerHTML=bosses.map((b,i)=>`<button class="boss-card" data-i="${i}"><div class="card-number">0${i+1}</div><div class="card-name">${b.name}</div><div class="boss-sprite">${b.avatar}</div><div class="card-meta">${b.desc} · ${b.difficulty}</div></button>`).join('');wrap.querySelectorAll('.boss-card').forEach(c=>c.onclick=()=>startFight(Number(c.dataset.i))); }
function backToMenu(){ $('fightScreen').classList.add('view-hidden');$('mainMenu').classList.remove('view-hidden');$('runStatus').textContent='MAIN MENU';$('gameOverlay').classList.add('hidden'); }

document.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){state.keys[key]=true;e.preventDefault();}if(e.code==='Space'){e.preventDefault();if(state.over)$('gameOverlay').querySelector('button')?.click();else strike();}if(key==='r'&&$('fightScreen')&&!$('fightScreen').classList.contains('view-hidden'))initBoss(selected);});
document.addEventListener('keyup',e=>{state.keys[e.key.toLowerCase()]=false;});
$('strikeBtn').onclick=strike;$('timingBar').onclick=strike;$('backToMenu').onclick=backToMenu;
makeCards();initBoss(0);draw();requestAnimationFrame(loop);
