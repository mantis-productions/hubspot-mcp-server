import type { AxiosInstance } from "axios";
import { ASSOCIATION_TYPES, DEFAULT_CONTACT_PROPERTIES, DEFAULT_COMPANY_PROPERTIES, DEFAULT_DEAL_PROPERTIES } from "../constants.js";
import { prop } from "../services/hubspot-client.js";
import type { HubSpotRecord, HubSpotListResponse, HubSpotSearchResponse, HubSpotAssociationResult } from "../types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

function formatContact(r: HubSpotRecord) {
  return {
    id: r.id,
    firstName: prop(r, "firstname"),
    lastName: prop(r, "lastname"),
    email: prop(r, "email"),
    phone: prop(r, "phone"),
    company: prop(r, "company"),
    jobTitle: prop(r, "jobtitle"),
    lifecycleStage: prop(r, "lifecyclestage"),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function formatCompany(r: HubSpotRecord) {
  return {
    id: r.id,
    name: prop(r, "name"),
    domain: prop(r, "domain"),
    industry: prop(r, "industry"),
    city: prop(r, "city"),
    state: prop(r, "state"),
    country: prop(r, "country"),
    phone: prop(r, "phone"),
    employees: prop(r, "numberofemployees"),
    annualRevenue: prop(r, "annualrevenue"),
    lifecycleStage: prop(r, "lifecyclestage"),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function formatDeal(r: HubSpotRecord) {
  return {
    id: r.id,
    dealName: prop(r, "dealname"),
    amount: prop(r, "amount"),
    dealStage: prop(r, "dealstage"),
    pipeline: prop(r, "pipeline"),
    closeDate: prop(r, "closedate"),
    dealType: prop(r, "dealtype"),
    description: prop(r, "description"),
    ownerId: prop(r, "hubspot_owner_id"),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function getAssociationTypeId(from: string, to: string): number {
  const key = `${from}_TO_${to}`.toUpperCase() as keyof typeof ASSOCIATION_TYPES;
  const id = ASSOCIATION_TYPES[key];
  if (!id) throw new Error(`No association type found for ${from} → ${to}`);
  return id;
}

export async function executeTool(
  client: AxiosInstance,
  toolName: string,
  input: ToolInput
): Promise<unknown> {
  switch (toolName) {
    // ── Contacts ─────────────────────────────────────────────────────────────

    case "hubspot_get_contact": {
      const properties = [...DEFAULT_CONTACT_PROPERTIES, ...(input.additionalProperties ?? [])];
      const res = await client.get<HubSpotRecord>(`/crm/v3/objects/contacts/${input.contactId}`, {
        params: { properties: properties.join(",") },
      });
      return formatContact(res.data);
    }

    case "hubspot_list_contacts": {
      const res = await client.get<HubSpotListResponse<HubSpotRecord>>("/crm/v3/objects/contacts", {
        params: { limit: input.limit ?? 20, after: input.after, properties: DEFAULT_CONTACT_PROPERTIES.join(",") },
      });
      const contacts = res.data.results.map(formatContact);
      const nextCursor = res.data.paging?.next?.after;
      return { contacts, hasMore: !!nextCursor, nextCursor, total: contacts.length };
    }

    case "hubspot_create_contact": {
      const payload: Record<string, unknown> = { properties: input.properties };
      if (input.associateWithCompanyId) {
        payload.associations = [{
          to: { id: input.associateWithCompanyId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: ASSOCIATION_TYPES.CONTACT_TO_COMPANY }],
        }];
      }
      const res = await client.post<HubSpotRecord>("/crm/v3/objects/contacts", payload);
      return formatContact(res.data);
    }

    case "hubspot_update_contact": {
      const res = await client.patch<HubSpotRecord>(
        `/crm/v3/objects/contacts/${input.contactId}`,
        { properties: input.properties }
      );
      return formatContact(res.data);
    }

    case "hubspot_delete_contact": {
      await client.delete(`/crm/v3/objects/contacts/${input.contactId}`);
      return { success: true, archivedId: input.contactId, message: `Contact ${input.contactId} archived.` };
    }

    // ── Companies ─────────────────────────────────────────────────────────────

    case "hubspot_get_company": {
      const properties = [...DEFAULT_COMPANY_PROPERTIES, ...(input.additionalProperties ?? [])];
      const res = await client.get<HubSpotRecord>(`/crm/v3/objects/companies/${input.companyId}`, {
        params: { properties: properties.join(",") },
      });
      return formatCompany(res.data);
    }

    case "hubspot_list_companies": {
      const res = await client.get<HubSpotListResponse<HubSpotRecord>>("/crm/v3/objects/companies", {
        params: { limit: input.limit ?? 20, after: input.after, properties: DEFAULT_COMPANY_PROPERTIES.join(",") },
      });
      const companies = res.data.results.map(formatCompany);
      const nextCursor = res.data.paging?.next?.after;
      return { companies, hasMore: !!nextCursor, nextCursor, total: companies.length };
    }

    case "hubspot_create_company": {
      const props = { ...input.properties };
      if (props.numberofemployees !== undefined) props.numberofemployees = String(props.numberofemployees);
      if (props.annualrevenue !== undefined) props.annualrevenue = String(props.annualrevenue);
      const res = await client.post<HubSpotRecord>("/crm/v3/objects/companies", { properties: props });
      return formatCompany(res.data);
    }

    case "hubspot_update_company": {
      const props = { ...input.properties };
      if (props.numberofemployees !== undefined) props.numberofemployees = String(props.numberofemployees);
      if (props.annualrevenue !== undefined) props.annualrevenue = String(props.annualrevenue);
      const res = await client.patch<HubSpotRecord>(
        `/crm/v3/objects/companies/${input.companyId}`,
        { properties: props }
      );
      return formatCompany(res.data);
    }

    case "hubspot_delete_company": {
      await client.delete(`/crm/v3/objects/companies/${input.companyId}`);
      return { success: true, archivedId: input.companyId, message: `Company ${input.companyId} archived.` };
    }

    // ── Deals ─────────────────────────────────────────────────────────────────

    case "hubspot_get_deal": {
      const properties = [...DEFAULT_DEAL_PROPERTIES, ...(input.additionalProperties ?? [])];
      const res = await client.get<HubSpotRecord>(`/crm/v3/objects/deals/${input.dealId}`, {
        params: { properties: properties.join(",") },
      });
      return formatDeal(res.data);
    }

    case "hubspot_list_deals": {
      const res = await client.get<HubSpotListResponse<HubSpotRecord>>("/crm/v3/objects/deals", {
        params: { limit: input.limit ?? 20, after: input.after, properties: DEFAULT_DEAL_PROPERTIES.join(",") },
      });
      const deals = res.data.results.map(formatDeal);
      const nextCursor = res.data.paging?.next?.after;
      return { deals, hasMore: !!nextCursor, nextCursor, total: deals.length };
    }

    case "hubspot_create_deal": {
      const associations: unknown[] = [];
      if (input.associateWithContactId) {
        associations.push({
          to: { id: input.associateWithContactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: ASSOCIATION_TYPES.DEAL_TO_CONTACT }],
        });
      }
      if (input.associateWithCompanyId) {
        associations.push({
          to: { id: input.associateWithCompanyId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: ASSOCIATION_TYPES.DEAL_TO_COMPANY }],
        });
      }
      const props = { ...input.properties };
      if (props.amount !== undefined) props.amount = String(props.amount);
      const payload: Record<string, unknown> = { properties: props };
      if (associations.length > 0) payload.associations = associations;
      const res = await client.post<HubSpotRecord>("/crm/v3/objects/deals", payload);
      return formatDeal(res.data);
    }

    case "hubspot_update_deal": {
      const props = { ...input.properties };
      if (props.amount !== undefined) props.amount = String(props.amount);
      const res = await client.patch<HubSpotRecord>(
        `/crm/v3/objects/deals/${input.dealId}`,
        { properties: props }
      );
      return formatDeal(res.data);
    }

    case "hubspot_delete_deal": {
      await client.delete(`/crm/v3/objects/deals/${input.dealId}`);
      return { success: true, archivedId: input.dealId, message: `Deal ${input.dealId} archived.` };
    }

    // ── Search & Associations ─────────────────────────────────────────────────

    case "hubspot_search": {
      const body: Record<string, unknown> = { limit: input.limit ?? 20 };
      if (input.after) body.after = input.after;
      if (input.query) body.query = input.query;
      if (input.filters?.length) body.filterGroups = [{ filters: input.filters }];
      if (input.properties?.length) body.properties = input.properties;
      if (input.sortBy) body.sorts = [{ propertyName: input.sortBy, direction: input.sortDirection ?? "ASCENDING" }];
      const res = await client.post<HubSpotSearchResponse<HubSpotRecord>>(
        `/crm/v3/objects/${input.objectType}/search`,
        body
      );
      const { total, results, paging } = res.data;
      return { total, count: results.length, hasMore: !!paging?.next?.after, nextCursor: paging?.next?.after, results };
    }

    case "hubspot_associate_records": {
      const typeId = getAssociationTypeId(input.fromObjectType, input.toObjectType);
      await client.put(
        `/crm/v3/objects/${input.fromObjectType}/${input.fromObjectId}/associations/${input.toObjectType}/${input.toObjectId}/${typeId}`
      );
      return { success: true, message: `Associated ${input.fromObjectType}/${input.fromObjectId} → ${input.toObjectType}/${input.toObjectId}` };
    }

    case "hubspot_list_associations": {
      const res = await client.get<HubSpotAssociationResult>(
        `/crm/v3/objects/${input.fromObjectType}/${input.fromObjectId}/associations/${input.toObjectType}`
      );
      return { total: res.data.results.length, associations: res.data.results };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
