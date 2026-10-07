// In-memory store for agent-enforced "required properties per deal stage" rules.
// HubSpot's Pipelines API has no concept of stage-level required properties
// (confirmed against the live API — stage metadata only carries `probability`),
// so the agent enforces this itself before moving a deal into a stage.
//
// This store resets on process restart. Treat it as a fast-iteration layer —
// once a pipeline's rules stabilize, promote them into this file's
// DEFAULT_REQUIREMENTS so they survive deploys.

export type StageRequirements = Record<string, Record<string, string[]>>;
// pipelineId -> stageId -> required property names

const DEFAULT_REQUIREMENTS: StageRequirements = {};

let requirements: StageRequirements = structuredClone(DEFAULT_REQUIREMENTS);

export function setStageRequirements(
  pipelineId: string,
  stageId: string,
  requiredProperties: string[]
): void {
  if (!requirements[pipelineId]) requirements[pipelineId] = {};
  requirements[pipelineId][stageId] = requiredProperties;
}

export function getStageRequirements(pipelineId: string, stageId: string): string[] {
  return requirements[pipelineId]?.[stageId] ?? [];
}

export function getAllStageRequirements(): StageRequirements {
  return requirements;
}

export function clearStageRequirements(pipelineId: string, stageId: string): void {
  if (requirements[pipelineId]) delete requirements[pipelineId][stageId];
}
