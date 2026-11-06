const { ['structuredClone']: clone } = globalThis; export const copy = (value: unknown) => clone(value);
