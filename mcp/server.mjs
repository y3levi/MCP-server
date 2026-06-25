import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDir, "..");
const allowedRoots = ["assets", "packages", "presets", "src", "default.project.json"];
const textExtensions = new Set([
	".json",
	".lua",
	".luau",
	".md",
	".txt",
	".toml",
	".yml",
	".yaml",
]);

function isInside(parent, child) {
	const relative = path.relative(parent, child);
	return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toProjectPath(absolutePath) {
	return path.relative(projectRoot, absolutePath).replaceAll(path.sep, "/");
}

function safeProjectPath(relativePath) {
	if (!relativePath || path.isAbsolute(relativePath)) {
		throw new Error("Use a relative project path.");
	}

	const normalized = path.normalize(relativePath);
	const firstSegment = normalized.split(path.sep)[0];

	if (!allowedRoots.includes(firstSegment) && !allowedRoots.includes(normalized)) {
		throw new Error(`Path is outside allowed project roots: ${allowedRoots.join(", ")}`);
	}

	const absolutePath = path.resolve(projectRoot, normalized);

	if (!isInside(projectRoot, absolutePath)) {
		throw new Error("Path escapes the project root.");
	}

	return absolutePath;
}

async function exists(absolutePath) {
	try {
		await fs.access(absolutePath);
		return true;
	} catch {
		return false;
	}
}

async function walkFiles(root, limit, files = []) {
	if (files.length >= limit || !(await exists(root))) {
		return files;
	}

	const entries = await fs.readdir(root, { withFileTypes: true });

	for (const entry of entries) {
		if (files.length >= limit) {
			break;
		}

		const absolutePath = path.join(root, entry.name);

		if (entry.isDirectory()) {
			await walkFiles(absolutePath, limit, files);
		} else if (entry.isFile()) {
			const stat = await fs.stat(absolutePath);
			files.push({
				path: toProjectPath(absolutePath),
				bytes: stat.size,
				extension: path.extname(entry.name),
			});
		}
	}

	return files;
}

async function listProjectAssets(args = {}) {
	const includeSrc = Boolean(args.includeSrc);
	const limit = Number.isInteger(args.limit) ? Math.max(1, Math.min(args.limit, 500)) : 200;
	const roots = includeSrc ? ["assets", "packages", "presets", "src"] : ["assets", "packages", "presets"];
	const files = [];

	for (const root of roots) {
		await walkFiles(path.join(projectRoot, root), limit, files);
		if (files.length >= limit) {
			break;
		}
	}

	return {
		roots,
		count: files.length,
		files,
	};
}

async function readProjectFile(args = {}) {
	const relativePath = String(args.path || "");
	const absolutePath = safeProjectPath(relativePath);
	const stat = await fs.stat(absolutePath);

	if (!stat.isFile()) {
		throw new Error("Path is not a file.");
	}

	if (stat.size > 256 * 1024) {
		throw new Error("File is too large to read through this MCP server.");
	}

	const extension = path.extname(absolutePath).toLowerCase();

	if (!textExtensions.has(extension)) {
		throw new Error(`Unsupported text extension: ${extension || "(none)"}`);
	}

	return {
		path: toProjectPath(absolutePath),
		bytes: stat.size,
		text: await fs.readFile(absolutePath, "utf8"),
	};
}

function collectRojoMappings(node, instancePath = [], mappings = []) {
	if (!node || typeof node !== "object") {
		return mappings;
	}

	if (typeof node.$path === "string") {
		mappings.push({
			instance: instancePath.join("/"),
			path: node.$path,
		});
	}

	for (const [key, value] of Object.entries(node)) {
		if (!key.startsWith("$") && value && typeof value === "object") {
			collectRojoMappings(value, [...instancePath, key], mappings);
		}
	}

	return mappings;
}

async function rojoProjectSummary() {
	const projectPath = path.join(projectRoot, "default.project.json");
	const project = JSON.parse(await fs.readFile(projectPath, "utf8"));
	const mappings = collectRojoMappings(project.tree, [project.name || "DataModel"]);

	return {
		name: project.name,
		className: project.tree?.$className,
		mappings,
		assetRoots: mappings.filter((mapping) => ["assets", "packages", "presets"].includes(mapping.path)),
	};
}

const tools = {
	list_project_assets: {
		description: "List files inside the project's assets, packages, presets, and optionally src folders.",
		inputSchema: {
			type: "object",
			properties: {
				includeSrc: {
					type: "boolean",
					description: "Also include files under src.",
				},
				limit: {
					type: "integer",
					minimum: 1,
					maximum: 500,
					description: "Maximum number of files to return.",
				},
			},
			additionalProperties: false,
		},
		handler: listProjectAssets,
	},
	read_project_file: {
		description: "Read a small text file from allowed project roots.",
		inputSchema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "Relative path under assets, packages, presets, src, or default.project.json.",
				},
			},
			required: ["path"],
			additionalProperties: false,
		},
		handler: readProjectFile,
	},
	rojo_project_summary: {
		description: "Summarize the Rojo project name, root class, and mapped paths.",
		inputSchema: {
			type: "object",
			properties: {},
			additionalProperties: false,
		},
		handler: rojoProjectSummary,
	},
};

const resources = [
	{
		uri: "bibi://project/default.project.json",
		name: "default.project.json",
		description: "Rojo project configuration.",
		mimeType: "application/json",
		path: "default.project.json",
	},
	{
		uri: "bibi://assets",
		name: "assets",
		description: "Installed project assets folder listing.",
		mimeType: "application/json",
		listingRoot: "assets",
	},
	{
		uri: "bibi://packages",
		name: "packages",
		description: "Installed project packages folder listing.",
		mimeType: "application/json",
		listingRoot: "packages",
	},
	{
		uri: "bibi://presets",
		name: "presets",
		description: "Installed community presets folder listing.",
		mimeType: "application/json",
		listingRoot: "presets",
	},
];

function result(id, value) {
	return JSON.stringify({ jsonrpc: "2.0", id, result: value });
}

function errorResult(id, code, message) {
	return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
}

function textToolResult(value) {
	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(value, null, 2),
			},
		],
	};
}

async function handleRequest(message) {
	const { id, method, params } = message;

	try {
		if (method === "initialize") {
			return result(id, {
				protocolVersion: params?.protocolVersion || "2024-11-05",
				capabilities: {
					tools: {},
					resources: {},
				},
				serverInfo: {
					name: "bibi-blox-assets",
					version: "0.1.0",
				},
			});
		}

		if (method === "notifications/initialized") {
			return null;
		}

		if (method === "tools/list") {
			return result(id, {
				tools: Object.entries(tools).map(([name, tool]) => ({
					name,
					description: tool.description,
					inputSchema: tool.inputSchema,
				})),
			});
		}

		if (method === "tools/call") {
			const tool = tools[params?.name];

			if (!tool) {
				throw new Error(`Unknown tool: ${params?.name}`);
			}

			return result(id, textToolResult(await tool.handler(params?.arguments || {})));
		}

		if (method === "resources/list") {
			return result(id, { resources: resources.map(({ path: _path, listingRoot: _listingRoot, ...resource }) => resource) });
		}

		if (method === "resources/read") {
			const resource = resources.find((item) => item.uri === params?.uri);

			if (!resource) {
				throw new Error(`Unknown resource: ${params?.uri}`);
			}

			let text;

			if (resource.path) {
				text = await fs.readFile(safeProjectPath(resource.path), "utf8");
			} else {
				const files = await walkFiles(path.join(projectRoot, resource.listingRoot), 500);
				text = JSON.stringify({ root: resource.listingRoot, files }, null, 2);
			}

			return result(id, {
				contents: [
					{
						uri: resource.uri,
						mimeType: resource.mimeType,
						text,
					},
				],
			});
		}

		return errorResult(id, -32601, `Method not found: ${method}`);
	} catch (error) {
		return errorResult(id, -32000, error.message);
	}
}

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
	buffer += chunk;

	while (buffer.includes("\n")) {
		const index = buffer.indexOf("\n");
		const line = buffer.slice(0, index).trim();
		buffer = buffer.slice(index + 1);

		if (!line) {
			continue;
		}

		const response = await handleRequest(JSON.parse(line));

		if (response) {
			process.stdout.write(`${response}\n`);
		}
	}
});
