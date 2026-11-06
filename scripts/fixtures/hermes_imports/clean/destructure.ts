export const copy = (globalThis: { structuredClone: (value: unknown) => unknown }, value: unknown) => { const { structuredClone } = globalThis; return structuredClone(value); };
