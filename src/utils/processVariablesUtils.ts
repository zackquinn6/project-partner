import type { StepInput } from '@/interfaces/Project';

/** Parse `operation_steps.process_variables` JSON the same way as the workflow editor. */
export function parseProcessVariablesFromDb(raw: unknown): StepInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const id = typeof item.id === 'string' && item.id ? item.id : `input-${index}`;
      const normalizedType = item.type === 'upstream' ? 'upstream' : 'process';
      return {
        id,
        name,
        type: normalizedType,
        description: typeof item.description === 'string' ? item.description : undefined,
        required: typeof item.required === 'boolean' ? item.required : false,
        options: Array.isArray(item.options) ? (item.options as string[]) : undefined,
        unit: typeof item.unit === 'string' ? item.unit : undefined,
        sourceStepId: typeof item.sourceStepId === 'string' ? item.sourceStepId : undefined,
        sourceStepName: typeof item.sourceStepName === 'string' ? item.sourceStepName : undefined,
        targetValue: typeof item.targetValue === 'string' ? item.targetValue : undefined,
      };
    })
    .filter((item) => item.name.length > 0);
}
