import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import type { Request, Response, NextFunction } from "express";

import { createHubSpotClient } from "./services/hubspot-client.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerCompanyTools } from "./tools/companies.js";
import { registerDealTools } from "./tools/deals.js";
import { registerSearchTools } from "./tools/search.js";

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
    // No key configured — pass through (dev mode only)
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

// ── Transport: stdio ──────────────────────────────────────────────────────────

async function runStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HubSpot MCP server running via stdio");
}

// ── Transport: HTTP ───────────────────────────────────────────────────────────

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Public health check — no auth required
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "hubspot-mcp-server", version: "1.0.0" });
  });

  // All MCP requests require a valid bearer token
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

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`HubSpot MCP server running on http://localhost:${port}/mcp`);
    if (process.env.MCP_API_KEY) {
      console.error("Bearer token auth: ENABLED");
    } else {
      console.error("WARNING: MCP_API_KEY not set — server is open, set this in production");
    }
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

const transport = process.env.TRANSPORT ?? "http";

if (transport === "http") {
  runHTTP().catch((err: unknown) => {
    console.error("Server error:", err);
    process.exit(1);
  });
} else {
  runStdio().catch((err: unknown) => {
    console.error("Server error:", err);
    process.exit(1);
  });
}
