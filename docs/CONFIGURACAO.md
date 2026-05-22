# Configuração de aplicações

O arquivo `apps.json` guarda a lista de aplicações exibidas no dashboard. Ele pode ser editado pelo próprio painel ou manualmente.

## Exemplo completo

```json
[
  {
    "id": "database",
    "name": "Banco de Dados",
    "command": "mariadbd.exe",
    "args": "--datadir=./data --port=3307 --bind-address=127.0.0.1 --console",
    "port": "3307",
    "cwd": "database/mariadb/bin",
    "dependsOn": [],
    "shell": false
  },
  {
    "id": "backend",
    "name": "Backend API",
    "command": "npm",
    "args": "run dev",
    "port": "3000",
    "cwd": "../backend",
    "dependsOn": ["database"],
    "shell": true
  }
]
```

## Campos

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `id` | Sim | Identificador único. Use letras, números e hífens para facilitar dependências. |
| `name` | Sim | Nome exibido na interface. |
| `command` | Sim | Comando ou executável que será iniciado. |
| `args` | Não | Argumentos do comando. |
| `port` | Não | Porta usada para detectar se a aplicação está ativa e evitar duplicidade. |
| `cwd` | Não | Diretório inicial do processo. Se vazio, usa a pasta do painel. |
| `dependsOn` | Não | Lista de `id`s que devem iniciar antes deste app. |
| `shell` | Não | `true` executa pelo shell do Windows; `false` executa diretamente o binário. |

## Diretórios relativos

O campo `cwd` aceita caminhos absolutos ou relativos.

Exemplos:

```json
"cwd": "C:\\Projetos\\backend"
```

```json
"cwd": "../backend"
```

Quando o caminho relativo não existe a partir da pasta do painel, o servidor tenta resolver a partir da raiz do projeto que contém pastas como `backend`, `erp` e `loja`.

## Dependências

Use `dependsOn` quando um serviço depende de outro.

```json
{
  "id": "frontend",
  "name": "Frontend",
  "command": "npm",
  "args": "run dev",
  "port": "5173",
  "cwd": "../frontend",
  "dependsOn": ["backend"],
  "shell": true
}
```

Ao iniciar `frontend`, o dashboard tenta iniciar `backend` antes.

## Uso de porta

Quando `port` é informado, o dashboard verifica `127.0.0.1:<porta>`.

Se a porta já estiver aberta, o serviço aparece como ativo e o painel evita iniciar outro processo igual. Ao parar, o dashboard também pode tentar encerrar o processo que ocupa a porta no Windows.

## Quando usar `shell`

Use `shell: true` para comandos normalmente executados no terminal, como:

```json
{
  "command": "npm",
  "args": "run dev",
  "shell": true
}
```

Use `shell: false` para executáveis diretos quando quiser evitar interpretação pelo shell:

```json
{
  "command": "C:\\Ferramentas\\app.exe",
  "args": "--port 8080",
  "shell": false
}
```

## Logs

Tudo que o processo escrever em stdout e stderr aparece no painel de logs da aplicação selecionada. O servidor mantém as últimas 1000 linhas por app enquanto está em execução.
