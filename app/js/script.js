// ---------- Estado global & descoberta dinâmica de páginas ----------
let PAGES = [];
let idx = 0;
let currentColor = '#E0C2A2'; // swatch que substitui o preto
let erasing = false;
let svgEl = null;
let undoStack = [];
let redoStack = [];
let soundOn = true; // always on (toggle removed)
let audioCtx;

// ---------- Helpers DOM / UI ----------
const $  = (sel)=>document.querySelector(sel);
const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
function setLabel(){ const total = PAGES.length || '?'; const cur = Math.min(idx+1,total); $('#pageLabel').textContent = `${cur} / ${total}`; }
function clickSoft(){
  if(!soundOn) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type='sine'; o.frequency.value = 1250 + Math.random()*150;
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.035, now+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now+0.04);
    o.connect(g).connect(audioCtx.destination);
    o.start(); setTimeout(()=>o.stop(), 70);
  }catch(e){}
}

// ---------- Cores: normalizador (#fff, white, rgb(), etc.) ----------
function parseColor(c){
  if(!c) return null;
  c = (''+c).trim().toLowerCase();
  if(c==='none') return 'none';
  if(c==='black') return '#000000';
  if(c==='white') return '#ffffff';
  if(c[0]==='#'){
    if(c.length===4){ // #rgb
      const r=c[1], g=c[2], b=c[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    if(c.length===7){ return c; }
    if(c.length===9){ return '#'+c.slice(1,7); }
  }
  const m = c.match(/^rgba?\(([^)]+)\)$/);
  if(m){
    const parts = m[1].split(',').map(s=>parseFloat(s.trim()));
    const r = Math.round(parts[0]||0), g = Math.round(parts[1]||0), b = Math.round(parts[2]||0);
    const toHex = (n)=>('0'+Math.max(0,Math.min(255,n)).toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return c; // fallback
}
const isNone = (v)=> (v||'').toLowerCase()==='none';
const isBlack = (v)=> { const p = parseColor(v); return p==='#000000'; };
const isWhite = (v)=> { const p = parseColor(v); return p==='#ffffff'; };

// ---------- Descobrir páginas (HEAD -> fallback GET) ----------
async function probe(url){
  try{ const r = await fetch(url, {method:'HEAD', cache:'no-store'}); if(r.ok) return true; }catch(e){}
  try{ const r = await fetch(url, {method:'GET',  cache:'no-store'}); if(r.ok) return true; }catch(e){}
  return false;
}
async function discoverPages(maxProbe=500){
  const found = [];
  for(let i=1;i<=maxProbe;i++){
    const path = `assets/pages/${i}.svg`;
    const ok = await probe(path);
    if(!ok){ break; }
    found.push(path);
  }
  PAGES = found;
  setLabel();
  updateProgressUI();
}

// ---------- Utilitário: inlining de estilos computados no SVG ----------
function inlineComputedStyles(svgRoot){
  const importantProps = ['stroke','fill','stroke-width','stroke-linejoin','stroke-linecap','stroke-miterlimit','fill-rule','paint-order'];
  const walker = svgRoot.querySelectorAll('*');
  walker.forEach(el=>{
    const cs = getComputedStyle(el);
    importantProps.forEach(p=>{
      try{
        const v = cs.getPropertyValue(p);
        if(v && v.trim() && v !== 'none' && v !== 'rgba(0, 0, 0, 0)'){
          el.setAttribute(p, v.trim());
        }
      }catch(e){}
    });
    const tag = el.tagName && el.tagName.toLowerCase();
    if(tag && ['path','line','polyline','polygon','rect','circle','ellipse'].includes(tag)){
      const hasFill = el.hasAttribute('fill') && el.getAttribute('fill')!=='none';
      const stroke = el.getAttribute('stroke');
      if(stroke && !hasFill){
        el.setAttribute('fill','none');
      }
    }
  });
  return svgRoot;
}

function forceBlackStrokes(svgRoot){
  try{
    const nodes = svgRoot.querySelectorAll('*');
    nodes.forEach(function(el){
      try{
        if(!el.getAttribute) return;
        let s = el.getAttribute('stroke');
        if(s){
          const norm = (typeof parseColor==='function') ? parseColor(s) : String(s).trim().toLowerCase();
          if(norm==='#ffffff' || norm==='#fff' || norm==='white' || /rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/i.test(s)){
            el.setAttribute('stroke', '#000000');
          }
        }
      }catch(_){}
    });
  }catch(_){}
  return svgRoot;
}

function normalizeSvg(svg){
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  svg.setAttribute('version','1.1');
  let w = svg.getAttribute('width'), h = svg.getAttribute('height');
  let hasVB = !!svg.getAttribute('viewBox');
  if(!hasVB){
    const W = parseFloat(w)||2480, H = parseFloat(h)||3508;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }
  svg.removeAttribute('width'); svg.removeAttribute('height');
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.style.width = '100%'; svg.style.height = 'auto';
}

function ensurePaintableBackground(svg){
  if(svg.querySelector('[data-bg="1"]')) return;
  let vb = svg.getAttribute('viewBox');
  let W=2480, H=3508;
  if(vb){ const p = vb.trim().split(/\s+/).map(Number); if(p.length===4){ W=p[2]; H=p[3]; } }
  const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
  rect.setAttribute('x','0'); rect.setAttribute('y','0');
  rect.setAttribute('width', String(W)); rect.setAttribute('height', String(H));
  rect.setAttribute('fill','#FFFFFF');
  rect.setAttribute('stroke','#000000');
  rect.setAttribute('stroke-width','0.01');
  rect.setAttribute('stroke-opacity','0');
  rect.dataset.bg='1';
  rect.dataset.origFill   = '#FFFFFF';
  rect.dataset.origStroke = '#000000';
  svg.insertBefore(rect, svg.firstChild);
}

function snapshotAndFix(el){
  if(!el.getAttribute) return;
  const f = el.getAttribute('fill');
  const s = el.getAttribute('stroke');
  if(el.dataset.origFill===undefined && f!==null)   el.dataset.origFill   = f;
  if(el.dataset.origStroke===undefined && s!==null) el.dataset.origStroke = s;
  const fN = parseColor(f);
  const sN = s==null ? null : parseColor(s);
  if(isWhite(fN) && (sN===null || isNone(sN))){
    el.setAttribute('stroke', '#000000');
    if(el.dataset.origStroke===undefined) el.dataset.origStroke = '#000000';
  }
}

function isPaintable(el){
  const f0 = parseColor(el.dataset.origFill);
  const s0 = parseColor(el.dataset.origStroke);
  if(isWhite(f0) && isBlack(s0)) return true;
  if(isNone(f0)  && isBlack(s0)) return false;
  if(isBlack(f0) && isBlack(s0)) return false;
  const tag = el.tagName.toLowerCase();
  if((tag==='text' || tag==='tspan') && (isBlack(f0)||isBlack(s0))) return false;
  return false;
}

// ---------- Carregar página ----------
async function loadPage(newIdx){
  if(PAGES.length===0) return;
  if(newIdx<0) newIdx = 0;
  if(newIdx>=PAGES.length) newIdx = PAGES.length-1;
  idx = newIdx;
  setLabel();
  undoStack.length = 0; redoStack.length = 0;

  const mount = $('#svgMount');
  mount.innerHTML = '';
  let res;
  try{ res = await fetch(PAGES[idx], {cache:'no-store'}); }
  catch(e){ mount.textContent = 'Erro ao carregar SVG.'; return; }
  const svgText = await res.text();

  const wrap = document.createElement('div');
  wrap.innerHTML = svgText.trim();
  const svg = wrap.querySelector('svg');
  if(!svg){ mount.textContent = 'SVG inválido.'; return; }

  normalizeSvg(svg);
  svg.querySelectorAll('*').forEach(snapshotAndFix);
  ensurePaintableBackground(svg);
  svg.addEventListener('click', onSvgClick);

  mount.appendChild(svg);
  svgEl = svg;

  // ✅ restaura pintura salva
  restorePaintState(pageId(), svg);

  resetPageCounters();
  updateProgressUI();
  clickSoft();
}

// ---------- Pintura ----------
function onSvgClick(e){
  const el = e.target;
  if(!el || !el.getAttribute) return;
  if(!isPaintable(el)) return;
  clickSoft();
  const prev = el.getAttribute('fill');
  const next = erasing ? '#FFFFFF' : currentColor;
  if(prev===next) return;
  undoStack.push({el, prev, attr:'fill'});
  redoStack.length = 0;
  el.setAttribute('fill', next);

  // ✅ salva estado local da pintura
  savePaintState(pageId(), svgEl);

  try{ incClickIfChanged(prev, next); handleUniquePaint(el, prev, next); }catch(e){}
}

// ==========================================================
// === Salvamento local da pintura ===
const PAINT_STORAGE_KEY = 'pp_paints_v1';

function loadSavedPaints() {
  try { return JSON.parse(localStorage.getItem(PAINT_STORAGE_KEY) || '{}'); }
  catch(e){ return {}; }
}

function savePaintState(pageId, svgEl) {
  if (!svgEl) return;
  const paints = loadSavedPaints();
  const coloredElements = [];

  svgEl.querySelectorAll('*').forEach(el => {
    const fill = el.getAttribute('fill');
    const origFill = el.dataset.origFill;
    if (fill && fill !== origFill && fill !== '#FFFFFF' && fill.toLowerCase() !== 'white') {
      coloredElements.push({
        selector: el.getAttribute('id') || el.outerHTML.slice(0, 120),
        fill
      });
    }
  });

  if (coloredElements.length > 0) paints[pageId] = coloredElements;
  else delete paints[pageId];

  localStorage.setItem(PAINT_STORAGE_KEY, JSON.stringify(paints));
}

function restorePaintState(pageId, svgEl) {
  const paints = loadSavedPaints();
  const data = paints[pageId];
  if (!data || !svgEl) return;
  const allEls = svgEl.querySelectorAll('*');
  data.forEach(saved => {
    for (const el of allEls) {
      if (el.outerHTML.slice(0, 120) === saved.selector) {
        el.setAttribute('fill', saved.fill);
        break;
      }
    }
  });
}
