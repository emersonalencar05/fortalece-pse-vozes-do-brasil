# INTEGRAÇÃO — 1ª Mostra Nacional Fortalece PSE + Zap do Zé Gotinha (v6.0)

**Repositório original:** `emersonalencar05/fortalece-pse-vozes-do-brasil`  
**GitHub Pages atual:** https://emersonalencar05.github.io/fortalece-pse-vozes-do-brasil/  
**Pasta publicada:** `/docs`, branch `main`  
**Nova página do chat:** https://emersonalencar05.github.io/fortalece-pse-vozes-do-brasil/ze-gotinha/

## O que foi integrado

- Botão visual de conversa, com símbolo de aplicativo de mensagens e título **“Converse com o Zé Gotinha”**, na página inicial do mapa. Não aparece sobre os perfis dos participantes.
- Página interna `docs/ze-gotinha/` com identidade PSE, mascote fornecido, logos e layout adaptado a celular/computador/tablet.
- Botão **Voltar ao mapa** na página do chat.
- Cinco modos: **Curiosidades**, **Quiz**, **Fake news**, **Conversa livre**, **Fortalece PSE**.
- Modo demonstração no navegador (sem custo e sem API), com respostas limitadas e identificadas como exemplos.
- API separada em `zegotinha-worker/`, pronta para publicação pelo Cloudflare Workers e integração à API OpenAI.
- Regras de personalidade, cuidados com informação de saúde, crises, inclusão, menores, limites de mensagens, CORS e armazenamento mínimo.
- Informações institucionais confirmadas em `zegotinha-worker/facts.js`.

**NÃO apague o repositório existente!** Este pacote é uma atualização **por sobreposição**, não uma versão substituta com todos os ativos do mapa. O mapa, os arquivos `docs/src/`, o painel `docs/admin.*`, as imagens originais `docs/assets/`, a sincronização `.github/`, `scripts/`, `supabase/` e os Secrets do GitHub permanecem no repositório anterior.

## PASSO A PASSO — PARTE 1: Publicar a interface no GitHub

1. Abra o **GitHub Desktop** e escolha o repositório `fortalece-pse-vozes-do-brasil`.
2. Clique em **Fetch origin**. Se aparecer **Pull origin**, clique nele para baixar as alterações mais recentes.
3. Crie uma cópia de segurança. No GitHub Desktop, use `Branch > New branch` e salve uma branch como `backup-antes-zap` (opcional, mas recomendado). Depois volte para `main`.
4. Baixe o arquivo `mostra-pse-zap-INTEGRACAO-COMPLETA.zip` fornecido pelo ChatGPT.
5. Extraia o ZIP. Abra a pasta extraída, selecione **o conteúdo dela** (`docs/`, `zegotinha-worker/`, `LEIA-ME-PRIMEIRO.md`) e copie para a **raiz** do repositório local aberto pelo GitHub Desktop (`Repository > Show in Explorer`).
6. Quando o Windows perguntar, escolha mesclar pastas e substituir **somente o `docs/index.html`**, caso solicitado. NÃO apague manualmente os arquivos que já estavam em `docs`!
7. No GitHub Desktop, em **Changes**, confira se aparecem `docs/index.html` (alterado), `docs/zap-launcher.css` (novo), `docs/ze-gotinha/` (novo) e `zegotinha-worker/` (novo). Os arquivos de banco e sincronização devem permanecer intactos.
8. Preencha o resumo do commit como `Integrar Zap do Zé Gotinha à Mostra PSE` e clique em **Commit to main**.
9. Clique em **Push origin**.
10. Abra o site https://emersonalencar05.github.io/fortalece-pse-vozes-do-brasil/ e espere a atualização normal do GitHub Pages. Atualize com **Ctrl+F5**. Na tela inicial do mapa, clique em **Converse com o Zé Gotinha**.
11. Verifique também o painel em `.../admin.html` e teste perfis reais aprovados. Esta atualização não altera `docs/config.js` nem `docs/src/app.js`; a leitura dos dados permanece como estava.

> **Atenção:** se o seu `docs/index.html` tiver recebido alterações novas após 31/10/2026, compare a versão mais recente do repositório antes de sobrescrevê-la para não perder alterações posteriores. O `docs/index.html` deste pacote foi baseado na versão 5.2 consultada no GitHub.

## PARTE 2: Ativar a inteligência artificial — Cloudflare + OpenAI

**Não coloque chaves da OpenAI no GitHub, no HTML, no JavaScript do site nem neste chat.** A chave deve existir como Secret do Cloudflare Worker. O plano ChatGPT Plus não inclui o consumo separado de API.

### A) Criar acesso aos serviços

1. Acesse https://platform.openai.com/api-keys e crie uma chave de API em seu projeto. Configure faturamento, alertas de uso e limite de orçamento conforme recursos disponíveis no painel.
2. Crie ou entre na sua conta em https://dash.cloudflare.com/ . A configuração da API funciona em Cloudflare Workers. O plano de uso do Workers pode mudar e possui limites próprios.
3. Verifique que o **Node.js** está instalado no Windows. Se não estiver, instale a versão LTS em https://nodejs.org/ .

### B) Publicar o servidor

1. No GitHub Desktop, clique em **Repository > Show in Explorer**.
2. Abra a pasta `zegotinha-worker`.
3. Na barra de endereço do Explorador de Arquivos, digite `cmd` e pressione **Enter**. O Prompt de Comando abrirá dentro dessa pasta.
4. Execute, um comando por vez:

```powershell
npx wrangler login
npx wrangler deploy
npx wrangler secret put OPENAI_API_KEY
```

5. O primeiro comando abre a página para autorizar o Cloudflare. O segundo cria o Worker e mostra um endereço parecido com `https://fortalece-pse-ze-gotinha.SEU-SUBDOMINIO.workers.dev`. **Copie a URL real que aparecer no seu terminal**.
6. No terceiro comando, cole a chave da API OpenAI somente quando o terminal pedir o Secret. A chave não aparecerá no código do site nem deve ser adicionada ao repositório.
7. O Worker já vem configurado com a origem do site, `https://emersonalencar05.github.io`, em `zegotinha-worker/wrangler.toml`. A origem **não** inclui `/fortalece-pse-vozes-do-brasil/`.

### C) Ligar o site ao Worker

1. No repositório do GitHub Desktop, abra `docs/ze-gotinha/config.js` no editor de texto.
2. Substitua a string vazia pelo **endereço real do Worker**, por exemplo:

```javascript
window.ZE_CONFIG = Object.freeze({
  API_URL: 'https://fortalece-pse-ze-gotinha.SEU-SUBDOMINIO.workers.dev'
});
```

3. Salve o arquivo. No GitHub Desktop, faça outro **Commit to main** com o título `Ativar IA do Zap do Zé Gotinha` e clique em **Push origin**.
4. Depois da publicação, visite `https://emersonalencar05.github.io/fortalece-pse-vozes-do-brasil/ze-gotinha/` e atualize com **Ctrl+F5**.
5. No topo do chat, o status deve passar de **Modo demonstração** para **IA disponível para conversar**. Envie “Oi, Zé! Me conte uma curiosidade sobre o SUS”.

### D) Se algo não funcionar

- **Modo demonstração permanece:** confira se `API_URL` foi salva corretamente, se o Pages publicou o último commit e se a rota `/health` do Worker está acessível.
- **Origem não autorizada/CORS:** o domínio do navegador deve estar na variável `ALLOWED_ORIGINS` do arquivo `wrangler.toml`. Depois de mudar, execute `npx wrangler deploy` novamente.
- **IA sem resposta:** confira se o Secret `OPENAI_API_KEY` existe no painel Cloudflare, se a chave possui permissão de API e se a conta OpenAI tem faturamento habilitado.
- **Erro 429:** limite de tráfego ou de conta atingido. Os limites do Worker são aproximados (10 mensagens/min por sessão, 150/min globalmente por local Cloudflare), e não garantem um teto monetário absoluto.
- **O mapa sumiu ou deixou de ler o Sheets:** verifique se você copiou o pacote **por cima** do repositório existente, sem apagar `docs/src/`, `docs/config.js`, `.github/` ou as credenciais já existentes. Use a branch de backup se precisar reverter.
- **O site ficou desatualizado:** em `Settings > Pages`, confira `Deploy from a branch > main > /docs`.

## Privacidade, menor de idade e saúde

- Chat sem autenticação e sem coleta deliberada de nome, CPF, endereço ou prontuário.
- Histórico em `sessionStorage` do navegador, apagável pelo botão Nova conversa. O Worker não possui banco de conversas.
- As últimas mensagens vão para a API OpenAI **somente quando a IA está habilitada**; requisições usam `store:false`, mas isso não é garantia de retenção zero em todos os provedores.
- Filtros básicos impedem envio de formatos comuns de CPF, e-mail e telefone, mas nenhuma filtragem de texto livre é perfeita.
- O personagem declara que é uma IA, não é canal oficial do Ministério da Saúde e não substitui atendimento profissional.
- O modo Fortalece PSE utiliza a base de fatos confirmados em `zegotinha-worker/facts.js`; atualize essa base apenas com informações aprovadas. Nenhum calendário ou conteúdo de saúde é buscado na web em tempo real.
- **Antes do evento com crianças e adolescentes**, faça revisão da organização sobre comunicação de privacidade, LGPD, uso de IA com menores, moderação, políticas de provedores e eventual avaliação jurídica/técnica. Esta versão oferece salvaguardas, mas não é uma certificação de conformidade jurídica.

### Referências informativas

- Programa Saúde na Escola: https://www.gov.br/saude/pt-br/composicao/saps/pse
- Temas do PSE: https://www.gov.br/saude/pt-br/composicao/saps/pse/faq/quais-sao-as-acoes-do
- API OpenAI: https://developers.openai.com/api/reference/resources/responses/methods/create
- Cloudflare Rate Limiting: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Arquivos alterados ou adicionados

```text
fortalece-pse-vozes-do-brasil/           (repositório existente, NÃO deletar)
├─ docs/
│  ├─ index.html                         (ATUALIZADO: novo botão no mapa)
│  ├─ zap-launcher.css                   (NOVO: visual responsivo do botão)
│  ├─ ze-gotinha/                        (NOVO: página do chat integrada)
│  │  ├─ index.html
│  │  ├─ styles.css
│  │  ├─ app.js
│  │  ├─ config.js                       (EDITAR com a URL DO WORKER após deploy)
│  │  ├─ privacidade.html
│  │  └─ assets/                         (mascote, símbolos e logos da Mostra)
│  ├─ src/                               (PRESERVADO: mapa e leitura de dados)
│  ├─ assets/                            (PRESERVADO: imagens originais)
│  ├─ admin.html / admin.css / admin.js  (PRESERVADOS)
│  └─ config.js                          (PRESERVADO: chave pública Supabase)
├─ zegotinha-worker/
│  ├─ worker.js                          (NOVO: IA e regras)
│  ├─ facts.js                           (NOVO: informações confirmadas)
│  ├─ wrangler.toml                      (NOVO: domínio e rate limits)
│  ├─ package.json
│  ├─ .dev.vars.example
│  ├─ .gitignore                          (protege segredos locais)
│  └─ test-worker.mjs                    (teste técnico com IA simulada)
├─ .github/                              (PRESERVADO: sincronização Sheets)
├─ scripts/                              (PRESERVADO)
└─ supabase/                             (PRESERVADO)
```

**Testes realizados nesta entrega:** sintaxe dos arquivos JavaScript, mock da API do Worker (CORS, dados pessoais, histórico, modo Fortalece e `store:false`), responsividade nas larguras de 1440, 768, 390 e 320 pixels, quiz, fake news demonstrativo e reinício da conversa. **Não foi feito deploy real, uso de chave OpenAI real, teste contra sua base Supabase em produção ou publicação no GitHub pelo ChatGPT.**
