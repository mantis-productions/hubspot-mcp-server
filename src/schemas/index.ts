import { z } from "zod";

// ── Pagination ─────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20)
    .describe("Number of results to return (1-100, default 20)"),
  after: z.string().optional()
    .describe("Cursor token from a previous response for pagination"),
});

// ── Contact schemas ───────────────────────────────────────────────────────────

export const ContactPropertiesSchema = z.object({
  email: z.string().email().optional().describe("Email address"),
  firstname: z.string().optional().describe("First name"),
  lastname: z.string().optional().describe("Last name"),
  phone: z.string().optional().describe("Phone number"),
  company: z.string().optional().describe("Company name"),
  jobtitle: z.string().optional().describe("Job title"),
  lifecyclestage: z.enum([
    "subscriber", "lead", "marketingqualifiedlead",
    "salesqualifiedlead", "opportunity", "customer",
    "evangelist", "other"
  ]).optional().describe("Lifecycle stage"),
  hs_lead_status: z.string().optional().describe("Lead status"),
}).describe("Contact properties to set");

export const CreateContactSchema = z.object({
  properties: ContactPropertiesSchema,
  associateWithCompanyId: z.string().optional()
    .describe("Optionally associate this contact with an existing company ID"),
}).strict();

export const UpdateContactSchema = z.object({
  contactId: z.string().describe("HubSpot contact record ID"),
  properties: ContactPropertiesSchema,
}).strict();

export const GetContactSchema = z.object({
  contactId: z.string().describe("HubSpot contact record ID"),
  additionalProperties: z.array(z.string()).optional()
    .describe("Extra property names to include in the response"),
}).strict();

export const DeleteContactSchema = z.object({
  contactId: z.string().describe("HubSpot contact record ID to archive/delete"),
}).strict();

// ── Company schemas ───────────────────────────────────────────────────────────

export const CompanyPropertiesSchema = z.object({
  name: z.string().optional().describe("Company name"),
  domain: z.string().optional().describe("Company domain (e.g. acme.com)"),
  industry: z.string().optional().describe("Industry (e.g. Technology)"),
  city: z.string().optional().describe("City"),
  state: z.string().optional().describe("State or province"),
  country: z.string().optional().describe("Country"),
  phone: z.string().optional().describe("Phone number"),
  numberofemployees: z.number().int().optional().describe("Number of employees"),
  annualrevenue: z.number().optional().describe("Annual revenue in USD"),
  description: z.string().optional().describe("Company description"),
  lifecyclestage: z.string().optional().describe("Lifecycle stage"),
}).describe("Company properties to set");

export const CreateCompanySchema = z.object({
  properties: CompanyPropertiesSchema,
}).strict();

export const UpdateCompanySchema = z.object({
  companyId: z.string().describe("HubSpot company record ID"),
  properties: CompanyPropertiesSchema,
}).strict();

export const GetCompanySchema = z.object({
  companyId: z.string().describe("HubSpot company record ID"),
  additionalProperties: z.array(z.string()).optional()
    .describe("Extra property names to include in the response"),
}).strict();

export const DeleteCompanySchema = z.object({
  companyId: z.string().describe("HubSpot company record ID to archive"),
}).strict();

// ── Deal schemas ──────────────────────────────────────────────────────────────

export const DealPropertiesSchema = z.object({
  dealname: z.string().optional().describe("Deal name"),
  amount: z.number().optional().describe("Deal amount in USD"),
  dealstage: z.string().optional()
    .describe("Deal stage (e.g. appointmentscheduled, qualifiedtobuy, presentationscheduled, decisionmakerboughtin, contractsent, closedwon, closedlost)"),
  pipeline: z.string().optional().describe("Pipeline ID (default: 'default')"),
  closedate: z.string().optional()
    .describe("Expected close date in ISO 8601 format (e.g. 2026-12-31)"),
  dealtype: z.enum(["newbusiness", "existingbusiness"]).optional()
    .describe("Deal type: newbusiness or existingbusiness"),
  description: z.string().optional().describe("Deal description"),
  hubspot_owner_id: z.string().optional().describe("Owner user ID"),
}).describe("Deal properties to set");

export const CreateDealSchema = z.object({
  properties: DealPropertiesSchema,
  associateWithContactId: z.string().optional()
    .describe("Associate this deal with a contact ID"),
  associateWithCompanyId: z.string().optional()
    .describe("Associate this deal with a company ID"),
}).strict();

export const UpdateDealSchema = z.object({
  dealId: z.string().describe("HubSpot deal record ID"),
  properties: DealPropertiesSchema,
}).strict();

export const GetDealSchema = z.object({
  dealId: z.string().describe("HubSpot deal record ID"),
  additionalProperties: z.array(z.string()).optional()
    .describe("Extra property names to include in the response"),
}).strict();

export const DeleteDealSchema = z.object({
  dealId: z.string().describe("HubSpot deal record ID to archive"),
}).strict();

// ── Search schemas ────────────────────────────────────────────────────────────

const SearchOperatorEnum = z.enum([
  "EQ", "NEQ", "CONTAINS_TOKEN", "NOT_CONTAINS_TOKEN",
  "GT", "GTE", "LT", "LTE", "HAS_PROPERTY", "NOT_HAS_PROPERTY"
]);

export const SearchObjectsSchema = z.object({
  objectType: z.enum(["contacts", "companies", "deals"])
    .describe("CRM object type to search"),
  query: z.string().optional()
    .describe("Full-text search query string"),
  filters: z.array(z.object({
    propertyName: z.string().describe("HubSpot property name (e.g. email, dealstage)"),
    operator: SearchOperatorEnum.describe("Comparison operator"),
    value: z.string().optional().describe("Value to compare against"),
  })).optional()
    .describe("Property filters to narrow results"),
  properties: z.array(z.string()).optional()
    .describe("Property names to include in the response"),
  sortBy: z.string().optional()
    .describe("Property name to sort by"),
  sortDirection: z.enum(["ASCENDING", "DESCENDING"]).default("ASCENDING")
    .describe("Sort direction"),
  limit: z.number().int().min(1).max(100).default(20)
    .describe("Number of results (1-100)"),
  after: z.string().optional()
    .describe("Pagination cursor"),
}).strict();

// ── Association schemas ───────────────────────────────────────────────────────

export const AssociateRecordsSchema = z.object({
  fromObjectType: z.enum(["contacts", "companies", "deals"])
    .describe("Source object type"),
  fromObjectId: z.string().describe("Source record ID"),
  toObjectType: z.enum(["contacts", "companies", "deals"])
    .describe("Target object type"),
  toObjectId: z.string().describe("Target record ID"),
}).strict();

export const ListAssociationsSchema = z.object({
  fromObjectType: z.enum(["contacts", "companies", "deals"])
    .describe("Source object type"),
  fromObjectId: z.string().describe("Source record ID"),
  toObjectType: z.enum(["contacts", "companies", "deals"])
    .describe("Associated object type to list"),
}).strict();

// ── List schemas ──────────────────────────────────────────────────────────────

export const ListObjectsSchema = PaginationSchema.extend({
  objectType: z.enum(["contacts", "companies", "deals"])
    .describe("CRM object type to list"),
  properties: z.array(z.string()).optional()
    .describe("Extra property names to include"),
}).strict();

// ── CMS schemas ───────────────────────────────────────────────────────────────

const SourceCodeEnvironmentEnum = z.enum(["published", "draft"])
  .describe("Design Manager environment. 'published' is live on the site immediately; 'draft' holds unpublished edits");

const DesignManagerPathSchema = z.string().min(1)
  .regex(/^[^/].*[^/]$|^[^/]$/, "Path must not start or end with '/'")
  .describe("Design Manager path, e.g. 'mark-wroblewski-theme/modules/hero.module/module.html' or 'mark-wroblewski-theme/templates/partials/header.html'");

export const ListPagesSchema = PaginationSchema.extend({
  nameContains: z.string().optional()
    .describe("Only return pages whose internal name contains this text (case-insensitive)"),
  slug: z.string().optional()
    .describe("Only return the page with this exact slug, e.g. 'blog' or 'kitchen-mart-booking-app'"),
}).strict();

export const GetPageSchema = z.object({
  pageId: z.string().describe("Website page content ID"),
  draft: z.boolean().default(false)
    .describe("true reads the unpublished draft (what the editor shows); false reads the live page"),
  includeLayout: z.boolean().default(true)
    .describe("Include layoutSections and widgets (module content). Set false for a compact summary"),
}).strict();

export const CreatePageSchema = z.object({
  name: z.string().min(1).describe("Internal page name shown in HubSpot's page listing"),
  slug: z.string().min(1).describe("URL slug without a leading slash, e.g. 'blog'"),
  templatePath: z.string().min(1)
    .describe("Template path, e.g. 'mark-wroblewski-theme/templates/home.html'"),
  htmlTitle: z.string().optional().describe("HTML <title> (required by HubSpot before publishing)"),
  metaDescription: z.string().optional().describe("Meta description for search results"),
  layoutSections: z.record(z.unknown()).optional()
    .describe("Drag-and-drop layout (layoutSections object), usually copied from an existing page and edited"),
  widgets: z.record(z.unknown()).optional()
    .describe("Template-level (non drag-and-drop) module content keyed by module name"),
}).strict();

export const ClonePageSchema = z.object({
  pageId: z.string().describe("Content ID of the page to clone"),
  cloneName: z.string().min(1).describe("Internal name for the new page"),
}).strict();

export const UpdatePageDraftSchema = z.object({
  pageId: z.string().describe("Website page content ID"),
  updates: z.record(z.unknown())
    .describe("Page fields to change on the draft, e.g. {\"slug\":\"blog\",\"htmlTitle\":\"Blog\",\"layoutSections\":{...}}. Top-level fields are replaced, not merged, so send the complete layoutSections when editing modules (read it with hubspot_cms_get_page draft=true first)"),
}).strict();

export const PublishPageSchema = z.object({
  pageId: z.string().describe("Website page content ID whose draft should go live"),
}).strict();

export const GetSourceFileSchema = z.object({
  path: DesignManagerPathSchema,
  environment: SourceCodeEnvironmentEnum.default("published"),
}).strict();

export const GetSourceMetadataSchema = z.object({
  path: z.string().min(1)
    .describe("Design Manager file or folder path, e.g. 'mark-wroblewski-theme/modules'. Folders list their children"),
  environment: SourceCodeEnvironmentEnum.default("published"),
}).strict();

export const UploadSourceFileSchema = z.object({
  path: DesignManagerPathSchema,
  content: z.string().describe("Full text content of the file. Replaces the existing file completely"),
  environment: SourceCodeEnvironmentEnum.default("published"),
}).strict();

export const UploadModuleSchema = z.object({
  modulePath: z.string().min(1)
    .regex(/\.module$/, "modulePath must end in '.module'")
    .describe("Module folder path ending in .module, e.g. 'mark-wroblewski-theme/modules/blog-listing.module'"),
  html: z.string().min(1).describe("HubL markup for module.html"),
  fieldsJson: z.string().min(2).describe("Contents of fields.json: a JSON array of field definitions"),
  label: z.string().min(1).describe("Module name shown in the page editor, e.g. 'Blog Listing'"),
  css: z.string().optional().describe("Optional module.css"),
  js: z.string().optional().describe("Optional module.js"),
  metaJson: z.string().optional()
    .describe("Optional full meta.json. When omitted a standard one is generated (pages, blog posts and listings, not global)"),
  environment: SourceCodeEnvironmentEnum.default("published"),
}).strict();
