import type Anthropic from "@anthropic-ai/sdk";
import type { AxiosInstance } from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

const str = (description: string) => ({ type: "string", description });
const obj = (description: string) => ({ type: "object", description });

const postProps = {
  name: str("Internal post name"),
  htmlTitle: str("Page title / SEO title"),
  slug: str("URL slug"),
  contentGroupId: str("Blog ID (from hubspot_list_blogs)"),
  postBody: str("HTML body"),
  postSummary: str("Summary / excerpt"),
  metaDescription: str("Meta description"),
  blogAuthorId: str("Blog author ID"),
  tagIds: { type: "array", items: { type: "number" }, description: "Tag IDs" },
  featuredImage: str("Featured image URL"),
  featuredImageAltText: str("Featured image alt text"),
  publishDate: str("ISO 8601 publish date"),
  language: str("Language code, e.g. en"),
};

const pageProps = {
  name: str("Internal page name"),
  htmlTitle: str("Page title"),
  slug: str("URL slug"),
  templatePath: str("Design Manager template path (use a blog listing template for a listing page)"),
  metaDescription: str("Meta description"),
  domain: str("Domain"),
  language: str("Language code"),
  layoutSections: obj("Layout sections"),
  widgets: obj("Widgets / module content"),
};

const authorProps = {
  fullName: str("Full name"),
  displayName: str("Display name"),
  email: str("Email"),
  slug: str("Slug"),
  bio: str("Bio"),
  website: str("Website"),
  twitter: str("Twitter"),
  linkedin: str("LinkedIn"),
  avatar: str("Avatar URL"),
};

const listProps = { limit: { type: "number", description: "1-100, default 20" }, after: str("Pagination cursor") };

const tool = (
  name: string,
  description: string,
  properties: Record<string, unknown> = {},
  required: string[] = []
): Anthropic.Tool => ({
  name,
  description,
  input_schema: { type: "object", properties, ...(required.length ? { required } : {}) } as Anthropic.Tool["input_schema"],
});

export const CMS_TOOLS: Anthropic.Tool[] = [
  tool("hubspot_list_blogs", "List blogs. Blogs cannot be created via API; use the id as contentGroupId for posts."),
  tool("hubspot_get_blog", "Get a blog by ID.", { blogId: str("Blog ID") }, ["blogId"]),
  tool("hubspot_list_blog_posts", "List blog posts, optionally filtered.", {
    ...listProps,
    contentGroupId: str("Only posts in this blog"),
    state: str("DRAFT, PUBLISHED or SCHEDULED"),
    name: str("Exact post name"),
  }),
  tool("hubspot_get_blog_post", "Get a blog post; draft=true for the unpublished draft.", {
    postId: str("Post ID"),
    draft: { type: "boolean" },
  }, ["postId"]),
  tool("hubspot_create_blog_post", "Create a draft blog post.", postProps, ["name", "contentGroupId"]),
  tool("hubspot_update_blog_post", "Update a blog post draft (live=true edits the published version).", {
    postId: str("Post ID"),
    live: { type: "boolean" },
    fields: obj("Post fields to change"),
  }, ["postId", "fields"]),
  tool("hubspot_publish_blog_post", "Publish a post now, or schedule with publishDate.", {
    postId: str("Post ID"),
    publishDate: str("ISO 8601 future date to schedule"),
  }, ["postId"]),
  tool("hubspot_delete_blog_post", "Delete a blog post.", { postId: str("Post ID") }, ["postId"]),

  tool("hubspot_list_blog_tags", "List blog tags.", listProps),
  tool("hubspot_create_blog_tag", "Create a blog tag.", { name: str("Tag name"), language: str("Language") }, ["name"]),
  tool("hubspot_update_blog_tag", "Update a blog tag.", { tagId: str("Tag ID"), name: str("Name"), language: str("Language") }, ["tagId"]),
  tool("hubspot_delete_blog_tag", "Delete a blog tag.", { tagId: str("Tag ID") }, ["tagId"]),

  tool("hubspot_list_blog_authors", "List blog authors.", listProps),
  tool("hubspot_create_blog_author", "Create a blog author.", authorProps, ["displayName"]),
  tool("hubspot_update_blog_author", "Update a blog author.", { authorId: str("Author ID"), ...authorProps }, ["authorId"]),
  tool("hubspot_delete_blog_author", "Delete a blog author.", { authorId: str("Author ID") }, ["authorId"]),

  tool("hubspot_list_site_pages", "List site pages (e.g. to find the blog listing page).", {
    ...listProps,
    name: str("Name filter"),
    state: str("State filter"),
  }),
  tool("hubspot_get_site_page", "Get a site page; draft=true for the draft.", {
    pageId: str("Page ID"),
    draft: { type: "boolean" },
  }, ["pageId"]),
  tool("hubspot_create_site_page", "Create a draft site page. Use a blog listing templatePath for a listing page.", pageProps, ["name"]),
  tool("hubspot_update_site_page", "Update a site page draft (live=true edits the published version).", {
    pageId: str("Page ID"),
    live: { type: "boolean" },
    fields: obj("Page fields to change"),
  }, ["pageId", "fields"]),
  tool("hubspot_publish_site_page", "Publish a site page now, or schedule with publishDate.", {
    pageId: str("Page ID"),
    publishDate: str("ISO 8601 future date to schedule"),
  }, ["pageId"]),
  tool("hubspot_delete_site_page", "Delete a site page.", { pageId: str("Page ID") }, ["pageId"]),
];

const CMS_TOOL_NAMES = new Set(CMS_TOOLS.map((t) => t.name));

export function isCmsTool(name: string): boolean {
  return CMS_TOOL_NAMES.has(name);
}

export async function executeCmsTool(client: AxiosInstance, name: string, input: ToolInput): Promise<unknown> {
  const posts = "/cms/v3/blogs/posts";
  const pages = "/cms/v3/pages/site-pages";
  const { postId, pageId, tagId, authorId, blogId, draft, live, fields, publishDate, ...rest } = input;

  switch (name) {
    case "hubspot_list_blogs": return (await client.get("/content/api/v2/blogs")).data;
    case "hubspot_get_blog": return (await client.get(`/content/api/v2/blogs/${blogId}`)).data;

    case "hubspot_list_blog_posts": return (await client.get(posts, { params: rest })).data;
    case "hubspot_get_blog_post": return (await client.get(`${posts}/${postId}${draft ? "/draft" : ""}`)).data;
    case "hubspot_create_blog_post": return (await client.post(posts, rest)).data;
    case "hubspot_update_blog_post": return (await client.patch(`${posts}/${postId}${live ? "" : "/draft"}`, fields)).data;
    case "hubspot_publish_blog_post":
      if (publishDate) {
        await client.post(`${posts}/schedule`, { id: postId, publishDate });
        return { success: true, postId, scheduledFor: publishDate };
      }
      await client.post(`${posts}/${postId}/draft/push-live`);
      return { success: true, postId, message: "Draft pushed live." };
    case "hubspot_delete_blog_post":
      await client.delete(`${posts}/${postId}`);
      return { success: true, deletedId: postId };

    case "hubspot_list_blog_tags": return (await client.get("/cms/v3/blogs/tags", { params: rest })).data;
    case "hubspot_create_blog_tag": return (await client.post("/cms/v3/blogs/tags", rest)).data;
    case "hubspot_update_blog_tag": return (await client.patch(`/cms/v3/blogs/tags/${tagId}`, rest)).data;
    case "hubspot_delete_blog_tag":
      await client.delete(`/cms/v3/blogs/tags/${tagId}`);
      return { success: true, deletedId: tagId };

    case "hubspot_list_blog_authors": return (await client.get("/cms/v3/blogs/authors", { params: rest })).data;
    case "hubspot_create_blog_author": return (await client.post("/cms/v3/blogs/authors", rest)).data;
    case "hubspot_update_blog_author": return (await client.patch(`/cms/v3/blogs/authors/${authorId}`, rest)).data;
    case "hubspot_delete_blog_author":
      await client.delete(`/cms/v3/blogs/authors/${authorId}`);
      return { success: true, deletedId: authorId };

    case "hubspot_list_site_pages": return (await client.get(pages, { params: rest })).data;
    case "hubspot_get_site_page": return (await client.get(`${pages}/${pageId}${draft ? "/draft" : ""}`)).data;
    case "hubspot_create_site_page": return (await client.post(pages, rest)).data;
    case "hubspot_update_site_page": return (await client.patch(`${pages}/${pageId}${live ? "" : "/draft"}`, fields)).data;
    case "hubspot_publish_site_page":
      if (publishDate) {
        await client.post(`${pages}/schedule`, { id: pageId, publishDate });
        return { success: true, pageId, scheduledFor: publishDate };
      }
      await client.post(`${pages}/${pageId}/draft/push-live`);
      return { success: true, pageId, message: "Draft pushed live." };
    case "hubspot_delete_site_page":
      await client.delete(`${pages}/${pageId}`);
      return { success: true, deletedId: pageId };

    default:
      throw new Error(`Unknown CMS tool: ${name}`);
  }
}
