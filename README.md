# MCP server

Projeto Roblox organizado com Rojo, suporte local a assets/presets e um MCP server simples para consultar a estrutura do projeto.

## Estrutura

```text
assets/              Assets sincronizados para ReplicatedStorage.Assets
packages/            Pacotes sincronizados para ReplicatedStorage.Packages
presets/             Presets sincronizados para ReplicatedStorage.Presets
src/client/          Scripts de cliente
src/server/          Scripts de servidor
src/shared/          Modulos compartilhados
src/workspace/       Mapa e objetos do Workspace
mcp/                 MCP server local do projeto
default.project.json Configuracao principal do Rojo
```

## Rojo

Para iniciar o servidor Rojo:

```powershell
.\rojo.exe serve default.project.json
```

Para gerar um arquivo local de build:

```powershell
.\rojo.exe build default.project.json --output bibi.rbxlx
```

Arquivos `.rbxl`, `.rbxlx`, `.rbxm` e `.rbxmx` sao gerados/localmente exportados e ficam fora do Git por padrao.

## Assets e Presets

Use estas pastas para conteudo local do projeto:

- `assets`: modelos, imagens, sons e outros recursos do jogo.
- `packages`: modulos e pacotes reutilizaveis.
- `presets`: presets da comunidade ou configuracoes prontas.

Essas pastas aparecem em `ReplicatedStorage` quando o projeto e sincronizado pelo Rojo.

## MCP

O projeto inclui um MCP server local em `mcp/server.mjs`.

Ele expoe:

- `list_project_assets`
- `read_project_file`
- `rojo_project_summary`

Para testar manualmente:

```powershell
node mcp/server.mjs
```

Clientes MCP podem usar a configuracao em `.mcp.json`.
