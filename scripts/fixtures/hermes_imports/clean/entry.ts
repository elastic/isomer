// Clean: pure formatting and scene code, with near-misses that must not trip the check.
import { platform } from './platform';
import { formatBytes } from './format';

// A local binding named like a banned global is not the global.
const structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const describe = (bytes: number) => ({
  label: formatBytes(bytes),
  platform,
  // Banned names as strings and property keys are not references.
  note: 'no MessageChannel or structuredClone here',
  copy: structuredClone({ bytes }),
  meta: { MessageChannel: false }.MessageChannel,
});
