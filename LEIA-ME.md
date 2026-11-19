# Atualização — painel administrativo e centralização das fotos

Esta atualização inclui:

- Painel administrativo reorganizado em dashboard, com indicadores reais carregados da tabela `voluntarios`.
- Contagem de registros, publicados, pendentes e UFs representadas.
- Distribuição de perfis por estado.
- Busca por nome, município, UF, mensagem ou origem.
- Filtros de todos, pendentes e publicados, com contadores.
- Acesso direto ao histórico/workflow de sincronização do GitHub Actions.
- Layout responsivo para desktop, tablet e celular.
- Correção da animação ao trocar participantes: a animação anterior aplicava `transform: translateY()` ao contêiner da foto e sobrescrevia o `translateX(-50%)` responsável por centralizá-lo. A nova animação altera somente a opacidade, mantendo a foto no centro em todos os perfis.

## Como instalar

1. Faça `Fetch origin` e `Pull origin` no GitHub Desktop.
2. Faça uma cópia de segurança da pasta do repositório ou crie uma branch de backup.
3. Extraia este ZIP.
4. Copie o conteúdo extraído para a raiz do repositório local `fortalece-pse-vozes-do-brasil`, mesclando a pasta `docs` e aceitando substituir somente os arquivos correspondentes.
5. Confira que os arquivos alterados são:
   - `docs/admin.html`
   - `docs/admin.css`
   - `docs/admin.js`
   - `docs/src/styles.css`
6. Não apague nem substitua `docs/config.js`, `.github/`, `scripts/`, `supabase/` ou os Secrets do GitHub.
7. No GitHub Desktop, faça commit com a mensagem `Modernizar painel admin e corrigir centralização das fotos`.
8. Clique em `Push origin` e aguarde o GitHub Pages publicar.
9. Abra `https://emersonalencar05.github.io/fortalece-pse-vozes-do-brasil/admin.html` e teste em computador e celular.
10. Na página do mapa, abra um estado com mais de um perfil e avance/volte entre as pessoas para confirmar a centralização da foto.

## Verificações realizadas

- `npm run check` passou.
- `node --check docs/admin.js` passou.
- `node --check docs/src/app.js` passou.
- O teste de integridade do projeto confirmou 27 UFs, 27 mascotes, 8 recursos, configuração Supabase e fluxo de fotos assinadas.

O painel continua usando a autenticação e as permissões existentes do Supabase. Não foram alteradas tabelas, políticas, credenciais nem o processo de sincronização. O link do GitHub Actions abre o workflow existente; a sincronização continua sendo iniciada pelo GitHub.
