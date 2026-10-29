-- FORTALECE PSE · GitHub Pages + Supabase
-- EXECUTE NO SUPABASE SQL EDITOR (uma vez). O banco não deve ser público sem RLS.
create extension if not exists pgcrypto;

create table if not exists public.voluntarios (
 id uuid primary key default gen_random_uuid(),
 nome text not null check (char_length(trim(nome)) between 2 and 180),
 cidade text not null default 'Município não informado',
 uf text not null check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
 mensagem text not null default '',
 ordem integer not null default 999,
 foto_path text,
 aprovado boolean not null default false,
 revisao_pendente boolean not null default false,
 origem text not null default 'manual',
 origem_chave text unique,
 fonte_hash text,
 foto_drive_id text,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create index if not exists voluntarios_publicados_uf on public.voluntarios(uf) where aprovado=true;

create table if not exists public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 criado_em timestamptz not null default now()
);
create table if not exists public.sync_status (
 id integer primary key check(id=1),
 ultima_execucao timestamptz,
 resultado text not null default ''
);
insert into public.sync_status(id) values (1) on conflict do nothing;

create or replace function public.eh_admin(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select uid is not null and exists(select 1 from public.admins a where a.user_id=uid);
$$;

create or replace function public.foto_publica(path text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.voluntarios v where v.foto_path=path and v.aprovado=true);
$$;

-- Público recebe APENAS os campos necessários dos perfis aprovados.
-- Evita disponibilizar origem_chave, hashes internos e IDs do Google Drive.
create or replace function public.listar_publicos()
returns table(id uuid,nome text,cidade text,uf text,mensagem text,ordem integer,foto_path text)
language sql stable security definer set search_path='' as $$
 select v.id,v.nome,v.cidade,v.uf,v.mensagem,v.ordem,v.foto_path
 from public.voluntarios v where v.aprovado=true
 order by v.ordem,v.nome limit 500;
$$;

revoke all on public.voluntarios from anon;
revoke all on public.voluntarios from authenticated;
revoke all on public.admins from anon;
revoke all on public.admins from authenticated;
revoke all on public.sync_status from anon;
revoke all on public.sync_status from authenticated;
grant select,insert,update,delete on public.voluntarios to authenticated;
grant select on public.admins to authenticated;
grant select on public.sync_status to authenticated;
revoke all on function public.eh_admin(uuid) from public;
revoke all on function public.foto_publica(text) from public;
revoke all on function public.listar_publicos() from public;
grant execute on function public.eh_admin(uuid) to anon,authenticated,service_role;
grant execute on function public.foto_publica(text) to anon,authenticated,service_role;
grant execute on function public.listar_publicos() to anon,authenticated,service_role;

alter table public.voluntarios enable row level security;
alter table public.admins enable row level security;
alter table public.sync_status enable row level security;

drop policy if exists voluntarios_admin_select on public.voluntarios;
create policy voluntarios_admin_select on public.voluntarios for select to authenticated using (public.eh_admin(auth.uid()));
drop policy if exists voluntarios_admin_insert on public.voluntarios;
create policy voluntarios_admin_insert on public.voluntarios for insert to authenticated with check (public.eh_admin(auth.uid()));
drop policy if exists voluntarios_admin_update on public.voluntarios;
create policy voluntarios_admin_update on public.voluntarios for update to authenticated using (public.eh_admin(auth.uid())) with check (public.eh_admin(auth.uid()));
drop policy if exists voluntarios_admin_delete on public.voluntarios;
create policy voluntarios_admin_delete on public.voluntarios for delete to authenticated using (public.eh_admin(auth.uid()));
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins for select to authenticated using (user_id=auth.uid());
drop policy if exists sync_admin_select on public.sync_status;
create policy sync_admin_select on public.sync_status for select to authenticated using (public.eh_admin(auth.uid()));

-- Fotos sempre em bucket PRIVADO. Assinaturas para leitura apenas quando o
-- perfil estiver publicado, ou quando o usuário for administrador.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('pse-fotos','pse-fotos',false,10485760,array['image/jpeg','image/png','image/webp'])
 on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists pse_fotos_select on storage.objects;
create policy pse_fotos_select on storage.objects for select to anon,authenticated
using (bucket_id='pse-fotos' and (public.foto_publica(name) or public.eh_admin(auth.uid())));
drop policy if exists pse_fotos_insert on storage.objects;
create policy pse_fotos_insert on storage.objects for insert to authenticated
with check (bucket_id='pse-fotos' and public.eh_admin(auth.uid()));
drop policy if exists pse_fotos_update on storage.objects;
create policy pse_fotos_update on storage.objects for update to authenticated
using (bucket_id='pse-fotos' and public.eh_admin(auth.uid())) with check (bucket_id='pse-fotos' and public.eh_admin(auth.uid()));
drop policy if exists pse_fotos_delete on storage.objects;
create policy pse_fotos_delete on storage.objects for delete to authenticated
using (bucket_id='pse-fotos' and public.eh_admin(auth.uid()));
