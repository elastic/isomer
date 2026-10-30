/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-check
// The PDF worker run from `src`: tsx's CommonJS hooks apply inside a worker on every supported Node, its ESM hooks only from 22.23.
'use strict';

require('tsx/cjs/api').require('./pdf_worker.ts', __filename);
