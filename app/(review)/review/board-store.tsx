"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationStage } from "@/lib/schema";
import {
  reorder as reorderAction,
  setStage as setStageAction,
  toggleStar as toggleStarAction,
} from "./actions";

export type BoardCard = {
  id: string;
  full_name: string;
  year: string;
  subteam: string;
  stage: ApplicationStage;
  starred: boolean;
  position: number;
};

type BoardStore = {
  cards: BoardCard[];
  getCard: (id: string) => BoardCard | undefined;
  starCard: (id: string, next: boolean) => void;
  moveCard: (id: string, stage: ApplicationStage, position: number) => void;
  setCardStage: (id: string, stage: ApplicationStage) => void;
};

const BoardStoreContext = createContext<BoardStore | null>(null);

/**
 * The board and the applicant panel are sibling slots of the /review layout
 * (`children` and `@drawer`), so neither can own the card state the other
 * needs. This provider sits above both: one list of cards, one realtime
 * subscription, one set of optimistic mutations.
 */
export function BoardStoreProvider({
  initialCards,
  children,
}: {
  initialCards: BoardCard[];
  children: React.ReactNode;
}) {
  const [cards, setCards] = useState<BoardCard[]>(initialCards);
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

  const patch = useCallback((id: string, fields: Partial<BoardCard>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  }, []);

  const starCard = useCallback(
    (id: string, next: boolean) => {
      patch(id, { starred: next });
      startTransition(() => {
        // Realtime reconciles on the next server broadcast if this fails.
        toggleStarAction(id, next).catch(() => {});
      });
    },
    [patch]
  );

  const moveCard = useCallback(
    (id: string, stage: ApplicationStage, position: number) => {
      patch(id, { stage, position });
      startTransition(() => {
        reorderAction(id, stage, position).catch(() => {});
      });
    },
    [patch]
  );

  const setCardStage = useCallback(
    (id: string, stage: ApplicationStage) => {
      patch(id, { stage });
      startTransition(() => {
        setStageAction(id, stage).catch(() => {});
      });
    },
    [patch]
  );

  const value = useMemo<BoardStore>(
    () => ({
      cards,
      getCard: (id) => cards.find((c) => c.id === id),
      starCard,
      moveCard,
      setCardStage,
    }),
    [cards, starCard, moveCard, setCardStage]
  );

  return <BoardStoreContext.Provider value={value}>{children}</BoardStoreContext.Provider>;
}

export function useBoardStore() {
  const store = useContext(BoardStoreContext);
  if (!store) throw new Error("useBoardStore must be used inside <BoardStoreProvider>.");
  return store;
}
