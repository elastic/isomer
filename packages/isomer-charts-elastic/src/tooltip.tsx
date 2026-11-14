/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TooltipContainer,
  TooltipHeader,
  TooltipTable,
  TooltipTableBody,
  TooltipTableCell,
  TooltipTableColorCell,
  TooltipTableRow,
} from '@elastic/charts';

/** A tooltip's header, when it has one, above a row for each entry: its color, label and value. */
export const SceneTooltipTable = ({
  header,
  entries,
}: {
  header?: string | undefined;
  entries: readonly {
    readonly label: string;
    readonly value: string;
    readonly color?: string | undefined;
  }[];
}) => (
  <TooltipContainer>
    {header === undefined ? null : <TooltipHeader>{header}</TooltipHeader>}
    <TooltipTable gridTemplateColumns="auto auto auto">
      <TooltipTableBody>
        {entries.map(({ label, value, color }, index) => (
          <TooltipTableRow key={index}>
            <TooltipTableColorCell color={color ?? 'transparent'} />
            <TooltipTableCell>{label}</TooltipTableCell>
            <TooltipTableCell>{value}</TooltipTableCell>
          </TooltipTableRow>
        ))}
      </TooltipTableBody>
    </TooltipTable>
  </TooltipContainer>
);
