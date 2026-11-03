/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The part of EUI's global reset Elastic Charts relies on, scoped to its charts, for hosts without EUI. */
export const elasticChartsReset = `.echChart, .echChart *, .echChart ::before, .echChart ::after { box-sizing: border-box; }
.echChart :where(h1, h2, h3, h4, h5, h6, p, ul, ol, li, button) { margin: 0; padding: 0; }
.echChart :where(ul, ol) { list-style: none; }
.echChart :where(h1, h2, h3, h4, h5, h6) { font-size: inherit; font-weight: inherit; }
.echChart :where(button) { appearance: none; background: none; border: 0; font: inherit; color: inherit; text-align: inherit; }
`;
