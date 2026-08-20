"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { STAGES } from "@/lib/board-types";
import type { ApplicationStage } from "@/lib/schema";
import { reorder as reorderAction, toggleStar as toggleStarAction } from "./actions";

type BoardCard = {
  id: string;
  full_name: string;
  year: string;
  subteam: string;
  stage: ApplicationStage;
  starred: boolean;
  position: number;
};

export function Board({ initialApplications }: { initialApplications: BoardCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState<BoardCard[]>(initialApplications);
  const [starredOnly, setStarredOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Realtime: two reviewers triaging at once is normal, not an edge case.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("applications-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        (payload) => {
          setCards((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((c) => c.id !== (payload.old as BoardCard).id);
            }
            const row = payload.new as BoardCard;
            const exists = prev.some((c) => c.id === row.id);
            if (exists) return prev.map((c) => (c.id === row.id ? { ...c, ...row } : c));
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const visibleStages = showArchived ? STAGES : STAGES.filter((s) => s.key !== "archived");
  const filtered = starredOnly ? cards.filter((c) => c.starred) : cards;

  const columns = useMemo(
    () =>
      visibleStages.map((s) => ({
        ...s,
        items: filtered
          .filter((c) => c.stage === s.key)
          .sort((a, b) => a.position - b.position),
      })),
    [visibleStages, filtered]
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

    setCards((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, stage: targetStage, position: newPosition } : c
      )
    );

    startTransition(() => {
      reorderAction(String(active.id), targetStage, newPosition).catch(() => {
        // Realtime subscription will reconcile on the next server broadcast.
      });
    });
  };

  const toggleStar = (id: string, next: boolean) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, starred: next } : c)));
    startTransition(() => {
      toggleStarAction(id, next).catch(() => {});
    });
  };

  const totalCount = cards.length;
  const starredCount = cards.filter((c) => c.starred).length;

  return (
    <div className="px-6 sm:px-10 py-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-6 pb-6 border-b border-rule">
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-3">
            Review board — 2026–27 cohort
          </div>
          <div className="text-[38px] leading-none font-extrabold tracking-[-0.03em] uppercase">
            Design Team Member
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[13px] text-[#5c5a51] whitespace-nowrap">
            {totalCount} applicants · {starredCount} starred
          </div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="px-4 py-2.5 border border-border text-[11px] font-bold tracking-[0.14em] uppercase whitespace-nowrap cursor-pointer"
            style={{
              background: showArchived ? "#E3E8CE" : "transparent",
              color: showArchived ? "#3F4A22" : "#5C5A51",
            }}
          >
            Show archived
          </button>
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
              onOpen={(id) => router.push(`/review/a/${id}`)}
              onStar={toggleStar}
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
  onOpen,
  onStar,
}: {
  stageKey: ApplicationStage;
  label: string;
  items: BoardCard[];
  onOpen: (id: string) => void;
  onStar: (id: string, next: boolean) => void;
}) {
  const { setNodeRef } = useDroppable({ id: stageKey });

  return (
    <div className="bg-board border border-rule-soft min-h-[420px]">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-rule-soft">
        <div className="text-[11px] font-bold tracking-[0.16em] uppercase">{label}</div>
        <div className="text-[11px] font-bold text-muted">{items.length}</div>
      </div>
      <div ref={setNodeRef} className="grid gap-2.5 p-3 min-h-[80px]">
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableCard key={item.id} card={item} onOpen={onOpen} onStar={onStar} />
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
  onOpen,
  onStar,
}: {
  card: BoardCard;
  onOpen: (id: string) => void;
  onStar: (id: string, next: boolean) => void;
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
      <CardBody card={card} onOpen={onOpen} onStar={onStar} />
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
  onOpen,
  onStar,
}: {
  card: BoardCard;
  onOpen: (id: string) => void;
  onStar: (id: string, next: boolean) => void;
}) {
  return (
    <div
      onClick={() => onOpen(card.id)}
      className="bg-surface border p-3.5 cursor-pointer hover:border-olive-light transition-colors"
      style={{ borderColor: card.starred ? "#6F7C3C" : "#DCD9CD" }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="text-[15px] font-bold tracking-[-0.01em]">{card.full_name}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStar(card.id, !card.starred);
          }}
          aria-label={card.starred ? "Unstar" : "Star"}
          className="text-[15px] leading-none cursor-pointer"
          style={{ color: card.starred ? "#6F7C3C" : "#B9B6A9" }}
        >
          {card.starred ? "★" : "☆"}
        </button>
      </div>
      <div className="mt-1.5 text-xs text-[#6b6a62]">{card.year}</div>
      <div className="mt-3 text-[10px] font-bold tracking-[0.12em] uppercase text-olive-light">
        {card.subteam}
      </div>
    </div>
  );
}
