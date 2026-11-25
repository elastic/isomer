# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.

# This repository installed and built on Linux, so native packages such as
# takumi's get their Linux binaries. `scripts/container_floor.cjs` builds it.
FROM node:24.22.3-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530

# No `.git` in the image, so husky's `prepare` has nothing to install into.
ENV HUSKY=0 NODE_ENV=production
WORKDIR /isomer
RUN corepack enable
COPY . .
# The build needs devDependencies, which `NODE_ENV=production` would skip.
RUN NODE_ENV=development pnpm install --frozen-lockfile && NODE_ENV=development pnpm build
