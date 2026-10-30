# Atualização do frontend da Mostra PSE — versão 5.2

**Destino:** repositório GitHub `emersonalencar05/fortalece-pse-vozes-do-brasil`, branch `main`, GitHub Pages publicado da pasta `/docs`.

## Importante: este ZIP é uma ATUALIZAÇÃO por sobreposição

**Não exclua os arquivos que já estão no repositório.** O ZIP contém o novo frontend e os arquivos necessários para pré-visualização local. Faça a extração **dentro da pasta RAIZ do repositório já clonado**, autorizando a substituição de `docs/index.html` e a inclusão de `docs/src/`, `docs/assets/` e demais arquivos deste pacote.

**Arquivos preservados do repositório atual:**

- `docs/admin.html`, `docs/admin.css`, `docs/admin.js` (painel e aprovação dos perfis)
- `.github/workflows/sincronizar-sheets.yml` (importação automática a cada ~20 min)
- `scripts/sincronizar-sheets.mjs`, `scripts/migrar-local.mjs` (sincronização e migração)
- `supabase/01-criar-banco.sql` (regras de acesso e esquema)
- `docs/404.html`, `docs/assets/` (logos preexistentes podem coexistir)
- **Repository secrets** e dados reais (não são incluídos e não devem ser copiados para o frontend)

O arquivo `docs/config.js` do pacote contém a **mesma URL e chave publicável** do repositório conferido em 30/10/2026. O novo frontend e o painel utilizam **esse mesmo arquivo** para apontar para o Supabase. Se a configuração mudar no futuro, atualize só `docs/config.js`. Nunca adicione `SUPABASE_SERVICE_ROLE_KEY` ou `GOOGLE_SERVICE_ACCOUNT_JSON` a arquivos públicos.

## 1. Fazer backup antes de atualizar

- No GitHub Desktop, abra o repositório e atualize a branch `main` (Fetch origin / Pull origin).
- É recomendável criar uma branch de segurança ou baixar o conteúdo atual antes da substituição.
- Confirme em **Settings → Pages** que o site está configurado em **Deploy from a branch → main → /docs**.

## 2. Aplicar este ZIP sem remover o backend

1. Extraia o ZIP numa pasta temporária.
2. Copie o **conteúdo de dentro** de `MOSTRA_PSE_V5_GITHUB_PAGES` para a **raiz** do repositório existente (`fortalece-pse-vozes-do-brasil`). **Não crie outra pasta `docs` dentro da pasta `docs`.**
3. Permita a substituição de `docs/index.html` e a inclusão de `docs/src/` e de `docs/assets/*.webp`.
4. **Não remova** `docs/admin.*`, `.github/`, `scripts/`, `supabase/` ou os secrets do GitHub.
5. Execute `npm run check` na raiz (Node 18+, não precisa `npm install`).
6. Execute `npm run dev` e abra `http://localhost:3000/?demo=1` para revisar o layout. Sem `?demo=1`, a página tenta carregar os perfis reais aprovados.
7. No GitHub Desktop confira **Changes**, escreva a mensagem `Atualizar frontend institucional da Mostra PSE` e faça **Commit to main → Push origin**.
8. Acesse a URL atual do Pages: `https://emersonalencar05.github.io/fortalece-pse-vozes-do-brasil/` e verifique a página inicial, um estado com voluntários aprovados e a página de administração em `.../admin.html`.

Ao publicar do GitHub Desktop na branch `main`, o Pages substituirá a tela atual automaticamente. O link antigo permanece o mesmo. Não é necessário alterar os Secrets nem executar `npm` no servidor GitHub Pages (frontend estático em `docs/`).

## 3. Fluxo de dados que deve continuar funcionando

**Google Forms → Google Sheets** (aba `Respostas ao formulário 1`) → **GitHub Actions** (`scripts/sincronizar-sheets.mjs`) → **Supabase** (tabela `voluntarios`, foto no bucket privado `pse-fotos`) → **Painel `/admin.html`** (aprovar) → **frontend** (RPC pública `listar_publicos()`).

- Ações agendadas importam os dados em intervalos aproximados de 20 minutos, sujeitos à fila da plataforma.
- **Respostas novas são importadas como pendentes**, não aparecem antes da aprovação no painel.
- O frontend solicita dados aprovados ao Supabase no carregamento e depois a cada 5 minutos.
- Fotos são acessadas por URLs assinadas temporárias; nunca tornam público o bucket inteiro.
- O mascote do perfil é escolhido pelo campo `uf` (ex.: `MG` mostra `docs/assets/MG.webp`).
- Uma falha de rede mostra aviso com botão para tentar novamente, **não mostra participantes fictícios em produção**.

## 4. Checagem após o push

- Abra o site em janela anônima ou faça atualização forçada `Ctrl+F5`.
- Teste a seleção de MG, SP, BA e DF (mapa, seletor, mascote correto).
- Compare um perfil aprovado no painel com nome, cidade, mensagem e foto no site.
- No GitHub → Actions → Importar respostas do Google Sheets, verifique se a execução mais recente ficou **verde**. Se necessário, use `Run workflow` (sem alterar segredos).
- No painel, aprove um cadastro de teste real com autorização de uso de imagem para conferir a publicação; posteriormente despublique-o se for apenas para validação.
- Teste na orientação 1080 × 1920 e num celular; ajuste o navegador para 100% de zoom no totem.

## 5. Voltar à versão anterior

No GitHub Desktop, reverta o commit que instalou a versão 5.2, faça o push da reversão e aguarde a atualização do GitHub Pages. O backend e os registros continuam preservados.

## Segurança e transparência

O repositório continua usando chaves **publishable/anon** no navegador, o que é esperado no Supabase. Não inclua credenciais da conta de serviço Google nem a chave `service_role` no repositório. Regras de RLS, função pública e bucket de fotos seguem sendo aplicadas no Supabase existente.
