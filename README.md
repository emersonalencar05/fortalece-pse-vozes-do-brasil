# Vozes do Brasil — Fortalece PSE

**Pacote de publicação v4.0, com aparência da versão 3.5.** Hospedagem do front-end no GitHub Pages, API e autenticação no Supabase, importação Google Forms/Sheets por GitHub Actions.

## Contém

- `docs/index.html`: mostra com o mapa interativo de 27 UFs (geometria e visual reaproveitados da versão 3.5).
- `docs/admin.html`: painel para entrar, revisar, editar, aprovar, despublicar e criar perfis.
- `supabase/01-criar-banco.sql`: tabelas, RLS e funções públicas restritas aos perfis aprovados, bucket privado de fotos.
- `.github/workflows/sincronizar-sheets.yml`: importação agendada a cada 20 minutos, com execução manual disponível.
- `scripts/sincronizar-sheets.mjs`: mapeamento da aba `Respostas ao formulário 1`, colunas A–F, importação das fotografias do Drive, consentimento e deduplicação.
- `scripts/migrar-local.mjs`: migração opcional dos registros aprovados da instalação Windows.
- `COMECE-AQUI.txt`: instruções para quem nunca publicou um site.

## 1. Configuração do Supabase

1. Crie projeto gratuito em https://supabase.com/dashboard.
2. Vá em **SQL Editor** e execute todo o conteúdo de `supabase/01-criar-banco.sql`.
3. Em **Authentication → Users**, crie um usuário com e-mail e senha. **Não envie a senha pelo chat.**
4. No SQL Editor, execute, substituindo o e-mail:

```sql
insert into public.admins(user_id)
select id from auth.users where lower(email)=lower('SEU_EMAIL_AQUI')
on conflict do nothing;
```

5. Desative auto cadastro público em **Authentication → Providers → Email**.
6. Edite `docs/config.js` com a Project URL e a **Publishable Key** (ou a antiga `anon key`), ambas próprias para o navegador. **NUNCA** coloque `service_role` em `docs/`.

### Segurança

- A tabela `voluntarios` só pode ser consultada e alterada por usuários listados em `admins`.
- O público lê apenas a função `listar_publicos()` com nome, cidade, UF, mensagem e foto **aprovados**.
- As fotografias ficam no bucket **privado** `pse-fotos`; URLs temporárias só são emitidas para imagens de perfis aprovados ou administradores autorizados.
- `public.sync_status` contém apenas contagens e mensagem resumida, não conteúdo das respostas.

## 2. GitHub Pages

1. Crie repositório **público** `fortalece-pse-vozes-do-brasil`.
2. Faça upload do conteúdo deste pacote **sem chaves e sem dados do Windows**. Recomenda-se GitHub Desktop para preservar diretórios e arquivos ocultos.
3. Vá em **Settings → Pages → Deploy from a branch**; escolha `main` e pasta `/docs`.
4. Aguarde a publicação. Abra URL e `/admin.html`.
5. Configure Site URL e Redirect URLs no Supabase para seu endereço publicado.

## 3. GitHub Actions e Google Sheets

A planilha configurada é `1V5tK25QgGnO62p-sUiEs4I6vvSY1dzuDGbrSbcwIFiI`; aba `Respostas ao formulário 1`. Cabeçalhos: data/hora, nome, cidade/estado, foto, depoimento, consentimento.

Em **GitHub → Settings → Secrets and variables → Actions**, crie os *Repository secrets*:

- `SUPABASE_URL`: Project URL do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: **legacy service_role JWT** (ou ajuste a autenticação no script conforme o tipo de credencial). Exclusivamente para o GitHub Actions.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: conteúdo JSON da conta de serviço usada no Google Cloud. Só no secret, jamais em arquivos do repositório.

As permissões de leitor na planilha e na pasta de uploads do Google Forms precisam estar dadas ao **e-mail da conta de serviço**.

Em **Actions → Importar respostas do Google Sheets → Run workflow**, execute manualmente uma vez e confira os logs (apenas contagens). Depois o agendamento roda aproximadamente a cada **20 minutos**, sujeito a atrasos/limites do GitHub Actions.

Entradas novas ou alteradas são importadas como **não aprovadas**. A atualização de dados já publicados exige nova aprovação. A remoção de consentimento ou exclusão de uma resposta retira o perfil do ar na sincronização seguinte. O campo local ambíguo é ignorado e deve ser corrigido na planilha.

## 4. Como migrar cadastros aprovados do Windows (opcional)

Se já existem cadastros manuais aprovados em seu Node.js local v3.5:

1. Faça backup da instalação local. Não publique a pasta `data` ou `public/uploads`.
2. No **PowerShell**, configure temporariamente duas variáveis de ambiente privadas (não faça commits desse terminal ou das chaves):

```powershell
$env:SUPABASE_URL="https://PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="COLE_AQUI_A_CHAVE_PRIVADA"
node .\scripts\migrar-local.mjs "C:\caminho\da\sua\fortalece-pse-mostra"
Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY
```

Execute uma vez (não é idempotente); os dados locais demonstrativos são ignorados. Cadastros do Sheets devem ser transferidos pela sincronização, não pelo migrador, para evitar duplicações.

## 5. Limites e considerações

- GitHub Pages não executa Node.js; o backend local v3.5 foi substituído por Supabase + Actions. **O design da versão 3.5 foi mantido, mas o código de publicação é uma nova versão de arquitetura.**
- Supabase Free pode pausar por inatividade e possui limites. Para evento público importante, teste carga, configure backups, considere plano pago se necessário.
- GitHub Actions agendado não garante execução no minuto exato. Perfis aprovados permanecem disponíveis mesmo se uma execução atrasar.
- Não há uma sincronização em tempo real garantida; o site consulta o Supabase a cada cinco minutos enquanto está aberto.
- Revise políticas de privacidade, autorização de imagem, canal de remoção e critérios de publicação.
- Para uso em produção, faça teste real do fluxo na sua conta do Supabase e GitHub; este pacote foi validado localmente e **não é uma implantação já ativa**.
