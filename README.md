# hubspot-mcp-server

A Model Context Protocol (MCP) server for the HubSpot CRM and CMS APIs — works both locally via Claude Desktop (stdio) and remotely via claude.ai (HTTP + bearer token).

---

## Tools

| Domain | Tools |
|--------|-------|
| **Contacts** | `hubspot_get_contact`, `hubspot_list_contacts`, `hubspot_create_contact`, `hubspot_update_contact`, `hubspot_delete_contact` |
| **Companies** | `hubspot_get_company`, `hubspot_list_companies`, `hubspot_create_company`, `hubspot_update_company`, `hubspot_delete_company` |
| **Deals** | `hubspot_get_deal`, `hubspot_list_deals`, `hubspot_create_deal`, `hubspot_update_deal`, `hubspot_delete_deal` |
| **Search & Assoc.** | `hubspot_search`, `hubspot_associate_records`, `hubspot_list_associations` |
| **CMS: Website pages** | `hubspot_cms_list_pages`, `hubspot_cms_get_page`, `hubspot_cms_create_page`, `hubspot_cms_clone_page`, `hubspot_cms_update_page_draft`, `hubspot_cms_publish_page` |
| **CMS: Design Manager** | `hubspot_cms_get_file`, `hubspot_cms_get_file_metadata`, `hubspot_cms_upload_file`, `hubspot_cms_upload_module` |

### How the CMS tools work

- **Pages** use the CMS Pages API (`/cms/v3/pages/site-pages`). Edits go to the page **draft** with `hubspot_cms_update_page_draft`; nothing is live until `hubspot_cms_publish_page`. HubSpot replaces each top-level field you send (for example `layoutSections`), so read the draft with `hubspot_cms_get_page` (`draft: true`) and send the full value back.
- **Publishing** pushes the draft live for a page that is already published, and schedules an immediate publish for a page that has never been live.
- **Design Manager files** (templates, partials, modules, CSS, JS) use the CMS Source Code API (`/cms/v3/source-code`). Uploads to the `published` environment (the default) are **live immediately** on every page that uses the file, so read a file with `hubspot_cms_get_file` before replacing it.
- **`hubspot_cms_upload_module`** writes a whole custom module (`fields.json`, `meta.json`, `module.html`, and optional `module.css` / `module.js`) into a `.module` folder in your theme. It then appears in the page editor.
- The `/agent` endpoint does not use the CMS tools yet; they are available through `/mcp`.

---

## Setup

### 1. Create a HubSpot Private App

1. Go to **HubSpot → Settings → Integrations → Private Apps**
2. Click **Create a private app**, then under **Scopes** add:
   - `crm.objects.contacts.read` + `write`
   - `crm.objects.companies.read` + `write`
   - `crm.objects.deals.read` + `write`
   - `content` (website pages, templates, modules and theme files, used by the CMS tools)
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
4. Click **Connect**. The 28 HubSpot tools will appear in your next conversation

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HUBSPOT_ACCESS_TOKEN` | ✅ | HubSpot private app token |
| `MCP_API_KEY` | ✅ (HTTP mode) | Bearer token that Claude.ai sends to authenticate |
| `TRANSPORT` | No | `stdio` (default) or `http` |
| `PORT` | No | HTTP port, default `3000` (Render sets this automatically) |
| `HUBSPOT_BASE_URL` | No | API base URL, default `https://api.hubapi.com`. Only change it to test against a mock API |

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
