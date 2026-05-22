# Guia de release

Este guia é para quem vai publicar uma versão do Applications Dashboard no GitHub Releases.

## 1. Preparar o ambiente

Instale as dependências:

```bash
npm install
```

Valide o projeto:

```bash
npm run lint
npm run build
```

## 2. Gerar a versão portable

Use:

```bash
npm run package:win:zip
```

O pacote será criado em:

```text
release/APPDashboard/
```

O `.zip` pronto para anexar será criado em:

```text
release/APPDashboard-windows-portable.zip
```

O executável principal será:

```text
release/APPDashboard/APPDashboard.exe
```

## 3. Testar antes de publicar

Abra:

```text
release/APPDashboard/APPDashboard.exe
```

Confira:

- A janela abre corretamente.
- A lista de apps aparece.
- O painel consegue iniciar e parar um processo de teste.
- Os logs aparecem no painel.

## 4. Compactar para o GitHub

Se você usou `npm run package:win:zip`, o arquivo já está pronto. Se preferir compactar manualmente, compacte a pasta inteira:

```text
release/APPDashboard/
```

Nome sugerido:

```text
APPDashboard-windows-portable.zip
```

Importante: não publique apenas `APPDashboard.exe`. A aplicação depende dos arquivos auxiliares do Electron que ficam na mesma pasta.

## 5. Criar a release no GitHub

No GitHub:

1. Abra a aba **Releases**.
2. Clique em **Draft a new release**.
3. Crie uma tag, por exemplo `v1.0.0`.
4. Anexe `APPDashboard-windows-portable.zip`.
5. Descreva as principais mudanças e instruções de uso.

Texto curto sugerido para a release:

```text
Baixe o arquivo APPDashboard-windows-portable.zip, extraia a pasta e execute APPDashboard.exe.

Não é necessário instalar Node.js nem baixar o código fonte para usar esta versão.
```

## Checklist de publicação

- `npm run lint` passou.
- `npm run build` passou.
- `npm run package:win:full` gerou `release/APPDashboard`.
- O executável abriu no Windows.
- A API local respondeu em `http://127.0.0.1:3764/api/apps`.
- O `.zip` contém a pasta completa da aplicação.
