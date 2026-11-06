const environment = globalThis; export const copy = (value: unknown) => environment.structuredClone(value);
