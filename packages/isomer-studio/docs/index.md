---
navigation_title: Isomer Studio
description: A gallery, per-primitive docs, a JSX editor and a preview of every surface for any Isomer pack.
---

# Isomer Studio

`@elastic/isomer-studio` is a dev and docs shell for any Isomer pack. Point it at a config file that exports a runtime, and it shows a gallery of every primitive, a docs page per primitive, a JSX editor with a live preview, and the same composition on every surface the runtime has.

## A first config

```ts
// isomer-studio.config.ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { myPack } from './src';

export default defineStudioConfig({
  runtime: createIsomerRuntime({ packs: [myPack] }),
});
```

That is enough for a pack whose primitives render inside a plain `view`. A pack with a frame that needs a particular root, or with styling the React surface must load, adds `compose` and `createReactContext`; see [The config](config.md).
