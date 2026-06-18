import axios, { AxiosInstance, AxiosError } from "axios";
import { HUBSPOT_BASE_URL } from "../constants.js";
import type { HubSpotError, SearchRequest, HubSpotSearchResponse, HubSpotRecord } from "../types.js";

export function createHubSpotClient(accessToken: string): AxiosInstance {
  const client = axios.create({
    baseURL: HUBSPOT_BASE_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15_000,
  });

  // Response interceptor: normalize errors
  client.interceptors.response.use(
    (res) => res,
    (error: AxiosError<HubSpotError>) => {
      const status = error.response?.status ?? 0;
      const data = error.response?.data;

      if (status === 401) {
        throw new Error(
          "HubSpot authentication failed. Verify your HUBSPOT_ACCESS_TOKEN is valid and has the required scopes."
        );
      }
      if (status === 429) {
        throw new Error(
          "HubSpot rate limit exceeded. Wait a moment and try again."
        );
      }
      if (status === 404) {
        throw new Error(
          `HubSpot record not found. Verify the ID exists and your token has access.`
        );
      }

      const msg = data?.message ?? error.message;
      const extras = data?.errors?.map((e) => e.message).join("; ") ?? "";
      throw new Error(`HubSpot API error (${status}): ${msg}${extras ? ` — ${extras}` : ""}`);
    }
  );

  return client;
}

// ── Pagination helper ─────────────────────────────────────────────────────────

export async function fetchAllPages<T>(
  client: AxiosInstance,
  url: string,
  params: Record<string, unknown> = {},
  maxRecords = 500
): Promise<T[]> {
  const results: T[] = [];
  let after: string | undefined;

  do {
    const response = await client.get<{
      results: T[];
      paging?: { next?: { after: string } };
    }>(url, { params: { ...params, ...(after ? { after } : {}) } });

    results.push(...response.data.results);
    after = response.data.paging?.next?.after;
  } while (after && results.length < maxRecords);

  return results;
}

// ── Search helper ─────────────────────────────────────────────────────────────

export async function searchObjects(
  client: AxiosInstance,
  objectType: string,
  request: SearchRequest
): Promise<HubSpotSearchResponse<HubSpotRecord>> {
  const response = await client.post<HubSpotSearchResponse<HubSpotRecord>>(
    `/crm/v3/objects/${objectType}/search`,
    request
  );
  return response.data;
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function prop(record: HubSpotRecord, key: string): string | null {
  return record.properties[key] ?? null;
}

export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + `\n\n[...truncated at ${limit} characters]`;
}
