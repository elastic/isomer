/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A table Scene as an HTML table, laid out as Lens's data grid: a shaded
// header, rows split by horizontal lines, an optional shaded footer, and the
// pager, under the title and description and above the notes. It
// draws the first page in the Scene's starting order. Every color is the
// Scene's; every length is `CHARTS_THEME`'s.

import type { CSSProperties, ReactNode } from 'react';
import type { StyleHandle } from '@elastic/distillate';

import type {
  SceneRenderEnv,
  TableAlignment,
  TableCell,
  TableScene,
} from '../scene/types';
import { sceneNotes } from '../text/scene_text';

import type { ReactSceneRenderer } from './context';
import { cls } from './styles';
import { tableModule } from './table_styles';
import { CHARTS_THEME } from './theme';

const theme = CHARTS_THEME.table;

const { handles: table } = tableModule;

/** The height of the lines around the table: title, description and notes. */
const textHeight = (scene: TableScene) =>
  (scene.title ? theme.titleHeight : 0) +
  (scene.description ? theme.lineHeight : 0) +
  sceneNotes(scene).length * theme.lineHeight;

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

type Classes = Pick<SceneRenderEnv, 'resolveClassName'> | undefined;

const Bar = ({
  bar,
  density,
  styles,
}: {
  bar: NonNullable<TableCell['bar']>;
  density: TableScene['density'];
  styles: Classes;
}) => (
  <span
    data-part="bar"
    className={cls(styles, table.bar, table.barShape[density])}
    style={{ background: bar.track }}>
    <span
      className={cls(styles, table.barFill, table.barShape[density])}
      style={{
        left: `${bar.from * 100}%`,
        width: `${(bar.to - bar.from) * 100}%`,
        background: bar.color,
      }}
    />
  </span>
);

const CellText = ({ cell, styles }: { cell: TableCell; styles: Classes }) =>
  cell.badge ? (
    <span
      className={cls(styles, table.badge)}
      style={{ background: cell.badge }}>
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
  density,
  styles,
}: {
  cell: TableCell;
  trailing: boolean;
  gutter: number;
  density: TableScene['density'];
  styles: Classes;
}) => {
  const value = (
    <span
      className={cls(
        styles,
        table.barValue,
        table.align[trailing ? 'left' : 'right']
      )}
      style={{ flex: `0 0 ${gutter}ch` }}>
      <CellText {...{ cell, styles }} />
    </span>
  );
  const bar = cell.bar && <Bar bar={cell.bar} {...{ density, styles }} />;
  return (
    <span className={cls(styles, table.barCell)}>
      {trailing ? bar : value}
      {trailing ? value : bar}
    </span>
  );
};

/**
 * Draws a table Scene as an HTML table, in the browser and on `snapshot`.
 * `styles` resolves its classes; absent, they are their readable names.
 */
export const TableView = ({
  scene,
  styles,
}: {
  scene: TableScene;
  styles?: Classes;
}): ReactNode => {
  const { density, chrome } = scene;
  const rule = `${theme.lineWidth}px solid ${chrome.gridLine}`;
  const shown = shownRows(scene);
  const cell = (alignment: TableAlignment, ...more: StyleHandle[]) =>
    cls(
      styles,
      table.cell,
      table.row[density],
      table.align[alignment],
      ...more
    );
  const gutters = scene.columns.map((_, index) =>
    shown.reduce(
      (widest, position) =>
        Math.max(widest, scene.rows[position]!.cells[index]!.text.length),
      theme.barLabelMinChars
    )
  );
  const shaded: CSSProperties = { background: scene.headerBackground };

  return (
    <div
      className={cls(styles, table.root, table.font[density])}
      style={{
        width: scene.size?.width ?? '100%',
        height: tableHeight(scene),
        color: chrome.text,
        background: chrome.background,
      }}>
      {scene.title && (
        <div
          data-part="title"
          title={scene.title}
          className={cls(styles, table.title)}>
          {scene.title}
        </div>
      )}
      {scene.description && (
        <div
          data-part="description"
          title={scene.description}
          className={cls(styles, table.line)}>
          {scene.description}
        </div>
      )}
      <table aria-label={scene.summary} className={cls(styles, table.table)}>
        <colgroup>
          {scene.columns.map(({ id, width }) => (
            <col key={id} {...(width !== undefined && { style: { width } })} />
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
                className={cell(column.alignment, table.heading)}>
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
                className={cell('center')}
                style={{ color: chrome.textSubdued }}>
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
                  {row.cells.map((tableCell, index) => {
                    const column = scene.columns[index]!;
                    const header = column.id === scene.rowHeader;
                    const CellTag = header ? 'th' : 'td';
                    return (
                      <CellTag
                        key={column.id}
                        {...(header && { scope: 'row' })}
                        data-row={tableCell.source.rows.join(' ')}
                        data-column={column.id}
                        data-empty={tableCell.empty}
                        title={tableCell.title ?? tableCell.text}
                        className={
                          header
                            ? cell(column.alignment, table.rowHeading)
                            : cell(column.alignment)
                        }
                        style={{
                          color: tableCell.color,
                          ...(tableCell.background && {
                            background: tableCell.background,
                          }),
                        }}>
                        {tableCell.bar ? (
                          <BarCell
                            cell={tableCell}
                            trailing={column.alignment === 'right'}
                            gutter={gutters[index]!}
                            {...{ density, styles }}
                          />
                        ) : (
                          <CellText cell={tableCell} styles={styles} />
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
                <td key={column.id} className={cell(column.alignment)}>
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
          className={cls(styles, table.pager, table.row[density])}>
          <span>{scene.paging.rowsPerPage}</span>
          <span className={cls(styles, table.pages)}>
            {scene.paging.pageLabels.map((label, page) =>
              page === 0 ? (
                <span key={label} className={cls(styles, table.page)}>
                  {label}
                </span>
              ) : (
                <span key={label} style={{ color: chrome.textSubdued }}>
                  {label}
                </span>
              )
            )}
          </span>
        </div>
      )}
      {sceneNotes(scene).map((note, index) => (
        <div
          key={index}
          data-part="note"
          title={note}
          className={cls(styles, table.line)}>
          <em>{note}</em>
        </div>
      ))}
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
  render: (scene, env) =>
    scene.kind === 'table' ? <TableView scene={scene} styles={env} /> : null,
};
