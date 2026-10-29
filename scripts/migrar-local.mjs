// Migração opcional dos dados APROVADOS da instalação local v3.5.
// Usar APENAS no próprio computador, não subir voluntarios.json ao GitHub.
import {readFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import crypto from 'node:crypto';
const root=resolve(process.argv[2]||'');
if(!process.argv[2])throw new Error('Uso: node scripts/migrar-local.mjs CAMINHO_DA_PASTA_LOCAL_V35');
const base=process.env.SUPABASE_URL?.replace(/\/$/,'');const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no terminal local. Nunca envie chave ao GitHub.');
const credentials={apikey:key,Authorization:'Bearer '+key};
const list=JSON.parse(await readFile(join(root,'data','voluntarios.json'),'utf8'));
let count=0,imgs=0;
for(const item of list){if(item.aprovado===false||item.exemplo||item.origem==='google-sheets'||item.origem==='google_sheets'||!item.nome||!item.uf)continue;
 const id=crypto.randomUUID();let path=null;
 if(typeof item.foto==='string'&&/^\/uploads\/[-\da-f]{36}\.(png|jpg|webp)$/.test(item.foto)){
  const ext=item.foto.split('.').at(-1);const contentType={jpg:'image/jpeg',png:'image/png',webp:'image/webp'}[ext];
  const bin=await readFile(join(root,'public',item.foto.slice(1)));
  path=`legado/${id}.${ext}`;
  const r=await fetch(base+'/storage/v1/object/pse-fotos/'+path,{method:'POST',headers:{...credentials,'Content-Type':contentType},body:bin});
  if(!r.ok)throw new Error('Erro ao enviar uma foto ('+r.status+')');imgs++;
 }
 const payload={id,nome:item.nome,cidade:item.cidade||'Município não informado',uf:item.uf,mensagem:item.mensagem||'',ordem:item.ordem||999,foto_path:path,aprovado:true,origem:'legado_v35'};
 const r=await fetch(base+'/rest/v1/voluntarios',{method:'POST',headers:{...credentials,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});
 if(!r.ok)throw new Error('Erro ao migrar registro ('+r.status+')');count++;
}
console.log(`Migração concluída: ${count} perfis publicados, ${imgs} fotografias.`);
