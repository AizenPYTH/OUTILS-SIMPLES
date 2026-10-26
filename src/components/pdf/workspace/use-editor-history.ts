"use client";

import * as React from "react";
import type { Annotation } from "@/lib/pdf/annotations/types";
import type { TextEdit } from "@/lib/pdf/text-edit/types";
import type { PagePlan } from "@/lib/pdf/operations/page-plan";

/** Everything the user changed, as one snapshot: undo/redo covers all of it. */
export interface EditorSnapshot {
  annotations: Annotation[];
  textEdits: TextEdit[];
  plan: PagePlan;
}

/** Human description of a step, shown in the history panel and the undo tooltip. */
export interface HistoryEntry {
  snapshot: EditorSnapshot;
  label: string;
}

interface HistoryState {
  present: EditorSnapshot;
  presentLabel: string;
  /** Key of the last commit, so a run of slider changes stays one undo step. */
  presentKey?: string;
  past: HistoryEntry[];
  future: HistoryEntry[];
}

type Action =
  | { type: "commit"; next: Partial<EditorSnapshot>; label: string; coalesce?: string }
  | { type: "replace"; next: Partial<EditorSnapshot> } // no history entry (live drag)
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; snapshot: EditorSnapshot };

const LIMIT = 100;

function merge(present: EditorSnapshot, next: Partial<EditorSnapshot>): EditorSnapshot {
  return {
    annotations: next.annotations ?? present.annotations,
    textEdits: next.textEdits ?? present.textEdits,
    plan: next.plan ?? present.plan,
  };
}

function same(a: EditorSnapshot, b: EditorSnapshot): boolean {
  return a.annotations === b.annotations && a.textEdits === b.textEdits && a.plan === b.plan;
}

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "commit": {
      const next = merge(state.present, action.next);
      if (same(next, state.present)) return state;
      if (action.coalesce && action.coalesce === state.presentKey) {
        // Same control on the same object as the previous step: refine that step.
        return { ...state, present: next, presentLabel: action.label, future: [] };
      }
      return {
        present: next,
        presentLabel: action.label,
        presentKey: action.coalesce,
        past: [...state.past.slice(-LIMIT), { snapshot: state.present, label: state.presentLabel }],
        future: [],
      };
    }
    case "replace":
      return { ...state, present: merge(state.present, action.next) };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        present: previous.snapshot,
        presentLabel: previous.label,
        presentKey: undefined,
        past: state.past.slice(0, -1),
        future: [{ snapshot: state.present, label: state.presentLabel }, ...state.future],
      };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        present: next.snapshot,
        presentLabel: next.label,
        presentKey: undefined,
        past: [...state.past, { snapshot: state.present, label: state.presentLabel }],
        future: rest,
      };
    }
    case "reset":
      return { present: action.snapshot, presentLabel: "Document ouvert", past: [], future: [] };
  }
}

/**
 * Undo/redo stack of the editor. Annotations, existing-text edits and the
 * page plan are one state: a text edit or a page deletion is undone exactly
 * like a drawing. A new commit clears the redo stack.
 */
export function useEditorHistory(initial: EditorSnapshot) {
  const [state, dispatch] = React.useReducer(reducer, {
    present: initial,
    presentLabel: "Document ouvert",
    past: [],
    future: [],
  });
  // Snapshot taken at the start of a live interaction so the whole drag is one undo step.
  const dragStartRef = React.useRef<Annotation[] | null>(null);

  const commit = React.useCallback(
    (next: Partial<EditorSnapshot>, label: string, options?: { coalesce?: string }) =>
      dispatch({ type: "commit", next, label, coalesce: options?.coalesce }),
    [],
  );
  const replaceLive = React.useCallback((annotations: Annotation[]) => {
    dispatch({ type: "replace", next: { annotations } });
  }, []);
  const beginLive = React.useCallback((current: Annotation[]) => {
    dragStartRef.current = current;
  }, []);
  const endLive = React.useCallback((final: Annotation[], label = "Déplacement") => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;
    // Nothing changed (a click without drag, a text left as it was): no step at all.
    if (start.length === final.length && start.every((a, i) => a === final[i])) {
      dispatch({ type: "replace", next: { annotations: start } });
      return;
    }
    // Re-insert the start snapshot as the "present" to record one history step.
    dispatch({ type: "replace", next: { annotations: start } });
    dispatch({ type: "commit", next: { annotations: final }, label });
  }, []);
  const undo = React.useCallback(() => dispatch({ type: "undo" }), []);
  const redo = React.useCallback(() => dispatch({ type: "redo" }), []);
  const reset = React.useCallback(
    (snapshot: EditorSnapshot) => dispatch({ type: "reset", snapshot }),
    [],
  );

  return {
    present: state.present,
    annotations: state.present.annotations,
    textEdits: state.present.textEdits,
    plan: state.present.plan,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undoLabel: state.presentLabel,
    redoLabel: state.future[0]?.label ?? null,
    /** Steps already taken (oldest first), then the current one. */
    steps: [...state.past.map((p) => p.label), state.presentLabel],
    commit,
    replaceLive,
    beginLive,
    endLive,
    undo,
    redo,
    reset,
  };
}
