import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AxiosInstance } from "axios";
import {
  ListPagesSchema,
  GetPageSchema,
  CreatePageSchema,
  ClonePageSchema,
  UpdatePageDraftSchema,
  PublishPageSchema,
  GetSourceFileSchema,
  GetSourceMetadataSchema,
  UploadSourceFileSchema,
  UploadModuleSchema,
} from "../schemas/index.js";
import { truncate } from "../services/hubspot-client.js";
import { CHARACTER_LIMIT } from "../constants.js";
import type { CmsPage, CmsPageSummary, HubSpotListResponse } from "../types.js";

const PAGES_URL = "/cms/v3/pages/site-pages";
const SOURCE_CODE_URL = "/cms/v3/source-code";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Encode each path segment but keep the slashes, so nested Design Manager paths resolve. */
function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function summarizePage(page: CmsPage): CmsPageSummary {
  return {
    id: page.id,
    name: page.name ?? null,
    slug: page.slug ?? null,
    url: page.url ?? null,
    htmlTitle: page.htmlTitle ?? null,
    state: page.state ?? null,
    currentlyPublished: page.currentlyPublished ?? null,
    templatePath: page.templatePath ?? null,
    updatedAt: page.updatedAt ?? null,
  };
}

function textResult<T extends object>(output: T) {
  return {
    content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2), CHARACTER_LIMIT) }],
    structuredContent: output as Record<string, unknown>,
  };
}

/** Upload one text file to the Design Manager. Replaces the file if it already exists. */
async function uploadSourceFile(
  client: AxiosInstance,
  environment: string,
  path: string,
  content: string
): Promise<void> {
  const fileName = path.split("/").pop() ?? "file";
  const form = new FormData();
  form.append("file", new Blob([content], { type: "text/plain" }), fileName);
  await client.put(`${SOURCE_CODE_URL}/${environment}/content/${encodePath(path)}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

function defaultModuleMeta(label: string): string {
  return JSON.stringify({
    label,
    css_assets: [],
    external_js: [],
    global: false,
    help_text: "",
    host_template_types: ["PAGE", "BLOG_POST", "BLOG_LISTING"],
    js_assets: [],
    other_assets: [],
    smart_type: "NOT_SMART",
    tags: [],
    is_available_for_new_content: true,
  }, null, 2);
}

// ── Tools ─────────────────────────────────────────────────────────────────────

export function registerCmsTools(server: McpServer, client: AxiosInstance): void {

  // ── Website pages ───────────────────────────────────────────────────────────

  server.registerTool("hubspot_cms_list_pages", {
    title: "List HubSpot Website Pages",
    description: `List website pages (CMS site pages) with their IDs, slugs and publish state.

Args:
  - limit (number): Results per page, 1-100 (default 20)
  - after (string): Pagination cursor from a previous response
  - nameContains (string): Filter by internal page name (case-insensitive)
  - slug (string): Filter by exact slug

Returns: { pages: [{ id, name, slug, url, htmlTitle, state, currentlyPublished, templatePath, updatedAt }], hasMore, nextCursor }`,
    inputSchema: ListPagesSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ limit, after, nameContains, slug }) => {
    const res = await client.get<HubSpotListResponse<CmsPage>>(PAGES_URL, {
      params: {
        limit,
        after,
        ...(nameContains ? { name__icontains: nameContains } : {}),
        ...(slug ? { slug } : {}),
      },
    });
    const pages = res.data.results.map(summarizePage);
    const nextCursor = res.data.paging?.next?.after;
    return textResult({ pages, hasMore: !!nextCursor, nextCursor, total: pages.length });
  });

  server.registerTool("hubspot_cms_get_page", {
    title: "Get HubSpot Website Page",
    description: `Read one website page, live or draft, including its module content.

Use draft=true before editing: it returns the unpublished draft the page editor shows. Module content lives in layoutSections (drag-and-drop areas) and widgets (template-level modules).

Args:
  - pageId (string): Page content ID
  - draft (boolean): Read the draft instead of the live page (default false)
  - includeLayout (boolean): Include layoutSections and widgets (default true)

Returns: Page summary plus, when includeLayout is true, layoutSections and widgets`,
    inputSchema: GetPageSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ pageId, draft, includeLayout }) => {
    const url = `${PAGES_URL}/${encodeURIComponent(pageId)}${draft ? "/draft" : ""}`;
    const res = await client.get<CmsPage>(url);
    const page = res.data;
    const output = includeLayout
      ? {
          ...summarizePage(page),
          metaDescription: page.metaDescription ?? null,
          layoutSections: page.layoutSections ?? {},
          widgets: page.widgets ?? {},
        }
      : { ...summarizePage(page), metaDescription: page.metaDescription ?? null };
    return textResult(output);
  });

  server.registerTool("hubspot_cms_create_page", {
    title: "Create HubSpot Website Page",
    description: `Create a new website page as an unpublished draft.

Tip: to match an existing design, read a similar page with hubspot_cms_get_page and reuse its templatePath and layoutSections, or use hubspot_cms_clone_page instead.

Args:
  - name (string): Internal page name
  - slug (string): URL slug without a leading slash
  - templatePath (string): Template path, e.g. 'my-theme/templates/home.html'
  - htmlTitle (string): HTML title (needed before publishing)
  - metaDescription (string): Meta description
  - layoutSections (object): Drag-and-drop module layout
  - widgets (object): Template-level module content

Returns: Created page summary with its new ID`,
    inputSchema: CreatePageSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ name, slug, templatePath, htmlTitle, metaDescription, layoutSections, widgets }) => {
    const payload: Record<string, unknown> = { name, slug, templatePath };
    if (htmlTitle !== undefined) payload.htmlTitle = htmlTitle;
    if (metaDescription !== undefined) payload.metaDescription = metaDescription;
    if (layoutSections !== undefined) payload.layoutSections = layoutSections;
    if (widgets !== undefined) payload.widgets = widgets;

    const res = await client.post<CmsPage>(PAGES_URL, payload);
    return textResult(summarizePage(res.data));
  });

  server.registerTool("hubspot_cms_clone_page", {
    title: "Clone HubSpot Website Page",
    description: `Duplicate an existing website page as a new unpublished draft, keeping its template and modules.

Follow with hubspot_cms_update_page_draft to set the new slug, titles and module content.

Args:
  - pageId (string): Content ID of the page to clone
  - cloneName (string): Internal name for the new page

Returns: Summary of the new page, including its ID`,
    inputSchema: ClonePageSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ pageId, cloneName }) => {
    const res = await client.post<CmsPage>(`${PAGES_URL}/clone`, { id: pageId, cloneName });
    return textResult(summarizePage(res.data));
  });

  server.registerTool("hubspot_cms_update_page_draft", {
    title: "Update HubSpot Website Page Draft",
    description: `Change fields on a page's draft. Nothing goes live until hubspot_cms_publish_page.

HubSpot replaces each top-level field you send, it does not merge them. To edit modules, read the draft with hubspot_cms_get_page (draft=true), change the module params inside layoutSections, and send the complete layoutSections back.

Args:
  - pageId (string): Page content ID
  - updates (object): Fields to set, e.g. slug, name, htmlTitle, metaDescription, layoutSections, widgets

Returns: Updated draft summary`,
    inputSchema: UpdatePageDraftSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ pageId, updates }) => {
    const res = await client.patch<CmsPage>(`${PAGES_URL}/${encodeURIComponent(pageId)}/draft`, updates);
    return textResult(summarizePage(res.data));
  });

  server.registerTool("hubspot_cms_publish_page", {
    title: "Publish HubSpot Website Page",
    description: `Publish a page so it is live on the website.

For a page that is already live this pushes the current draft live. For a page that has never been published it schedules publishing for right now. The page needs an htmlTitle first.

Args:
  - pageId (string): Page content ID

Returns: { pageId, method: 'push-live' | 'schedule', url }`,
    inputSchema: PublishPageSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ pageId }) => {
    const id = encodeURIComponent(pageId);
    const current = (await client.get<CmsPage>(`${PAGES_URL}/${id}`)).data;

    let method: "push-live" | "schedule";
    if (current.currentlyPublished) {
      await client.post(`${PAGES_URL}/${id}/draft/push-live`);
      method = "push-live";
    } else {
      // Push-live only updates already published pages; new pages are published via schedule.
      await client.post(`${PAGES_URL}/schedule`, {
        id: pageId,
        publishDate: new Date(Date.now() + 5_000).toISOString(),
      });
      method = "schedule";
    }

    return textResult({ pageId, method, url: current.url ?? null, published: true });
  });

  // ── Design Manager source code (themes, templates, modules) ────────────────

  server.registerTool("hubspot_cms_get_file", {
    title: "Get HubSpot Design Manager File",
    description: `Read the text of a Design Manager file: a template, partial, module file, CSS or JS.

Read a file before replacing it with hubspot_cms_upload_file, so you keep everything you are not changing.

Args:
  - path (string): File path, e.g. 'my-theme/templates/partials/header.html'
  - environment ('published' | 'draft'): Default 'published'

Returns: { path, environment, content }`,
    inputSchema: GetSourceFileSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ path, environment }) => {
    const res = await client.get<string>(`${SOURCE_CODE_URL}/${environment}/content/${encodePath(path)}`, {
      responseType: "text",
      transformResponse: (data) => data,
    });
    return textResult({ path, environment, content: String(res.data) });
  });

  server.registerTool("hubspot_cms_get_file_metadata", {
    title: "Get HubSpot Design Manager File Metadata",
    description: `Get metadata for a Design Manager file or folder. For a folder this lists its children, which is how to browse a theme.

Args:
  - path (string): File or folder path, e.g. 'my-theme/modules'
  - environment ('published' | 'draft'): Default 'published'

Returns: { path, name, folder, children?, updatedAt, ... }`,
    inputSchema: GetSourceMetadataSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ path, environment }) => {
    const res = await client.get<Record<string, unknown>>(
      `${SOURCE_CODE_URL}/${environment}/metadata/${encodePath(path)}`
    );
    return textResult(res.data);
  });

  server.registerTool("hubspot_cms_upload_file", {
    title: "Upload HubSpot Design Manager File",
    description: `Create or replace one Design Manager file (template, partial, CSS, JS or module file).

Warning: with environment 'published' (the default) the change is live on every page that uses the file as soon as it uploads. Read the current file with hubspot_cms_get_file first and send the full updated content.

Args:
  - path (string): File path, e.g. 'my-theme/templates/partials/header.html'
  - content (string): Full file content
  - environment ('published' | 'draft'): Default 'published'

Returns: { path, environment, bytes, uploaded: true }`,
    inputSchema: UploadSourceFileSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  }, async ({ path, content, environment }) => {
    await uploadSourceFile(client, environment, path, content);
    return textResult({ path, environment, bytes: Buffer.byteLength(content, "utf8"), uploaded: true });
  });

  server.registerTool("hubspot_cms_upload_module", {
    title: "Upload HubSpot Custom Module",
    description: `Create or replace a custom module in a theme: uploads module.html, fields.json and meta.json (plus module.css and module.js when given) into one .module folder.

The module then appears in the page editor and can be placed on pages. Replacing an existing module re-renders every page that uses it.

Args:
  - modulePath (string): Folder ending in .module, e.g. 'my-theme/modules/blog-listing.module'
  - label (string): Module name in the page editor
  - html (string): HubL markup
  - fieldsJson (string): fields.json content (JSON array)
  - css, js (string): Optional module.css and module.js
  - metaJson (string): Optional meta.json; a standard one is generated otherwise
  - environment ('published' | 'draft'): Default 'published'

Returns: { modulePath, files: string[], uploaded: true }`,
    inputSchema: UploadModuleSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  }, async ({ modulePath, label, html, fieldsJson, css, js, metaJson, environment }) => {
    let fields: unknown;
    try {
      fields = JSON.parse(fieldsJson);
    } catch (err) {
      throw new Error(`fieldsJson is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!Array.isArray(fields)) {
      throw new Error("fieldsJson must be a JSON array of field definitions.");
    }

    const meta = metaJson ?? defaultModuleMeta(label);
    if (metaJson) {
      try {
        JSON.parse(metaJson);
      } catch (err) {
        throw new Error(`metaJson is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const files: Array<[string, string]> = [
      ["fields.json", JSON.stringify(fields, null, 2)],
      ["meta.json", meta],
      ["module.html", html],
    ];
    if (css !== undefined) files.push(["module.css", css]);
    if (js !== undefined) files.push(["module.js", js]);

    // Upload one at a time: fields.json and meta.json first so module.html validates against them.
    for (const [fileName, content] of files) {
      await uploadSourceFile(client, environment, `${modulePath}/${fileName}`, content);
    }

    return textResult({
      modulePath,
      environment,
      files: files.map(([fileName]) => `${modulePath}/${fileName}`),
      uploaded: true,
    });
  });
}
