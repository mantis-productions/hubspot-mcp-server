import type Anthropic from "@anthropic-ai/sdk";
import type { AxiosInstance } from "axios";
import * as x from "../services/crm-extras.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

const str = (description: string) => ({ type: "string", description });
const props = { type: "object", description: "HubSpot property name → value" };
const assoc = {
  type: "array",
  description: "Records to associate with",
  items: {
    type: "object",
    properties: { toObjectType: str("contacts, companies or deals"), toObjectId: str("Record ID") },
    required: ["toObjectType", "toObjectId"],
  },
};
const page = { limit: { type: "number", description: "1-100, default 20" }, after: str("Pagination cursor") };

const tool = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []): Anthropic.Tool => ({
  name,
  description,
  input_schema: { type: "object", properties, ...(required.length ? { required } : {}) } as Anthropic.Tool["input_schema"],
});

const TASK_HINT = "Properties: hs_task_subject, hs_task_body, hs_task_status (NOT_STARTED|IN_PROGRESS|WAITING|COMPLETED|DEFERRED), hs_task_priority (LOW|MEDIUM|HIGH), hs_task_type (TODO|CALL|EMAIL), hs_timestamp (ISO due date, required on create), hubspot_owner_id.";
const APPT_HINT = "Properties: hs_appointment_name, hs_appointment_start (ISO), hs_appointment_end (ISO), hs_appointment_type, hubspot_owner_id.";

export const CRM_EXTRA_TOOLS: Anthropic.Tool[] = [
  tool("hubspot_list_tasks", "List tasks.", page),
  tool("hubspot_get_task", "Get a task by ID.", { taskId: str("Task ID") }, ["taskId"]),
  tool("hubspot_create_task", `Create a task, optionally associated with records. ${TASK_HINT}`, { properties: props, associations: assoc }, ["properties"]),
  tool("hubspot_update_task", `Update a task. ${TASK_HINT}`, { taskId: str("Task ID"), properties: props }, ["taskId", "properties"]),
  tool("hubspot_delete_task", "Archive a task.", { taskId: str("Task ID") }, ["taskId"]),

  tool("hubspot_list_appointments", "List appointments.", page),
  tool("hubspot_get_appointment", "Get an appointment by ID.", { appointmentId: str("Appointment ID") }, ["appointmentId"]),
  tool("hubspot_create_appointment", `Create an appointment, optionally associated with records. ${APPT_HINT}`, { properties: props, associations: assoc }, ["properties"]),
  tool("hubspot_update_appointment", `Update an appointment. ${APPT_HINT}`, { appointmentId: str("Appointment ID"), properties: props }, ["appointmentId", "properties"]),
  tool("hubspot_delete_appointment", "Archive an appointment.", { appointmentId: str("Appointment ID") }, ["appointmentId"]),

  tool("hubspot_search_segments", "Search segments (lists) by name; empty query returns all.", {
    query: str("Name query"), count: { type: "number" }, offset: { type: "number" },
  }),
  tool("hubspot_get_segment", "Get a segment (list) with its filters.", { listId: str("List ID") }, ["listId"]),
  tool("hubspot_create_segment", "Create a segment. MANUAL = add members by ID; DYNAMIC = auto-updates from filterBranch; SNAPSHOT = filters evaluated once. DYNAMIC/SNAPSHOT need filterBranch (HubSpot nested OR → AND → filters structure with filterType PROPERTY, property, and operation {operationType, operator, values}).", {
    name: str("Segment name"),
    objectType: str("contacts, companies or deals"),
    processingType: str("MANUAL, DYNAMIC or SNAPSHOT"),
    filterBranch: { type: "object", description: "Filter definition" },
  }, ["name", "objectType", "processingType"]),
  tool("hubspot_update_segment", "Rename a segment and/or replace its filters.", {
    listId: str("List ID"), name: str("New name"), filterBranch: { type: "object", description: "New filters" },
  }, ["listId"]),
  tool("hubspot_delete_segment", "Delete a segment (restorable in HubSpot for 90 days).", { listId: str("List ID") }, ["listId"]),
  tool("hubspot_list_segment_members", "List record IDs in a segment.", { listId: str("List ID"), limit: { type: "number" }, after: str("Cursor") }, ["listId"]),
  tool("hubspot_change_segment_members", "Add or remove records on a MANUAL or SNAPSHOT segment.", {
    listId: str("List ID"),
    action: str("add or remove"),
    recordIds: { type: "array", items: { type: "string" } },
  }, ["listId", "action", "recordIds"]),
];

const NAMES = new Set(CRM_EXTRA_TOOLS.map((t) => t.name));
export const isCrmExtraTool = (name: string) => NAMES.has(name);

export async function executeCrmExtraTool(c: AxiosInstance, name: string, i: ToolInput): Promise<unknown> {
  switch (name) {
    case "hubspot_list_tasks": return x.listActivities(c, "tasks", i.limit, i.after);
    case "hubspot_get_task": return x.getActivity(c, "tasks", i.taskId);
    case "hubspot_create_task": return x.createActivity(c, "tasks", i.properties, i.associations);
    case "hubspot_update_task": return x.updateActivity(c, "tasks", i.taskId, i.properties);
    case "hubspot_delete_task": return x.deleteActivity(c, "tasks", i.taskId);

    case "hubspot_list_appointments": return x.listActivities(c, "appointments", i.limit, i.after);
    case "hubspot_get_appointment": return x.getActivity(c, "appointments", i.appointmentId);
    case "hubspot_create_appointment": return x.createActivity(c, "appointments", i.properties, i.associations);
    case "hubspot_update_appointment": return x.updateActivity(c, "appointments", i.appointmentId, i.properties);
    case "hubspot_delete_appointment": return x.deleteActivity(c, "appointments", i.appointmentId);

    case "hubspot_search_segments": return x.searchLists(c, i.query, i.count, i.offset);
    case "hubspot_get_segment": return x.getList(c, i.listId);
    case "hubspot_create_segment": return x.createList(c, i as Parameters<typeof x.createList>[1]);
    case "hubspot_update_segment": {
      const out: Record<string, unknown> = {};
      if (i.name) out.rename = await x.renameList(c, i.listId, i.name);
      if (i.filterBranch) out.filters = await x.updateListFilters(c, i.listId, i.filterBranch);
      return out;
    }
    case "hubspot_delete_segment": return x.deleteList(c, i.listId);
    case "hubspot_list_segment_members": return x.listMembers(c, i.listId, i.limit, i.after);
    case "hubspot_change_segment_members": return x.changeListMembers(c, i.listId, i.action, i.recordIds);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
