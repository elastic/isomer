/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const decodeJwtPayload = (jwt) => {
  const payload = jwt.split('.')[1];
  if (!payload) {
    throw new Error('GitHub returned a malformed OIDC token');
  }
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
};

const requestUrl = new URL(requiredEnv('ACTIONS_ID_TOKEN_REQUEST_URL'));
requestUrl.searchParams.set('audience', 'sts.amazonaws.com');

const response = await fetch(requestUrl, {
  headers: {
    Authorization: `Bearer ${requiredEnv('ACTIONS_ID_TOKEN_REQUEST_TOKEN')}`,
  },
});
if (!response.ok) {
  throw new Error(`GitHub OIDC request failed with HTTP ${response.status}`);
}

const { value: oidcToken } = await response.json();
if (typeof oidcToken !== 'string') {
  throw new Error('GitHub OIDC response did not contain a token');
}

const claims = decodeJwtPayload(oidcToken);
const safeClaimNames = [
  'sub',
  'aud',
  'repository',
  'repository_owner',
  'actor',
  'event_name',
  'workflow_ref',
  'job_workflow_ref',
  'head_ref',
  'base_ref',
  'ref',
  'run_id',
];
const safeClaims = Object.fromEntries(
  safeClaimNames
    .filter((name) => claims[name] !== undefined)
    .map((name) => [name, claims[name]])
);
console.log(`NO01_CANARY_OIDC_CLAIMS=${JSON.stringify(safeClaims)}`);

const repository = requiredEnv('GITHUB_REPOSITORY');
const rolePrefix = 'codex-eng-preview-';
const roleHash = createHash('sha256')
  .update(repository)
  .digest('hex')
  .slice(0, 64 - rolePrefix.length);
const roleArn = `arn:aws:iam::197730964718:role/${rolePrefix}${roleHash}`;
console.log(`NO01_CANARY_ROLE_ARN=${roleArn}`);

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'no01-oidc-'));
const tokenPath = join(temporaryDirectory, 'token.jwt');
writeFileSync(tokenPath, oidcToken, { mode: 0o600 });

try {
  const assumeRole = spawnSync(
    'aws',
    [
      'sts',
      'assume-role-with-web-identity',
      '--role-arn',
      roleArn,
      '--role-session-name',
      `h1-no01-${requiredEnv('GITHUB_RUN_ID')}`,
      '--web-identity-token',
      `file://${tokenPath}`,
      '--duration-seconds',
      '900',
      '--query',
      'Credentials',
      '--output',
      'json',
    ],
    { encoding: 'utf8' }
  );
  if (assumeRole.status !== 0) {
    throw new Error(
      `AWS STS AssumeRoleWithWebIdentity failed: ${assumeRole.stderr.trim()}`
    );
  }

  const credentials = JSON.parse(assumeRole.stdout);
  const callerIdentity = spawnSync(
    'aws',
    ['sts', 'get-caller-identity', '--output', 'json'],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
        AWS_SESSION_TOKEN: credentials.SessionToken,
        AWS_DEFAULT_REGION: 'us-east-1',
      },
    }
  );
  if (callerIdentity.status !== 0) {
    throw new Error(
      `AWS STS GetCallerIdentity failed: ${callerIdentity.stderr.trim()}`
    );
  }

  console.log(
    `NO01_CANARY_STS_IDENTITY=${JSON.stringify(JSON.parse(callerIdentity.stdout))}`
  );
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
