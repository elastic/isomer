export const clone = <T>(value: T): T => globalThis.structuredClone(value);
