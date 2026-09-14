import type { ApplicationStage } from "@/lib/schema";

/**
 * Pure ordering rules for the review board. Kept free of React and dnd-kit so
 * "where does a dropped card end up" can be unit tested directly.
 *
 * A column's order is `position` ascending. `position` is a float so a drop
 * only has to write one row (the midpoint of its neighbours); when repeated
 * drops into the same gap exhaust float precision, the column is renumbered.
 */

export type OrderedCard = { id: string; position: number };
export type StagedCard = OrderedCard & { stage: ApplicationStage };
export type Columns = Record<ApplicationStage, string[]>;
export type PositionUpdate = { id: string; position: number };

/** Position first, id as a tiebreaker — equal positions must not reorder between renders. */
export function compareCards(a: OrderedCard, b: OrderedCard): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function buildColumns(cards: StagedCard[], stages: readonly { key: ApplicationStage }[]): Columns {
  const columns = Object.fromEntries(stages.map((s) => [s.key, [] as string[]])) as Columns;
  for (const card of [...cards].sort(compareCards)) columns[card.stage]?.push(card.id);
  return columns;
}

/** The column an id belongs to: itself if it is a column key, otherwise the column holding that card. */
export function findColumn(columns: Columns, id: string): ApplicationStage | undefined {
  if (Object.prototype.hasOwnProperty.call(columns, id)) return id as ApplicationStage;
  return (Object.keys(columns) as ApplicationStage[]).find((key) => columns[key].includes(id));
}

/**
 * Move `activeId` to where dropping it over `overId` puts it, mirroring what
 * dnd-kit's sortable preview shows:
 * - over a column: append to it;
 * - over a card in the same column: take that card's index (arrayMove), so
 *   dragging down lands *after* the hovered card and dragging up *before* it;
 * - over a card in another column: before it, or after it when `placeBelow`.
 */
export function moveInColumns(
  columns: Columns,
  activeId: string,
  overId: string,
  placeBelow: boolean
): Columns {
  if (activeId === overId) return columns;
  const from = findColumn(columns, activeId);
  const to = findColumn(columns, overId);
  if (!from || !to || from === activeId) return columns;

  const fromItems = columns[from];
  const without = fromItems.filter((id) => id !== activeId);

  if (from === to) {
    const newIndex = overId === to ? without.length : fromItems.indexOf(overId);
    return { ...columns, [from]: insertAt(without, newIndex, activeId) };
  }

  const toItems = columns[to];
  const overIndex = toItems.indexOf(overId);
  const index = overIndex === -1 ? toItems.length : overIndex + (placeBelow ? 1 : 0);
  return { ...columns, [from]: without, [to]: insertAt(toItems, index, activeId) };
}

function insertAt(items: string[], index: number, id: string): string[] {
  return [...items.slice(0, index), id, ...items.slice(index)];
}

/**
 * Position for a card inserted at `index` among `others` (the column, in
 * order, without the moving card). `needsRebalance` means there is no
 * representable number strictly between the neighbours.
 */
export function positionForIndex(
  others: OrderedCard[],
  index: number
): { position: number; needsRebalance: boolean } {
  const before = others[index - 1];
  const after = others[index];
  if (before && after) {
    const position = (before.position + after.position) / 2;
    return { position, needsRebalance: !(before.position < position && position < after.position) };
  }
  if (before) return { position: before.position + 1, needsRebalance: false };
  if (after) return { position: after.position - 1, needsRebalance: false };
  return { position: 1, needsRebalance: false };
}

/** Renumber a column 1..n in the given order. */
export function rebalance(orderedIds: string[]): PositionUpdate[] {
  return orderedIds.map((id, i) => ({ id, position: i + 1 }));
}

/**
 * The position writes for dropping `activeId` so the target column reads as
 * `visibleOrder`.
 *
 * `stageCards` is every card currently in the target stage; `visibleOrder` is
 * what the reviewer sees there after the drop, which may omit cards hidden by
 * a filter. Hidden cards keep their relative order and never move between
 * two visible ones they weren't already between.
 */
export function planDrop(
  stageCards: OrderedCard[],
  visibleOrder: string[],
  activeId: string
): PositionUpdate[] {
  const others = new Map(stageCards.filter((c) => c.id !== activeId).map((c) => [c.id, c]));
  const visible = visibleOrder.filter((id) => id === activeId || others.has(id));
  const index = visible.indexOf(activeId);
  if (index === -1) return [];

  const visibleOthers = visible.filter((id) => id !== activeId).map((id) => others.get(id)!);
  const { position, needsRebalance } = positionForIndex(visibleOthers, index);
  if (!needsRebalance) return [{ id: activeId, position }];

  const full = [...others.values()].sort(compareCards).map((c) => c.id);
  const before = visibleOthers[index - 1];
  const after = visibleOthers[index];
  const at = before ? full.indexOf(before.id) + 1 : after ? full.indexOf(after.id) : full.length;
  const current = new Map(stageCards.map((c) => [c.id, c.position]));
  return rebalance(insertAt(full, at, activeId)).filter(
    (u) => u.id === activeId || current.get(u.id) !== u.position
  );
}
