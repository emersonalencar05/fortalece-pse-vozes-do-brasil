(() => {
'use strict';
const $=s=>document.getElementById(s);
const cfg=window.FPSE_CONFIG||{};
const client=(window.supabase&&cfg.supabaseUrl?.startsWith('https://')&&cfg.publishableKey&&!cfg.publishableKey.includes('COLE_'))?window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey):null;
let records=[],filter='all',editing=null;
const ufs='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
$('uf').replaceChildren(...ufs.map(uf=>{const o=document.createElement('option');o.value=uf;o.textContent=uf;return o;}));
function note(t,error=false){$('notices').textContent=t; $('notices').classList.toggle('error',error)}
function text(tag,cls,value){const el=document.createElement(tag);el.className=cls||'';el.textContent=value;return el;}
async function checkAdmin(){const {data:{user},error}=await client.auth.getUser();if(error||!user){$('login').hidden=false;$('dashboard').hidden=true;return false;}
 const {data,error:err}=await client.from('admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(err||!data){$('login').hidden=false;$('dashboard').hidden=true;note('Este usuário não foi autorizado como administrador. Cadastre o usuário em public.admins.',true);return false}
 $('login').hidden=true;$('dashboard').hidden=false;return true;}
async function refresh(){if(!await checkAdmin())return;const {data,error}=await client.from('voluntarios').select('*').order('criado_em',{ascending:false}).limit(600);
 if(error)return note('Falha ao listar: '+error.message,true);records=data||[];draw();
 const {data:status}=await client.from('sync_status').select('ultima_execucao,resultado').eq('id',1).maybeSingle();
 $('sync-status').textContent=status?.ultima_execucao?new Date(status.ultima_execucao).toLocaleString('pt-BR')+' — '+(status.resultado||''):'Ainda sem execução';}
function draw(){const approved=records.filter(x=>x.aprovado).length;const pending=records.length-approved;
 $('stats').textContent=`${records.length} registros · ${approved} publicados · ${pending} pendentes`;
 const view=records.filter(x=>filter==='all'||(filter==='approved'?x.aprovado:!x.aprovado));const holder=$('profiles');holder.replaceChildren();
 if(!view.length){holder.appendChild(text('p','muted','Nenhum perfil nesta categoria.'));return}
 for(const v of view){const row=text('article','profile','');const info=text('div','', '');info.append(text('h3','',v.nome),text('p','',`${v.cidade||''} · ${v.uf||''} · ${v.origem||'manual'}`));
 const status=text('span','status'+(v.aprovado?' ok':''),v.aprovado?'Publicado':'Pendente');info.appendChild(status);
 if(v.revisao_pendente)info.appendChild(text('p','', 'Atualizado pela planilha: confira e aprove novamente.'));
 const actions=text('div','actions','');const edit=text('button','secondary','Editar');edit.type='button';edit.onclick=()=>openEditor(v);actions.append(edit);
 const toggle=text('button','',v.aprovado?'Retirar do ar':'Aprovar');toggle.type='button';toggle.onclick=()=>setApproval(v,!v.aprovado);actions.append(toggle);
 if(v.origem!=='google_sheets'){const del=text('button','danger','Excluir');del.type='button';del.onclick=()=>remove(v);actions.append(del)}
 row.append(info,actions);holder.append(row);}}
async function setApproval(v,value){if(!confirm(value?'Publicar este perfil no site?':'Retirar este perfil do site?'))return;
 const {error}=await client.from('voluntarios').update({aprovado:value,revisao_pendente:false}).eq('id',v.id);if(error)return note(error.message,true);note('Status atualizado.');await refresh();}
async function remove(v){if(!confirm('Excluir definitivamente este perfil manual?'))return;
 const {error}=await client.from('voluntarios').delete().eq('id',v.id);if(error)return note(error.message,true);note('Perfil excluído.');await refresh();}
function openEditor(v){editing=v||null;$('editor').hidden=false;$('editor-title').textContent=v?'Editar perfil':'Novo perfil';
 $('profile-id').value=v?.id||'';$('nome').value=v?.nome||'';$('cidade').value=v?.cidade||'';$('uf').value=v?.uf||'MG';$('ordem').value=v?.ordem||999;
 $('mensagem').value=v?.mensagem||'';$('aprovado').checked=!!v?.aprovado;$('foto').value='';$('photo-info').textContent=v?.foto_path?'Fotografia existente: '+v.foto_path:'Nenhuma fotografia ainda';$('editor').scrollIntoView({behavior:'smooth'});}
$('profile-form').addEventListener('submit',async ev=>{ev.preventDefault();const file=$('foto').files[0];if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024))return note('Use JPEG, PNG ou WebP até 5 MB.',true);
 const id=editing?.id||crypto.randomUUID();let photoPath=editing?.foto_path||null;
 if(file){const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];photoPath=`manual/${id}.${ext}`;
 const {error}=await client.storage.from('pse-fotos').upload(photoPath,file,{upsert:true,contentType:file.type});if(error)return note('Erro ao salvar fotografia: '+error.message,true)}
 const data={id,nome:$('nome').value.trim(),cidade:$('cidade').value.trim(),uf:$('uf').value,mensagem:$('mensagem').value.trim(),ordem:Number($('ordem').value)||999,
 foto_path:photoPath,aprovado:$('aprovado').checked,origem:editing?.origem||'manual',revisao_pendente:false};
 const {error}=await client.from('voluntarios').upsert(data,{onConflict:'id'});if(error)return note('Erro ao salvar perfil: '+error.message,true);
 note('Perfil salvo com sucesso.');$('editor').hidden=true;editing=null;await refresh();});
$('login-form').addEventListener('submit',async ev=>{ev.preventDefault();if(!client)return note('Configure docs/config.js com URL e chave pública.',true);
 const {error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return note('Login não autorizado: '+error.message,true);note('Login realizado.');await refresh();});
$('logout').onclick=async()=>{await client.auth.signOut();$('dashboard').hidden=true;$('login').hidden=false;$('editor').hidden=true;note('Sessão encerrada.')};
$('new').onclick=()=>openEditor(null);$('cancel').onclick=()=>{$('editor').hidden=true;editing=null};$('reload').onclick=refresh;
for(const f of document.querySelectorAll('.filter'))f.onclick=()=>{filter=f.dataset.filter;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===f));draw()};
if(!client)note('Antes de entrar, configure docs/config.js com a URL e a chave publicável do Supabase.',true);else refresh();
})();