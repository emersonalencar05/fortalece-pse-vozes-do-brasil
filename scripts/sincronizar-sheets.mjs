// Sincronização SEGURA: executada pelo GitHub Actions com segredos protegidos.
// Não publicar dados pessoais nas mensagens de log.
import crypto from 'node:crypto';

const SHEET_ID='1V5tK25QgGnO62p-sUiEs4I6vvSY1dzuDGbrSbcwIFiI';
const SHEET_NAME='Respostas ao formulário 1';
const BUCKET='pse-fotos';
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_KEY=process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY||!GOOGLE_KEY)throw new Error('Configure os três segredos no GitHub Actions.');
const serviceAccount=JSON.parse(GOOGLE_KEY);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const UF_NAMES={
 'acre':'AC','alagoas':'AL','amapa':'AP','amazonas':'AM','bahia':'BA','ceara':'CE',
 'distrito federal':'DF','espirito santo':'ES','goias':'GO','maranhao':'MA','mato grosso':'MT',
 'mato grosso do sul':'MS','minas gerais':'MG','para':'PA','paraiba':'PB','parana':'PR',
 'pernambuco':'PE','piaui':'PI','rio de janeiro':'RJ','rio grande do norte':'RN',
 'rio grande do sul':'RS','rondonia':'RO','roraima':'RR','santa catarina':'SC',
 'sao paulo':'SP','sergipe':'SE','tocantins':'TO'};
const UF_LIST=new Set(Object.values(UF_NAMES));
const CITIES={'rio de janeiro':'RJ','brasilia':'DF','goiania':'GO','rio branco':'AC','natal':'RN','florianopolis':'SC','joao pessoa':'PB','feira de santana':'BA'};
function cidadeUF(raw){
 const original=String(raw||'').trim().replace(/\s+/g,' ');
 if(!original)return null;
 const normalized=norm(original);
 if(UF_LIST.has(original.toUpperCase()))return {cidade:'Município não informado',uf:original.toUpperCase(),aviso:true};
 if(UF_NAMES[normalized])return {cidade:'Município não informado',uf:UF_NAMES[normalized],aviso:true};
 const parts=original.split(/\s*\/\s*|\s+[-–—]\s+|\s*,\s*/).filter(Boolean);
 if(parts.length>1){const suf=norm(parts.at(-1)),uf=UF_LIST.has(parts.at(-1).toUpperCase())?parts.at(-1).toUpperCase():UF_NAMES[suf];
  if(uf)return {cidade:parts.slice(0,-1).join(', ').trim()||'Município não informado',uf,aviso:false};}
 const states=Object.keys(UF_NAMES).sort((a,b)=>b.length-a.length);
 for(const state of states){if(normalized.endsWith(' '+state)){const uf=UF_NAMES[state],city=original.slice(0,original.length-state.length).replace(/[\s\-–,]+$/,'').trim();return {cidade:city||'Município não informado',uf,aviso:!city};}}
 if(CITIES[normalized])return {cidade:original,uf:CITIES[normalized],aviso:false};
 return null; // Dado ambíguo: nunca escolher UF arbitrariamente.
}

function jwtGoogle(){
 const now=Math.floor(Date.now()/1000);const payload={iss:serviceAccount.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
 const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const sigInput=b64({alg:'RS256',typ:'JWT'})+'.'+b64(payload);
 const sig=crypto.sign('RSA-SHA256',Buffer.from(sigInput),serviceAccount.private_key).toString('base64url');return sigInput+'.'+sig;
}
async function googleToken(){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwtGoogle()})});if(!r.ok)throw new Error('Credencial da conta de serviço rejeitada pelo Google ('+r.status+')');return (await r.json()).access_token;}
function serviceHeaders(extra={}){return {'apikey':SUPABASE_SERVICE_ROLE_KEY,'Authorization':'Bearer '+SUPABASE_SERVICE_ROLE_KEY,...extra};}
async function supa(url,method='GET',payload){const r=await fetch(SUPABASE_URL+url,{method,headers:serviceHeaders({'Content-Type':'application/json',Prefer:'return=representation'}),body:payload===undefined?undefined:JSON.stringify(payload)});if(!r.ok)throw new Error('Supabase '+method+' falhou ('+r.status+'): '+(await r.text()).slice(0,250));if(r.status===204)return [];return await r.json();}
async function photoFor(id,accessToken,sourceKey){
 if(!id)return null;
 const hdr={Authorization:'Bearer '+accessToken};
 const metaResponse=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=mimeType,size`,{headers:hdr});
 if(!metaResponse.ok){console.warn('Foto sem permissão ou indisponível: Drive respondeu '+metaResponse.status);return null;}
 const meta=await metaResponse.json();const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 if(!map[meta.mimeType]||Number(meta.size)>10*1024*1024){console.warn('Foto ignorada: formato ou tamanho não permitido.');return null;}
 const r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:hdr});
 if(!r.ok){console.warn('Não foi possível ler uma foto do Drive ('+r.status+').');return null;}
 const data=Buffer.from(await r.arrayBuffer());if(data.length>10*1024*1024)return null;
 const path=`sheets/${hash(sourceKey).slice(0,30)}.${map[meta.mimeType]}`;
 const u=SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+path;
 const upload=await fetch(u,{method:'POST',headers:serviceHeaders({'Content-Type':meta.mimeType,'x-upsert':'true'}),body:data});
 if(!upload.ok)throw new Error('Não foi possível armazenar foto no Supabase ('+upload.status+').');return path;
}
async function run(){
 const accessToken=await googleToken();
 const range=`'${SHEET_NAME.replaceAll("'","''")}'!A2:F5000`;
 const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,{headers:{Authorization:'Bearer '+accessToken}});
 if(!r.ok)throw new Error('Erro na leitura do Google Sheets ('+r.status+'). Verifique compartilhamento e API.');
 const values=(await r.json()).values||[];
 const existing=await supa('/rest/v1/voluntarios?select=id,origem_chave,fonte_hash,aprovado,foto_path,foto_drive_id&origem=eq.google_sheets&limit=5000');
 const old=new Map(existing.map(x=>[x.origem_chave,x]));const seen=new Set();
 let created=0,updated=0,unchanged=0,skipped=0,retired=0,photos=0;
 for(const row of values){
  const [timestamp,nome,local,foto,mensagem,consentimento]=row;
  if(!String(nome||'').trim())continue;
  const key='form:'+hash(String(timestamp||'')+'|'+norm(nome));
  const approved=norm(consentimento).startsWith('autorizo o uso');
  const place=cidadeUF(local);
  if(!approved||!place||!String(mensagem||'').trim()){skipped++;continue;}
  // A pessoa informou somente o estado (sem município). Permanece pendente e será revisada.
  const photoId=(String(foto||'').match(/[?&]id=([A-Za-z0-9_-]+)/)||String(foto||'').match(/\/file\/d\/([A-Za-z0-9_-]+)/)||[])[1]||'';
  const payload={origem:'google_sheets',origem_chave:key,nome:String(nome).trim().slice(0,180),cidade:place.cidade,uf:place.uf,mensagem:String(mensagem||'').trim().slice(0,4000),ordem:999,foto_drive_id:photoId};
  const signature=hash(JSON.stringify(payload));seen.add(key);
  const prior=old.get(key);
  if(prior?.fonte_hash===signature && (prior.foto_path || !photoId)){unchanged++;continue;}
  const photoPath=(photoId && prior?.foto_drive_id===photoId && prior?.foto_path)?prior.foto_path:await photoFor(photoId,accessToken,key);
  if(photoPath&&photoPath!==prior?.foto_path)photos++;
  const data={...payload,fonte_hash:signature,foto_path:photoPath,aprovado:false,revisao_pendente:!!prior,atualizado_em:new Date().toISOString()};
  if(prior){await supa('/rest/v1/voluntarios?origem_chave=eq.'+encodeURIComponent(key),'PATCH',data);updated++;}
  else{await supa('/rest/v1/voluntarios','POST',data);created++;}
 }
 // Se uma resposta foi excluída ou consentimento retirado, despublicar sem apagar a trilha administrativa.
 for(const item of existing){if(!seen.has(item.origem_chave) && item.aprovado){
   await supa('/rest/v1/voluntarios?id=eq.'+item.id,'PATCH',{aprovado:false,revisao_pendente:true});retired++;
 }}
 const status=`Novos: ${created}; revisões: ${updated}; sem mudanças: ${unchanged}; inválidos: ${skipped}; retirados do ar: ${retired}; fotos: ${photos}`;
 await supa('/rest/v1/sync_status?id=eq.1','PATCH',{ultima_execucao:new Date().toISOString(),resultado:status});
 console.log('Sincronização concluída. '+status); // Não imprimir nomes, respostas ou segredos.
}
run().catch(err=>{console.error('Falha: '+err.message);process.exitCode=1;});
