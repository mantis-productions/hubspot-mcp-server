import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import type { Request, Response, NextFunction } from "express";

import { createHubSpotClient } from "./services/hubspot-client.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerCompanyTools } from "./tools/companies.js";
import { registerDealTools } from "./tools/deals.js";
import { registerSearchTools } from "./tools/search.js";
import { runAgent } from "./agents/hubspot-agent.js";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function getHubSpotToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "HUBSPOT_ACCESS_TOKEN environment variable is required.\n" +
      "Create a Private App in HubSpot: Settings → Integrations → Private Apps\n" +
      "Required scopes: crm.objects.contacts.read/write, crm.objects.companies.read/write, crm.objects.deals.read/write"
    );
  }
  return token;
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required for agent endpoints.");
  }
  return new Anthropic({ apiKey });
}

function buildServer(): McpServer {
  const accessToken = getHubSpotToken();
  const client = createHubSpotClient(accessToken);

  const server = new McpServer({
    name: "hubspot-mcp-server",
    version: "1.0.0",
  });

  registerContactTools(server, client);
  registerCompanyTools(server, client);
  registerDealTools(server, client);
  registerSearchTools(server, client);

  return server;
}

// ── Auth middleware ───────────────────────────────────────────────────────────

function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) {
    next();
    return;
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing Authorization: Bearer <token> header",
    });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== apiKey) {
    res.status(403).json({
      error: "Forbidden",
      message: "Invalid API key",
    });
    return;
  }

  next();
}

// ── HTTP server (always — stdio removed) ─────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "hubspot-mcp-server", version: "1.0.0" });
});

app.post("/mcp", requireBearerToken, async (req: Request, res: Response) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// ── Agent endpoint ────────────────────────────────────────────────────────────

app.post("/agent", requireBearerToken, async (req: Request, res: Response) => {
  const { prompt, max_turns } = req.body as { prompt?: string; max_turns?: number };

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "Bad Request", message: "prompt (string) is required" });
    return;
  }

  try {
    const anthropic = getAnthropicClient();
    const hubspotClient = createHubSpotClient(getHubSpotToken());
    const result = await runAgent(anthropic, hubspotClient, prompt.trim(), max_turns);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Agent error", message });
  }
});

const port = parseInt(process.env.PORT ?? "3000", 10);
app.listen(port, () => {
  console.log(`HubSpot MCP server running on port ${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`Auth: ${process.env.MCP_API_KEY ? "ENABLED" : "WARNING: MCP_API_KEY not set"}`);
});
