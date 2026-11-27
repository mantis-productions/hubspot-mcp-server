import type { AxiosInstance } from "axios";

// Shared by the MCP tools (src/tools/crm-extras.ts) and the agent (src/agents/crm-extras-tools.ts).

export const ACTIVITY_TYPES = ["tasks", "appointments", "meetings"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const LIST_OBJECT_TYPE_IDS = { contacts: "0-1", companies: "0-2", deals: "0-3" } as const;
export type ListObjectType = keyof typeof LIST_OBJECT_TYPE_IDS;

export type Associations = { toObjectType: string; toObjectId: string }[];

const TASK_PROPS = [
  "hs_task_subject", "hs_task_body", "hs_task_status", "hs_task_priority",
  "hs_task_type", "hs_timestamp", "hubspot_owner_id", "hs_createdate", "hs_lastmodifieddate",
];
// HubSpot's commerce/scheduling "Appointments" object (0-421). Deactivated on many portals —
// a portal must have this object enabled for these calls to succeed. For the classic Meetings
// engagement used by most portals, use "meetings" instead.
const APPOINTMENT_PROPS = [
  "hs_appointment_name", "hs_appointment_start", "hs_appointment_end",
  "hs_appointment_type", "hs_duration", "hubspot_owner_id", "hs_createdate", "hs_lastmodifieddate",
];
// Classic Meetings engagement (object 0-47) — verified against a live portal's property schema.
const MEETING_PROPS = [
  "hs_meeting_title", "hs_meeting_body", "hs_meeting_start_time", "hs_meeting_end_time",
  "hs_meeting_outcome", "hs_meeting_location", "hs_meeting_location_type",
  "hubspot_owner_id", "hs_createdate", "hs_lastmodifieddate",
];

const PROPS_BY_TYPE: Record<ActivityType, string[]> = {
  tasks: TASK_PROPS,
  appointments: APPOINTMENT_PROPS,
  meetings: MEETING_PROPS,
};

export const defaultProps = (type: ActivityType) => PROPS_BY_TYPE[type];

export async function listActivities(c: AxiosInstance, type: ActivityType, limit = 20, after?: string) {
  return (await c.get(`/crm/v3/objects/${type}`, { params: { limit, after, properties: defaultProps(type).join(",") } })).data;
}

export async function getActivity(c: AxiosInstance, type: ActivityType, id: string) {
  return (await c.get(`/crm/v3/objects/${type}/${id}`, { params: { properties: defaultProps(type).join(",") } })).data;
}

export async function createActivity(
  c: AxiosInstance, type: ActivityType, properties: Record<string, unknown>, associations: Associations = []
) {
  const res = await c.post(`/crm/v3/objects/${type}`, { properties });
  for (const a of associations) {
    await c.put(`/crm/v4/objects/${type}/${res.data.id}/associations/default/${a.toObjectType}/${a.toObjectId}`);
  }
  return res.data;
}

export async function updateActivity(c: AxiosInstance, type: ActivityType, id: string, properties: Record<string, unknown>) {
  return (await c.patch(`/crm/v3/objects/${type}/${id}`, { properties })).data;
}

export async function deleteActivity(c: AxiosInstance, type: ActivityType, id: string) {
  await c.delete(`/crm/v3/objects/${type}/${id}`);
  return { success: true, archivedId: id, message: `${type} ${id} archived.` };
}

// ── Segments (lists) ──

export async function searchLists(c: AxiosInstance, query = "", count = 20, offset = 0) {
  return (await c.post("/crm/v3/lists/search", { query, count, offset })).data;
}

export async function getList(c: AxiosInstance, listId: string) {
  return (await c.get(`/crm/v3/lists/${listId}`)).data;
}

export async function createList(
  c: AxiosInstance,
  body: { name: string; objectType: ListObjectType; processingType: "MANUAL" | "DYNAMIC" | "SNAPSHOT"; filterBranch?: unknown }
) {
  const { objectType, ...rest } = body;
  return (await c.post("/crm/v3/lists", { ...rest, objectTypeId: LIST_OBJECT_TYPE_IDS[objectType] })).data;
}

export async function renameList(c: AxiosInstance, listId: string, name: string) {
  return (await c.put(`/crm/v3/lists/${listId}/update-list-name`, null, { params: { listName: name } })).data;
}

export async function updateListFilters(c: AxiosInstance, listId: string, filterBranch: unknown) {
  return (await c.put(`/crm/v3/lists/${listId}/update-list-filters`, { filterBranch })).data;
}

export async function deleteList(c: AxiosInstance, listId: string) {
  await c.delete(`/crm/v3/lists/${listId}`);
  return { success: true, deletedId: listId, message: "List deleted (restorable in HubSpot for 90 days)." };
}

export async function changeListMembers(c: AxiosInstance, listId: string, action: "add" | "remove", recordIds: string[]) {
  return (await c.put(`/crm/v3/lists/${listId}/memberships/${action}`, recordIds)).data;
}

export async function listMembers(c: AxiosInstance, listId: string, limit = 100, after?: string) {
  return (await c.get(`/crm/v3/lists/${listId}/memberships`, { params: { limit, after } })).data;
}
