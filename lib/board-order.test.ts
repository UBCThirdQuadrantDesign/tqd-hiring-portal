import { describe, expect, it } from "vitest";
import { STAGES } from "@/lib/board-types";
import type { ApplicationStage } from "@/lib/schema";
import {
  buildColumns,
  compareCards,
  findColumn,
  moveInColumns,
  planDrop,
  positionForIndex,
  rebalance,
  type Columns,
  type StagedCard,
} from "./board-order";

function card(id: string, position: number, stage: ApplicationStage = "new"): StagedCard {
  return { id, position, stage };
}

function columnsOf(partial: Partial<Columns>): Columns {
  return { ...buildColumns([], STAGES), ...partial };
}

/** Apply updates to a card list, moving the active card into `stage`. */
function apply(
  cards: StagedCard[],
  updates: { id: string; position: number }[],
  activeId: string,
  stage: ApplicationStage
): StagedCard[] {
  const byId = new Map(updates.map((u) => [u.id, u.position]));
  return cards.map((c) => ({
    ...c,
    stage: c.id === activeId ? stage : c.stage,
    position: byId.get(c.id) ?? c.position,
  }));
}

function orderOf(cards: StagedCard[], stage: ApplicationStage, visible?: Set<string>): string[] {
  return cards
    .filter((c) => c.stage === stage && (!visible || visible.has(c.id)))
    .sort(compareCards)
    .map((c) => c.id);
}

/** Full drop pipeline as the board runs it: layout move, then position writes, then re-sort. */
function drop(
  cards: StagedCard[],
  activeId: string,
  overId: string,
  placeBelow = false,
  visible?: Set<string>
) {
  const shown = visible ? cards.filter((c) => visible.has(c.id)) : cards;
  const layout = moveInColumns(buildColumns(shown, STAGES), activeId, overId, placeBelow);
  const stage = findColumn(layout, activeId)!;
  const updates = planDrop(
    cards.filter((c) => c.stage === stage),
    layout[stage],
    activeId
  );
  const next = apply(cards, updates, activeId, stage);
  return { layout, stage, updates, next, order: orderOf(next, stage, visible) };
}

// Five cards in "new" with gappy, unsorted input positions.
const column = [card("e", 50), card("a", 10), card("c", 30), card("b", 20), card("d", 40)];

describe("compareCards", () => {
  it("orders by position", () => {
    expect([...column].sort(compareCards).map((c) => c.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("breaks position ties by id, regardless of input order", () => {
    const tied = [card("z", 1), card("m", 1), card("a", 1)];
    const reversed = [...tied].reverse();
    expect(tied.sort(compareCards).map((c) => c.id)).toEqual(["a", "m", "z"]);
    expect(reversed.sort(compareCards).map((c) => c.id)).toEqual(["a", "m", "z"]);
  });
});

describe("moveInColumns — same column", () => {
  const layout = columnsOf({ new: ["a", "b", "c", "d", "e"] });

  it("dragging down onto a card lands right after it", () => {
    expect(moveInColumns(layout, "a", "c", false).new).toEqual(["b", "c", "a", "d", "e"]);
    expect(moveInColumns(layout, "b", "e", false).new).toEqual(["a", "c", "d", "e", "b"]);
    expect(moveInColumns(layout, "a", "b", false).new).toEqual(["b", "a", "c", "d", "e"]);
  });

  it("dragging up onto a card lands right before it", () => {
    expect(moveInColumns(layout, "e", "b", false).new).toEqual(["a", "e", "b", "c", "d"]);
    expect(moveInColumns(layout, "d", "a", false).new).toEqual(["d", "a", "b", "c", "e"]);
  });

  it("dropping on itself is a no-op", () => {
    expect(moveInColumns(layout, "c", "c", false)).toBe(layout);
  });

  it("placeBelow does not affect same-column moves", () => {
    expect(moveInColumns(layout, "a", "c", true).new).toEqual(["b", "c", "a", "d", "e"]);
  });

  it("dropping on its own column moves it to the end", () => {
    expect(moveInColumns(layout, "b", "new", false).new).toEqual(["a", "c", "d", "e", "b"]);
  });
});

describe("moveInColumns — across columns", () => {
  const layout = columnsOf({ new: ["a", "b"], reviewing: ["x", "y", "z"] });

  it("upper half of a card inserts before it", () => {
    const next = moveInColumns(layout, "a", "y", false);
    expect(next.new).toEqual(["b"]);
    expect(next.reviewing).toEqual(["x", "a", "y", "z"]);
  });

  it("lower half of a card inserts after it", () => {
    expect(moveInColumns(layout, "a", "y", true).reviewing).toEqual(["x", "y", "a", "z"]);
    expect(moveInColumns(layout, "a", "z", true).reviewing).toEqual(["x", "y", "z", "a"]);
  });

  it("dropping on a column appends", () => {
    expect(moveInColumns(layout, "a", "reviewing", false).reviewing).toEqual(["x", "y", "z", "a"]);
    expect(moveInColumns(layout, "a", "offer", false).offer).toEqual(["a"]);
  });

  it("unknown ids leave the layout alone", () => {
    expect(moveInColumns(layout, "nope", "y", false)).toBe(layout);
    expect(moveInColumns(layout, "a", "nope", false)).toBe(layout);
  });
});

describe("positionForIndex", () => {
  const others = [card("a", 10), card("b", 20)];

  it("top, middle and bottom land strictly between their neighbours", () => {
    expect(positionForIndex(others, 0).position).toBeLessThan(10);
    const mid = positionForIndex(others, 1).position;
    expect(mid).toBeGreaterThan(10);
    expect(mid).toBeLessThan(20);
    expect(positionForIndex(others, 2).position).toBeGreaterThan(20);
  });

  it("empty column starts at 1", () => {
    expect(positionForIndex([], 0)).toEqual({ position: 1, needsRebalance: false });
  });

  it("flags a rebalance when neighbours share a position", () => {
    expect(positionForIndex([card("a", 5), card("b", 5)], 1).needsRebalance).toBe(true);
  });
});

describe("drop pipeline", () => {
  it("same column, down, persists the previewed order", () => {
    const { order, updates } = drop(column, "a", "c");
    expect(order).toEqual(["b", "c", "a", "d", "e"]);
    expect(updates).toHaveLength(1);
  });

  it("same column, up, persists the previewed order", () => {
    expect(drop(column, "e", "b").order).toEqual(["a", "e", "b", "c", "d"]);
  });

  it("to the top and bottom of a column", () => {
    expect(drop(column, "c", "a").order).toEqual(["c", "a", "b", "d", "e"]);
    expect(drop(column, "c", "e").order).toEqual(["a", "b", "d", "e", "c"]);
  });

  it("across columns, including an empty one", () => {
    const cards = [...column, card("x", 1, "reviewing"), card("y", 2, "reviewing")];
    expect(drop(cards, "c", "y", false).order).toEqual(["x", "c", "y"]);
    expect(drop(cards, "c", "y", true).order).toEqual(["x", "y", "c"]);
    expect(drop(cards, "c", "x", false).order).toEqual(["c", "x", "y"]);
    const toEmpty = drop(cards, "c", "offer");
    expect(toEmpty.stage).toBe("offer");
    expect(toEmpty.order).toEqual(["c"]);
    expect(orderOf(toEmpty.next, "new")).toEqual(["a", "b", "d", "e"]);
  });

  it("with a filter, the visible order matches the preview", () => {
    // Starred-only: b and d are hidden between the visible cards.
    const visible = new Set(["a", "c", "e"]);
    expect(drop(column, "a", "e", false, visible).order).toEqual(["c", "e", "a"]);
    expect(drop(column, "e", "c", false, visible).order).toEqual(["a", "e", "c"]);
    expect(drop(column, "e", "a", false, visible).order).toEqual(["e", "a", "c"]);
  });

  it("repeated drops into one gap rebalance instead of colliding", () => {
    let cards = [card("a", 1), card("b", 2), card("c", 3), card("d", 4)];
    let rebalanced = false;
    // Alternate which card goes between "a" and the one after it, forever halving the gap.
    for (let i = 0; i < 80; i++) {
      const mover = i % 2 === 0 ? "c" : "d";
      const current = orderOf(cards, "new");
      const expected = ["a", mover, ...current.filter((id) => id !== "a" && id !== mover)];
      const { updates, next, order } = drop(cards, mover, current[1]);
      if (updates.length > 1) rebalanced = true;
      expect(order).toEqual(expected);
      const positions = next.map((c) => c.position);
      expect(new Set(positions).size).toBe(positions.length);
      cards = next;
    }
    expect(rebalanced).toBe(true);
  });
});

describe("rebalance", () => {
  it("renumbers in order with strictly increasing positions", () => {
    expect(rebalance(["c", "a", "b"])).toEqual([
      { id: "c", position: 1 },
      { id: "a", position: 2 },
      { id: "b", position: 3 },
    ]);
  });
});

describe("planDrop — randomized", () => {
  // Small seeded PRNG so failures reproduce.
  function rng(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("the active card always ends up at the requested visible index", () => {
    const random = rng(42);
    for (let run = 0; run < 2000; run++) {
      const size = Math.floor(random() * 8);
      const stageCards = Array.from({ length: size }, (_, i) =>
        // Integer positions from a tiny range so ties and tight gaps are common.
        card(`c${i}`, Math.floor(random() * 4) + random() * (random() < 0.3 ? 1e-15 : 0))
      );
      const incoming = random() < 0.5 ? null : card("moving", 99, "reviewing");
      const all = incoming ? [...stageCards, incoming] : stageCards;
      if (all.length === 0) continue;
      const activeId = incoming ? incoming.id : all[Math.floor(random() * all.length)].id;

      const visible = new Set(
        all.filter((c) => c.id === activeId || random() < 0.7).map((c) => c.id)
      );
      const visibleOthers = orderOf(all, "new", visible).filter((id) => id !== activeId);
      const index = Math.floor(random() * (visibleOthers.length + 1));
      const target = [...visibleOthers.slice(0, index), activeId, ...visibleOthers.slice(index)];

      const hiddenBefore = orderOf(all, "new").filter((id) => id !== activeId && !visible.has(id));
      const updates = planDrop(
        all.filter((c) => c.stage === "new"),
        target,
        activeId
      );
      const next = apply(all, updates, activeId, "new");

      expect(orderOf(next, "new", visible)).toEqual(target);
      const fullNext = orderOf(next, "new").filter((id) => id !== activeId);
      expect(fullNext.filter((id) => !visible.has(id))).toEqual(hiddenBefore);
    }
  });
});
