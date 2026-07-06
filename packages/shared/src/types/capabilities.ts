/**
 * AgentWorker capability keys. The orchestrator dispatches by capability,
 * never by concrete class — swapping a worker implementation requires zero
 * orchestrator change (the "interchangeable agents" hard requirement).
 */
export const CAPABILITIES = {
  ExtractTranscript: 'extract.transcript',
  ClassifyTags: 'classify.tags',
  DraftOutreach: 'draft.outreach',
  RouteLead: 'route.lead',
  PrioritizeTasks: 'prioritize.tasks',
} as const;
export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];
