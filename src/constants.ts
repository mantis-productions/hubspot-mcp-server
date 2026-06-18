export const HUBSPOT_BASE_URL = "https://api.hubapi.com";
export const CHARACTER_LIMIT = 50_000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Association type IDs (HUBSPOT_DEFINED)
export const ASSOCIATION_TYPES = {
  CONTACT_TO_COMPANY: 1,
  COMPANY_TO_CONTACT: 2,
  DEAL_TO_CONTACT: 3,
  CONTACT_TO_DEAL: 4,
  DEAL_TO_COMPANY: 5,
  COMPANY_TO_DEAL: 6,
} as const;

// Default properties to fetch for each object type
export const DEFAULT_CONTACT_PROPERTIES = [
  "firstname", "lastname", "email", "phone",
  "company", "jobtitle", "lifecyclestage",
  "hs_lead_status", "createdate", "lastmodifieddate",
];

export const DEFAULT_COMPANY_PROPERTIES = [
  "name", "domain", "industry", "city", "state", "country",
  "phone", "numberofemployees", "annualrevenue",
  "lifecyclestage", "createdate", "lastmodifieddate",
];

export const DEFAULT_DEAL_PROPERTIES = [
  "dealname", "amount", "dealstage", "pipeline",
  "closedate", "dealtype", "description",
  "hubspot_owner_id", "createdate", "lastmodifieddate",
];
