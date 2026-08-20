"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { STAGES } from "@/lib/board-types";
import type { ApplicationStage } from "@/lib/schema";
import { useBoardStore, type BoardCard } from "./board-store";

export function Board() {
  const router = useRouter();
  const { cards, starCard, moveCard } = useBoardStore();
  const [starredOnly, setStarredOnly] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filtered = starredOnly ? cards.filter((c) => c.starred) : cards;

  const columns = useMemo(
    () =>
      STAGES.map((s) => ({
        ...s,
        items: filtered
          .filter((c) => c.stage === s.key)
          .sort((a, b) => a.position - b.position),
      })),
    [filtered]
  );

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    // `over.id` is either a card id (drop onto a card) or a column key
    // (drop onto an empty/near-empty column).
    const overCard = cards.find((c) => c.id === over.id);
    const targetStage = overCard ? overCard.stage : (over.id as ApplicationStage);
    if (!STAGES.some((s) => s.key === targetStage)) return;

    const columnItems = cards
      .filter((c) => c.stage === targetStage && c.id !== active.id)
      .sort((a, b) => a.position - b.position);

    const overIndex = overCard ? columnItems.findIndex((c) => c.id === overCard.id) : columnItems.length;
    const before = columnItems[overIndex - 1];
    const after = columnItems[overIndex];
    const newPosition =
      before && after
        ? (before.position + after.position) / 2
        : before
        ? before.position + 1
        : after
        ? after.position - 1
        : 1;

    moveCard(String(active.id), targetStage, newPosition);
  };

  // Warm the intercepted /review/a/[id] payload while the pointer is still
  // travelling to the click — otherwise the panel can't open until four
  // queries and two signed-URL mints come back.
  const prefetchCard = useCallback(
    (id: string) => router.prefetch(`/review/a/${id}`),
    [router]
  );

  const totalCount = cards.length;
  const starredCount = cards.filter((c) => c.starred).length;

  return (
    <div className="px-6 sm:px-10 py-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-6 pb-6 border-b border-rule">
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-3">
            Review board
          </div>
          <div className="text-[38px] leading-none font-extrabold tracking-[-0.03em]">
            Applications
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[13px] text-[#5c5a51] whitespace-nowrap">
            {totalCount} applicants · {starredCount} starred
          </div>
          <button
            onClick={() => setStarredOnly((v) => !v)}
            className="px-4 py-2.5 border border-border text-[11px] font-bold tracking-[0.14em] uppercase whitespace-nowrap cursor-pointer"
            style={{
              background: starredOnly ? "#E3E8CE" : "transparent",
              color: starredOnly ? "#3F4A22" : "#5C5A51",
            }}
          >
            Starred only
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid gap-5 mt-7 items-start"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {columns.map((col) => (
            <Column
              key={col.key}
              stageKey={col.key}
              label={col.label}
              items={col.items}
              archived={col.key === "archived"}
              onOpen={(id) => router.push(`/review/a/${id}`)}
              onStar={starCard}
              onPrefetch={prefetchCard}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && <CardPreview card={activeCard} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  stageKey,
  label,
  items,
  archived = false,
  onOpen,
  onStar,
  onPrefetch,
}: {
  stageKey: ApplicationStage;
  label: string;
  items: BoardCard[];
  archived?: boolean;
  onOpen: (id: string) => void;
  onStar: (id: string, next: boolean) => void;
  onPrefetch: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: stageKey });

  return (
    <div
      className={`border min-h-[420px] ${
        archived ? "bg-board-archived border-rule" : "bg-board border-rule-soft"
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-3.5 border-b ${
          archived ? "border-rule" : "border-rule-soft"
        }`}
      >
        <div className="text-[11px] font-bold tracking-[0.16em] uppercase">{label}</div>
        <div className="text-[11px] font-bold text-muted">{items.length}</div>
      </div>
      <div ref={setNodeRef} className="grid gap-2.5 p-3 min-h-[80px]">
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableCard
              key={item.id}
              card={item}
              dimmed={archived}
              onOpen={onOpen}
              onStar={onStar}
              onPrefetch={onPrefetch}
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="py-6 px-2 text-center text-xs text-faint">Nothing here yet</div>
        )}
      </div>
    </div>
  );
}

function SortableCard({
  card,
  dimmed = false,
  onOpen,
  onStar,
  onPrefetch,
}: {
  card: BoardCard;
  dimmed?: boolean;
  onOpen: (id: string) => void;
  onStar: (id: string, next: boolean) => void;
  onPrefetch: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardBody card={card} dimmed={dimmed} onOpen={onOpen} onStar={onStar} onPrefetch={onPrefetch} />
    </div>
  );
}

function CardPreview({ card }: { card: BoardCard }) {
  return (
    <div className="rotate-1">
      <CardBody card={card} onOpen={() => {}} onStar={() => {}} />
    </div>
  );
}

function CardBody({
  card,
  dimmed = false,
  onOpen,
  onStar,
  onPrefetch,
}: {
  card: BoardCard;
  dimmed?: boolean;
  onOpen: (id: string) => void;
  onStar: (id: string, next: boolean) => void;
  onPrefetch?: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onOpen(card.id)}
      onPointerEnter={() => onPrefetch?.(card.id)}
      className={`bg-surface border p-3.5 cursor-pointer hover:border-olive-light transition-colors${
        dimmed ? " opacity-70" : ""
      }`}
      style={{ borderColor: !dimmed && card.starred ? "#6F7C3C" : "#DCD9CD" }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div
          className={`text-[15px] font-bold tracking-[-0.01em]${dimmed ? " text-muted" : ""}`}
        >
          {card.full_name}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStar(card.id, !card.starred);
          }}
          aria-label={card.starred ? "Unstar" : "Star"}
          className="-m-1.5 p-1.5 text-[30px] leading-none cursor-pointer"
          style={{ color: card.starred ? "#6F7C3C" : "#B9B6A9" }}
        >
          {card.starred ? "★" : "☆"}
        </button>
      </div>
      <div className={`mt-1.5 text-xs ${dimmed ? "text-faint" : "text-[#6b6a62]"}`}>
        {card.year}
      </div>
      <div
        className={`mt-3 text-[10px] font-bold tracking-[0.12em] uppercase ${
          dimmed ? "text-muted" : "text-olive-light"
        }`}
      >
        {card.subteam}
      </div>
    </div>
  );
}
