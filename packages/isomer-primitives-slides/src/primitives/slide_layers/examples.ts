/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayersNode } from './schema';

/** Canonical {@link SlideLayersNode} example. */
export const example: SlideLayersNode = {
  type: 'slideLayers',
  layers: [
    {
      name: 'Apps',
      chips: ['ios', 'android', 'web'],
      owner: 'Client team',
      tone: 'primary',
    },
    {
      name: 'Gateway',
      body: 'Routes, rate-limits, and authenticates every request',
      owner: 'Platform',
      tone: 'primary',
    },
    {
      name: 'Services',
      body: 'Orders, catalog, and **delivery slots**, each deployed on its own',
      owner: 'Product teams',
    },
    {
      name: 'Data',
      chips: ['postgres', 'redis', 'kafka'],
      owner: 'Data team',
    },
    {
      name: 'Cloud',
      body: 'Compute, storage, and the network under all of it',
      owner: 'Provider',
      tone: 'accent',
    },
  ],
};

/** Six layers, and six chips on one, the most the slide holds. */
export const fullExample: SlideLayersNode = {
  type: 'slideLayers',
  layers: [
    {
      name: 'Roof',
      body: 'Solar panels and the rainwater tanks',
      owner: 'Landlord',
      tone: 'accent',
    },
    {
      name: 'Offices',
      body: 'Four floors of leased desks and meeting rooms',
      owner: 'Tenants',
    },
    {
      name: 'Lobby',
      chips: ['reception', 'café', 'mail room', 'lockers', 'gym', 'bike store'],
      owner: 'Facilities',
      tone: 'primary',
    },
    {
      name: 'Parking',
      body: 'Two levels, with chargers on the lower one',
      owner: 'Facilities',
      tone: 'primary',
    },
    {
      name: 'Plant room',
      chips: ['boilers', 'chillers', 'generator'],
      owner: 'Contractor',
    },
    {
      name: 'Foundations',
      body: 'Concrete piles driven twenty meters into clay',
      owner: 'Landlord',
      tone: 'accent',
    },
  ],
};

/** Three, the fewest. */
export const shortExample: SlideLayersNode = {
  type: 'slideLayers',
  layers: [
    {
      name: 'HTTP',
      body: 'Requests and responses your code reads and writes',
      owner: 'Your app',
      tone: 'primary',
    },
    {
      name: 'TLS',
      body: 'Encrypts the bytes and proves who the server is',
      owner: 'The library',
    },
    {
      name: 'TCP',
      body: 'Delivers the bytes in order, resending what gets lost',
      owner: 'The OS',
    },
  ],
};

/** Conformance examples for {@link SlideLayersNode}. */
export const examples: SlideLayersNode[] = [example, fullExample, shortExample];
