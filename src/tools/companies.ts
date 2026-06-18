import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AxiosInstance } from "axios";
import {
  CreateCompanySchema,
  UpdateCompanySchema,
  GetCompanySchema,
  DeleteCompanySchema,
  PaginationSchema,
} from "../schemas/index.js";
import { prop, truncate } from "../services/hubspot-client.js";
import {
  DEFAULT_COMPANY_PROPERTIES,
  CHARACTER_LIMIT,
} from "../constants.js";
import type { HubSpotRecord, CompanyOutput, HubSpotListResponse } from "../types.js";

function formatCompany(record: HubSpotRecord): CompanyOutput {
  return {
    id: record.id,
    name: prop(record, "name"),
    domain: prop(record, "domain"),
    industry: prop(record, "industry"),
    city: prop(record, "city"),
    state: prop(record, "state"),
    country: prop(record, "country"),
    phone: prop(record, "phone"),
    employees: prop(record, "numberofemployees"),
    annualRevenue: prop(record, "annualrevenue"),
    lifecycleStage: prop(record, "lifecyclestage"),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function registerCompanyTools(server: McpServer, client: AxiosInstance): void {

  server.registerTool("hubspot_get_company", {
    title: "Get HubSpot Company",
    description: `Retrieve a single HubSpot company record by ID.

Args:
  - companyId (string): HubSpot company record ID
  - additionalProperties (string[]): Optional extra properties to include

Returns: Company with id, name, domain, industry, city, state, country, phone, employees, annualRevenue, lifecycleStage`,
    inputSchema: GetCompanySchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ companyId, additionalProperties }) => {
    const properties = [...DEFAULT_COMPANY_PROPERTIES, ...(additionalProperties ?? [])];
    const res = await client.get<HubSpotRecord>(`/crm/v3/objects/companies/${companyId}`, {
      params: { properties: properties.join(",") },
    });
    const company = formatCompany(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(company, null, 2) }],
      structuredContent: company,
    };
  });

  server.registerTool("hubspot_list_companies", {
    title: "List HubSpot Companies",
    description: `List company records from HubSpot CRM with pagination.

Args:
  - limit (number): Results per page, 1-100 (default 20)
  - after (string): Pagination cursor from a previous response

Returns: { companies: CompanyOutput[], hasMore: boolean, nextCursor?: string }`,
    inputSchema: PaginationSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ limit, after }) => {
    const res = await client.get<HubSpotListResponse<HubSpotRecord>>("/crm/v3/objects/companies", {
      params: { limit, after, properties: DEFAULT_COMPANY_PROPERTIES.join(",") },
    });
    const companies = res.data.results.map(formatCompany);
    const nextCursor = res.data.paging?.next?.after;
    const output = { companies, hasMore: !!nextCursor, nextCursor, total: companies.length };
    return {
      content: [{ type: "text", text: truncate(JSON.stringify(output, null, 2), CHARACTER_LIMIT) }],
      structuredContent: output,
    };
  });

  server.registerTool("hubspot_create_company", {
    title: "Create HubSpot Company",
    description: `Create a new company record in HubSpot CRM.

Args:
  - properties.name: Company name (recommended)
  - properties.domain: Website domain (e.g. acme.com)
  - properties.industry: Industry type
  - properties.city / state / country: Location
  - properties.numberofemployees: Employee count
  - properties.annualrevenue: Annual revenue in USD

Returns: Created company with its new record ID`,
    inputSchema: CreateCompanySchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ properties }) => {
    const serialized: Record<string, unknown> = {
      ...properties,
      ...(properties.numberofemployees !== undefined ? { numberofemployees: String(properties.numberofemployees) } : {}),
      ...(properties.annualrevenue !== undefined ? { annualrevenue: String(properties.annualrevenue) } : {}),
    };
    const res = await client.post<HubSpotRecord>("/crm/v3/objects/companies", { properties: serialized });
    const company = formatCompany(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(company, null, 2) }],
      structuredContent: company,
    };
  });

  server.registerTool("hubspot_update_company", {
    title: "Update HubSpot Company",
    description: `Update properties on an existing HubSpot company. Only provided fields are changed.

Args:
  - companyId (string): HubSpot company record ID
  - properties: Any combination of company fields to update

Returns: Updated company record`,
    inputSchema: UpdateCompanySchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ companyId, properties }) => {
    const serialized: Record<string, unknown> = {
      ...properties,
      ...(properties.numberofemployees !== undefined ? { numberofemployees: String(properties.numberofemployees) } : {}),
      ...(properties.annualrevenue !== undefined ? { annualrevenue: String(properties.annualrevenue) } : {}),
    };
    const res = await client.patch<HubSpotRecord>(
      `/crm/v3/objects/companies/${companyId}`,
      { properties: serialized }
    );
    const company = formatCompany(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(company, null, 2) }],
      structuredContent: company,
    };
  });

  server.registerTool("hubspot_delete_company", {
    title: "Delete HubSpot Company",
    description: `Archive (soft-delete) a company in HubSpot. Record moves to the recycle bin.

Args:
  - companyId (string): HubSpot company record ID

Returns: Confirmation message`,
    inputSchema: DeleteCompanySchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, async ({ companyId }) => {
    await client.delete(`/crm/v3/objects/companies/${companyId}`);
    const result = { success: true, archivedId: companyId, message: `Company ${companyId} archived successfully.` };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  });
}
