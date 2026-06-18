import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AxiosInstance } from "axios";
import { SearchObjectsSchema, AssociateRecordsSchema, ListAssociationsSchema } from "../schemas/index.js";
import { truncate } from "../services/hubspot-client.js";
import { CHARACTER_LIMIT, ASSOCIATION_TYPES } from "../constants.js";
import type { HubSpotRecord, HubSpotSearchResponse, HubSpotAssociationResult } from "../types.js";

// Lookup table for association type IDs between object pairs
function getAssociationTypeId(from: string, to: string): number {
  const key = `${from}_TO_${to}`.toUpperCase() as keyof typeof ASSOCIATION_TYPES;
  const id = ASSOCIATION_TYPES[key];
  if (!id) throw new Error(`No default association type found for ${from} → ${to}. Use the HubSpot API directly for custom association types.`);
  return id;
}

export function registerSearchTools(server: McpServer, client: AxiosInstance): void {

  // ── Search ──────────────────────────────────────────────────────────────────

  server.registerTool("hubspot_search", {
    title: "Search HubSpot CRM",
    description: `Search contacts, companies, or deals using full-text query and/or property filters.

Args:
  - objectType: "contacts" | "companies" | "deals"
  - query (string): Full-text search string (e.g. "Acme Corp" or "john@example.com")
  - filters: Array of property filters:
      [{ propertyName: "email", operator: "EQ", value: "john@example.com" }]
    Operators: EQ, NEQ, CONTAINS_TOKEN, NOT_CONTAINS_TOKEN, GT, GTE, LT, LTE, HAS_PROPERTY, NOT_HAS_PROPERTY
  - properties (string[]): Property names to include in results
  - sortBy (string): Property name to sort by
  - sortDirection: "ASCENDING" | "DESCENDING"
  - limit (number): 1-100 results (default 20)
  - after (string): Pagination cursor

Returns:
  { total: number, results: HubSpotRecord[], hasMore: boolean, nextCursor?: string }

Examples:
  - Find a contact by email: objectType="contacts", filters=[{propertyName:"email",operator:"EQ",value:"jane@example.com"}]
  - Find open deals: objectType="deals", filters=[{propertyName:"dealstage",operator:"NEQ",value:"closedwon"}]
  - Find companies in a city: objectType="companies", filters=[{propertyName:"city",operator:"EQ",value:"Boston"}]`,
    inputSchema: SearchObjectsSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ objectType, query, filters, properties, sortBy, sortDirection, limit, after }) => {
    const body: Record<string, unknown> = { limit, after };

    if (query) body.query = query;

    if (filters && filters.length > 0) {
      body.filterGroups = [{ filters }];
    }

    if (properties && properties.length > 0) {
      body.properties = properties;
    }

    if (sortBy) {
      body.sorts = [{ propertyName: sortBy, direction: sortDirection }];
    }

    const res = await client.post<HubSpotSearchResponse<HubSpotRecord>>(
      `/crm/v3/objects/${objectType}/search`,
      body
    );

    const { total, results, paging } = res.data;
    const nextCursor = paging?.next?.after;
    const output = { total, count: results.length, hasMore: !!nextCursor, nextCursor, results };

    return {
      content: [{ type: "text", text: truncate(JSON.stringify(output, null, 2), CHARACTER_LIMIT) }],
      structuredContent: output,
    };
  });

  // ── Associate Records ───────────────────────────────────────────────────────

  server.registerTool("hubspot_associate_records", {
    title: "Associate HubSpot Records",
    description: `Create an association between two HubSpot CRM records (e.g. link a contact to a company, or a deal to a contact).

Args:
  - fromObjectType: "contacts" | "companies" | "deals"
  - fromObjectId: Source record ID
  - toObjectType: "contacts" | "companies" | "deals"
  - toObjectId: Target record ID

Supported pairs and their defaults:
  - contacts ↔ companies
  - deals ↔ contacts
  - deals ↔ companies

Returns: Confirmation of the association created`,
    inputSchema: AssociateRecordsSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ fromObjectType, fromObjectId, toObjectType, toObjectId }) => {
    const associationTypeId = getAssociationTypeId(fromObjectType, toObjectType);

    await client.put(
      `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationTypeId}`
    );

    const result = {
      success: true,
      message: `Associated ${fromObjectType}/${fromObjectId} → ${toObjectType}/${toObjectId}`,
      associationTypeId,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  });

  // ── List Associations ───────────────────────────────────────────────────────

  server.registerTool("hubspot_list_associations", {
    title: "List HubSpot Record Associations",
    description: `List all records of a given type associated with a source CRM record.

Args:
  - fromObjectType: "contacts" | "companies" | "deals"
  - fromObjectId: Source record ID
  - toObjectType: Object type to list associations for

Example: List all companies associated with contact 12345
  fromObjectType="contacts", fromObjectId="12345", toObjectType="companies"

Returns: { associations: [{ id: string, type: string }], total: number }`,
    inputSchema: ListAssociationsSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ fromObjectType, fromObjectId, toObjectType }) => {
    const res = await client.get<HubSpotAssociationResult>(
      `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}`
    );

    const output = {
      total: res.data.results.length,
      associations: res.data.results,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  });
}
