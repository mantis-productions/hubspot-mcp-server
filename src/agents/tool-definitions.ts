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
    description: "List HubSpot contacts with pagination. Order is NOT guaranteed to be by recency (typically ascending by internal record ID / creation order, oldest first). For \"most recent\" or \"latest\" requests, use hubspot_search with sortBy=\"createdate\" and sortDirection=\"DESCENDING\" instead.",
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

  // ── Companies ────────────────────────────────────────────────────────────────

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
    description: "List HubSpot companies with pagination. Order is NOT guaranteed to be by recency (typically ascending by internal record ID / creation order, oldest first). For \"most recent\" or \"latest\" requests, use hubspot_search with sortBy=\"createdate\" and sortDirection=\"DESCENDING\" instead.",
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
    description: "List HubSpot deals with pagination. Order is NOT guaranteed to be by recency (typically ascending by internal record ID / creation order, oldest first). For \"most recent\" or \"latest\" requests, use hubspot_search with sortBy=\"createdate\" and sortDirection=\"DESCENDING\" instead.",
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

  // ── Pipelines & Stages ──────────────────────────────────────────────

  {
    name: "hubspot_list_pipelines",
    description: "List all pipelines and their stages for an object type (e.g. deals, tickets). Each stage includes its id, label, displayOrder, and metadata (probability for deals).",
    input_schema: {
      type: "object",
      properties: {
        objectType: { type: "string", enum: ["deals", "tickets"], description: "Object type (default: deals)" },
      },
    },
  },
  {
    name: "hubspot_create_pipeline",
    description: `Create a new pipeline with its stages in one call.

For objectType "deals", each stage needs a "probability" (0.0-1.0, likelihood of closing at that stage; use 1.0 for a closed-won-style stage, 0.0 for closed-lost-style).
For objectType "tickets", each stage needs a "state" of "OPEN" or "CLOSED" instead.

Returns the created pipeline with real stage IDs — use those IDs (not labels) in all other pipeline/stage/deal tools.`,
    input_schema: {
      type: "object",
      properties: {
        objectType: { type: "string", enum: ["deals", "tickets"], description: "Object type (default: deals)" },
        label: { type: "string", description: "Pipeline display name" },
        stages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              displayOrder: { type: "number", description: "0-indexed order within the pipeline" },
              probability: { type: "number", description: "0.0-1.0 (deals pipelines only)" },
              state: { type: "string", enum: ["OPEN", "CLOSED"], description: "(tickets pipelines only)" },
            },
            required: ["label", "displayOrder"],
          },
          description: "Ordered list of stages to create with the pipeline",
        },
      },
      required: ["label", "stages"],
    },
  },
  {
    name: "hubspot_update_pipeline",
    description: "Update a pipeline's label or display order.",
    input_schema: {
      type: "object",
      properties: {
        objectType: { type: "string", enum: ["deals", "tickets"], description: "Object type (default: deals)" },
        pipelineId: { type: "string" },
        label: { type: "string" },
        displayOrder: { type: "number" },
      },
      required: ["pipelineId"],
    },
  },
  {
    name: "hubspot_create_pipeline_stage",
    description: "Add a new stage to an existing pipeline.",
    input_schema: {
      type: "object",
      properties: {
        objectType: { type: "string", enum: ["deals", "tickets"], description: "Object type (default: deals)" },
        pipelineId: { type: "string" },
        label: { type: "string" },
        displayOrder: { type: "number", description: "0-indexed order within the pipeline" },
        probability: { type: "number", description: "0.0-1.0 (deals pipelines only)" },
        state: { type: "string", enum: ["OPEN", "CLOSED"], description: "(tickets pipelines only)" },
      },
      required: ["pipelineId", "label", "displayOrder"],
    },
  },
  {
    name: "hubspot_update_pipeline_stage",
    description: "Update an existing pipeline stage's label, order, or probability/state.",
    input_schema: {
      type: "object",
      properties: {
        objectType: { type: "string", enum: ["deals", "tickets"], description: "Object type (default: deals)" },
        pipelineId: { type: "string" },
        stageId: { type: "string" },
        label: { type: "string" },
        displayOrder: { type: "number" },
        probability: { type: "number" },
        state: { type: "string", enum: ["OPEN", "CLOSED"] },
      },
      required: ["pipelineId", "stageId"],
    },
  },
  {
    name: "hubspot_delete_pipeline_stage",
    description: "Delete a pipeline stage. Fails if any deal currently sits in that stage — move or close those deals first.",
    input_schema: {
      type: "object",
      properties: {
        objectType: { type: "string", enum: ["deals", "tickets"], description: "Object type (default: deals)" },
        pipelineId: { type: "string" },
        stageId: { type: "string" },
      },
      required: ["pipelineId", "stageId"],
    },
  },

  // ── Stage-required-properties (agent-enforced, not a native HubSpot API) ──

  {
    name: "hubspot_set_stage_required_properties",
    description: `Define which deal properties must be set before a deal can enter a given pipeline stage.

IMPORTANT: HubSpot's API has no native concept of stage-required-properties (verified against live docs — stage metadata only carries probability). This is an agent-side rule, enforced only by this agent when it moves a deal via hubspot_move_deal_to_stage — it does NOT appear in the HubSpot UI and does NOT block manual stage changes made by users in HubSpot directly. Rules also reset if this server restarts/redeploys unless promoted into the server's source code.`,
    input_schema: {
      type: "object",
      properties: {
        pipelineId: { type: "string" },
        stageId: { type: "string" },
        requiredProperties: {
          type: "array",
          items: { type: "string" },
          description: "HubSpot deal property internal names that must be non-empty (e.g. amount, closedate)",
        },
      },
      required: ["pipelineId", "stageId", "requiredProperties"],
    },
  },
  {
    name: "hubspot_get_stage_required_properties",
    description: "Get the agent-enforced required properties configured for a pipeline stage. Omit stageId to list all configured rules for the pipeline.",
    input_schema: {
      type: "object",
      properties: {
        pipelineId: { type: "string" },
        stageId: { type: "string" },
      },
      required: ["pipelineId"],
    },
  },
  {
    name: "hubspot_move_deal_to_stage",
    description: `Move a deal into a pipeline stage, enforcing any agent-side required-properties rule configured for that stage (see hubspot_set_stage_required_properties).

If required properties are missing, the deal is NOT updated and the response lists exactly which properties are missing — set them first with hubspot_update_deal, then retry.`,
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string" },
        pipelineId: { type: "string", description: "Pipeline the deal belongs to (needed to look up the stage's required-properties rule)" },
        stageId: { type: "string", description: "Target stage ID (this becomes the deal's dealstage)" },
      },
      required: ["dealId", "pipelineId", "stageId"],
    },
  },

  // ── Account & Owners ─────────────────────────────────────────────────────

  {
    name: "hubspot_get_account_info",
    description: "Get this HubSpot portal's account-level details: time zone, currency, account type, portal name, account ID, and creation date.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "hubspot_list_owners",
    description: "List HubSpot owners (CRM-assignable reps used for hubspot_owner_id on contacts/companies/deals). Optionally filter by email. Use this to look up a real owner ID before assigning a record to someone — never guess an owner ID.",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Filter to the owner with this exact email address" },
        limit: { type: "number", description: "Results per page (1-500, default 100)" },
        after: { type: "string", description: "Pagination cursor" },
      },
    },
  },
  {
    name: "hubspot_get_owner",
    description: "Get a single HubSpot owner by owner ID.",
    input_schema: {
      type: "object",
      properties: {
        ownerId: { type: "string", description: "HubSpot owner ID" },
      },
      required: ["ownerId"],
    },
  },
];
