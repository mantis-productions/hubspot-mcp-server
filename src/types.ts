// ── HubSpot API response shapes ──────────────────────────────────────────────

export interface HubSpotRecord {
  id: string;
  properties: Record<string, string | null>;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}

export interface HubSpotListResponse<T> {
  results: T[];
  paging?: {
    next?: { after: string; link?: string };
  };
}

export interface HubSpotSearchResponse<T> {
  total: number;
  results: T[];
  paging?: {
    next?: { after: string; link?: string };
  };
}

export interface HubSpotError {
  status: string;
  message: string;
  correlationId?: string;
  errors?: Array<{ message: string; in?: string }>;
}

export interface HubSpotAssociation {
  id: string;
  type: string;
}

export interface HubSpotAssociationResult {
  results: Array<{
    id: string;
    type: string;
  }>;
}

// ── Search filter types ───────────────────────────────────────────────────────

export interface SearchFilter {
  propertyName: string;
  operator: "EQ" | "NEQ" | "CONTAINS_TOKEN" | "NOT_CONTAINS_TOKEN" | "GT" | "GTE" | "LT" | "LTE" | "HAS_PROPERTY" | "NOT_HAS_PROPERTY";
  value?: string;
}

export interface SearchFilterGroup {
  filters: SearchFilter[];
}

export interface SearchRequest {
  query?: string;
  filterGroups?: SearchFilterGroup[];
  properties?: string[];
  sorts?: Array<{ propertyName: string; direction: "ASCENDING" | "DESCENDING" }>;
  after?: string;
  limit?: number;
}

// ── Tool output shapes ────────────────────────────────────────────────────────

export interface ContactOutput {
  [key: string]: unknown;
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  lifecycleStage: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyOutput {
  [key: string]: unknown;
  id: string;
  name: string | null;
  domain: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  employees: string | null;
  annualRevenue: string | null;
  lifecycleStage: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealOutput {
  [key: string]: unknown;
  id: string;
  dealName: string | null;
  amount: string | null;
  dealStage: string | null;
  pipeline: string | null;
  closeDate: string | null;
  dealType: string | null;
  description: string | null;
  ownerId: string | null;
  createdAt?: string;
  updatedAt?: string;
}
