# Applications Dashboard

Dashboard desktop para Windows que centraliza a execução de aplicações, serviços e comandos locais que normalmente precisam ser iniciados pelo terminal.

Ele foi pensado para cenários em que vários programas precisam subir em ordem, como banco de dados, backend, frontends e ferramentas auxiliares. A aplicação permite cadastrar comandos, iniciar e parar processos, acompanhar logs em tempo real e respeitar dependências entre serviços.

## Para quem só quer usar

Baixe a versão mais recente na área **Releases** do GitHub.

1. Faça download do arquivo `.zip` da release.
2. Extraia a pasta em qualquer lugar do Windows.
3. Abra `APPDashboard.exe`.
4. Use o botão **Novo App** para cadastrar os programas que deseja executar.

Não é necessário baixar o código fonte, instalar Node.js ou rodar comandos de desenvolvimento para usar a versão release.

## Recursos

- Interface desktop em Electron.
- API local em Express executada junto com o aplicativo.
- Cadastro, edição e exclusão de aplicações.
- Start/stop de processos locais.
- Leitura de logs em tempo real.
- Detecção de processo ativo por porta.
- Encerramento de árvore de processos no Windows.
- Suporte a dependências entre aplicações.
- Build portable para distribuição.

## Como funciona

O painel lê as aplicações cadastradas em `apps.json`. Cada item descreve o comando, argumentos, diretório inicial, porta monitorada e dependências.

Quando um app é iniciado, o servidor local:

1. Inicia primeiro as dependências configuradas em `dependsOn`.
2. Verifica se a porta já está em uso, quando uma porta foi informada.
3. Executa o comando no diretório configurado.
4. Envia stdout/stderr para o visualizador de logs.
5. Permite parar o processo pelo painel.

## Configuração dos apps

Exemplo de `apps.json`:

```json
[
  {
    "id": "backend-local",
    "name": "Backend API",
    "command": "npm",
    "args": "run dev",
    "port": "3000",
    "cwd": "../backend",
    "dependsOn": [],
    "shell": true
  }
]
```

Campos principais:

- `id`: identificador único usado internamente e em dependências.
- `name`: nome exibido no painel.
- `command`: executável ou comando base.
- `args`: argumentos passados para o comando.
- `port`: porta usada para detectar se o serviço está ativo.
- `cwd`: diretório de execução. Pode ser absoluto ou relativo.
- `dependsOn`: lista de `id`s que devem iniciar antes deste app.
- `shell`: quando `true`, executa pelo shell do Windows; quando `false`, executa diretamente o programa.

Mais detalhes estão em [docs/CONFIGURACAO.md](docs/CONFIGURACAO.md).

## Desenvolvimento

Requisitos:

- Windows
- Node.js 20 ou superior
- npm

Instalação:

```bash
npm install
```

Rodar em modo desenvolvimento:

```bash
npm run dev
```

Gerar build de produção:

```bash
npm run build
```

Validar TypeScript:

```bash
npm run lint
```

Abrir como aplicativo desktop local:

```bash
npm run desktop
```

Gerar versão portable para Windows:

```bash
npm run package:win:full
```

Gerar a versão portable já compactada para anexar no GitHub Releases:

```bash
npm run package:win:zip
```

O executável será criado em:

```text
release/APPDashboard/APPDashboard.exe
```

## Publicação de release

Para publicar uma versão no GitHub Releases, gere o pacote portable e compacte a pasta `release/APPDashboard`.

O usuário final deve receber o `.zip` com a pasta completa, não apenas o `.exe`, porque o Electron depende dos arquivos auxiliares que ficam ao lado do executável.

Passo a passo recomendado em [docs/RELEASE.md](docs/RELEASE.md).

## Scripts disponíveis

- `npm run dev`: inicia o servidor com Vite em modo desenvolvimento.
- `npm run lint`: executa validação TypeScript sem emitir arquivos.
- `npm run build`: gera frontend e servidor em `dist`.
- `npm run start`: executa o servidor compilado em `dist/server.cjs`.
- `npm run desktop`: gera build e abre o Electron.
- `npm run package:win`: empacota a pasta portable usando o build atual.
- `npm run package:win:full`: gera build e empacota a pasta portable.
- `npm run package:win:zip`: gera build, empacota a pasta portable e cria `release/APPDashboard-windows-portable.zip`.
- `npm run clean`: remove `dist`.

## Testes realizados

Validações feitas neste projeto:

- `npm run lint`
- `npm run build`
- Teste HTTP do servidor compilado em modo produção.
- Teste funcional de iniciar/parar processo local e capturar logs.
- `npm run package:win`
- Abertura do executável `release/APPDashboard/APPDashboard.exe` e consulta da API local.

## Estrutura do projeto

```text
.
├── electron/              # Inicialização do Electron
├── scripts/               # Scripts de empacotamento
├── src/                   # Interface React
├── public/                # Arquivos públicos copiados para o build
├── server.ts              # API local e controle de processos
├── apps.json              # Aplicações cadastradas
├── package.json           # Scripts e dependências
└── docs/                  # Documentação complementar
```

## Observações de segurança

Este aplicativo executa comandos locais cadastrados pelo usuário. Use apenas configurações confiáveis e revise comandos antes de iniciar processos, principalmente quando `shell` estiver habilitado.
