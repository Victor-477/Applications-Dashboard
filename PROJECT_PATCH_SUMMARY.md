# Applications Dashboard Patch Summary

Este arquivo resume as principais alteracoes do projeto para facilitar commits futuros no GitHub.

## Versao atual

- Versao: 2.2.0
- Data: 2026-05-26
- Area principal: configuracoes gerais, importacao/exportacao de instancias e documentacao de patches.

## 2.2.0

- Adicionada categoria de configuracoes das instancias em Configuracoes > Geral.
- Adicionado backup das instancias cadastradas em JSON.
- Adicionada importacao de instancias via JSON para configurar varias instancias de uma unica vez.
- Adicionada opcao para substituir as instancias atuais durante a importacao.
- Adicionada validacao no backend para payloads importados.
- Adicionados logs do sistema para exportacao, sucesso e falha de importacao.
- Atualizado versionamento do aplicativo para 2.2.0.

## 2.1.0

- Reorganizada a aba Geral em categorias claras.
- Ajustado cabecalho fixo em Configuracoes e Patch Files.
- A rolagem passou a acontecer somente no conteudo das abas.
- Commits da pagina Patch Files passaram a ser clicaveis.
- Detalhes de commit passaram a exibir hash, data, titulo e descricao.
- Adicionado fallback para leitura de commits quando o executavel git nao puder ser chamado.

## 0.1.0

- Adicionada navegacao lateral com Home, HomePage, AI Chat, Patch Files e Settings.
- Adicionada configuracao de URL da HomePage.
- Adicionada pagina AI Chat com configuracao local de provider, modelo e API key.
- Adicionada pagina Patch Files com notas de versao e commits recentes.
- Adicionados filtros e formatos de exportacao dos logs do sistema.
- Removida exclusao de instancias da tela inicial, mantendo a acao somente em Configuracoes.

## Base inicial

- Criado layout em cards para servicos.
- Adicionado terminal lateral para a instancia selecionada.
- Adicionado painel lateral de criacao e edicao de instancias.
- Adicionados controles de habilitar e desabilitar instancias.
- Adicionados logs locais do sistema.

## Arquivos importantes para commits

- `package.json`: versao do aplicativo e scripts.
- `package-lock.json`: versao travada do pacote raiz.
- `patch-notes.json`: historico exibido na pagina Patch Files.
- `server.ts`: endpoints, execucao local, logs, importacao/exportacao e AI Chat.
- `src/App.tsx`: layout principal, navegacao lateral e rodape.
- `src/components/SettingsView.tsx`: abas de configuracoes, logs e ferramentas gerais.
- `src/components/PatchFilesView.tsx`: exibicao de notas e commits.
- `src/i18n.ts`: traducoes de interface.
- `src/types.ts`: contratos compartilhados entre frontend e backend.

## Checklist antes de commitar

1. Atualizar `package.json` e `package-lock.json` com a nova versao.
2. Adicionar uma entrada nova em `patch-notes.json`.
3. Atualizar este arquivo com o resumo da nova versao.
4. Rodar `npm run lint`.
5. Rodar `npm run build`.
6. Validar `http://127.0.0.1:3000/` quando a alteracao impactar interface ou API.
