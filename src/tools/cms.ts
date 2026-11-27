import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AxiosInstance } from "axios";
import { z } from "zod";
import { truncate } from "../services/hubspot-client.js";
import { CHARACTER_LIMIT } from "../constants.js";

const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const UPDATE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const DELETE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

const PostFields = {
  name: z.string().describe("Internal post name"),
  htmlTitle: z.string().optional().describe("Page title shown in browser/SEO"),
  slug: z.string().optional().describe("URL slug (path after the blog's base URL)"),
  contentGroupId: z.string().describe("ID of the blog the post belongs to (see hubspot_list_blogs)"),
  postBody: z.string().optional().describe("HTML body of the post"),
  postSummary: z.string().optional().describe("Summary / excerpt shown on listing pages"),
  metaDescription: z.string().optional().describe("Meta description"),
  blogAuthorId: z.string().optional().describe("Blog author ID"),
  tagIds: z.array(z.number().int()).optional().describe("Tag IDs to attach"),
  featuredImage: z.string().optional().describe("Featured image URL"),
  featuredImageAltText: z.string().optional().describe("Featured image alt text"),
  useFeaturedImage: z.boolean().optional(),
  publishDate: z.string().optional().describe("ISO 8601 publish date"),
  language: z.string().optional().describe("Language code, e.g. en"),
};

const respond = (data: unknown) => {
  const out = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : { result: data };
  return {
    content: [{ type: "text" as const, text: truncate(JSON.stringify(out, null, 2), CHARACTER_LIMIT) }],
    structuredContent: out,
  };
};

const ListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).describe("Results per page, 1-100"),
  after: z.string().optional().describe("Pagination cursor"),
}).strict();

export function registerCmsTools(server: McpServer, client: AxiosInstance): void {
  // ── Blogs (read-only: HubSpot's public API cannot create blogs) ────────────

  server.registerTool("hubspot_list_blogs", {
    title: "List HubSpot Blogs",
    description: `List blogs in the portal. Blogs themselves can only be created in HubSpot (Settings → Website → Blog); the public API does not support creating them. Use the returned id as contentGroupId when creating posts.`,
    inputSchema: z.object({}).strict(),
    annotations: READ,
  }, async () => respond((await client.get("/content/api/v2/blogs")).data));

  server.registerTool("hubspot_get_blog", {
    title: "Get HubSpot Blog",
    description: "Get a single blog (including its listing template and settings) by ID.",
    inputSchema: z.object({ blogId: z.string() }).strict(),
    annotations: READ,
  }, async ({ blogId }) => respond((await client.get(`/content/api/v2/blogs/${blogId}`)).data));

  // ── Blog posts ─────────────────────────────────────────────────────────────

  server.registerTool("hubspot_list_blog_posts", {
    title: "List HubSpot Blog Posts",
    description: "List blog posts, optionally filtered by blog, state or name.",
    inputSchema: ListSchema.extend({
      contentGroupId: z.string().optional().describe("Only posts in this blog"),
      state: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional(),
      name: z.string().optional().describe("Filter by exact post name"),
    }).strict(),
    annotations: READ,
  }, async (params) => respond((await client.get("/cms/v3/blogs/posts", { params })).data));

  server.registerTool("hubspot_get_blog_post", {
    title: "Get HubSpot Blog Post",
    description: "Get a blog post by ID. Set draft=true to read the unpublished draft version.",
    inputSchema: z.object({ postId: z.string(), draft: z.boolean().default(false) }).strict(),
    annotations: READ,
  }, async ({ postId, draft }) =>
    respond((await client.get(`/cms/v3/blogs/posts/${postId}${draft ? "/draft" : ""}`)).data));

  server.registerTool("hubspot_create_blog_post", {
    title: "Create HubSpot Blog Post",
    description: "Create a new blog post as a draft. Use hubspot_publish_blog_post to make it live.",
    inputSchema: z.object(PostFields).strict(),
    annotations: WRITE,
  }, async (post) => respond((await client.post("/cms/v3/blogs/posts", post)).data));

  server.registerTool("hubspot_update_blog_post", {
    title: "Update HubSpot Blog Post",
    description: "Update fields of a blog post. By default edits the draft (publish afterwards to go live); set live=true to edit the published version directly.",
    inputSchema: z.object({
      postId: z.string(),
      live: z.boolean().default(false),
      fields: z.object(PostFields).partial().passthrough().describe("Fields to change"),
    }).strict(),
    annotations: UPDATE,
  }, async ({ postId, live, fields }) =>
    respond((await client.patch(`/cms/v3/blogs/posts/${postId}${live ? "" : "/draft"}`, fields)).data));

  server.registerTool("hubspot_publish_blog_post", {
    title: "Publish HubSpot Blog Post",
    description: "Publish a blog post. Without publishDate, pushes the draft live now; with publishDate, schedules it.",
    inputSchema: z.object({
      postId: z.string(),
      publishDate: z.string().optional().describe("ISO 8601 future date to schedule publication"),
    }).strict(),
    annotations: UPDATE,
  }, async ({ postId, publishDate }) => {
    if (publishDate) {
      await client.post("/cms/v3/blogs/posts/schedule", { id: postId, publishDate });
      return respond({ success: true, postId, scheduledFor: publishDate });
    }
    await client.post(`/cms/v3/blogs/posts/${postId}/draft/push-live`);
    return respond({ success: true, postId, message: "Draft pushed live." });
  });

  server.registerTool("hubspot_delete_blog_post", {
    title: "Delete HubSpot Blog Post",
    description: "Delete a blog post (moves it to the recycle bin).",
    inputSchema: z.object({ postId: z.string() }).strict(),
    annotations: DELETE,
  }, async ({ postId }) => {
    await client.delete(`/cms/v3/blogs/posts/${postId}`);
    return respond({ success: true, deletedId: postId });
  });

  // ── Tags ───────────────────────────────────────────────────────────────────

  server.registerTool("hubspot_list_blog_tags", {
    title: "List HubSpot Blog Tags",
    description: "List blog tags.",
    inputSchema: ListSchema,
    annotations: READ,
  }, async (params) => respond((await client.get("/cms/v3/blogs/tags", { params })).data));

  server.registerTool("hubspot_create_blog_tag", {
    title: "Create HubSpot Blog Tag",
    description: "Create a blog tag.",
    inputSchema: z.object({ name: z.string(), language: z.string().optional() }).strict(),
    annotations: WRITE,
  }, async (tag) => respond((await client.post("/cms/v3/blogs/tags", tag)).data));

  server.registerTool("hubspot_update_blog_tag", {
    title: "Update HubSpot Blog Tag",
    description: "Rename or update a blog tag.",
    inputSchema: z.object({ tagId: z.string(), name: z.string().optional(), language: z.string().optional() }).strict(),
    annotations: UPDATE,
  }, async ({ tagId, ...fields }) => respond((await client.patch(`/cms/v3/blogs/tags/${tagId}`, fields)).data));

  server.registerTool("hubspot_delete_blog_tag", {
    title: "Delete HubSpot Blog Tag",
    description: "Delete a blog tag.",
    inputSchema: z.object({ tagId: z.string() }).strict(),
    annotations: DELETE,
  }, async ({ tagId }) => {
    await client.delete(`/cms/v3/blogs/tags/${tagId}`);
    return respond({ success: true, deletedId: tagId });
  });

  // ── Authors ────────────────────────────────────────────────────────────────

  const AuthorFields = {
    fullName: z.string().optional(),
    email: z.string().optional(),
    slug: z.string().optional(),
    bio: z.string().optional(),
    website: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    avatar: z.string().optional().describe("Avatar image URL"),
    displayName: z.string().optional(),
  };

  server.registerTool("hubspot_list_blog_authors", {
    title: "List HubSpot Blog Authors",
    description: "List blog authors.",
    inputSchema: ListSchema,
    annotations: READ,
  }, async (params) => respond((await client.get("/cms/v3/blogs/authors", { params })).data));

  server.registerTool("hubspot_create_blog_author", {
    title: "Create HubSpot Blog Author",
    description: "Create a blog author.",
    inputSchema: z.object({ ...AuthorFields, displayName: z.string() }).strict(),
    annotations: WRITE,
  }, async (author) => respond((await client.post("/cms/v3/blogs/authors", author)).data));

  server.registerTool("hubspot_update_blog_author", {
    title: "Update HubSpot Blog Author",
    description: "Update a blog author.",
    inputSchema: z.object({ authorId: z.string(), ...AuthorFields }).strict(),
    annotations: UPDATE,
  }, async ({ authorId, ...fields }) => respond((await client.patch(`/cms/v3/blogs/authors/${authorId}`, fields)).data));

  server.registerTool("hubspot_delete_blog_author", {
    title: "Delete HubSpot Blog Author",
    description: "Delete a blog author.",
    inputSchema: z.object({ authorId: z.string() }).strict(),
    annotations: DELETE,
  }, async ({ authorId }) => {
    await client.delete(`/cms/v3/blogs/authors/${authorId}`);
    return respond({ success: true, deletedId: authorId });
  });

  // ── Site pages (blog listing page, landing/home pages, etc.) ───────────────

  const PageFields = {
    name: z.string().describe("Internal page name"),
    htmlTitle: z.string().optional(),
    slug: z.string().optional().describe("URL slug, e.g. 'blog'"),
    templatePath: z.string().optional().describe("Design Manager template path, e.g. '@hubspot/growth/templates/blog.html'"),
    metaDescription: z.string().optional(),
    domain: z.string().optional(),
    language: z.string().optional(),
    layoutSections: z.record(z.unknown()).optional().describe("Layout section/module content"),
    widgets: z.record(z.unknown()).optional().describe("Widget/module content"),
    widgetContainers: z.record(z.unknown()).optional(),
  };

  server.registerTool("hubspot_list_site_pages", {
    title: "List HubSpot Site Pages",
    description: "List website pages, e.g. to find the blog listing page.",
    inputSchema: ListSchema.extend({ name: z.string().optional(), state: z.string().optional() }).strict(),
    annotations: READ,
  }, async (params) => respond((await client.get("/cms/v3/pages/site-pages", { params })).data));

  server.registerTool("hubspot_get_site_page", {
    title: "Get HubSpot Site Page",
    description: "Get a site page by ID. Set draft=true for the unpublished draft.",
    inputSchema: z.object({ pageId: z.string(), draft: z.boolean().default(false) }).strict(),
    annotations: READ,
  }, async ({ pageId, draft }) =>
    respond((await client.get(`/cms/v3/pages/site-pages/${pageId}${draft ? "/draft" : ""}`)).data));

  server.registerTool("hubspot_create_site_page", {
    title: "Create HubSpot Site Page",
    description: "Create a site page (draft). Use a blog listing template as templatePath to create a blog listing page.",
    inputSchema: z.object(PageFields).passthrough(),
    annotations: WRITE,
  }, async (page) => respond((await client.post("/cms/v3/pages/site-pages", page)).data));

  server.registerTool("hubspot_update_site_page", {
    title: "Update HubSpot Site Page",
    description: "Update a site page. Edits the draft by default; set live=true to edit the published version.",
    inputSchema: z.object({
      pageId: z.string(),
      live: z.boolean().default(false),
      fields: z.object(PageFields).partial().passthrough(),
    }).strict(),
    annotations: UPDATE,
  }, async ({ pageId, live, fields }) =>
    respond((await client.patch(`/cms/v3/pages/site-pages/${pageId}${live ? "" : "/draft"}`, fields)).data));

  server.registerTool("hubspot_publish_site_page", {
    title: "Publish HubSpot Site Page",
    description: "Publish a site page now (push draft live) or schedule it with publishDate.",
    inputSchema: z.object({ pageId: z.string(), publishDate: z.string().optional() }).strict(),
    annotations: UPDATE,
  }, async ({ pageId, publishDate }) => {
    if (publishDate) {
      await client.post("/cms/v3/pages/site-pages/schedule", { id: pageId, publishDate });
      return respond({ success: true, pageId, scheduledFor: publishDate });
    }
    await client.post(`/cms/v3/pages/site-pages/${pageId}/draft/push-live`);
    return respond({ success: true, pageId, message: "Draft pushed live." });
  });

  server.registerTool("hubspot_delete_site_page", {
    title: "Delete HubSpot Site Page",
    description: "Delete a site page (recycle bin).",
    inputSchema: z.object({ pageId: z.string() }).strict(),
    annotations: DELETE,
  }, async ({ pageId }) => {
    await client.delete(`/cms/v3/pages/site-pages/${pageId}`);
    return respond({ success: true, deletedId: pageId });
  });
}
