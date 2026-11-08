/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A table Scene as an HTML table, laid out as Lens's data grid: a shaded
// header, rows split by horizontal lines, an optional shaded footer, and the
// pager, under the title and description and above the notes and link. It
// draws the first page in the Scene's starting order. Every color is the
// Scene's; every length is `CHARTS_THEME`'s.

import type { CSSProperties, ReactNode } from 'react';
import { sanitizeNavigationHref } from '@elastic/isomer-sdk';

import type { TableCell, TableScene } from '../scene/types';
import { sceneNotes } from '../text/scene_text';

import type { ReactSceneRenderer } from './context';
import { CHARTS_THEME } from './theme';

const theme = CHARTS_THEME.table;

const ellipsis: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const linkOf = ({ interactions: { link } }: TableScene) => {
  const href = link && sanitizeNavigationHref(link.href);
  return link && href ? { href, label: link.label } : undefined;
};

/** The height of the lines around the table: title, description, notes and link. */
const textHeight = (scene: TableScene) =>
  (scene.title ? theme.titleHeight : 0) +
  (scene.description ? theme.lineHeight : 0) +
  (sceneNotes(scene).length + (linkOf(scene) ? 1 : 0)) * theme.lineHeight;

/** The rows drawn on the first page, as positions into `scene.rows`. */
const firstPage = (scene: TableScene): readonly number[] =>
  scene.paging ? scene.order.slice(0, scene.paging.pageSize) : scene.order;

const hasFooter = (scene: TableScene) =>
  scene.columns.some(({ footer }) => footer !== undefined);

/** Rows besides the body: the header, then a footer and the pager when shown. */
const chromeRows = (scene: TableScene) =>
  1 + (hasFooter(scene) ? 1 : 0) + (scene.paging ? 1 : 0);

/** The height a table draws at: the Scene's, else its lines and first page's rows. */
export const tableHeight = (scene: TableScene): number =>
  scene.size?.height ??
  textHeight(scene) +
    (chromeRows(scene) + Math.max(firstPage(scene).length, 1)) *
      theme.density[scene.density].rowHeight;

/** The first page's rows that fit the height the table draws at. */
const shownRows = (scene: TableScene): readonly number[] => {
  const { rowHeight } = theme.density[scene.density];
  const fits = Math.max(
    0,
    Math.floor((tableHeight(scene) - textHeight(scene)) / rowHeight) -
      chromeRows(scene)
  );
  return firstPage(scene).slice(0, fits);
};

const line = (height: number, fontSize: number): CSSProperties => ({
  ...ellipsis,
  height,
  lineHeight: `${height}px`,
  fontSize,
});

const Bar = ({
  bar,
  rowHeight,
}: {
  bar: NonNullable<TableCell['bar']>;
  rowHeight: number;
}) => {
  const thickness = rowHeight * theme.barThickness;
  const shape = { height: thickness, borderRadius: thickness / 2 };
  return (
    <span
      data-part="bar"
      style={{
        ...shape,
        position: 'relative',
        flex: 1,
        background: bar.track,
      }}>
      <span
        style={{
          ...shape,
          position: 'absolute',
          top: 0,
          left: `${bar.from * 100}%`,
          width: `${(bar.to - bar.from) * 100}%`,
          background: bar.color,
        }}
      />
    </span>
  );
};

const CellText = ({ cell }: { cell: TableCell }) =>
  cell.badge ? (
    <span
      style={{
        ...ellipsis,
        display: 'inline-block',
        maxWidth: '100%',
        padding: `0 ${theme.badgePadding}px`,
        borderRadius: theme.badgeRadius,
        background: cell.badge,
        verticalAlign: 'middle',
      }}>
      {cell.text}
    </span>
  ) : (
    <>{cell.text}</>
  );

// Lens puts a bar's value on the trailing side of a right-aligned column and
// the leading side otherwise, hugging the bar.
const BarCell = ({
  cell,
  trailing,
  gutter,
  rowHeight,
}: {
  cell: TableCell;
  trailing: boolean;
  gutter: number;
  rowHeight: number;
}) => {
  const value = (
    <span
      style={{
        ...ellipsis,
        flex: `0 0 ${gutter}ch`,
        textAlign: trailing ? 'left' : 'right',
      }}>
      <CellText cell={cell} />
    </span>
  );
  const bar = cell.bar && <Bar bar={cell.bar} rowHeight={rowHeight} />;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: theme.barGap }}>
      {trailing ? bar : value}
      {trailing ? value : bar}
    </span>
  );
};

/** Draws a table Scene as an HTML table, in the browser and on `snapshot`. */
export const TableView = ({ scene }: { scene: TableScene }): ReactNode => {
  const { rowHeight, font, padding } = theme.density[scene.density];
  const { chrome } = scene;
  const rule = `${theme.lineWidth}px solid ${chrome.gridLine}`;
  const shown = shownRows(scene);
  const cellStyle = (alignment: CSSProperties['textAlign']): CSSProperties => ({
    ...ellipsis,
    height: rowHeight,
    padding: `0 ${padding}px`,
    textAlign: alignment,
    boxSizing: 'border-box',
  });
  const gutters = scene.columns.map((_, index) =>
    shown.reduce(
      (widest, position) =>
        Math.max(widest, scene.rows[position]!.cells[index]!.text.length),
      theme.barLabelMinChars
    )
  );
  const link = linkOf(scene);
  const bodyLine = line(theme.lineHeight, CHARTS_THEME.type.body);
  const shaded: CSSProperties = { background: scene.headerBackground };

  return (
    <div
      style={{
        width: scene.size?.width ?? '100%',
        height: tableHeight(scene),
        overflow: 'hidden',
        fontSize: font,
        color: chrome.text,
        background: chrome.background,
      }}>
      {scene.title && (
        <div
          data-part="title"
          title={scene.title}
          style={{
            ...line(theme.titleHeight, CHARTS_THEME.type.title),
            fontWeight: theme.headerWeight,
          }}>
          {scene.title}
        </div>
      )}
      {scene.description && (
        <div data-part="description" title={scene.description} style={bodyLine}>
          {scene.description}
        </div>
      )}
      <table
        aria-label={scene.summary}
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
        }}>
        <colgroup>
          {scene.columns.map(({ id, width }) => (
            <col key={id} style={width === undefined ? {} : { width }} />
          ))}
        </colgroup>
        <thead data-part="header">
          <tr style={{ ...shaded, borderBottom: rule }}>
            {scene.columns.map((column) => (
              <th
                key={column.id}
                data-column={column.id}
                scope="col"
                title={column.label}
                style={{
                  ...cellStyle(column.alignment),
                  fontWeight: theme.headerWeight,
                }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scene.rows.length === 0 ? (
            <tr style={{ borderBottom: rule }}>
              <td
                colSpan={scene.columns.length}
                style={{ ...cellStyle('center'), color: chrome.textSubdued }}>
                {scene.emptyText}
              </td>
            </tr>
          ) : (
            shown.map((position) => {
              const row = scene.rows[position]!;
              return (
                <tr
                  key={row.row}
                  data-row={row.row}
                  {...(row.emphasis !== undefined && {
                    'data-emphasis': row.emphasis,
                  })}
                  style={{
                    borderBottom: rule,
                    ...(row.emphasis !== undefined && {
                      background: scene.emphasisBackground,
                    }),
                  }}>
                  {row.cells.map((cell, index) => {
                    const column = scene.columns[index]!;
                    const header = column.id === scene.rowHeader;
                    const CellTag = header ? 'th' : 'td';
                    return (
                      <CellTag
                        key={column.id}
                        {...(header && { scope: 'row' })}
                        data-row={cell.source.rows.join(' ')}
                        data-column={column.id}
                        data-empty={cell.empty}
                        title={cell.title ?? cell.text}
                        style={{
                          ...cellStyle(column.alignment),
                          ...(header && { fontWeight: 'normal' }),
                          color: cell.color,
                          ...(cell.background && {
                            background: cell.background,
                          }),
                        }}>
                        {cell.bar ? (
                          <BarCell
                            cell={cell}
                            trailing={column.alignment === 'right'}
                            gutter={gutters[index]!}
                            rowHeight={rowHeight}
                          />
                        ) : (
                          <CellText cell={cell} />
                        )}
                      </CellTag>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
        {hasFooter(scene) && (
          <tfoot data-part="footer">
            <tr style={shaded}>
              {scene.columns.map((column) => (
                <td key={column.id} style={cellStyle(column.alignment)}>
                  {column.footer}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {scene.paging && (
        <div
          data-part="pager"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: rowHeight,
            padding: `0 ${padding}px`,
            boxSizing: 'border-box',
          }}>
          <span>{scene.paging.rowsPerPage}</span>
          <span style={{ display: 'flex', gap: theme.pageGap }}>
            {scene.paging.pageLabels.map((label, page) => (
              <span
                key={label}
                style={
                  page === 0
                    ? { fontWeight: theme.headerWeight }
                    : { color: chrome.textSubdued }
                }>
                {label}
              </span>
            ))}
          </span>
        </div>
      )}
      {sceneNotes(scene).map((note, index) => (
        <div key={index} data-part="note" title={note} style={bodyLine}>
          <em>{note}</em>
        </div>
      ))}
      {link && (
        <div data-part="link" style={bodyLine}>
          <a href={link.href} style={{ color: 'inherit' }}>
            {link.label}
          </a>
        </div>
      )}
    </div>
  );
};

/**
 * The pack's own renderer for table Scenes. No chart engine draws a table, so
 * the pack does, the same in the browser and on Node.
 */
export const tableSceneRenderer: ReactSceneRenderer = {
  id: 'charts-table',
  environments: ['browser', 'node'],
  supports: (kind) => kind === 'table',
  render: (scene) =>
    scene.kind === 'table' ? <TableView scene={scene} /> : null,
};
