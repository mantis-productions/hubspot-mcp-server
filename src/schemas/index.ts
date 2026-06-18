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
