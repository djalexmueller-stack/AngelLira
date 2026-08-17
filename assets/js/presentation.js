
/* ============ stage scale-to-fit ============ */
(function(){
  const outer = document.getElementById('stageOuter');
  const stage = document.getElementById('stage');
  function fit(){
    const availW = window.innerWidth * 0.94;
    const availH = window.innerHeight * 0.88;
    const scale = Math.min(availW/1280, availH/720, 1.35);
    stage.style.transform = 'scale('+scale+')';
    outer.style.width = (1280*scale)+'px';
    outer.style.height = (720*scale)+'px';
  }
  fit();
  window.addEventListener('resize', fit);
})();

/* ============ ambient network background ============ */
(function(){
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1280; canvas.height = 720;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = 18;
  const pts = [];
  for (let i=0;i<N;i++){
    pts.push({ x:Math.random()*1280, y:Math.random()*720, vx:(Math.random()-.5)*.045, vy:(Math.random()-.5)*.045,
      accent: Math.random()<0.10, r: Math.random()<0.10 ? (1.35+Math.random()*.65) : (.65+Math.random()*.55) });
  }
  const LINK = 125;
  function step(){
    ctx.clearRect(0,0,1280,720);
    for (const p of pts){ p.x+=p.vx; p.y+=p.vy; if(p.x<-20)p.x=1300; if(p.x>1300)p.x=-20; if(p.y<-20)p.y=740; if(p.y>740)p.y=-20; }
    for (let i=0;i<N;i++){ for (let j=i+1;j<N;j++){
      const a=pts[i], b=pts[j]; const dx=a.x-b.x, dy=a.y-b.y; const d=Math.sqrt(dx*dx+dy*dy);
      if (d<LINK){ const o=(1-d/LINK)*0.075; ctx.strokeStyle='rgba(200,180,120,'+o.toFixed(3)+')'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
    }}
    for (const p of pts){ ctx.beginPath(); ctx.fillStyle = p.accent ? 'rgba(240,185,58,0.34)' : 'rgba(170,170,178,0.17)'; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }
    requestAnimationFrame(step);
  }
  step();
  if (reduceMotion){ for (const p of pts){ p.vx=0; p.vy=0; } }
})();

/* ============ slide navigation ============ */
// Momento 02 removido da apresentação conforme solicitação.
document.getElementById('s2')?.remove();
const slides = Array.from(document.querySelectorAll('.slide'));
const total = slides.length;
let current = 0;
let presentationMode = 'auto';
try {
  const savedMode = sessionStorage.getItem('iris-presentation-mode');
  if (savedMode === 'auto' || savedMode === 'manual') presentationMode = savedMode;
} catch (_) {}
window.presentationMode = presentationMode;
const dotsWrap = document.getElementById('dots');
slides.forEach((_,i)=>{ const d=document.createElement('div'); d.className='dot'+(i===0?' active':''); d.onclick=()=>showSlide(i); dotsWrap.appendChild(d); });
const dots = Array.from(dotsWrap.children);
const counter = document.getElementById('counter');
counter.textContent = '01 / ' + String(total).padStart(2,'0');

function setPresentationMode(mode){
  if(mode !== 'auto' && mode !== 'manual') return;
  presentationMode = mode;
  window.presentationMode = mode;
  try { sessionStorage.setItem('iris-presentation-mode', mode); } catch (_) {}
  document.querySelectorAll('#presentationMode .mode-option').forEach(button=>{
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
document.querySelectorAll('#presentationMode .mode-option').forEach(button=>{
  button.addEventListener('click', event=>{
    event.preventDefault();
    event.stopPropagation();
    setPresentationMode(button.dataset.mode);
  });
});
setPresentationMode(presentationMode);

function showSlide(idx){
  idx = Math.max(0, Math.min(total-1, idx));
  if (idx === current) return;
  if (current === 0 && typeof stopIrisOpening === 'function') stopIrisOpening();
  // interrompe o vídeo do Momento 1 ao sair da tela
  if (slides[current].id === 's1') controlMoment1Video(false);
  controlSupplementalMomentVideos(slides[current], false);
  controlPersonaVideos(slides[current], false);
  controlMoment4OrbitVideos(slides[current], false);
  slides[current].classList.remove('active');
  current = idx;
  slides[current].classList.add('active');
  dots.forEach((d,i)=>d.classList.toggle('active', i===current));
  counter.textContent = String(current+1).padStart(2,'0') + ' / ' + total;
  if (typeof syncSidebarActive === 'function') syncSidebarActive();

  // ao entrar no Momento 1, inicia o vídeo imediatamente
  if (slides[current].id === 's1') controlMoment1Video(true);
  controlSupplementalMomentVideos(slides[current], true);
  controlPersonaVideos(slides[current], true);
  controlMoment4OrbitVideos(slides[current], true);
  runSlideSequence(slides[current]);
}

/* ============ barra lateral de navegação por momentos ============ */
let syncSidebarActive = null;
(function(){
  const sidebar = document.getElementById('momentSidebar');
  const toggle = document.getElementById('sidebarToggle');
  const rail = document.getElementById('sidebarRail');
  const scrim = document.getElementById('sidebarScrim');
  const panelList = document.getElementById('sidebarPanelList');
  if (!sidebar || !toggle || !rail || !scrim || !panelList) return;

  function labelFor(slide, index){
    const eyebrow = slide.querySelector(':scope > .eyebrow');
    if (eyebrow && eyebrow.textContent.trim()) return eyebrow.textContent.trim();
    if (slide.id === 's0') return 'Abertura · Prazer, eu sou a IRIS';
    if (slide.classList.contains('close-slide')) return 'Encerramento';
    return 'Momento ' + String(index + 1).padStart(2, '0');
  }

  const railDots = [];
  const panelItems = [];
  slides.forEach((slide, i) => {
    const label = labelFor(slide, i);

    const railDot = document.createElement('div');
    railDot.className = 'sidebar-rail-dot';
    railDot.setAttribute('role', 'button');
    railDot.setAttribute('tabindex', '0');
    railDot.setAttribute('aria-label', label);
    const tip = document.createElement('span');
    tip.className = 'rail-tip';
    tip.textContent = label;
    railDot.appendChild(tip);
    railDot.addEventListener('click', () => { showSlide(i); closePanel(); });
    railDot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSlide(i); closePanel(); } });
    rail.appendChild(railDot);
    railDots.push(railDot);

    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    const num = document.createElement('span');
    num.className = 'sidebar-item-num';
    num.textContent = String(i + 1).padStart(2, '0');
    const lbl = document.createElement('span');
    lbl.className = 'sidebar-item-label';
    lbl.textContent = label;
    item.appendChild(num);
    item.appendChild(lbl);
    item.addEventListener('click', () => { showSlide(i); closePanel(); });
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSlide(i); closePanel(); } });
    panelList.appendChild(item);
    panelItems.push(item);
  });

  function syncActive(){
    railDots.forEach((d, i) => d.classList.toggle('active', i === current));
    panelItems.forEach((it, i) => it.classList.toggle('active', i === current));
    const activeItem = panelItems[current];
    if (activeItem && sidebar.classList.contains('expanded')) activeItem.scrollIntoView({ block: 'nearest' });
  }
  syncSidebarActive = syncActive;
  syncActive();

  function openPanel(){ sidebar.classList.add('expanded'); toggle.setAttribute('aria-expanded', 'true'); }
  function closePanel(){ sidebar.classList.remove('expanded'); toggle.setAttribute('aria-expanded', 'false'); }
  function togglePanel(){ sidebar.classList.contains('expanded') ? closePanel() : openPanel(); }

  toggle.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
  scrim.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
})();

/* Vídeos que substituem os avatares estáticos sem alterar seu footprint. */
function controlPersonaVideos(slide, active){
  if(!slide) return;
  const videos=Array.from(slide.querySelectorAll('[data-iris-persona-video]'));
  videos.forEach(video=>{
    video._personaPlayToken=(video._personaPlayToken||0)+1;
    const token=video._personaPlayToken;
    try{video.pause();}catch(_){ }
    try{if(video.readyState>=1) video.currentTime=0;}catch(_){ }
    video.classList.remove('is-ready');
    video.onended=null;
    if(!active) return;

    video.muted=false;
    video.volume=1;
    video.onended=()=>{
      if(video._personaPlayToken===token) video.pause();
    };
    const play=()=>{
      if(video._personaPlayToken!==token || !slide.classList.contains('active')) return;
      let promise;
      try{promise=video.play();}catch(_){promise=null;}
      if(promise&&typeof promise.then==='function'){
        promise.then(()=>{
          if(video._personaPlayToken===token && slide.classList.contains('active')) video.classList.add('is-ready');
        }).catch(()=>{
          // O navegador pode bloquear áudio ao entrar no slide; mantém o
          // vídeo visível e tenta continuar em modo silencioso.
          if(slide.id==='s3'){
            video.muted=true;
            video.play().then(()=>video.classList.add('is-ready')).catch(()=>video.classList.add('is-ready'));
          }else video.classList.remove('is-ready');
        });
      }else if(!video.paused){
        video.classList.add('is-ready');
      }
    };
    if(video.readyState>=2) play();
    else{
      video.addEventListener('canplay',play,{once:true});
      try{video.load();}catch(_){ }
    }
  });
}

/* ============ vídeo circular do Momento 04 ============ */
function controlMoment4OrbitVideos(slide, active){
  if(!slide || slide.id !== 's4') return;
  const core=slide.querySelector('[data-iris-orbit-video]');
  if(!core) return;
  const sideHost=slide.querySelector('[data-iris-orbit-side-video]');
  const videos=Array.from((sideHost||core).querySelectorAll('.iris-orbit-video'));
  const ambientVideos=Array.from(slide.querySelectorAll('.m4-video-ambient'));
  if(!videos.length) return;

  core._playToken=(core._playToken||0)+1;
  const token=core._playToken;
  const reset=()=>{
    videos.forEach((video,index)=>{
      try{video.pause();}catch(_){ }
      try{if(video.readyState>=1)video.currentTime=0;}catch(_){ }
      video.classList.toggle('active',index===0);
      video.onended=null;
    });
    ambientVideos.forEach((video,index)=>{
      try{video.pause();}catch(_){ }
      try{if(video.readyState>=1)video.currentTime=0;}catch(_){ }
      video.classList.toggle('active',index===0);
    });
  };

  if(!active){
    reset();
    return;
  }

  reset();
  const playAt=(index)=>{
    if(core._playToken!==token || !slide.classList.contains('active')) return;
    const video=videos[index];
    if(!video) return;
    videos.forEach((item,i)=>item.classList.toggle('active',i===index));
    ambientVideos.forEach((item,i)=>{
      const isCurrent=i===index;
      item.classList.toggle('active',isCurrent);
      if(!isCurrent){
        try{item.pause();}catch(_){ }
      }
    });
    video.muted=false;
    video.volume=1;
    const ambient=ambientVideos[index];
    if(ambient){
      ambient.muted=true;
      try{ambient.currentTime=video.currentTime||0;}catch(_){ }
      try{const ambientPlay=ambient.play();if(ambientPlay&&ambientPlay.catch)ambientPlay.catch(()=>{});}catch(_){ }
    }
    // Avança uma única vez pela sequência. No último vídeo,
    // mantém o quadro final em vez de reiniciar o primeiro.
    video.onended=()=>{
      const nextIndex=index+1;
      if(nextIndex<videos.length) playAt(nextIndex);
    };
    let promise;
    try{promise=video.play();}catch(_){promise=null;}
    if(promise&&typeof promise.catch==='function')promise.catch(()=>{});
  };

  const first=videos[0];
  if(first.readyState>=2) playAt(0);
  else{
    first.addEventListener('canplay',()=>playAt(0),{once:true});
    try{first.load();}catch(_){ }
  }
}
/* ============ vídeos adicionais por momento ============ */
function controlSupplementalMomentVideos(slide, active){
  if(!slide) return;
  const layer=slide.querySelector('[data-moment-video-layer]');
  if(!layer) return;
  const videos=Array.from(layer.querySelectorAll('.moment-video'));
  const button=layer.querySelector('.moment-video-start');
  if(!videos.length) return;

  layer._playToken=(layer._playToken||0)+1;
  const token=layer._playToken;
  const hideButton=()=>{ if(button) button.classList.remove('show'); };
  const showButton=()=>{
    if(button && layer._playToken===token && slide.classList.contains('active')) button.classList.add('show');
  };
  const reset=()=>{
    layer.style.transition='none';
    layer.classList.remove('is-leaving');
    void layer.offsetWidth;
    layer.style.transition='';
    videos.forEach((video,index)=>{
      try{video.pause();}catch(_){ }
      try{if(video.readyState>=1)video.currentTime=0;}catch(_){ }
      video.classList.toggle('active',index===0);
      video.onended=null;
      video.ontimeupdate=null;
    });
  };

  if(!active){
    hideButton();
    reset();
    layer.classList.remove('is-finished');
    return;
  }

  layer.classList.remove('is-finished');
  reset();

  const playAt=(index)=>{
    if(layer._playToken!==token || !slide.classList.contains('active')) return;
    if(index>=videos.length){
      hideButton();
      layer.classList.add('is-finished');
      return;
    }
    videos.forEach((video,i)=>video.classList.toggle('active',i===index));
    const video=videos[index];
    video.muted=false;
    video.volume=1;
    const leaveAt=Number(video.dataset.leaveAt);
    if(Number.isFinite(leaveAt)){
      video.ontimeupdate=()=>{
        if(layer._playToken===token && video.currentTime>=leaveAt) layer.classList.add('is-leaving');
      };
    }
    video.onended=()=>playAt(index+1);
    hideButton();
    let promise;
    try{promise=video.play();}catch(_){promise=null;}
    if(promise&&typeof promise.catch==='function')promise.catch(showButton);
  };

  if(button){
    button.onclick=(event)=>{
      event.preventDefault();
      event.stopPropagation();
      playAt(0);
    };
  }

  const first=videos[0];
  if(first.readyState>=2) playAt(0);
  else{
    first.addEventListener('canplay',()=>playAt(0),{once:true});
    try{first.load();}catch(_){showButton();}
    setTimeout(()=>{
      if(layer._playToken===token && first.paused && slide.classList.contains('active')) showButton();
    },900);
  }
}

function enhanceConversationAvatars(){
  const avatarImg = document.querySelector('.chat-avatar img') || document.querySelector('.m9-figwrap img');
  if(!avatarImg) return;
  const avatarSrc = avatarImg.getAttribute('src');
  const avatarAlt = avatarImg.getAttribute('alt') || 'IRIS';

  function wrapBubble(selector, side){
    document.querySelectorAll(selector).forEach(bubble=>{
      if(!bubble || bubble.closest('.msg-row')) return;
      const row = document.createElement('div');
      row.className = 'msg-row ' + side;

      const avatar = document.createElement('span');
      avatar.className = 'msg-avatar' + (side==='right' ? ' client-avatar' : '');
      if(side==='right'){
        avatar.setAttribute('aria-label','Cliente / gestor');
        avatar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.3"></circle><path d="M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6"></path></svg>';
      }else{
        const img = document.createElement('img');
        img.src = avatarSrc;
        img.alt = avatarAlt;
        avatar.appendChild(img);
      }

      bubble.parentNode.insertBefore(row, bubble);
      row.appendChild(avatar);
      row.appendChild(bubble);
    });
  }

  wrapBubble('.abubble', 'left');
  wrapBubble('.qbubble', 'right');
  wrapBubble('#s8 .m8-msg.a', 'left');
  wrapBubble('#s8 .m8-msg.u', 'right');
  wrapBubble('#s7 .action-q', 'right');
  wrapBubble('#s7 .iris-action-response', 'left');
  wrapBubble('#s7 .action-confirm-user', 'right');
  wrapBubble('#s7 .iris-action-final', 'left');
}

function setupIrisSpeakingSideVideos(){
  const configs=[
    {slideId:'s3', selector:'.persona-circle-m3 [data-iris-persona-video]', side:'right'},
    {slideId:'s11', selector:'.persona-circle-m11 [data-iris-persona-video]', side:'left'}
  ];
  configs.forEach(config=>{
    const slide=document.getElementById(config.slideId);
    if(!slide || slide.querySelector('.iris-video-stage[data-iris-side="'+config.slideId+'"]')) return;
    const videos=Array.from(slide.querySelectorAll(config.selector));
    if(!videos.length) return;
    const wrap=document.createElement('div');
    wrap.className='iris-video-stage side-'+config.side;
    wrap.dataset.irisSide=config.slideId;
    if(config.orbit) wrap.setAttribute('data-iris-orbit-side-video','');
    videos.forEach(video=>wrap.appendChild(video));
    slide.appendChild(wrap);
  });
}
setupIrisSpeakingSideVideos();
enhanceConversationAvatars();

/* Avança sozinho, sem pausa, pela sequência inicial de apresentação da
   IRIS (Apresentação -> Conhecimento operacional -> Orquestração ->
   Demonstração), assim que o vídeo de cada slide termina. Cada slide
   continua totalmente independente (próprio layout/CSS/navegação) — só
   adiciona o encadeamento por cima, sem mexer em nada existente. */
(function setupAutoAdvanceChain(){
  function chain(slideId, getVideo){
    const slide = document.getElementById(slideId);
    if(!slide) return;
    let wiredVideo = null;
    const tryWire = () => {
      const v = getVideo();
      if(!v || v === wiredVideo) return;
      wiredVideo = v;
      v.addEventListener('ended', () => {
        if(presentationMode === 'auto' && slides[current] === slide){
          showSlide(current + 1);
        }
      });
    };
    tryWire();
    // O vídeo do s3 só existe no lugar certo depois que
    // setupIrisSpeakingSideVideos() termina de movê-lo; tenta de novo
    // num próximo tick para garantir que já foi encontrado.
    setTimeout(tryWire, 0);
  }
  chain('s1', () => document.getElementById('m1IntroVideo'));
  chain('s3', () => document.getElementById('s3')?.querySelector('[data-iris-persona-video]'));
  chain('s4', () => {
    const vids = Array.from(document.getElementById('s4')?.querySelectorAll('.iris-orbit-video') || []);
    return vids[vids.length - 1];
  });
})();

initConversationScroll();
// A sequência inicial é disparada uma única vez ao final do script, depois
// que todas as funções e manipuladores já foram configurados.
function go(dir){ showSlide(current+dir); }

document.addEventListener('keydown', (e)=>{
  if (['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){ e.preventDefault(); go(1); }
  else if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){ e.preventDefault(); go(-1); }
  else if (e.key==='Home') showSlide(0);
  else if (e.key==='End') showSlide(total-1);
});
let touchX=null;
document.addEventListener('touchstart', e=>touchX=e.touches[0].clientX);
document.addEventListener('touchend', e=>{
  if (touchX===null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx)>50) go(dx<0?1:-1);
  touchX=null;
});

/* ============ generic typewriter ============ */
let typingGeneration = 0;
function autoScrollWithin(el){
  if(!el) return;
  const scroller = el.closest('.chat-body, .actionpanel, .m8-pane');
  if(scroller){ scroller.scrollTop = scroller.scrollHeight; }
}
function typeInto(span, speed){
  const myGeneration = typingGeneration;
  return new Promise(resolve=>{
    const full = span.dataset.full || '';
    span.textContent = '';
    autoScrollWithin(span);
    let i = 0;
    (function step(){
      /* Cancela imediatamente uma digitação antiga ao trocar/reabrir a tela. */
      if (myGeneration !== typingGeneration){ resolve(); return; }
      if (i>=full.length){ autoScrollWithin(span); resolve(); return; }
      span.textContent += full[i];
      autoScrollWithin(span);
      i++;
      let d = speed;
      if (/[,.!?;:]/.test(full[i-1])) d += 70;
      if (full[i-1]===' ') d = Math.max(10, speed-8);
      setTimeout(step, d);
    })();
  });
}

/* ============ per-slide sequences ============ */
const seqTimers = [];
function clearSeq(){
  typingGeneration++;
  seqTimers.forEach(clearTimeout);
  seqTimers.length = 0;
}
function after(ms, fn){ const id=setTimeout(fn, ms); seqTimers.push(id); return id; }
function initConversationScroll(){
  const selectors = ['#s5 .chat-body','#s6 .chat-body','#s7 .actionpanel','#s8 .m8-pane'];
  document.querySelectorAll(selectors.join(',')).forEach(el=>{
    if(el.dataset.scrollInit==='1') return;
    el.dataset.scrollInit='1';
    el.tabIndex = 0;
    el.addEventListener('wheel', e=>{
      e.preventDefault();
      e.stopPropagation();
      el.scrollTop += e.deltaY;
    }, { passive:false });
    el.addEventListener('touchmove', e=>{ e.stopPropagation(); }, { passive:true });
    el.addEventListener('pointerdown', ()=>{ try{ el.focus({preventScroll:true}); }catch(_){ el.focus(); } });
    el.addEventListener('mouseenter', ()=>{ try{ el.focus({preventScroll:true}); }catch(_){ el.focus(); } });
    el.addEventListener('keydown', e=>{
      if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)){
        e.stopPropagation();
      }
    });
  });
}

let irisOpeningGeneration = 0;
function irisOpeningEls(){
  return {
    slide:document.getElementById('s0'),
    v1:document.getElementById('irisIntroVideo1'),
    v2:document.getElementById('irisIntroVideo2'),
    v3:document.getElementById('irisIntroVideo3'),
    line:document.getElementById('ol1'),
    acro:document.getElementById('acronymLine'),
    tag:document.getElementById('otag'),
    skip:document.getElementById('oskip'),
    start:document.getElementById('irisOpeningStart'),
    error:document.getElementById('irisOpeningError')
  };
}
function startIrisPresentation(ev){
  if(ev){
    try{ev.preventDefault();ev.stopPropagation();}catch(_){ }
  }
  const v1=document.getElementById('irisIntroVideo1');
  const v2=document.getElementById('irisIntroVideo2');
  const v3=document.getElementById('irisIntroVideo3');
  const btn=document.getElementById('irisOpeningStart');
  const err=document.getElementById('irisOpeningError');
  const line=document.getElementById('ol1');
  if(!v1){
    if(err){err.textContent='Vídeo inicial não encontrado no HTML.';err.classList.add('show');}
    return false;
  }
  if(btn)btn.classList.remove('show');
  if(err){err.classList.remove('show');err.textContent='';}
  try{
    v1.pause();
    if(v1.readyState>=1)v1.currentTime=0;
    v1.muted=false;
    v1.volume=1;
    v1.classList.add('active');
    if(v2){
      v2.pause();
      if(v2.readyState>=1)v2.currentTime=0;
      v2.muted=false;
      v2.volume=1;
      v2.classList.remove('active');
    }
    if(v3){
      v3.pause();
      if(v3.readyState>=1)v3.currentTime=0;
      v3.muted=false;
      v3.volume=1;
      v3.classList.remove('active');
    }
  }catch(_){ }
  const actuallyPlay=()=>{
    let pr;
    try{pr=v1.play();}catch(e){pr=Promise.reject(e);}
    if(pr&&typeof pr.then==='function'){
      pr.then(()=>{
        if(line){
          line.classList.remove('show');
          line.innerHTML='';
          clearTimeout(window.__irisHelloTimer);
          // capa_video1_editado.mp4 agora corta para o vídeo 2 em ~2.4s (fala
          // começa por volta de 0.3s), então a legenda precisa aparecer bem
          // antes dos antigos 4000ms, ou surge por cima do vídeo errado.
          // v1 agora fala a partir de ~2.24s (caminhada acelerada + chegada).
          window.__irisHelloTimer=setTimeout(()=>{
            if(document.getElementById('s0')?.classList.contains('active')){
              line.innerHTML='Olá, eu sou a <span class="goldword">IRIS</span>.';
              line.classList.add('show');
            }
          },2600);
        }
      }).catch(e=>{
        if(btn){btn.textContent='? Tentar novamente';btn.classList.add('show');}
        if(err){err.textContent='O navegador bloqueou a reprodução. Clique novamente para iniciar.';err.classList.add('show');}
      });
    }
  };
  // Executa play() ainda dentro do clique. A Promise do vídeo aguarda os
  // dados sem perder a autorização de áudio concedida pelo navegador.
  actuallyPlay();
  return false;
}

function stopIrisOpening(){
  irisOpeningGeneration++;
  const {v1,v2,v3,start,error}=irisOpeningEls();
  [v1,v2,v3].forEach(v=>{if(!v)return;v.pause();v.muted=false;});
  if(start){start.textContent='? Iniciar apresentação';start.classList.add('show');}
  if(error)error.classList.remove('show');
}

function controlMoment1Video(active){
  const v=document.getElementById('m1IntroVideo');
  const btn=document.getElementById('m1VideoStart');
  if(!v) return;

  v._m1PlayToken=(v._m1PlayToken||0)+1;
  const token=v._m1PlayToken;

  const hideBtn=()=>{ if(btn) btn.classList.remove('show'); };
  const showBtn=()=>{ if(btn && v._m1PlayToken===token && slides[current] && slides[current].id==='s1') btn.classList.add('show'); };
  const playNow=()=>{
    if(v._m1PlayToken!==token || !slides[current] || slides[current].id!=='s1') return;
    hideBtn();
    v.muted=false;
    try{ if(v.readyState>=1) v.currentTime=0; }catch(e){}
    let p;
    try{ p=v.play(); }catch(e){ p=null; }
    if(p && typeof p.catch==='function') p.catch(showBtn);
  };

  if(!active){
    hideBtn();
    try{ v.pause(); }catch(e){}
    try{ if(v.readyState>=1) v.currentTime=0; }catch(e){}
    return;
  }

  if(btn){
    btn.onclick=(ev)=>{
      ev.preventDefault();ev.stopPropagation();
      v._m1PlayToken=(v._m1PlayToken||0)+1;
      const clickToken=v._m1PlayToken;
      btn.classList.remove('show');
      v.muted=false;
      try{if(v.readyState>=1)v.currentTime=0;}catch(e){}
      const p=v.play();
      if(p&&typeof p.catch==='function')p.catch(()=>{if(v._m1PlayToken===clickToken)btn.classList.add('show');});
    };
  }

  // Entrada no Momento 1 ocorre a partir de uma ação do usuário (seta, clique ou teclado),
  // então tentamos a reprodução com áudio no mesmo fluxo de navegação.
  if(v.readyState>=2) playNow();
  else{
    const once=()=>playNow();
    v.addEventListener('canplay',once,{once:true});
    try{v.load();}catch(e){showBtn();}
    // Se o navegador não liberar canplay rapidamente, oferece fallback discreto.
    setTimeout(()=>{ if(v._m1PlayToken===token && v.paused) showBtn(); },900);
  }
}
function waitForActualVideoPlayback(video, opts={}){
  const minAdvance=opts.minAdvance??0.035;
  const timeoutMs=opts.timeoutMs??1800;
  return new Promise(resolve=>{
    const startTime=video.currentTime||0;
    let playing=!video.paused, frameRendered=false, done=false, rafId=0, frameId=0, timer=0;
    const cleanup=()=>{
      video.removeEventListener('playing',onPlaying);
      if(rafId)cancelAnimationFrame(rafId);
      if(frameId && video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frameId);
      clearTimeout(timer);
    };
    const finish=(ok)=>{if(done)return;done=true;cleanup();resolve(ok);};
    const check=()=>{
      if(video.currentTime-startTime>=minAdvance)frameRendered=true;
      if(playing&&frameRendered)finish(true);
      else if(!done)rafId=requestAnimationFrame(check);
    };
    const onPlaying=()=>{playing=true;check();};
    video.addEventListener('playing',onPlaying);
    if(video.requestVideoFrameCallback){
      const onFrame=()=>{
        if(video.currentTime-startTime>=minAdvance)frameRendered=true;
        if(playing&&frameRendered)finish(true);
        else if(!done)frameId=video.requestVideoFrameCallback(onFrame);
      };
      frameId=video.requestVideoFrameCallback(onFrame);
    }
    timer=setTimeout(()=>finish(false),timeoutMs);
    check();
  });
}

function runS0(){
  const gen=++irisOpeningGeneration;
  const {slide,v1,v2,v3,line,acro,tag,skip,start,error}=irisOpeningEls();
  if(!slide||!v1||!v2||!v3)return;
  const stillHere=()=>current===0 && gen===irisOpeningGeneration;
  let secondStarted=false, thirdStarted=false, finalStarted=false, brandShown=false, textTimer=null, monitorFrame=null;
  // Vídeos 1/2/3 agora usam as versões *_editado.mp4 (passos e "IRIS,"/"Eu"
  // iniciais removidos por corte real de arquivo). Os tempos abaixo foram
  // recalculados por análise de áudio (RMS) sobre os arquivos já cortados —
  // não são mais os mesmos números do vídeo original.
  // v1: a caminhada continua visível, só foi acelerada (1.6x) e teve o
  // áudio de passos silenciado; a fala em si não foi tocada.
  const coverTiming={
    v1:{start:0.02,speechStart:2.24,speechEnd:4.08,cut:4.23},
    // O vídeo 2 permanece limpo até ~3.05 s; o corte ocorre em 3.09 s
    // (aprox. um frame após o fim da fala e antes de qualquer sobra visual).
    v2:{start:0.02,speechStart:0.08,speechEnd:3.05,cut:3.09},
    v3:{start:0.02},
    crossfadeMs:140,
    brandDelay:380,
    finalMessageDelay:180
  };

  // Estado inicial limpo.
  if(line){line.classList.remove('show','m3-cover-line');line.innerHTML='';}
  if(acro)acro.classList.remove('show','expanded');
  if(tag)tag.classList.remove('show');
  if(skip)skip.classList.remove('show');
  if(start)start.classList.remove('show');
  if(error){error.classList.remove('show');error.textContent='';}
  [v1,v2,v3].forEach((v,i)=>{
    v.pause();
    try{v.currentTime=i===0?coverTiming.v1.start:(i===1?coverTiming.v2.start:coverTiming.v3.start);}catch(e){}
    v.muted=false;
    v.classList.toggle('active',i===0);
    v.classList.remove('is-finished','handoff-out','video-ready');
  });

  function stopMonitor(){
    if(monitorFrame!==null){cancelAnimationFrame(monitorFrame);monitorFrame=null;}
  }
  function monitorCuts(){
    if(!stillHere()){stopMonitor();return;}
    if(!secondStarted&&!v1.paused&&v1.currentTime>=coverTiming.v1.cut)startSecond();
    if(secondStarted&&!thirdStarted&&!v2.paused&&v2.currentTime>=coverTiming.v2.cut)startThird();
    monitorFrame=requestAnimationFrame(monitorCuts);
  }
  function ensureMonitor(){
    if(monitorFrame===null)monitorFrame=requestAnimationFrame(monitorCuts);
  }
  function scheduleHello(){
    clearTimeout(textTimer);
    // Mesmo ajuste do outro fluxo (clique manual): vídeo 1 encurtado exige
    // a legenda antes dos antigos 4000ms (fala começa em ~2.24s agora).
    textTimer=setTimeout(()=>{
      if(!stillHere()||!line)return;
      line.innerHTML='Olá, eu sou a <span class="goldword">IRIS</span>.';
      line.classList.add('show');
    },2600);
  }
  function showBrand(){
    if(brandShown||thirdStarted||!stillHere())return;
    brandShown=true;
    if(line)line.classList.remove('show');
    if(acro){
      acro.classList.add('show');
      setTimeout(()=>{if(stillHere())acro.classList.add('expanded');},780);
    }
  }
  async function startSecond(){
    if(secondStarted||!stillHere())return;
    secondStarted=true;
    if(line)line.classList.remove('show');
    v1.classList.add('handoff-out');
    v1.classList.remove('active');
    // Ativa o próximo vídeo imediatamente para não revelar o fundo entre cenas.
    v2.classList.add('active');
    v2.muted=false;
    try{v2.currentTime=coverTiming.v2.start;}catch(e){}
    try{await v2.play();}
    catch(e){
      v2.muted=true;
      try{v2.currentTime=coverTiming.v2.start;}catch(e){}
      try{await v2.play();}
      catch(_){
        if(start){start.textContent='? Continuar apresentação';start.classList.add('show');}
        return;
      }
    }
    setTimeout(()=>{try{v1.pause();}catch(e){}},coverTiming.crossfadeMs);
    await new Promise(resolve=>setTimeout(resolve,coverTiming.crossfadeMs));
    if(!stillHere())return;
    setTimeout(()=>{if(stillHere())showBrand();},coverTiming.brandDelay);
    ensureMonitor();
  }
  async function startThird(){
    if(thirdStarted||!stillHere())return;
    thirdStarted=true;
    // O branding nunca pode aparecer sozinho entre o vídeo 2 e o vídeo 3.
    if(acro)acro.classList.remove('show','expanded');
    if(line){line.classList.remove('show');line.innerHTML='';}
    if(tag)tag.classList.remove('show');
    // Mantém o vídeo 2 visível até o vídeo 3 estar realmente pronto.
    try{v2.pause();v2.currentTime=coverTiming.v2.cut;}catch(e){}
    // Preparação fora do estado active: evita que :has() altere o background da capa.
    v3.classList.remove('active','video-ready');
    v3.muted=false;
    v3.volume=1;
    try{v3.currentTime=coverTiming.v3.start;}catch(e){}
    let playbackReady=false;
    try{await v3.play();playbackReady=await waitForActualVideoPlayback(v3);}
    catch(e){playbackReady=false;}
    if(!playbackReady){
      if(start){start.textContent='? Continuar apresentação';start.classList.add('show');}
      return;
    }
    // A troca visual só acontece após o frame real estar reproduzindo.
    v3.classList.add('active','video-ready');
    if(line){
      line.innerHTML='Sou a sua<br><span class="goldword">assessora operacional</span><br>de inteligência artificial.';
      line.classList.add('m3-cover-line');
      line.classList.add('show');
    }
    // Só agora inicia a saída do vídeo 2: sem intervalo, frame congelado ou fundo exposto.
    v2.classList.add('handoff-out');
    v2.classList.remove('active');
    setTimeout(()=>{try{v2.pause();}catch(e){}},coverTiming.crossfadeMs);
    await new Promise(resolve=>setTimeout(resolve,coverTiming.crossfadeMs));
    if(!stillHere())return;
  }
  function finishOpeningVideo(){
    if(finalStarted||!stillHere())return;
    finalStarted=true;
    v3.classList.add('is-finished');
    setTimeout(()=>{try{v3.pause();}catch(e){}},coverTiming.crossfadeMs);
    setTimeout(()=>{
      if(!stillHere())return;
      if(acro)acro.classList.remove('show','expanded');
      if(line){line.classList.remove('show','m3-cover-line');line.innerHTML='';}
      if(tag)tag.classList.add('show');
      if(skip)skip.classList.add('show');
      // A abertura é uma sequência contínua: após a mensagem final, entra no
      // primeiro momento sem exigir outro clique.
      setTimeout(()=>{
        if(stillHere() && presentationMode === 'auto') showSlide(1);
      },2200);
    },coverTiming.finalMessageDelay);
  }
  async function startFirst(){
    if(!stillHere())return false;
    if(start)start.classList.remove('show');
    if(error)error.classList.remove('show');
    try{v1.currentTime=coverTiming.v1.start;v2.currentTime=coverTiming.v2.start;v3.currentTime=coverTiming.v3.start;}catch(e){}
    v1.classList.remove('handoff-out');v1.classList.add('active');
    v2.classList.remove('active');v2.classList.remove('is-finished','handoff-out');
    v3.classList.remove('active');v3.classList.remove('is-finished','handoff-out');
    v1.muted=false;
    scheduleHello();
    try{await v1.play();ensureMonitor();}
    catch(e){
      clearTimeout(textTimer);
      stopMonitor();
      if(start){start.textContent='? Iniciar apresentação';start.classList.add('show');}
    }
    return false;
  }

  v1.ontimeupdate=()=>{
    if(presentationMode==='auto'&&stillHere()&&!secondStarted&&v1.currentTime>=coverTiming.v1.cut)startSecond();
  };
  v1.onended=()=>{if(presentationMode==='auto'&&stillHere())startSecond();};
  v1.onerror=()=>{
    if(!stillHere())return;
    if(error){error.textContent='Não foi possível carregar o primeiro vídeo incorporado à apresentação.';error.classList.add('show');}
    if(start){start.textContent='? Iniciar apresentação';start.classList.add('show');}
  };
  v2.ontimeupdate=()=>{
    if(presentationMode!=='auto')return;
    if(stillHere()&&!brandShown&&v2.currentTime>=coverTiming.v2.speechStart+.35)showBrand();
    if(stillHere()&&!thirdStarted&&v2.currentTime>=coverTiming.v2.cut)startThird();
  };
  v2.onended=()=>{if(presentationMode==='auto'&&stillHere())startThird();};
  v3.onended=()=>{if(presentationMode==='auto'&&stillHere())finishOpeningVideo();};
  if(start){
    start.onclick=(ev)=>{
      if(ev){ev.preventDefault();ev.stopPropagation();}
      if(secondStarted&&!thirdStarted&&v2.paused&&!finalStarted){
        v2.muted=false;v2.volume=1;
        v2.play().then(()=>{start.classList.remove('show');ensureMonitor();}).catch(()=>start.classList.add('show'));
        return false;
      }
      if(thirdStarted&&v3.paused&&!finalStarted){
        v3.muted=false;v3.volume=1;
        v3.play().then(()=>start.classList.remove('show')).catch(()=>start.classList.add('show'));
        return false;
      }
      return startFirst();
    };
  }
  // Navegadores bloqueiam de forma inconsistente autoplay com áudio.
  // A capa já abre carregada e o único clique em “Iniciar apresentação” libera o áudio
  // e dispara toda a sequência sem navegar para a página 2.
  try{v1.load();}catch(e){}
  try{v2.load();}catch(e){}
  try{v3.load();}catch(e){}
  if(start){start.textContent='? Iniciar apresentação';start.classList.add('show');}
}

function runS2(){
  const nodes = document.querySelectorAll('#m2flow .flow-node');
  const fill = document.getElementById('m2fill');
  nodes.forEach(n=>n.classList.remove('lit'));
  fill.style.width = '0';
  nodes.forEach(n=>{
    const t = parseInt(n.dataset.t,10);
    after(t, ()=>{ n.classList.add('lit'); });
  });
  after(200, ()=>{ fill.style.width = '100%'; });
}

function runS3(){
  const badges = document.querySelectorAll('#s3 .databadge');
  badges.forEach((b,i)=>{ b.style.animation='none'; void b.offsetWidth; b.style.animationDelay=(i*80)+'ms'; b.style.animation='badgein .6s ease forwards'; });
  const messageLines = document.querySelectorAll('#s3 .m3-message-line');
  messageLines.forEach(line=>line.classList.remove('show'));
  [1450,1800,3500,5200].forEach((delay,i)=>after(delay,()=>messageLines[i]?.classList.add('show')));
}

let orbitBuilt = false;
function buildOrbit(){
  if (orbitBuilt) return;
  orbitBuilt = true;
  const orbit = document.getElementById('orbit');
  const R = 210;
  const items = [
    { icon:'ai-openai', label:'OpenAI', angle:-90, vb:'0 0 16 16' },
    { icon:'ai-gemini', label:'Gemini', angle:-18, vb:'0 0 24 24' },
    { icon:'ai-claude', label:'Claude', angle:54, vb:'0 0 24 24', cls:'claude' },
    { icon:'ai-copilot', label:'Copilot', angle:126, vb:'0 0 24 24' },
    { icon:'ai-meta', label:'Meta AI', angle:198, vb:'0 0 16 16' }
  ];
  items.forEach((it, i)=>{
    const rad = it.angle * Math.PI/180;
    const x = 280 + R*Math.cos(rad);
    const y = 280 + R*Math.sin(rad);
    const link = document.createElement('div');
    link.className = 'orbit-link';
    const dx = x-280, dy = y-280;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const ang = Math.atan2(dy,dx) * 180/Math.PI;
    const coreRadius = 59;
    const nodeRadius = 44;
    const gap = 4;
    const startX = 280 + (coreRadius + gap) * Math.cos(rad);
    const startY = 280 + (coreRadius + gap) * Math.sin(rad);
    const linkLength = Math.max(0, dist - coreRadius - nodeRadius - (gap * 2));
    link.style.left = startX + 'px';
    link.style.top = startY + 'px';
    link.style.width = linkLength + 'px';
    link.style.transform = 'rotate('+ang+'deg)';
    link.dataset.idx = i;
    orbit.appendChild(link);
    const node = document.createElement('div');
    node.className = 'orbit-node' + (it.cls ? ' ' + it.cls : '');
    node.style.left = x+'px';
    node.style.top = y+'px';
    node.dataset.idx = i;
    node.innerHTML = '<svg viewBox="'+it.vb+'"><use href="#'+it.icon+'"></use></svg><div class="onl">'+it.label+'</div>';
    orbit.appendChild(node);
  });
}
function runS4(){
  buildOrbit();
  const nodes = document.querySelectorAll('#orbit .orbit-node');
  const links = document.querySelectorAll('#orbit .orbit-link');
  nodes.forEach(n=>n.classList.remove('active'));
  links.forEach(l=>l.classList.remove('active'));
  let i = 0;
  function pulse(){
    nodes.forEach(n=>n.classList.remove('active'));
    links.forEach(l=>l.classList.remove('active'));
    const idx = i % nodes.length;
    nodes[idx].classList.add('active');
    links[idx].classList.add('active');
    i++;
    after(1400, pulse);
  }
  after(500, pulse);
}

async function runS5(){
  const body = document.getElementById('s5body');
  body.scrollTop = 0;
  const q = body.querySelector('.qbubble .typewriter');
  const a = body.querySelector('.abubble .typewriter');
  const qRow = q.closest('.msg-row');
  const aRow = a.closest('.msg-row');
  const result = document.getElementById('s5result');
  [qRow,aRow].forEach(r=>{ if(r){ r.classList.remove('chat-seq-visible'); r.classList.add('chat-seq-hidden'); } });
  result.classList.remove('show');
  q.textContent=''; a.textContent='';
  await new Promise(r=>after(400,r));
  if(qRow){ qRow.classList.remove('chat-seq-hidden'); qRow.classList.add('chat-seq-visible'); }
  await typeInto(q, 26);
  await new Promise(r=>after(650,r));
  if(aRow){ aRow.classList.remove('chat-seq-hidden'); aRow.classList.add('chat-seq-visible'); }
  await new Promise(r=>after(180,r));
  await typeInto(a, 20);
  after(300, ()=>{ result.classList.add('show'); autoScrollWithin(result); });
}

async function runS6(){
  const chips = document.querySelectorAll('#s6sources .src-chip');
  chips.forEach(c=>c.classList.remove('lit'));
  const body = document.getElementById('s6body');
  const q = body.querySelector('.qbubble .typewriter');
  const a = body.querySelector('.abubble .typewriter');
  const qRow = q.closest('.msg-row');
  const aRow = a.closest('.msg-row');
  const result = document.getElementById('s6result');
  [qRow,aRow].forEach(r=>{ if(r){ r.classList.remove('chat-seq-visible'); r.classList.add('chat-seq-hidden'); } });
  result.classList.remove('show');
  q.textContent=''; a.textContent='';
  await new Promise(r=>after(300,r));
  if(qRow){ qRow.classList.remove('chat-seq-hidden'); qRow.classList.add('chat-seq-visible'); }
  await typeInto(q, 22);
  chips.forEach((c,i)=>{ after(300+i*260, ()=>c.classList.add('lit')); });
  await new Promise(r=>after(1500,r));
  if(aRow){ aRow.classList.remove('chat-seq-hidden'); aRow.classList.add('chat-seq-visible'); }
  await new Promise(r=>after(180,r));
  await typeInto(a, 20);
  after(300, ()=>{ result.classList.add('show'); autoScrollWithin(result); });
}

async function runS7(){
  const panel=document.querySelector('#s7 .actionpanel');
  if(panel) panel.scrollTop=0;
  const steps=[...document.querySelectorAll('#s7pipe .pstep')];
  const q=document.getElementById('s7q');
  const result=document.getElementById('s7result');
  const confirm=document.getElementById('s7confirm');
  const final=document.getElementById('s7final');
  const qRow=q ? q.closest('.msg-row') : null;
  const resultRow=result ? result.closest('.msg-row') : null;
  const confirmRow=confirm ? confirm.closest('.msg-row') : null;
  const finalRow=final ? final.closest('.msg-row') : null;
  const qText=q?.querySelector('.typewriter');
  const answerText=result?.querySelector('.iar-head .typewriter');
  const askText=result?.querySelector('.action-confirm-ask .typewriter');
  const confirmText=confirm?.querySelector('.typewriter');
  const finalText=final?.querySelector('.iaf-head .typewriter');
  const vehiclesWrap=document.getElementById('s7vehicles');
  const vehicles=[...document.querySelectorAll('#s7 .vehicle-item')];
  const finalItems=[...document.querySelectorAll('#s7 .iaf-item')];

  steps.forEach(s=>s.classList.remove('active'));
  [qRow,resultRow,confirmRow,finalRow].forEach(r=>{
    if(r){r.classList.remove('chat-seq-visible');r.classList.add('chat-seq-hidden');}
  });
  [result,confirm,final].forEach(el=>el && el.classList.remove('show'));
  [qText,answerText,askText,confirmText,finalText].forEach(t=>{if(t)t.textContent='';});
  if(vehiclesWrap) vehiclesWrap.classList.remove('detail-label-show');
  [...vehicles,...finalItems].forEach(el=>el.classList.remove('reveal-show'));

  // A operação começa a ganhar presença quando a IRIS inicia sua saída do vídeo.
  await new Promise(r=>after(6150,r));

  // 1. Cliente faz a solicitação
  await new Promise(r=>after(350,r));
  if(qRow){qRow.classList.remove('chat-seq-hidden');qRow.classList.add('chat-seq-visible');}
  if(qText) await typeInto(qText,24);

  // O fluxo superior reage à solicitação enquanto a IRIS processa
  steps.forEach((s,i)=>after(100+i*330,()=>s.classList.add('active')));
  await new Promise(r=>after(700,r));

  // 2. Avatar + balão da IRIS aparecem juntos; depois ela responde
  if(resultRow){resultRow.classList.remove('chat-seq-hidden');resultRow.classList.add('chat-seq-visible');}
  if(result){result.classList.add('show');autoScrollWithin(result);}
  await new Promise(r=>after(160,r));
  if(answerText) await typeInto(answerText,18);

  // 3. Detalhamento surge dentro da mesma resposta da IRIS
  if(vehiclesWrap) vehiclesWrap.classList.add('detail-label-show');
  for(const item of vehicles){
    await new Promise(r=>after(180,r));
    item.classList.add('reveal-show');
    autoScrollWithin(item);
  }
  await new Promise(r=>after(280,r));
  if(askText) await typeInto(askText,18);

  // 4. Cliente confirma somente depois da pergunta da IRIS terminar
  await new Promise(r=>after(500,r));
  if(confirmRow){confirmRow.classList.remove('chat-seq-hidden');confirmRow.classList.add('chat-seq-visible');}
  if(confirm){confirm.classList.add('show');autoScrollWithin(confirm);}
  if(confirmText) await typeInto(confirmText,24);

  // 5. Resposta final da IRIS entra depois da confirmação
  await new Promise(r=>after(500,r));
  if(finalRow){finalRow.classList.remove('chat-seq-hidden');finalRow.classList.add('chat-seq-visible');}
  if(final){final.classList.add('show');autoScrollWithin(final);}
  await new Promise(r=>after(150,r));
  if(finalText) await typeInto(finalText,18);
  for(const item of finalItems){
    await new Promise(r=>after(220,r));
    item.classList.add('reveal-show');
    autoScrollWithin(item);
  }
}


async function runS8(){
  document.querySelectorAll('#s8 .m8-pane').forEach(p=>p.scrollTop=0);
  const msgs=[...document.querySelectorAll('#s8 .m8-typed')];
  const items=[...document.querySelectorAll('#s8 .m8-found-item')];
  const foundList=document.querySelector('#s8 .m8-found-list');
  const rows=msgs.map(m=>m.closest('.msg-row'));
  msgs.forEach(m=>{ m.classList.remove('show'); const t=m.querySelector('.typewriter'); if(t) t.textContent=''; });
  rows.forEach(r=>{ if(r){ r.classList.remove('chat-seq-visible'); r.classList.add('chat-seq-hidden'); } });
  items.forEach(i=>i.classList.remove('show'));
  if(foundList){ foundList.classList.remove('conversation-show'); foundList.classList.remove('detail-label-show'); }

  // Sistema AngelLira: pergunta primeiro; IRIS só entra depois da pergunta terminar
  if(msgs[0]){
    if(rows[0]){ rows[0].classList.remove('chat-seq-hidden'); rows[0].classList.add('chat-seq-visible'); }
    msgs[0].classList.add('show');
    await typeInto(msgs[0].querySelector('.typewriter'),22);
  }
  await new Promise(r=>after(420,r));
  if(msgs[1]){
    if(rows[1]){ rows[1].classList.remove('chat-seq-hidden'); rows[1].classList.add('chat-seq-visible'); }
    msgs[1].classList.add('show');
    await new Promise(r=>after(160,r));
    await typeInto(msgs[1].querySelector('.typewriter'),18);
  }
  if(foundList){
    foundList.classList.add('conversation-show');
    foundList.classList.add('detail-label-show');
    autoScrollWithin(foundList);
  }
  items.forEach((item,i)=>after(180+i*260,()=>{ item.classList.add('show'); autoScrollWithin(item); }));

  // WhatsApp: mesma lógica — usuário pergunta, depois avatar + balão da IRIS aparecem juntos
  await new Promise(r=>after(1600,r));
  if(msgs[2]){
    if(rows[2]){ rows[2].classList.remove('chat-seq-hidden'); rows[2].classList.add('chat-seq-visible'); }
    msgs[2].classList.add('show');
    await typeInto(msgs[2].querySelector('.typewriter'),20);
  }
  await new Promise(r=>after(420,r));
  if(msgs[3]){
    if(rows[3]){ rows[3].classList.remove('chat-seq-hidden'); rows[3].classList.add('chat-seq-visible'); }
    msgs[3].classList.add('show');
    await new Promise(r=>after(160,r));
    await typeInto(msgs[3].querySelector('.typewriter'),18);
  }
}

function runS11(){
  const qs = document.querySelectorAll('#execqs .exec-q');
  qs.forEach(q=>q.classList.remove('hi'));
  let i=0;
  function cyc(){
    qs.forEach(q=>q.classList.remove('hi'));
    qs[i%qs.length].classList.add('hi');
    i++;
    after(1900, cyc);
  }
  cyc();
}

function runS12(){
  const l1 = document.getElementById('cl1');
  const cf = document.getElementById('cfinal');
  const sig = document.getElementById('csig');
  const fig = document.getElementById('closeFigure');
  const line1 = document.getElementById('cfline1');
  const line2 = document.getElementById('cfline2');
  const divider = document.getElementById('cfdivider');
  [l1,cf,sig].forEach(e=>e.classList.remove('show'));
  if(fig) fig.classList.remove('hide-for-logo');
  [line1,line2].forEach(el=>{ el.classList.remove('focus','locked'); el.classList.add('hidden'); });
  divider.classList.remove('show');
  void cf.offsetWidth;
  after(420, ()=>l1.classList.add('show'));
  after(2550, ()=>l1.classList.remove('show'));
  after(3200, ()=>{ cf.classList.add('show'); line1.classList.remove('hidden'); line1.classList.add('focus'); });
  after(4650, ()=>{ line1.classList.remove('focus'); line1.classList.add('locked'); divider.classList.add('show'); });
  after(5350, ()=>{ line2.classList.remove('hidden'); line2.classList.add('focus'); });
  after(6850, ()=>{ line2.classList.remove('focus'); line2.classList.add('locked'); });
  after(7900, ()=>{ sig.classList.add('show'); });
}

function runSlideSequence(slide){
  clearSeq();
  const id = slide.id;
  if (id==='s0') runS0();
  else if (id==='s2') runS2();
  else if (id==='s3') runS3();
  else if (id==='s4') runS4();
  else if (id==='s5') runS5();
  else if (id==='s6') runS6();
  else if (id==='s7') runS7();
  else if (id==='s8') runS8();
  else if (id==='s11') runS11();
  else if (id==='s12') runS12();
}
(function(){
  const m = location.search.match(/[?&]slide=(\d+)/);
  const s = m ? parseInt(m[1],10) : NaN;
  if (s && s>=1 && s<=total){
    slides[0].classList.remove('active');
    current = s-1;
    slides[current].classList.add('active');
    dots.forEach((d,i)=>d.classList.toggle('active', i===current));
    counter.textContent = String(current+1).padStart(2,'0') + ' / ' + total;
    if (typeof syncSidebarActive === 'function') syncSidebarActive();
  }
})();
initConversationScroll();
if(slides[current].id==='s1') controlMoment1Video(true);
controlSupplementalMomentVideos(slides[current], true);
controlPersonaVideos(slides[current], true);
controlMoment4OrbitVideos(slides[current], true);
runSlideSequence(slides[current]);


/* ---- next inline script ---- */


/* ============ premium interaction layer ============ */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  const reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bridge=document.querySelector('.m8-bridge');
  if(bridge && !bridge.querySelector('.energy')){ const e=document.createElement('span'); e.className='energy'; bridge.appendChild(e); }
  /* pointer parallax intentionally disabled for executive version */
})();
