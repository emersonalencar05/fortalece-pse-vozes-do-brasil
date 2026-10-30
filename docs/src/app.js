import { UFS, REGIOES } from './map-data.js';
import { CONFIG } from './config.js';

const $ = id => document.getElementById(id);
const home = $('home'), profile = $('profile'), dialog = $('state-dialog');
const flag = $('profile-state-mascot'), avatar = $('participant-avatar');
const stateColors = {
  AC:'#11672b', AL:'#ecb921', AM:'#225ca7', AP:'#df2e32', BA:'#145f2e', CE:'#2763ad', DF:'#e4bb29',
  ES:'#e63936', GO:'#2763ad', MA:'#f2c326', MG:'#12652f', MS:'#f1c42c', MT:'#d73631', PA:'#147338',
  PB:'#de3734', PE:'#2672b6', PI:'#12672b', PR:'#e1b82a', RJ:'#215ea5', RN:'#0d6b30', RO:'#f0c329',
  RR:'#df3732', RS:'#2869ad', SC:'#176835', SE:'#e4ba27', SP:'#dc3830', TO:'#225eaa'
};

let source = 'loading';
let allProfiles = [];
let currentUF = null;
let currentIndex = 0;
let lastFocus = null;
let lastInteraction = Date.now();
let refreshPending = false;
const photoCache = new Map();
// O modo de demonstração só existe em localhost: nunca mostra perfis fictícios no GitHub Pages.
const DEMO_FORCED = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('demo') === '1';
const prettyLocation = p => p.cidade && p.cidade !== 'Município não informado' ? `${p.cidade}/${p.uf}` : (UFS[p.uf]?.nome ?? p.uf);
const sortedForUF = uf => allProfiles.filter(p=>p.uf === uf).sort((a,b)=>(a.ordem??999)-(b.ordem??999)||a.nome.localeCompare(b.nome,'pt-BR'));

function previewProfiles(){
  return Object.values(UFS).flatMap(u => [
    {id:`preview-${u.uf}-1`,uf:u.uf,nome:'[NOME]',cidade:'[cidade]',mensagem:'[MENSAGEM]',foto:'',ordem:1,demonstracao:true},
    ...(u.uf==='MG'? [{id:'preview-MG-2',uf:u.uf,nome:'[OUTRO PARTICIPANTE]',cidade:'[cidade]',mensagem:'Esta é uma segunda tela ilustrativa para testar as setas e a navegação entre participantes do mesmo estado.',foto:'',ordem:2,demonstracao:true}]:[])
  ]);
}
function setSource(mode){
  source=mode;
  $('local-badge').hidden=mode!=='demo';
  const errorMode=mode==='error';
  $('connection-warning').hidden=!errorMode;
  $('data-status').textContent=mode==='demo'?'Dados ilustrativos — prévia local':mode==='live'?'Dados aprovados atualizados':errorMode?'Não foi possível conectar à base de perfis':'Carregando…';
  document.querySelectorAll('.uf-choice').forEach(b=>{
    const n=sortedForUF(b.dataset.uf).length;
    const counter=b.querySelector('.uf-count');
    if(counter)counter.textContent=mode==='demo'?'Prévia':`${n} ${n===1?'perfil':'perfis'}`;
  });
}
function renderMap(){
  const ns='http://www.w3.org/2000/svg';
  const group=$('map-states');
  for(const [i, uf] of Object.keys(UFS).entries()){
    const data=UFS[uf];const path=document.createElementNS(ns,'path');
    path.setAttribute('d',data.d);path.setAttribute('fill',stateColors[uf]);path.setAttribute('class','map-state');
    path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',`${data.nome}, ${uf}. Abrir perfis.`);
    path.dataset.uf=uf;
    path.style.setProperty('--stagger', `${Math.min(i*17,280)}ms`);
    path.addEventListener('pointerenter',e=>showTooltip(e,uf));
    path.addEventListener('pointermove',e=>showTooltip(e,uf));
    path.addEventListener('pointerleave',()=>{$('map-tooltip').hidden=true;});
    path.addEventListener('focus',()=>{$('map-tooltip').hidden=true;});
    path.addEventListener('click',()=>openUF(uf));
    path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openUF(uf);}});
    group.appendChild(path);
  }
}
function showTooltip(e,uf){
  if(e.pointerType==='touch')return;
  const box=$('brazil-map').getBoundingClientRect();const tooltip=$('map-tooltip');
  tooltip.hidden=false;tooltip.textContent=UFS[uf].nome;
  const x=Math.min(Math.max(e.clientX-box.left,50),box.width-50),y=Math.max(e.clientY-box.top,20);
  tooltip.style.left=`${x}px`;tooltip.style.top=`${y}px`;
}
function renderRegions(){
  const root=$('region-list');
  for(const [region,ufs] of Object.entries(REGIOES)){
    const section=document.createElement('section');section.className='region';
    const h=document.createElement('h3');h.textContent=region;section.append(h);
    const grid=document.createElement('div');grid.className='uf-grid';
    for(const uf of ufs){const b=document.createElement('button');b.className='uf-choice';b.type='button';b.dataset.uf=uf;
      const name=document.createElement('strong'),count=document.createElement('span');
      name.textContent=`${uf} · ${UFS[uf].nome}`;count.className='uf-count';count.textContent='Carregando…';
      b.append(name,count);b.addEventListener('click',()=>openUF(uf));grid.append(b);
    }
    section.append(grid);root.append(section);
  }
}
function openDialog(){lastFocus=document.activeElement;dialog.hidden=false;document.body.classList.add('dialog-open');$('close-selector').focus();}
function closeDialog(){dialog.hidden=true;document.body.classList.remove('dialog-open');if(lastFocus?.isConnected)lastFocus.focus();}
function navigateToProfile(uf,index=0){
  const profiles=sortedForUF(uf);
  currentUF=uf;
  currentIndex=Math.min(Math.max(0,index),Math.max(0,profiles.length-1));
  home.hidden=true;profile.hidden=false;
  document.querySelectorAll('.map-state').forEach(e=>e.classList.toggle('is-active',e.dataset.uf===uf));
  renderProfile();
  window.scrollTo({top:0,behavior:'instant'});
  profile.classList.remove('screen-enter');void profile.offsetWidth;profile.classList.add('screen-enter');
  const params=new URLSearchParams(location.search);params.set('uf',uf);params.delete('perfil');
  history.replaceState(null,'',location.pathname+'?'+params.toString());
}
function openUF(uf){
  if(!UFS[uf])return;
  if(!dialog.hidden)closeDialog();
  $('map-tooltip').hidden=true;
  navigateToProfile(uf,0);
}
function backToMap(){
  currentUF=null;currentIndex=0;home.hidden=false;profile.hidden=true;
  document.querySelectorAll('.map-state').forEach(e=>e.classList.remove('is-active'));
  const params=new URLSearchParams(location.search);params.delete('uf');params.delete('perfil');
  history.replaceState(null,'',location.pathname+(params.size?'?'+params.toString():''));
  window.scrollTo({top:0,behavior:'instant'});
}
function imageURL(url){
  if(!url||typeof url!=='string')return null;
  try{const parsed=new URL(url,location.href);return ['https:','http:'].includes(parsed.protocol)?parsed.href:null;}
  catch{return null;}
}
function clearAvatar(){const img=avatar.querySelector('img');if(img)img.remove();}
function appendPortrait(p,url){
  const src=imageURL(url);if(!src)return;clearAvatar();
  const img=document.createElement('img');img.alt=`Foto de ${p.nome}`;img.loading='eager';img.referrerPolicy='no-referrer';
  img.onerror=()=>img.remove();img.src=src;avatar.append(img);
}
function renderProfile(){
  if(!currentUF)return;
  const list=sortedForUF(currentUF);
  const p=list[currentIndex];
  const hasProfile=Boolean(p);
  $('profile-name').textContent=hasProfile?p.nome:'Nenhum perfil publicado';
  $('profile-location').textContent=hasProfile?prettyLocation(p):UFS[currentUF].nome;
  const message=hasProfile?p.mensagem:`Ainda não há depoimentos publicados de ${UFS[currentUF].nome}. Volte ao mapa para explorar outro território.`;
  const messageEl=$('profile-message');messageEl.textContent=message;messageEl.scrollTop=0;
  messageEl.classList.toggle('is-long',message.length>290);
  messageEl.classList.toggle('is-very-long',message.length>650);
  const path=`./assets/${currentUF}.webp`;
  flag.src=path;flag.alt=`Zé Gotinha segurando a bandeira de ${UFS[currentUF].nome}`;
  clearAvatar();
  if(p?.foto_path){
    const cacheKey=p.foto_path;
    const cached=photoCache.get(cacheKey);
    if(cached?.expires>Date.now())appendPortrait(p,cached.url);
    else signedPhotoPath(cacheKey).then(url=>{
      if(!url)return;photoCache.set(cacheKey,{url,expires:Date.now()+12*60*1000});
      if(currentUF===p.uf && sortedForUF(currentUF)[currentIndex]?.id===p.id)appendPortrait(p,url);
    }).catch(()=>{});
  } else if(p?.foto)appendPortrait(p,p.foto);
  $('profile-counter').textContent=list.length?`${currentIndex+1} / ${list.length}`:'Sem depoimentos';
  $('profile-prev').disabled=list.length<2;
  $('profile-next').disabled=list.length<2;
  $('quote-scroll-hint').hidden=true;
  requestAnimationFrame(()=>{$('quote-scroll-hint').hidden=messageEl.scrollHeight<=messageEl.clientHeight+8;});
}
function swapProfile(direction){
  const list=sortedForUF(currentUF);if(list.length<2)return;
  currentIndex=(currentIndex+direction+list.length)%list.length;
  const card=$('profile');card.classList.remove('profile-swap');void card.offsetWidth;card.classList.add('profile-swap');
  renderProfile();
}
function authHeaders(){
  // Chaves sb_publishable_* NÃO são JWTs: enviá-las como Bearer causaria "Invalid JWT".
  const headers={'apikey':CONFIG.publishableKey,'Content-Type':'application/json'};
  if(!CONFIG.publishableKey.startsWith('sb_publishable_'))headers.Authorization=`Bearer ${CONFIG.publishableKey}`;
  return headers;
}
async function signedPhotoPath(path){
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(`${CONFIG.supabaseUrl}/storage/v1/object/sign/pse-fotos/${encoded}`,{method:'POST',headers:authHeaders(),body:JSON.stringify({expiresIn:900})});
  if(!response.ok)return '';
  const obj=await response.json();const signed=obj.signedURL||obj.signedUrl||'';
  return signed?(signed.startsWith('https://')?signed:CONFIG.supabaseUrl+(signed.startsWith('/storage/v1/')?signed:'/storage/v1/'+signed.replace(/^\/+/,''))):'';
}
async function fetchApprovedProfiles(){
  const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),5500);
  try{
    const r=await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/listar_publicos`,{method:'POST',headers:authHeaders(),body:'{}',signal:abort.signal});
    if(!r.ok)throw new Error(`Supabase HTTP ${r.status}`);
    const records=await r.json();if(!Array.isArray(records))throw new Error('Formato inesperado de dados.');
    const sanitized=records.filter(v=>UFS[String(v.uf||'').trim().toUpperCase()]).map(v=>({
      id:String(v.id??''),uf:String(v.uf).trim().toUpperCase(),
      nome:String(v.nome||'Participante'),cidade:String(v.cidade||''),
      mensagem:String(v.mensagem||''),foto:'',foto_path:typeof v.foto_path==='string'?v.foto_path:'',
      ordem:Number.isFinite(Number(v.ordem))?Number(v.ordem):999
    }));
    return sanitized;
  }finally{clearTimeout(timeout)}
}
async function updateData(){
  if(refreshPending)return;refreshPending=true;
  try{
    if(DEMO_FORCED){allProfiles=previewProfiles();setSource('demo');return;}
    if(!CONFIG.supabaseUrl.startsWith('https://') || !CONFIG.publishableKey)throw new Error('Configuração pública de banco ausente.');
    const approved=await fetchApprovedProfiles();
    allProfiles=approved;
    if(currentUF){const count=sortedForUF(currentUF).length;currentIndex=Math.max(0,Math.min(currentIndex,count-1));}
    setSource('live');
  }catch(error){
    // Em produção não exibir perfis fictícios, mesmo sem internet. Se já há dados
    // reais carregados, mantê-los na memória até que a rede volte.
    if(source!=='demo')setSource('error');
    console.warn('[Mostra PSE] Não foi possível consultar os perfis publicados:',error.message);
  }finally{refreshPending=false;if(currentUF)renderProfile();}
}
function installActions(){
  $('retry-connection').addEventListener('click',updateData);
  $('open-selector').addEventListener('click',openDialog);
  $('close-selector').addEventListener('click',closeDialog);
  dialog.addEventListener('pointerdown',e=>{if(e.target===dialog)closeDialog();});
  $('back-home').addEventListener('click',backToMap);
  $('profile-prev').addEventListener('click',()=>swapProfile(-1));
  $('profile-next').addEventListener('click',()=>swapProfile(1));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!dialog.hidden)closeDialog();
    else if(e.key==='Escape'&&!profile.hidden)backToMap();
    else if(!profile.hidden&&e.key==='ArrowRight')swapProfile(1);
    else if(!profile.hidden&&e.key==='ArrowLeft')swapProfile(-1);
  });
  let touchX=0;
  profile.addEventListener('touchstart',e=>{touchX=e.touches[0]?.clientX||0},{passive:true});
  profile.addEventListener('touchend',e=>{
    const d=(e.changedTouches[0]?.clientX||0)-touchX;
    if(Math.abs(d)>85 && !e.target.closest('.quote-content'))swapProfile(d<0?1:-1);
  },{passive:true});
  for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,()=>lastInteraction=Date.now(),{passive:true});
  // Em totens sem uso, retorna ao mapa (sem interromper uma leitura em andamento).
  setInterval(()=>{if(Date.now()-lastInteraction>CONFIG.kioskIdleMs){if(!dialog.hidden)closeDialog();if(!profile.hidden)backToMap();lastInteraction=Date.now();}},5000);
  setInterval(updateData,CONFIG.refreshMs);
}
renderMap();renderRegions();installActions();
updateData();
const directUF=new URLSearchParams(location.search).get('uf')?.toUpperCase();if(directUF&&UFS[directUF])navigateToProfile(directUF);
