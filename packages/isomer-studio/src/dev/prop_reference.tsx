/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import type { PropDescriptor } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { createChildNodeWalker } from '@elastic/isomer-sdk';
import { readAuthoredSpec } from '@elastic/isomer-sdk/author';
import { css } from '@emotion/react';
import type { ZodType } from 'zod';
import { toJSONSchema } from 'zod';

import { useAccent } from '../chrome/accent';
import { PropsTable } from '../docs/props_table';
import type { PrimitiveDoc } from '../model/describe_runtime';
import { useStudio } from '../studio_context';

type Schema = Record<string, unknown>;
const isSchema = (value: unknown): value is Schema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const schemaType = (
  schema: Schema,
  defs: Schema,
  seen = new Set<string>()
): string => {
  if (typeof schema.$ref === 'string') {
    const name = schema.$ref.replace(/^#\/\$defs\//, '');
    const target = defs[name];
    return !seen.has(name) && isSchema(target)
      ? schemaType(target, defs, new Set(seen).add(name))
      : name;
  }
  if ('const' in schema) {
    return JSON.stringify(schema.const);
  }
  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  }
  const variants = schema.anyOf ?? schema.oneOf;
  if (Array.isArray(variants)) {
    return variants
      .filter(isSchema)
      .map((value) => schemaType(value, defs, seen))
      .join(' | ');
  }
  if (schema.type === 'array' && isSchema(schema.items)) {
    const item = schemaType(schema.items, defs, seen);
    return `${item.includes(' | ') ? `(${item})` : item}[]`;
  }
  return typeof schema.type === 'string' ? schema.type : 'unknown';
};

const childProps = (schema: ZodType): PropDescriptor[] => {
  const json = toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  const defs = isSchema(json.$defs) ? json.$defs : {};
  const properties = isSchema(json.properties) ? json.properties : {};
  const required = new Set(json.required ?? []);
  return Object.entries(properties).flatMap(([name, value]) =>
    isSchema(value)
      ? [
          {
            name,
            type: schemaType(value, defs),
            kind: 'other' as const,
            required: required.has(name),
            ...(typeof value.description === 'string'
              ? { description: value.description }
              : {}),
          },
        ]
      : []
  );
};

interface Reference {
  name: string;
  props: PropDescriptor[];
}

const childReferences = (
  schema: ZodType,
  name: string,
  ancestors = new Set<ZodType>()
): Reference[] => {
  if (ancestors.has(schema)) {
    return [];
  }
  const seen = new Set(ancestors).add(schema);
  const references = readAuthoredSpec(schema).children.flatMap((field) => {
    const childName = `${name}.${field.name.charAt(0).toUpperCase()}${field.name.slice(1)}`;
    return [
      {
        name: childName,
        props: childProps(field.propsSchema ?? field.itemSchema),
      },
      ...(field.toItem ? [] : childReferences(field.itemSchema, name, seen)),
    ];
  });
  return [
    ...new Map(
      references.map((reference) => [reference.name, reference])
    ).values(),
  ];
};

/** Props for the selected primitive, its branded JSX children, and other nodes in the draft. */
export const PropReference = ({
  doc,
  nodes,
  id,
}: {
  doc: PrimitiveDoc;
  nodes: readonly PrimitiveNode[];
  id: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const accent = useAccent('dev');
  const [selected, setSelected] = useState<string>();
  const {
    runtime,
    docs: { primitives },
  } = useStudio();
  const references = useMemo(() => {
    const walk = createChildNodeWalker(runtime.primitives);
    // A primitive's child walker may assume schema-valid props.
    const walkChildren = (node: Schema) => {
      try {
        return walk(node);
      } catch {
        return [];
      }
    };
    const types = new Set([doc.type]);
    const visited = new Set<unknown>();
    const visit = (node: unknown) => {
      if (!isSchema(node) || visited.has(node)) {
        return;
      }
      visited.add(node);
      if (typeof node.type === 'string') {
        types.add(node.type);
      }
      walkChildren(node).forEach(({ node: child }) => visit(child));
    };
    nodes.forEach(visit);
    return [...types].flatMap((type): Reference[] => {
      const primitive = primitives.find((item) => item.type === type);
      if (!primitive) {
        return [];
      }
      const name = type.charAt(0).toUpperCase() + type.slice(1);
      return [
        { name, props: primitive.props },
        ...childReferences(primitive.definition.schema, name),
      ];
    });
  }, [doc.type, nodes, primitives, runtime.primitives]);
  const active =
    references.find(({ name }) => name === selected) ?? references[0];

  return (
    <section
      id={id}
      aria-label="Primitive prop reference"
      css={css`
        flex: 0 1 auto;
        min-height: 0;
        overflow: auto;
        padding: ${euiTheme.size.base};
        border-top: ${euiTheme.border.thin};
      `}>
      <EuiTabs size="s" aria-label="Prop reference components">
        {references.map(({ name }) => (
          <EuiTab
            key={name}
            isSelected={name === active?.name}
            aria-controls={`${id}-table`}
            id={`${id}-${name}`}
            onClick={() => setSelected(name)}>
            {name}
          </EuiTab>
        ))}
      </EuiTabs>
      {active ? (
        <section
          id={`${id}-table`}
          role="tabpanel"
          aria-labelledby={`${id}-${active.name}`}>
          <PropsTable
            props={active.props}
            {...{ accent }}
            compact
            names={primitives.map(({ type }) => type)}
          />
        </section>
      ) : null}
    </section>
  );
};
