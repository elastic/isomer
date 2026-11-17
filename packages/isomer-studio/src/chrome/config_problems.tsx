/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

/** Why the latest config was rejected, or nothing when it loaded. */
export const ConfigProblems = ({
  problems,
}: {
  problems: readonly string[];
}) =>
  problems.length ? (
    <EuiCallOut
      announceOnMount
      color="danger"
      iconType="error"
      title="The config is invalid; the Studio keeps the last valid one">
      <ul>
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </EuiCallOut>
  ) : null;
