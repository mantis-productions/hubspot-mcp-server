import Anthropic from "@anthropic-ai/sdk";
import type { AxiosInstance } from "axios";
import { HUBSPOT_TOOLS } from "./tool-definitions.js";
import { executeTool } from "./tool-executor.js";

export interface AgentAction {
  tool: string;
  input: Record<string, unknown>;
  result: unknown;
}

export interface AgentResult {
  answer: string;
  actions: AgentAction[];
  turns: number;
}

const SYSTEM_PROMPT = `You are a HubSpot CRM assistant. When the user gives you a natural-language request, use the available tools to fulfill it — searching, reading, creating, updating, or deleting CRM records as needed.

Guidelines:
- Always search or look up records before updating or associating them unless IDs are given.
- When creating records, confirm required fields are present (e.g. email for contacts, dealname for deals).
- After completing actions, summarize what was done in a clear, concise response.
- If a request is ambiguous, make a reasonable assumption and state it in your response.
- Never fabricate record IDs or data — use only what the tools return.
- For "most recent", "latest", "newest", or "oldest" requests, never use the plain list tools (hubspot_list_contacts/companies/deals) — their order is not recency-based. Use hubspot_search with sortBy="createdate" and sortDirection="DESCENDING" (or "ASCENDING" for oldest) instead.
- Pipelines and stages: use hubspot_list_pipelines to look up real pipeline/stage IDs before creating or editing stages — never guess an ID. HubSpot deal stages need a "probability" (0.0-1.0); ticket stages need a "state" (OPEN/CLOSED).
- HubSpot has no native concept of "required properties per stage" — that's enforced only by this agent via hubspot_set_stage_required_properties / hubspot_move_deal_to_stage. Explain this distinction if the user asks for it to show up in the HubSpot UI or to block manual stage changes made directly in HubSpot — it won't. Always use hubspot_move_deal_to_stage (not a raw hubspot_update_deal) when moving a deal between stages, so any configured requirements are enforced.
- When assigning a record to someone (hubspot_owner_id), use hubspot_list_owners to look up the real owner ID by name/email first — never guess one.`;

export async function runAgent(
  anthropic: Anthropic,
  hubspotClient: AxiosInstance,
  prompt: string,
  maxTurns = 10
): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: prompt },
  ];

  const actions: AgentAction[] = [];
  let turns = 0;

  while (turns < maxTurns) {
    turns++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: HUBSPOT_TOOLS,
      messages,
    });

    // Add assistant response to message history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Extract final text answer
      const textBlock = response.content.find((b) => b.type === "text");
      const answer = textBlock?.type === "text" ? textBlock.text : "Done.";
      return { answer, actions, turns };
    }

    if (response.stop_reason !== "tool_use") {
      break;
    }

    // Execute all tool calls in this response
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      let result: unknown;
      let isError = false;

      try {
        result = await executeTool(hubspotClient, block.name, block.input as Record<string, unknown>);
        actions.push({ tool: block.name, input: block.input as Record<string, unknown>, result });
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
        isError = true;
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
        is_error: isError,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    answer: `Agent stopped after ${turns} turns without a final response.`,
    actions,
    turns,
  };
}
