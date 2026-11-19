# Correção definitiva do alinhamento da foto do perfil

Esta atualização contém os arquivos do painel administrativo e a correção da animação da foto na página pública.

## Instalação
1. Extraia o ZIP na raiz do repositório `fortalece-pse-vozes-do-brasil`.
2. Mescle a pasta `docs` com a pasta `docs` existente e aceite substituir os arquivos.
3. Confirme que `docs/src/styles.css` foi substituído.
4. Faça commit e Push para a branch `main`.
5. Após o GitHub Pages publicar, abra o site e faça Ctrl+F5 (ou teste em janela anônima).

## O que foi corrigido
A animação anterior aplicava `transform: translateY(...)` ao elemento `.avatar`. Isso sobrescrevia o `transform: translateX(-50%)` usado para centralizar a foto. Agora a animação da foto altera somente a opacidade, preservando permanentemente a centralização horizontal.

## Arquivos incluídos
- `docs/admin.html`
- `docs/admin.css`
- `docs/admin.js`
- `docs/src/styles.css`

Não substitua `docs/config.js`, arquivos de sincronização, banco de dados ou Secrets.
