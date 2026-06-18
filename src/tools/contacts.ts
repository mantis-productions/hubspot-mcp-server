import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AxiosInstance } from "axios";
import { z } from "zod";
import {
  CreateContactSchema,
  UpdateContactSchema,
  GetContactSchema,
  DeleteContactSchema,
  PaginationSchema,
} from "../schemas/index.js";
import {
  prop,
  truncate,
} from "../services/hubspot-client.js";
import {
  DEFAULT_CONTACT_PROPERTIES,
  CHARACTER_LIMIT,
  ASSOCIATION_TYPES,
} from "../constants.js";
import type { HubSpotRecord, ContactOutput, HubSpotListResponse } from "../types.js";

function formatContact(record: HubSpotRecord): ContactOutput {
  return {
    id: record.id,
    firstName: prop(record, "firstname"),
    lastName: prop(record, "lastname"),
    email: prop(record, "email"),
    phone: prop(record, "phone"),
    company: prop(record, "company"),
    jobTitle: prop(record, "jobtitle"),
    lifecycleStage: prop(record, "lifecyclestage"),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function registerContactTools(server: McpServer, client: AxiosInstance): void {

  // ── Get Contact ─────────────────────────────────────────────────────────────

  server.registerTool("hubspot_get_contact", {
    title: "Get HubSpot Contact",
    description: `Retrieve a single HubSpot contact by their record ID.

Returns standard contact fields (name, email, phone, company, job title, lifecycle stage).

Args:
  - contactId (string): HubSpot contact record ID (numeric string)
  - additionalProperties (string[]): Optional extra property names to include

Returns: Contact object with id, firstName, lastName, email, phone, company, jobTitle, lifecycleStage

Errors:
  - "record not found" if the ID doesn't exist or the token lacks access`,
    inputSchema: GetContactSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ contactId, additionalProperties }) => {
    const properties = [...DEFAULT_CONTACT_PROPERTIES, ...(additionalProperties ?? [])];
    const res = await client.get<HubSpotRecord>(`/crm/v3/objects/contacts/${contactId}`, {
      params: { properties: properties.join(",") },
    });
    const contact = formatContact(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(contact, null, 2) }],
      structuredContent: contact,
    };
  });

  // ── List Contacts ───────────────────────────────────────────────────────────

  server.registerTool("hubspot_list_contacts", {
    title: "List HubSpot Contacts",
    description: `List contacts from HubSpot CRM with pagination.

Args:
  - limit (number): Results per page, 1-100 (default 20)
  - after (string): Pagination cursor from a previous response

Returns: { contacts: ContactOutput[], hasMore: boolean, nextCursor?: string, total: number }`,
    inputSchema: PaginationSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ limit, after }) => {
    const res = await client.get<HubSpotListResponse<HubSpotRecord>>("/crm/v3/objects/contacts", {
      params: {
        limit,
        after,
        properties: DEFAULT_CONTACT_PROPERTIES.join(","),
      },
    });
    const contacts = res.data.results.map(formatContact);
    const nextCursor = res.data.paging?.next?.after;
    const output = { contacts, hasMore: !!nextCursor, nextCursor, total: contacts.length };
    return {
      content: [{ type: "text", text: truncate(JSON.stringify(output, null, 2), CHARACTER_LIMIT) }],
      structuredContent: output,
    };
  });

  // ── Create Contact ──────────────────────────────────────────────────────────

  server.registerTool("hubspot_create_contact", {
    title: "Create HubSpot Contact",
    description: `Create a new contact record in HubSpot CRM.

Args:
  - properties.email: Email address (required for unique identification)
  - properties.firstname / lastname: Name fields
  - properties.phone: Phone number
  - properties.company: Company name string
  - properties.jobtitle: Job title
  - properties.lifecyclestage: lead | customer | subscriber | etc.
  - associateWithCompanyId: Optionally link to a company record by ID

Returns: Created contact with its new record ID

Errors:
  - "CONTACT_EXISTS" if a contact with that email already exists`,
    inputSchema: CreateContactSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ properties, associateWithCompanyId }) => {
    const payload: { properties: Record<string, unknown>; associations?: unknown[] } = {
      properties: { ...properties },
    };

    if (associateWithCompanyId) {
      payload.associations = [{
        to: { id: associateWithCompanyId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: ASSOCIATION_TYPES.CONTACT_TO_COMPANY }],
      }];
    }

    const res = await client.post<HubSpotRecord>("/crm/v3/objects/contacts", payload);
    const contact = formatContact(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(contact, null, 2) }],
      structuredContent: contact,
    };
  });

  // ── Update Contact ──────────────────────────────────────────────────────────

  server.registerTool("hubspot_update_contact", {
    title: "Update HubSpot Contact",
    description: `Update properties on an existing HubSpot contact. Only provided fields are changed.

Args:
  - contactId (string): HubSpot contact record ID
  - properties: Any combination of contact fields to update

Returns: Updated contact record`,
    inputSchema: UpdateContactSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ contactId, properties }) => {
    const res = await client.patch<HubSpotRecord>(
      `/crm/v3/objects/contacts/${contactId}`,
      { properties }
    );
    const contact = formatContact(res.data);
    return {
      content: [{ type: "text", text: JSON.stringify(contact, null, 2) }],
      structuredContent: contact,
    };
  });

  // ── Delete Contact ──────────────────────────────────────────────────────────

  server.registerTool("hubspot_delete_contact", {
    title: "Delete HubSpot Contact",
    description: `Archive (soft-delete) a contact in HubSpot. The record moves to the recycle bin and can be restored within HubSpot.

Args:
  - contactId (string): HubSpot contact record ID

Returns: Confirmation message with deleted ID`,
    inputSchema: DeleteContactSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, async ({ contactId }) => {
    await client.delete(`/crm/v3/objects/contacts/${contactId}`);
    const result = { success: true, archivedId: contactId, message: `Contact ${contactId} archived successfully.` };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  });
}
