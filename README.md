# hubspot-mcp-server

A Model Context Protocol (MCP) server for the HubSpot CRM API — works both locally via Claude Desktop (stdio) and remotely via claude.ai (HTTP + bearer token).

---

## Tools

| Domain | Tools |
|--------|-------|
| **Contacts** | `hubspot_get_contact`, `hubspot_list_contacts`, `hubspot_create_contact`, `hubspot_update_contact`, `hubspot_delete_contact` |
| **Companies** | `hubspot_get_company`, `hubspot_list_companies`, `hubspot_create_company`, `hubspot_update_company`, `hubspot_delete_company` |
| **Deals** | `hubspot_get_deal`, `hubspot_list_deals`, `hubspot_create_deal`, `hubspot_update_deal`, `hubspot_delete_deal` |
| **Search & Assoc.** | `hubspot_search`, `hubspot_associate_records`, `hubspot_list_associations` |

---

## Setup

### 1. Create a HubSpot Private App

1. Go to **HubSpot → Settings → Integrations → Private Apps**
2. Click **Create a private app**, then under **Scopes** add:
   - `crm.objects.contacts.read` + `write`
   - `crm.objects.companies.read` + `write`
   - `crm.objects.deals.read` + `write`
3. Copy the generated **Access Token**

### 2. Install & Build

```bash
npm install
npm run build
```

---

## Option A — Claude Desktop (local, stdio)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hubspot": {
      "command": "node",
      "args": ["/absolute/path/to/hubspot-mcp-server/dist/index.js"],
      "env": {
        "HUBSPOT_ACCESS_TOKEN": "pat-your-token-here"
      }
    }
  }
}
```

Restart Claude Desktop — the tools will appear automatically.

---

## Option B — claude.ai browser (remote, HTTP via Render)

### Step 1 — Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo
4. Render detects `render.yaml` automatically. Set these **Environment Variables** in the dashboard:

   | Key | Value |
   |-----|-------|
   | `HUBSPOT_ACCESS_TOKEN` | Your HubSpot private app token |
   | `MCP_API_KEY` | A strong random secret you generate (e.g. `openssl rand -hex 32`) |
   | `TRANSPORT` | `http` |

5. Deploy. Your URL will be: `https://hubspot-mcp-server.onrender.com`

> **Free tier note:** Render's free tier spins down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds. Upgrade to Starter ($7/mo) to keep it always-on.

### Step 2 — Connect in claude.ai

1. Go to **claude.ai → Settings → Integrations**
2. Click **Add MCP Server**
3. Fill in:
   - **URL:** `https://hubspot-mcp-server.onrender.com/mcp`
   - **Header name:** `Authorization`
   - **Header value:** `Bearer <your MCP_API_KEY>`
4. Click **Connect** — the 15 HubSpot tools will appear in your next conversation

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HUBSPOT_ACCESS_TOKEN` | ✅ | HubSpot private app token |
| `MCP_API_KEY` | ✅ (HTTP mode) | Bearer token that Claude.ai sends to authenticate |
| `TRANSPORT` | No | `stdio` (default) or `http` |
| `PORT` | No | HTTP port, default `3000` (Render sets this automatically) |

---

## Generate a secure MCP_API_KEY

```bash
openssl rand -hex 32
```

Copy the output into Render's environment variables and into the claude.ai header value field.

---

## Local HTTP testing

```bash
HUBSPOT_ACCESS_TOKEN=pat-xxx MCP_API_KEY=mysecret TRANSPORT=http node dist/index.js

# Test auth
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mysecret" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Health check (no auth)
curl http://localhost:3000/health
```
