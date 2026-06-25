# bibi_Blox MCP

This folder contains a small local MCP server for project tooling.

It exposes safe read-only access to the Rojo project structure, installed asset
folders, packages, and presets.

## Server

Run from the project root:

```powershell
node mcp/server.mjs
```

MCP clients can use the root `.mcp.json`:

```json
{
  "mcpServers": {
    "bibi-blox-assets": {
      "command": "node",
      "args": ["mcp/server.mjs"]
    }
  }
}
```

## Tools

- `list_project_assets`: Lists files inside `assets`, `packages`, `presets`, and optionally `src`.
- `read_project_file`: Reads a safe project file by relative path.
- `rojo_project_summary`: Summarizes the Rojo tree and mapped paths from `default.project.json`.

## Resources

- `bibi://project/default.project.json`
- `bibi://assets`
- `bibi://packages`
- `bibi://presets`
