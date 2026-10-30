import {UFS,REGIOES} from './docs/src/map-data.js';
import {readFile, access} from 'node:fs/promises';
import {join} from 'node:path';
const states=Object.keys(UFS);
if(states.length!==27)throw new Error(`Esperadas 27 UFs, vieram ${states.length}`);
const byRegion=Object.values(REGIOES).flat();
if(new Set(byRegion).size!==27||byRegion.some(uf=>!UFS[uf]))throw new Error('Regiões não cobrem 27 UFs');
for(const uf of states){
  if(!UFS[uf].d.startsWith('M')||!UFS[uf].d.endsWith('Z'))throw new Error(`Malha SVG incorreta: ${uf}`);
  await access(join('docs','assets',uf+'.webp'));
}
for(const file of ['logo','fundo','fundo_perfil','mostranacional','personagem','instituicoes','aspas','zegotinhas'])await access(join('docs','assets',file+'.webp'));
for(const path of ['docs/index.html','docs/config.js','docs/src/app.js','docs/src/styles.css'])await access(path);
const html=await readFile('docs/index.html','utf8');
if(!html.includes('<script src="./config.js"></script>'))throw new Error('Config pública não carregada');
if(!html.includes('<script type="module" src="./src/app.js"></script>'))throw new Error('Módulo principal ausente');
const js=await readFile('docs/src/app.js','utf8');
if(!js.includes('rpc/listar_publicos')||!js.includes('storage/v1/object/sign'))throw new Error('Integração de perfis/fotos não encontrada');
if(!js.includes("['localhost','127.0.0.1','[::1]']"))throw new Error('Demonstração pública não bloqueada');
if(!js.includes("if(!CONFIG.publishableKey.startsWith('sb_publishable_'))"))throw new Error('Cabeçalho de chave publicável Supabase incorreto');
console.log('OK: 27 UFs, 27 mascotes, 8 recursos, dados do Supabase, fotos assinadas, modo demo restrito ao localhost.');
