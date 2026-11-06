import { readFileSync } from 'node:fs';

// Never bundled for Hermes: platform.native.ts wins, as it does under Metro.
export const platform = readFileSync('/etc/hostname', 'utf8');
