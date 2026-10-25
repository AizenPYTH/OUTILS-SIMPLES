"use client";

import * as React from "react";
import type { Annotation } from "@/lib/pdf/annotations/types";

interface HistoryState {
  present: Annotation[];
  past: Annotation[][];
  future: Annotation[][];
}

type Action =
  | { type: "commit"; next: Annotation[] }
  | { type: "replace"; next: Annotation[] } // no history entry (live drag)
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" };

const LIMIT = 100;

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "commit":
      if (action.next === state.present) return state;
      return {
        present: action.next,
        past: [...state.past.slice(-LIMIT), state.present],
        future: [],
      };
    case "replace":
      return { ...state, present: action.next };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { present: next, past: [...state.past, state.present], future: rest };
    }
    case "reset":
      return { present: [], past: [], future: [] };
  }
}

/** Undo/redo stack for annotations. A new commit clears the redo stack (design spec). */
export function useAnnotationHistory() {
  const [state, dispatch] = React.useReducer(reducer, { present: [], past: [], future: [] });
  // Snapshot taken at the start of a live interaction so the whole drag is one undo step.
  const dragStartRef = React.useRef<Annotation[] | null>(null);

  const commit = React.useCallback((next: Annotation[]) => dispatch({ type: "commit", next }), []);
  const replaceLive = React.useCallback((next: Annotation[]) => {
    dispatch({ type: "replace", next });
  }, []);
  const beginLive = React.useCallback((current: Annotation[]) => {
    dragStartRef.current = current;
  }, []);
  const endLive = React.useCallback((final: Annotation[]) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;
    // Re-insert the start snapshot as the "present" to record one history step.
    dispatch({ type: "replace", next: start });
    dispatch({ type: "commit", next: final });
  }, []);

  return {
    annotations: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit,
    replaceLive,
    beginLive,
    endLive,
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    reset: () => dispatch({ type: "reset" }),
  };
}
