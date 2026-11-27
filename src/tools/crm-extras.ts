import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AxiosInstance } from "axios";
import { z } from "zod";
import { truncate } from "../services/hubspot-client.js";
import * as x from "../services/crm-extras.js";
import { CHARACTER_LIMIT } from "../constants.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const UPDATE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const DELETE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

const respond = (data: unknown) => {
  const out = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : { result: data };
  return {
    content: [{ type: "text" as const, text: truncate(JSON.stringify(out, null, 2), CHARACTER_LIMIT) }],
    structuredContent: out,
  };
};

const Props = z.record(z.union([z.string(), z.number(), z.boolean()])).describe("HubSpot property name → value");
const Assoc = z.array(z.object({
  toObjectType: z.enum(["contacts", "companies", "deals"]),
  toObjectId: z.string(),
})).optional().describe("Records to associate the new item with");
const Page = { limit: z.number().int().min(1).max(100).default(20), after: z.string().optional() };

export function registerCrmExtraTools(server: McpServer, client: AxiosInstance): void {
  const activities = [
    {
      type: "tasks" as const, singular: "task", idKey: "taskId",
      props: "hs_task_subject, hs_task_body, hs_task_status (NOT_STARTED|IN_PROGRESS|WAITING|COMPLETED|DEFERRED), hs_task_priority (LOW|MEDIUM|HIGH), hs_task_type (TODO|CALL|EMAIL), hs_timestamp (ISO due date, required), hubspot_owner_id",
    },
    {
      type: "appointments" as const, singular: "appointment", idKey: "appointmentId",
      props: "hs_appointment_name, hs_appointment_start (ISO), hs_appointment_end (ISO), hs_appointment_type, hubspot_owner_id",
    },
  ];

  for (const a of activities) {
    const idSchema = { [a.idKey]: z.string().describe(`HubSpot ${a.singular} ID`) };

    server.registerTool(`hubspot_list_${a.type}`, {
      title: `List HubSpot ${a.type}`,
      description: `List ${a.type} with pagination.`,
      inputSchema: z.object(Page).strict(),
      annotations: READ,
    }, async ({ limit, after }) => respond(await x.listActivities(client, a.type, limit, after)));

    server.registerTool(`hubspot_get_${a.singular}`, {
      title: `Get HubSpot ${a.singular}`,
      description: `Get a ${a.singular} by ID.`,
      inputSchema: z.object(idSchema).strict(),
      annotations: READ,
    }, async (args) => respond(await x.getActivity(client, a.type, args[a.idKey])));

    server.registerTool(`hubspot_create_${a.singular}`, {
      title: `Create HubSpot ${a.singular}`,
      description: `Create a ${a.singular}, optionally associated with contacts/companies/deals.\nCommon properties: ${a.props}`,
      inputSchema: z.object({ properties: Props, associations: Assoc }).strict(),
      annotations: WRITE,
    }, async ({ properties, associations }) => respond(await x.createActivity(client, a.type, properties, associations)));

    server.registerTool(`hubspot_update_${a.singular}`, {
      title: `Update HubSpot ${a.singular}`,
      description: `Update a ${a.singular}. Only provided properties change.\nCommon properties: ${a.props}`,
      inputSchema: z.object({ ...idSchema, properties: Props }).strict(),
      annotations: UPDATE,
    }, async (args) => respond(await x.updateActivity(client, a.type, (args as unknown as Record<string, string>)[a.idKey], args.properties)));

    server.registerTool(`hubspot_delete_${a.singular}`, {
      title: `Delete HubSpot ${a.singular}`,
      description: `Archive a ${a.singular} (recycle bin).`,
      inputSchema: z.object(idSchema).strict(),
      annotations: DELETE,
    }, async (args) => respond(await x.deleteActivity(client, a.type, args[a.idKey])));
  }

  // ── Segments (lists) ───────────────────────────────────────────────────────

  const listId = { listId: z.string().describe("HubSpot list (segment) ID") };

  server.registerTool("hubspot_search_segments", {
    title: "Search HubSpot Segments",
    description: "Search segments (lists) by name. Empty query returns all.",
    inputSchema: z.object({ query: z.string().default(""), count: z.number().int().min(1).max(500).default(20), offset: z.number().int().min(0).default(0) }).strict(),
    annotations: READ,
  }, async ({ query, count, offset }) => respond(await x.searchLists(client, query, count, offset)));

  server.registerTool("hubspot_get_segment", {
    title: "Get HubSpot Segment",
    description: "Get a segment (list) including its filters.",
    inputSchema: z.object(listId).strict(),
    annotations: READ,
  }, async ({ listId }) => respond(await x.getList(client, listId)));

  server.registerTool("hubspot_create_segment", {
    title: "Create HubSpot Segment",
    description: `Create a segment (list). processingType: MANUAL (add members by ID), DYNAMIC (auto-updates from filterBranch), SNAPSHOT (filters evaluated once). DYNAMIC/SNAPSHOT require filterBranch, HubSpot's nested filter structure: {"filterBranchType":"OR","filterBranchOperator":"OR","filterBranches":[{"filterBranchType":"AND","filterBranchOperator":"AND","filters":[{"filterType":"PROPERTY","property":"lifecyclestage","operation":{"operationType":"ENUMERATION","operator":"IS_ANY_OF","values":["customer"]}}],"filterBranches":[]}],"filters":[]}`,
    inputSchema: z.object({
      name: z.string(),
      objectType: z.enum(["contacts", "companies", "deals"]),
      processingType: z.enum(["MANUAL", "DYNAMIC", "SNAPSHOT"]),
      filterBranch: z.record(z.unknown()).optional(),
    }).strict(),
    annotations: WRITE,
  }, async (body) => respond(await x.createList(client, body)));

  server.registerTool("hubspot_update_segment", {
    title: "Update HubSpot Segment",
    description: "Rename a segment and/or replace its filters (DYNAMIC/SNAPSHOT only).",
    inputSchema: z.object({ ...listId, name: z.string().optional(), filterBranch: z.record(z.unknown()).optional() }).strict(),
    annotations: UPDATE,
  }, async ({ listId, name, filterBranch }) => {
    const result: Record<string, unknown> = {};
    if (name) result.rename = await x.renameList(client, listId, name);
    if (filterBranch) result.filters = await x.updateListFilters(client, listId, filterBranch);
    return respond(result);
  });

  server.registerTool("hubspot_delete_segment", {
    title: "Delete HubSpot Segment",
    description: "Delete a segment (restorable in HubSpot for 90 days).",
    inputSchema: z.object(listId).strict(),
    annotations: DELETE,
  }, async ({ listId }) => respond(await x.deleteList(client, listId)));

  server.registerTool("hubspot_list_segment_members", {
    title: "List HubSpot Segment Members",
    description: "List record IDs in a segment.",
    inputSchema: z.object({ ...listId, limit: z.number().int().min(1).max(250).default(100), after: z.string().optional() }).strict(),
    annotations: READ,
  }, async ({ listId, limit, after }) => respond(await x.listMembers(client, listId, limit, after)));

  server.registerTool("hubspot_change_segment_members", {
    title: "Add/Remove HubSpot Segment Members",
    description: "Add or remove records on a MANUAL or SNAPSHOT segment. DYNAMIC segments are driven by filters and reject this.",
    inputSchema: z.object({ ...listId, action: z.enum(["add", "remove"]), recordIds: z.array(z.string()).min(1) }).strict(),
    annotations: UPDATE,
  }, async ({ listId, action, recordIds }) => respond(await x.changeListMembers(client, listId, action, recordIds)));
}
