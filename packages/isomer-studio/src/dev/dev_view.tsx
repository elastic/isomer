/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { PrimitiveHeading } from '../chrome/primitive_heading';
import type { StudioRoute } from '../chrome/route';
import type { ComposeParams } from '../model/compose_link';
import { encodeSource } from '../model/compose_link';
import { rememberTrusted } from '../model/compose_storage';
import type { PrimitiveDoc } from '../model/describe_runtime';
import { useStudio } from '../studio_context';
import { ExamplePicker } from '../surfaces/example_picker';

import { EditorPanel } from './editor_panel';
import type { EditorFormat, EditorState } from './use_editor';
import { printDraft, splitComposition, useEditor } from './use_editor';
import { Workbench } from './workbench';

const OPEN_LABEL = 'Open in the composition editor';

/** Carries the composed draft, minus the Studio's theme, to the composition editor. */
const OpenInComposer = ({
  editor,
  openComposer,
}: {
  editor: EditorState;
  openComposer: (params: ComposeParams) => void;
}) => {
  const { schemaFor, shim } = useStudio();
  const open = async () => {
    const { theme: _theme, ...authored } = editor.composition;
    const draft = splitComposition(authored);
    const printAs = (format: EditorFormat) => ({
      format,
      source: printDraft(draft, format, 'composition', { schemaFor, shim }),
    });
    let printed: { format: EditorFormat; source: string };
    try {
      printed = printAs(editor.format);
    } catch {
      // A type JSX can't name still carries over as JSON.
      printed = printAs('json');
    }
    rememberTrusted(printed);
    openComposer({
      code: await encodeSource(printed.source),
      lang: printed.format,
    });
  };

  return (
    <EuiButtonEmpty
      size="s"
      iconType="external"
      isDisabled={Boolean(editor.parseError) || editor.isParsing}
      onClick={() => void open()}>
      {OPEN_LABEL}
    </EuiButtonEmpty>
  );
};

const ExampleWorkbench = ({
  doc,
  example,
  stacked,
  onExampleChange,
  openComposer,
}: {
  doc: PrimitiveDoc;
  example: number;
  stacked: boolean;
  onExampleChange: (example: number) => void;
  openComposer: (params: ComposeParams) => void;
}) => {
  const [initial] = useState(() => ({
    nodes: [doc.examples[example]?.node ?? { type: doc.type }],
  }));
  const editor = useEditor(initial);
  const { label, examples } = doc;

  return (
    <Workbench
      heading={
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <PrimitiveHeading {...{ doc }} layout="inline" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <OpenInComposer {...{ editor, openComposer }} />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      source={
        <EditorPanel
          {...{ editor }}
          ariaLabel={`${label} source`}
          leading={
            <ExamplePicker
              {...{ examples, example }}
              onChange={onExampleChange}
            />
          }
        />
      }
      supported={doc.surfaces}
      {...{ editor, stacked, doc }}
    />
  );
};

export interface DevViewProps {
  route: StudioRoute;
  stacked: boolean;
  navigate: (next: Partial<StudioRoute>) => void;
  openComposer: (params: ComposeParams) => void;
}

/** The workbench: edit one example beside the previews, or above them when space is tight. */
export const DevView = ({
  route: { page, example },
  stacked,
  navigate,
  openComposer,
}: DevViewProps) => {
  const {
    docs: { primitives },
  } = useStudio();
  const doc = primitives.find(({ type }) => type === page);
  if (!doc) {
    return null;
  }

  return (
    <ExampleWorkbench
      key={`${page}/${example}`}
      {...{ doc, example, stacked, openComposer }}
      onExampleChange={(next) => navigate({ example: next })}
    />
  );
};
