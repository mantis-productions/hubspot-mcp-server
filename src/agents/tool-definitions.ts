import type Anthropic from "@anthropic-ai/sdk";

export const HUBSPOT_TOOLS: Anthropic.Tool[] = [
  // ── Contacts ──────────────────────────────────────────────────────────────

  {
    name: "hubspot_get_contact",
    description: "Retrieve a single HubSpot contact by record ID.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "HubSpot contact record ID" },
        additionalProperties: {
          type: "array",
          items: { type: "string" },
          description: "Extra property names to include",
        },
      },
      required: ["contactId"],
    },
  },
  {
    name: "hubspot_list_contacts",
    description: "List HubSpot contacts with pagination.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Results per page (1-100, default 20)" },
        after: { type: "string", description: "Pagination cursor" },
      },
    },
  },
  {
    name: "hubspot_create_contact",
    description: "Create a new contact in HubSpot CRM.",
    input_schema: {
      type: "object",
      properties: {
        properties: {
          type: "object",
          description: "Contact fields",
          properties: {
            email: { type: "string" },
            firstname: { type: "string" },
            lastname: { type: "string" },
            phone: { type: "string" },
            company: { type: "string" },
            jobtitle: { type: "string" },
            lifecyclestage: {
              type: "string",
              enum: ["subscriber","lead","marketingqualifiedlead","salesqualifiedlead","opportunity","customer","evangelist","other"],
            },
          },
        },
        associateWithCompanyId: { type: "string", description: "Company ID to associate" },
      },
      required: ["properties"],
    },
  },
  {
    name: "hubspot_update_contact",
    description: "Update properties on an existing HubSpot contact.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "HubSpot contact record ID" },
        properties: {
          type: "object",
          description: "Fields to update",
          properties: {
            email: { type: "string" },
            firstname: { type: "string" },
            lastname: { type: "string" },
            phone: { type: "string" },
            company: { type: "string" },
            jobtitle: { type: "string" },
            lifecyclestage: { type: "string" },
            hs_lead_status: { type: "string" },
          },
        },
      },
      required: ["contactId", "properties"],
    },
  },
  {
    name: "hubspot_delete_contact",
    description: "Archive (soft-delete) a HubSpot contact.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "HubSpot contact record ID" },
      },
      required: ["contactId"],
    },
  },

  // ── Companies ─────────────────────────────────────────────────────────────

  {
    name: "hubspot_get_company",
    description: "Retrieve a single HubSpot company by record ID.",
    input_schema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "HubSpot company record ID" },
        additionalProperties: {
          type: "array",
          items: { type: "string" },
          description: "Extra property names to include",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "hubspot_list_companies",
    description: "List HubSpot companies with pagination.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Results per page (1-100)" },
        after: { type: "string", description: "Pagination cursor" },
      },
    },
  },
  {
    name: "hubspot_create_company",
    description: "Create a new company in HubSpot CRM.",
    input_schema: {
      type: "object",
      properties: {
        properties: {
          type: "object",
          description: "Company fields",
          properties: {
            name: { type: "string" },
            domain: { type: "string" },
            industry: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            country: { type: "string" },
            phone: { type: "string" },
            numberofemployees: { type: "number" },
            annualrevenue: { type: "number" },
            description: { type: "string" },
            lifecyclestage: { type: "string" },
          },
        },
      },
      required: ["properties"],
    },
  },
  {
    name: "hubspot_update_company",
    description: "Update properties on an existing HubSpot company.",
    input_schema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "HubSpot company record ID" },
        properties: {
          type: "object",
          description: "Fields to update",
          properties: {
            name: { type: "string" },
            domain: { type: "string" },
            industry: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            country: { type: "string" },
            phone: { type: "string" },
            numberofemployees: { type: "number" },
            annualrevenue: { type: "number" },
            description: { type: "string" },
            lifecyclestage: { type: "string" },
          },
        },
      },
      required: ["companyId", "properties"],
    },
  },
  {
    name: "hubspot_delete_company",
    description: "Archive (soft-delete) a HubSpot company.",
    input_schema: {
      type: "object",
      properties: {
        companyId: { type: "string", description: "HubSpot company record ID" },
      },
      required: ["companyId"],
    },
  },

  // ── Deals ─────────────────────────────────────────────────────────────────

  {
    name: "hubspot_get_deal",
    description: "Retrieve a single HubSpot deal by record ID.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "HubSpot deal record ID" },
        additionalProperties: {
          type: "array",
          items: { type: "string" },
          description: "Extra property names to include",
        },
      },
      required: ["dealId"],
    },
  },
  {
    name: "hubspot_list_deals",
    description: "List HubSpot deals with pagination.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Results per page (1-100)" },
        after: { type: "string", description: "Pagination cursor" },
      },
    },
  },
  {
    name: "hubspot_create_deal",
    description: "Create a new deal in HubSpot CRM.",
    input_schema: {
      type: "object",
      properties: {
        properties: {
          type: "object",
          description: "Deal fields",
          properties: {
            dealname: { type: "string" },
            amount: { type: "number" },
            dealstage: { type: "string" },
            pipeline: { type: "string" },
            closedate: { type: "string", description: "ISO 8601 date (e.g. 2026-12-31)" },
            dealtype: { type: "string", enum: ["newbusiness", "existingbusiness"] },
            description: { type: "string" },
            hubspot_owner_id: { type: "string" },
          },
        },
        associateWithContactId: { type: "string" },
        associateWithCompanyId: { type: "string" },
      },
      required: ["properties"],
    },
  },
  {
    name: "hubspot_update_deal",
    description: "Update properties on an existing HubSpot deal.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "HubSpot deal record ID" },
        properties: {
          type: "object",
          description: "Fields to update",
          properties: {
            dealname: { type: "string" },
            amount: { type: "number" },
            dealstage: { type: "string" },
            pipeline: { type: "string" },
            closedate: { type: "string" },
            dealtype: { type: "string" },
            description: { type: "string" },
            hubspot_owner_id: { type: "string" },
          },
        },
      },
      required: ["dealId", "properties"],
    },
  },
  {
    name: "hubspot_delete_deal",
    description: "Archive (soft-delete) a HubSpot deal.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "HubSpot deal record ID" },
      },
      required: ["dealId"],
    },
  },

  // ── Search & Associations ─────────────────────────────────────────────────

  {
    name: "hubspot_search",
    description: `Search contacts, companies, or deals using full-text query and/or property filters.
Operators: EQ, NEQ, CONTAINS_TOKEN, NOT_CONTAINS_TOKEN, GT, GTE, LT, LTE, HAS_PROPERTY, NOT_HAS_PROPERTY`,
    input_schema: {
      type: "object",
      properties: {
        objectType: { type: "string", enum: ["contacts", "companies", "deals"] },
        query: { type: "string", description: "Full-text search string" },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              propertyName: { type: "string" },
              operator: { type: "string" },
              value: { type: "string" },
            },
            required: ["propertyName", "operator"],
          },
          description: "Property filters",
        },
        properties: { type: "array", items: { type: "string" }, description: "Properties to return" },
        sortBy: { type: "string" },
        sortDirection: { type: "string", enum: ["ASCENDING", "DESCENDING"] },
        limit: { type: "number" },
        after: { type: "string" },
      },
      required: ["objectType"],
    },
  },
  {
    name: "hubspot_associate_records",
    description: "Create an association between two HubSpot CRM records.",
    input_schema: {
      type: "object",
      properties: {
        fromObjectType: { type: "string", enum: ["contacts", "companies", "deals"] },
        fromObjectId: { type: "string" },
        toObjectType: { type: "string", enum: ["contacts", "companies", "deals"] },
        toObjectId: { type: "string" },
      },
      required: ["fromObjectType", "fromObjectId", "toObjectType", "toObjectId"],
    },
  },
  {
    name: "hubspot_list_associations",
    description: "List all records of a given type associated with a source CRM record.",
    input_schema: {
      type: "object",
      properties: {
        fromObjectType: { type: "string", enum: ["contacts", "companies", "deals"] },
        fromObjectId: { type: "string" },
        toObjectType: { type: "string", enum: ["contacts", "companies", "deals"] },
      },
      required: ["fromObjectType", "fromObjectId", "toObjectType"],
    },
  },
];
