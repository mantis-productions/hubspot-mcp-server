import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AxiosInstance } from "axios";
import {
  CreateDealSchema,
  UpdateDealSchema,
  GetDealSchema,
  DeleteDealSchema,
  PaginationSchema,
} from "../schemas/index.js";
import { prop, truncate } from "../services/hubspot-client.js";
import {
  DEFAULT_DEAL_PROPERTIES,
  CHARACTER_LIMIT,
  ASSOCIATION_TYPES,
} from "../constants.js";
import type { HubSpotRecord, DealOutput, HubSpotListResponse } from "../types.js";

function formatDeal(record: HubSpotRecord): DealOutput {
  return {
    id: record.id,
    dealName: prop(record, "dealname"),
    amount: prop(record, "amount"),
    dealStage: prop(record, "dealstage"),
    pipeline: prop(record, "pipeline"),
    closeDate: prop(record, "closedate"),
    dealType: prop(record, "dealtype"),
    description: prop(record, "description"),
    ownerId: prop(record, "hubspot_owner_id"),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function registerDealTools(server: McpServer, client: AxiosInstance): void {

  server.registerTool("hubspot_get_deal", {
    title: "Get HubSpot Deal",
    description: `Retrieve a single HubSpot deal record by ID.

Args:
  - dealId (string): HubSpot deal record ID
  - additionalProperties (string[]): Optional extra properties to include

Returns: Deal with id, dealName, amount, dealStage, pipeline, closeDate, dealType, description, ownerId`,
    inputSchema: GetDealSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ dealId, additionalProperties }) => {
    const properties = [...DEFAULT_DEAL_PROPERTIES, ...(additionalProperties ?? [])];
    const res = await client.get<HubSpotRecord>(`/crm/v3/objects/deals/${dealId}`, {
      params: { properties: properties.join(",") },
    });
    const deal = formatDeal(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(deal, null, 2) }],
      structuredContent: deal,
    };
  });

  server.registerTool("hubspot_list_deals", {
    title: "List HubSpot Deals",
    description: `List deals from HubSpot CRM with pagination.

Args:
  - limit (number): Results per page, 1-100 (default 20)
  - after (string): Pagination cursor from a previous response

Returns: { deals: DealOutput[], hasMore: boolean, nextCursor?: string }`,
    inputSchema: PaginationSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ limit, after }) => {
    const res = await client.get<HubSpotListResponse<HubSpotRecord>>("/crm/v3/objects/deals", {
      params: { limit, after, properties: DEFAULT_DEAL_PROPERTIES.join(",") },
    });
    const deals = res.data.results.map(formatDeal);
    const nextCursor = res.data.paging?.next?.after;
    const output = { deals, hasMore: !!nextCursor, nextCursor, total: deals.length };
    return {
      content: [{ type: "text", text: truncate(JSON.stringify(output, null, 2), CHARACTER_LIMIT) }],
      structuredContent: output,
    };
  });

  server.registerTool("hubspot_create_deal", {
    title: "Create HubSpot Deal",
    description: `Create a new deal in HubSpot CRM.

Args:
  - properties.dealname: Deal name (required)
  - properties.amount: Deal value in USD
  - properties.dealstage: Pipeline stage slug (e.g. appointmentscheduled, closedwon, closedlost)
  - properties.pipeline: Pipeline ID (default: 'default')
  - properties.closedate: Expected close date in ISO 8601 (e.g. 2026-12-31)
  - properties.dealtype: newbusiness | existingbusiness
  - properties.hubspot_owner_id: HubSpot user ID for deal owner
  - associateWithContactId: Contact ID to associate
  - associateWithCompanyId: Company ID to associate

Returns: Created deal with new record ID`,
    inputSchema: CreateDealSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ properties, associateWithContactId, associateWithCompanyId }) => {
    const associations: unknown[] = [];

    if (associateWithContactId) {
      associations.push({
        to: { id: associateWithContactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: ASSOCIATION_TYPES.DEAL_TO_CONTACT }],
      });
    }
    if (associateWithCompanyId) {
      associations.push({
        to: { id: associateWithCompanyId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: ASSOCIATION_TYPES.DEAL_TO_COMPANY }],
      });
    }

    const serialized: Record<string, unknown> = {
      ...properties,
      ...(properties.amount !== undefined ? { amount: String(properties.amount) } : {}),
    };

    const payload: Record<string, unknown> = { properties: serialized };
    if (associations.length > 0) payload.associations = associations;

    const res = await client.post<HubSpotRecord>("/crm/v3/objects/deals", payload);
    const deal = formatDeal(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(deal, null, 2) }],
      structuredContent: deal,
    };
  });

  server.registerTool("hubspot_update_deal", {
    title: "Update HubSpot Deal",
    description: `Update properties on an existing HubSpot deal. Only provided fields are changed.

Common use cases:
  - Move deal to next stage: update dealstage
  - Update close date or amount
  - Reassign deal owner via hubspot_owner_id

Args:
  - dealId (string): HubSpot deal record ID
  - properties: Any combination of deal fields to update

Returns: Updated deal record`,
    inputSchema: UpdateDealSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ dealId, properties }) => {
    const serialized: Record<string, unknown> = {
      ...properties,
      ...(properties.amount !== undefined ? { amount: String(properties.amount) } : {}),
    };
    const res = await client.patch<HubSpotRecord>(
      `/crm/v3/objects/deals/${dealId}`,
      { properties: serialized }
    );
    const deal = formatDeal(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(deal, null, 2) }],
      structuredContent: deal,
    };
  });

  server.registerTool("hubspot_delete_deal", {
    title: "Delete HubSpot Deal",
    description: `Archive (soft-delete) a deal in HubSpot. Record moves to the recycle bin and can be restored.

Args:
  - dealId (string): HubSpot deal record ID

Returns: Confirmation message`,
    inputSchema: DeleteDealSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, async ({ dealId }) => {
    await client.delete(`/crm/v3/objects/deals/${dealId}`);
    const result = { success: true, archivedId: dealId, message: `Deal ${dealId} archived successfully.` };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  });
}
