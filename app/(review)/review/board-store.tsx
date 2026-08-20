"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeWithAuth, type ChannelStatus } from "@/lib/supabase/realtime";
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

/** The board's projection of `applications` — kept in sync with toBoardCard(). */
const BOARD_COLUMNS = "id, full_name, year, subteam, stage, starred, position";

/**
 * Realtime hands us the whole row, `answers` and `search_vector` included.
 * Narrow it to what the board actually renders so a card has the same shape
 * whether it arrived from the server render, a re-sync, or a socket broadcast.
 */
function toBoardCard(row: Record<string, unknown>): BoardCard {
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    year: row.year as string,
    subteam: row.subteam as string,
    stage: row.stage as ApplicationStage,
    starred: row.starred as boolean,
    position: row.position as number,
  };
}

/** Re-sync no more often than this when tab focus flaps. */
const RESYNC_DEBOUNCE_MS = 2000;
/** How often to poll while the channel is *not* healthy. Costs nothing when it is. */
const UNHEALTHY_POLL_MS = 20000;

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
  // createBrowserClient is a singleton, so this is the same client — and the
  // same websocket — the applicant panel's notes channel uses.
  const [supabase] = useState(() => createClient());

  /**
   * Ids with a server action in flight. Their local value is newer than
   * anything the server can tell us, so incoming rows must not overwrite them:
   * otherwise a re-sync landing mid-drag snaps the card back to where it was.
   */
  const pendingRef = useRef<Map<string, number>>(new Map());
  const statusRef = useRef<ChannelStatus | null>(null);
  const lastResyncRef = useRef(0);

  const isPending = useCallback((id: string) => (pendingRef.current.get(id) ?? 0) > 0, []);

  /**
   * Authoritative re-read of the board. Covers the windows realtime cannot:
   * events emitted between the server render and the channel joining, and
   * anything missed while the socket was down.
   */
  const resync = useCallback(async () => {
    lastResyncRef.current = Date.now();
    const { data, error } = await supabase
      .from("applications")
      .select(BOARD_COLUMNS)
      .order("position", { ascending: true });
    if (error || !data) return;

    setCards((prev) => {
      const prevById = new Map(prev.map((c) => [c.id, c]));
      return data.map((row) => {
        const card = toBoardCard(row);
        const local = prevById.get(card.id);
        return local && isPending(card.id) ? local : card;
      });
    });
  }, [supabase, isPending]);

  const resyncDebounced = useCallback(() => {
    if (Date.now() - lastResyncRef.current < RESYNC_DEBOUNCE_MS) return;
    void resync();
  }, [resync]);

  // Realtime: two reviewers triaging at once is normal, not an edge case.
  useEffect(() => {
    return subscribeWithAuth(
      supabase,
      "applications-board",
      { event: "*", schema: "public", table: "applications" },
      (payload) => {
        setCards((prev) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return id ? prev.filter((c) => c.id !== id) : prev;
          }
          const row = toBoardCard(payload.new);
          const exists = prev.some((c) => c.id === row.id);
          if (!exists) return [...prev, row];
          if (isPending(row.id)) return prev;
          return prev.map((c) => (c.id === row.id ? row : c));
        });
      },
      (status) => {
        statusRef.current = status;
        // Joining — or re-joining after a drop — is exactly when we may have
        // missed changes, so reconcile before trusting the stream again.
        if (status === "SUBSCRIBED") void resync();
      }
    );
  }, [supabase, resync, isPending]);

  // A backgrounded tab gets throttled and can miss events entirely; re-read on
  // the way back in.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") resyncDebounced();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", resyncDebounced);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", resyncDebounced);
    };
  }, [resyncDebounced]);

  // Safety net: if the channel never reaches SUBSCRIBED (publication missing,
  // websocket blocked, token rejected), the board still converges instead of
  // sitting quietly stale.
  useEffect(() => {
    const id = setInterval(() => {
      if (statusRef.current === "SUBSCRIBED") return;
      void resync();
    }, UNHEALTHY_POLL_MS);
    return () => clearInterval(id);
  }, [resync]);

  const patch = useCallback((id: string, fields: Partial<BoardCard>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  }, []);

  /** Optimistic patch + server action, with the id marked pending until it settles. */
  const mutate = useCallback(
    (id: string, fields: Partial<BoardCard>, action: () => Promise<unknown>) => {
      patch(id, fields);
      pendingRef.current.set(id, (pendingRef.current.get(id) ?? 0) + 1);
      startTransition(() => {
        action()
          .catch(() => {})
          .finally(() => {
            const next = (pendingRef.current.get(id) ?? 1) - 1;
            if (next > 0) pendingRef.current.set(id, next);
            else pendingRef.current.delete(id);
          });
      });
    },
    [patch]
  );

  const starCard = useCallback(
    (id: string, next: boolean) => {
      // Realtime reconciles on the next server broadcast if this fails.
      mutate(id, { starred: next }, () => toggleStarAction(id, next));
    },
    [mutate]
  );

  const moveCard = useCallback(
    (id: string, stage: ApplicationStage, position: number) => {
      mutate(id, { stage, position }, () => reorderAction(id, stage, position));
    },
    [mutate]
  );

  const setCardStage = useCallback(
    (id: string, stage: ApplicationStage) => {
      mutate(id, { stage }, () => setStageAction(id, stage));
    },
    [mutate]
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
