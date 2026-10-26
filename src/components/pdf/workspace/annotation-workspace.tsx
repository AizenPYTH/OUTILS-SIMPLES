"use client";

import * as React from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  LayoutList,
  Minus,
  Plus,
  ScanText,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LoadedPdf } from "@/components/pdf/hooks/use-pdf-document";
import { useOperation } from "@/components/pdf/hooks/use-operation";
import { downloadPdf } from "@/components/pdf/shared/result-utils";
import { openPdf, renderPageToCanvas, visualSize, type OpenedPdf } from "@/lib/pdf/browser/pdfjs";
import {
  ZOOM_PERCENT_STEPS,
  anchoredScroll,
  fitScaleFor,
  percentOf,
  scaleOfPercent,
  stepScale,
  wheelScale,
  zoomLabel,
  type FitMode,
} from "@/lib/pdf/editor/zoom";
import { ensureFontFace } from "@/lib/pdf/fonts-embed";
import { applyTextEdits } from "@/lib/pdf/text-edit/apply";
import { extractTextRuns } from "@/lib/pdf/text-edit/extract-runs";
import { getPageContent } from "@/lib/pdf/text-edit/page-content";
import type { PageTextStatus, TextEdit, TextRun } from "@/lib/pdf/text-edit/types";
import { measureImage, readImageFile } from "@/lib/pdf/browser/read-file";
import { applyAnnotations } from "@/lib/pdf/operations/annotate";
import { applyPagePlan, identityPlan, isIdentityPlan } from "@/lib/pdf/operations/page-plan";
import {
  annotationBounds,
  duplicateAnnotation,
  translateAnnotation,
  type Annotation,
  type ImageAnnotation,
  type PdfPoint,
  type TextAnnotation,
} from "@/lib/pdf/annotations/types";
import {
  pdfRectToViewport,
  viewportRectToPdf,
  viewportScale,
  type ViewportLike,
} from "@/lib/pdf/coordinates";
import { isPdfError, PdfError } from "@/lib/pdf/errors";
import type { OcrLanguage } from "@/lib/ocr/types";
import { t } from "@/lib/i18n";
import { clamp, uid } from "@/lib/utils";
import { AnnotationOverlay, autosizeText } from "./overlay";
import { FloatingBar } from "./floating-bar";
import { ContextBar } from "./context-bar";
import { EditorHeader, type DocumentStatus, type HeaderMenuItem } from "./editor-header";
import { ExportDialog, type ExportResult } from "./export-dialog";
import { ImportDiagnosis } from "./import-diagnosis";
import { PagesPanel } from "./pages-panel";
import {
  SidePanel,
  OcrPanel,
  DocumentPanel,
  HistoryPanel,
  ShortcutsPanel,
  SearchPanel,
} from "./side-panel";
import { normalizeForSearch, searchDocument, type SearchMatch } from "@/lib/pdf/browser/search";
import { SignatureDialog, type SignatureAsset } from "./signature-dialog";
import { TextEditLayer, type RunVisual } from "./text-edit-layer";
import { Toolbar, type ToolbarExtra } from "./toolbar";
import {
  defaultSettings,
  modeTools,
  toolDefaults,
  toolShortcuts,
  type EditorPanel,
  type ToolSettings,
  type WorkspaceMode,
  type WorkspaceTool,
} from "./types";
import { useEditorHistory } from "./use-editor-history";
import { useEditorOcr, type OcrLayerInfo } from "./use-editor-ocr";

interface AnnotationWorkspaceProps {
  pdf: LoadedPdf;
  mode: WorkspaceMode;
  toolId: string;
  title: string;
  onClose: () => void;
}

/** Padding around the page inside the scroll area (CSS px). */
const PAGE_PAD = 16;

/**
 * Full-screen editor in four zones: compact header (A), tool rail by intent
 * (B), workspace centred on the page (C), collapsible pages panel (D), plus
 * one side panel at a time (OCR, document, history, shortcuts).
 */
export function AnnotationWorkspace({
  pdf,
  mode,
  toolId,
  title,
  onClose,
}: AnnotationWorkspaceProps) {
  const tools = modeTools[mode];
  const isEditor = mode === "editor";
  const [tool, setToolState] = React.useState<WorkspaceTool>(tools[1] ?? "select");
  const [settings, setSettings] = React.useState<ToolSettings>(defaultSettings);
  const [positionState, setPosition] = React.useState(0);
  // Zoom: one absolute scale (CSS px per point). Fit modes derive it from the
  // container; zooming by hand freezes it until the next fit command.
  const [manualScale, setManualScale] = React.useState(() => scaleOfPercent(100));
  const [fitMode, setFitMode] = React.useState<FitMode>("width");
  const [scroll, setScroll] = React.useState({ left: 0, top: 0 });
  const [viewport, setViewport] = React.useState<ViewportLike | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false);
  const [renderError, setRenderError] = React.useState(false);
  const [showRuns, setShowRuns] = React.useState(false);
  // --- Search in the document (pdf.js text items), with replacement through the text editor.
  const [searchQuery, setSearchQuery] = React.useState("");
  const [replacement, setReplacement] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchMatch[]>([]);
  const [searchCurrent, setSearchCurrent] = React.useState<number | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [searchProgress, setSearchProgress] = React.useState<{
    done: number;
    total: number;
  } | null>(null);
  // Pages panel open by default on large screens only (the editor only mounts in the browser).
  const [pagesOpen, setPagesOpen] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  const [panel, setPanel] = React.useState<EditorPanel | null>(null);
  const [diagnosisDismissed, setDiagnosisDismissed] = React.useState(false);
  const pendingAsset = React.useRef<SignatureAsset | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const shellRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 800, height: 600 });
  const pendingAnchor = React.useRef<{
    pointer: { x: number; y: number };
    oldScale: number;
    newScale: number;
    pageOffsetBefore: { x: number; y: number };
    scrollBefore: { scrollLeft: number; scrollTop: number };
  } | null>(null);
  const history = useEditorHistory({
    annotations: [],
    textEdits: [],
    plan: identityPlan(pdf.pageCount),
  });
  const { annotations, textEdits, plan } = history;
  const exportOp = useOperation<ExportResult>(toolId);

  // --- Base document: the original, or the original with an OCR text layer.
  const [ocrLayer, setOcrLayer] = React.useState<{ info: OcrLayerInfo; opened: OpenedPdf } | null>(
    null,
  );
  const ocrLayerRef = React.useRef(ocrLayer);
  React.useEffect(() => {
    ocrLayerRef.current = ocrLayer;
  }, [ocrLayer]);
  React.useEffect(() => () => void ocrLayerRef.current?.opened.destroy(), []);
  const baseBytes = ocrLayer?.info.bytes ?? pdf.bytes;
  const baseDoc = ocrLayer?.opened.doc ?? pdf.opened.doc;
  const ocr = useEditorOcr();
  const [ocrLanguage, setOcrLanguage] = React.useState<OcrLanguage>("fra");
  const scannedPages = React.useMemo(
    () => pdf.diagnosis?.pages.filter((p) => p.kind === "scanned").map((p) => p.index) ?? [],
    [pdf.diagnosis],
  );
  const [ocrScope, setOcrScope] = React.useState<"scanned" | "all">(
    scannedPages.length > 0 ? "scanned" : "all",
  );

  // --- Current page: a position in the plan, pointing at a source page with an extra rotation.
  // Clamped at render time: undoing a duplication can shorten the plan under the position.
  const position = Math.min(positionState, plan.length - 1);
  const planned = plan[position] ?? plan[0]!;
  const page = pdf.pages[planned.source] ?? pdf.pages[0]!;
  const pageIndex = page.index;
  const extraRotation = planned.rotation;

  // --- Existing-text edits: applied to the real content stream, previewed from the result.
  const [preview, setPreview] = React.useState<{
    bytes: Uint8Array;
    opened: OpenedPdf;
    version: number;
  } | null>(null);
  const [previewBusy, setPreviewBusy] = React.useState(false);
  const [pageText, setPageText] = React.useState<{ key: string; status: PageTextStatus } | null>(
    null,
  );
  const previewRequest = React.useRef(0);
  const previewRef = React.useRef<typeof preview>(null);
  React.useEffect(() => {
    previewRef.current = preview;
  }, [preview]);
  React.useEffect(() => () => void previewRef.current?.opened.destroy(), []);
  const displayDoc = preview?.opened.doc ?? baseDoc;
  const displayBytes = preview?.bytes ?? baseBytes;
  const textKey = `${pageIndex}:${preview?.version ?? 0}:${ocrLayer ? "ocr" : "base"}`;

  // Rebuild the preview whenever the edits (or the base document) change: undo/redo included.
  React.useEffect(() => {
    const request = (previewRequest.current += 1);
    let cancelled = false;
    const rebuild = async () => {
      if (textEdits.length === 0) {
        setPreview((current) => {
          void current?.opened.destroy();
          return null;
        });
        return;
      }
      setPreviewBusy(true);
      try {
        const { bytes, report } = await applyTextEdits(baseBytes, textEdits);
        const opened = await openPdf(bytes);
        if (cancelled || request !== previewRequest.current) {
          void opened.destroy();
          return;
        }
        setPreview((current) => {
          void current?.opened.destroy();
          return { bytes, opened, version: request };
        });
        if (report.skipped.length)
          toast.error(
            `${report.skipped.length} modification(s) impossible(s) : ${report.skipped.map((s) => s.reason).join(", ")}.`,
          );
        if (report.fontReplaced)
          toast.info(
            "Un caractère est absent de la police d'origine : ce passage utilise une police standard proche.",
          );
      } catch (error) {
        if (!cancelled)
          toast.error(isPdfError(error) ? error.message : "La modification du texte a échoué.");
      } finally {
        if (!cancelled && request === previewRequest.current) setPreviewBusy(false);
      }
    };
    // Deferred so the state updates happen outside the effect body (and a burst of
    // undo/redo only rebuilds once).
    const timer = setTimeout(() => void rebuild(), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [textEdits, baseBytes]);

  const commitTextEdit = (run: TextRun, text: string, visual?: RunVisual) => {
    const existing = textEdits.find(
      (e) => e.pageIndex === run.pageIndex && e.opIndex === run.opIndex,
    );
    const edit: TextEdit = existing
      ? { ...existing, text, ...(visual ? { visual } : {}) }
      : {
          pageIndex: run.pageIndex,
          opIndex: run.opIndex,
          removeOps: run.extraOps,
          text,
          original: run.original,
          fallback: run.fallback,
          ...(visual ? { visual } : {}),
        };
    history.commit(
      { textEdits: [...textEdits.filter((e) => e !== existing), edit] },
      `Texte modifié : « ${text.slice(0, 24)}${text.length > 24 ? "…" : ""} »`,
    );
  };

  const revertTextEdit = (run: TextRun) => {
    history.commit(
      {
        textEdits: textEdits.filter(
          (e) => !(e.pageIndex === run.pageIndex && e.opIndex === run.opIndex),
        ),
      },
      "Texte d'origine rétabli",
    );
  };

  // Analyse the page's text runs while the text tool is active.
  React.useEffect(() => {
    if (tool !== "editText") return;
    let cancelled = false;
    (async () => {
      const content = await getPageContent(displayBytes, pageIndex);
      const status = await extractTextRuns(displayDoc, pageIndex, content);
      if (!cancelled) setPageText({ key: textKey, status });
    })().catch(() => {
      if (!cancelled)
        setPageText({
          key: textKey,
          status: { kind: "mismatch", runs: [], detail: "analyse impossible" },
        });
    });
    return () => {
      cancelled = true;
    };
  }, [tool, displayBytes, displayDoc, pageIndex, textKey]);

  // Lock the document scroll while the editor is full-screen.
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Track the scroll container's visible box (scrollbars excluded) for the fit modes.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The scale actually used: a fit computed from the container, or the manual level.
  const fitScaleValue = React.useMemo(() => {
    const size = visualSize(page, extraRotation);
    return fitScaleFor(fitMode ?? "width", size, {
      width: containerSize.width - 2 * PAGE_PAD,
      height: containerSize.height - 2 * PAGE_PAD,
    });
  }, [page, extraRotation, containerSize, fitMode]);
  const scale = fitMode ? fitScaleValue : manualScale;
  const scaleRef = React.useRef(scale);
  React.useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  /** Changes the scale while keeping the document point under `pointer` (container coords) fixed. */
  const zoomTo = React.useCallback((next: number, pointer?: { x: number; y: number }) => {
    const container = containerRef.current;
    const pageEl = pageRef.current;
    const current = scaleRef.current;
    if (Math.abs(next - current) < 1e-6) return;
    if (container && pageEl) {
      pendingAnchor.current = {
        pointer: pointer ?? { x: container.clientWidth / 2, y: container.clientHeight / 2 },
        oldScale: current,
        newScale: next,
        pageOffsetBefore: { x: pageEl.offsetLeft, y: pageEl.offsetTop },
        scrollBefore: { scrollLeft: container.scrollLeft, scrollTop: container.scrollTop },
      };
    }
    setFitMode(null);
    setManualScale(next);
  }, []);

  // Ctrl + wheel anywhere in the editor zooms the document (never the browser),
  // around the pointer when it is over the page area. Native listener: React's
  // onWheel is passive and could not prevent the browser zoom.
  React.useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const container = containerRef.current;
      let pointer: { x: number; y: number } | undefined;
      if (container) {
        const rect = container.getBoundingClientRect();
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        if (inside) pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
      zoomTo(wheelScale(scaleRef.current, e.deltaY, e.deltaMode), pointer);
    };
    shell.addEventListener("wheel", onWheel, { passive: false });
    return () => shell.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  // Render the current page.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    setRenderError(false);
    renderPageToCanvas(displayDoc, pageIndex, canvas, {
      scale,
      extraRotation,
      signal: controller.signal,
    })
      .then(({ viewport: vp }) => {
        if (!controller.signal.aborted)
          setViewport({ width: vp.width, height: vp.height, transform: vp.transform });
      })
      .catch(() => !controller.signal.aborted && setRenderError(true));
    return () => controller.abort();
  }, [displayDoc, pageIndex, extraRotation, scale]);

  // Once the page has its new size, scroll so the anchored point stays under the pointer.
  React.useLayoutEffect(() => {
    const pending = pendingAnchor.current;
    const container = containerRef.current;
    const pageEl = pageRef.current;
    if (!pending || !container || !pageEl || !viewport) return;
    if (Math.abs(viewportScale(viewport) - pending.newScale) > 1e-6) return; // not rendered yet
    pendingAnchor.current = null;
    const next = anchoredScroll(
      pending.scrollBefore,
      pending.pointer,
      pending.oldScale,
      pending.newScale,
      pending.pageOffsetBefore,
      { x: pageEl.offsetLeft, y: pageEl.offsetTop },
    );
    container.scrollLeft = next.scrollLeft;
    container.scrollTop = next.scrollTop;
  }, [viewport]);

  // Revoke image preview URLs on unmount.
  const urlsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const setTool = (next: WorkspaceTool) => {
    setToolState(next);
    setSelectedId(null);
    setEditingId(null);
    // Each intent starts from its own default style; the user's later changes stick.
    const defaults = toolDefaults[next];
    if (defaults) setSettings((s) => ({ ...s, ...defaults }));
    if (next === "signature") setSignatureOpen(true);
    if (next === "image") imageInputRef.current?.click();
  };

  const selected = annotations.find((a) => a.id === selectedId) ?? null;
  const commitAnnotations = (next: Annotation[], label: string, coalesce?: string) =>
    history.commit({ annotations: next }, label, { coalesce });

  const updateSettings = (patch: Partial<ToolSettings>) => setSettings((s) => ({ ...s, ...patch }));

  /** Floating bar: one object changed. */
  const updateAnnotation = (next: Annotation, label: string, coalesce?: string) =>
    commitAnnotations(
      annotations.map((a) => (a.id === next.id ? next : a)),
      label,
      coalesce,
    );

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = duplicateAnnotation(selected, uid(selected.type));
    commitAnnotations([...annotations, copy], "Élément dupliqué");
    setSelectedId(copy.id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    commitAnnotations(
      annotations.filter((a) => a.id !== selected.id),
      "Élément supprimé",
    );
    setSelectedId(null);
  };

  const autosizeForPage = (a: TextAnnotation): TextAnnotation =>
    viewport ? autosizeText(a, viewport, page.rotation + extraRotation) : a;

  // Faces of the families in use are registered on screen as soon as they appear.
  React.useEffect(() => {
    const families = new Set(
      annotations.filter((a) => a.type === "text").map((a) => (a as TextAnnotation).fontFamily),
    );
    for (const family of families) void ensureFontFace(family);
  }, [annotations]);

  const placeImage = (asset: SignatureAsset, role: ImageAnnotation["role"], at?: PdfPoint) => {
    if (!viewport) return;
    const visual = visualSize(page, extraRotation);
    const maxWidthPt = visual.width * (role === "signature" ? 0.35 : 0.5);
    const widthPt = Math.min(maxWidthPt, asset.width * 0.75);
    const heightPt = widthPt * (asset.height / asset.width);
    const s = viewportScale(viewport);
    // Centre on the click point, or on the page.
    const center = at
      ? (() => {
          const [a, b, c, d, e, f] = viewport.transform as number[];
          return { x: a! * at.x + c! * at.y + e!, y: b! * at.x + d! * at.y + f! };
        })()
      : { x: viewport.width / 2, y: viewport.height / 2 };
    const box = {
      x: center.x - (widthPt * s) / 2,
      y: center.y - (heightPt * s) / 2,
      width: widthPt * s,
      height: heightPt * s,
    };
    const rect = viewportRectToPdf(viewport, box);
    const copy = new Uint8Array(asset.bytes.byteLength);
    copy.set(asset.bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: asset.mimeType }));
    urlsRef.current.add(url);
    const annotation: ImageAnnotation = {
      id: uid("img"),
      type: "image",
      pageIndex,
      ...rect,
      bytes: asset.bytes,
      mimeType: asset.mimeType,
      previewUrl: url,
      role,
    };
    commitAnnotations(
      [...annotations, annotation],
      role === "signature" ? "Signature placée" : "Image insérée",
    );
    setSelectedId(annotation.id);
    setToolState("select");
  };

  const onPlaceAt = (point: PdfPoint) => {
    const asset = pendingAsset.current;
    if (asset) {
      placeImage(asset, tool === "signature" ? "signature" : "image", point);
      return;
    }
    if (tool === "signature") setSignatureOpen(true);
    else imageInputRef.current?.click();
  };

  const onImageFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { bytes, mimeType } = await readImageFile(file);
      const { width, height } = await measureImage(bytes, mimeType);
      const asset = { bytes, mimeType, width, height };
      pendingAsset.current = asset;
      placeImage(asset, "image");
      pendingAsset.current = null;
    } catch (error) {
      toast.error(isPdfError(error) ? error.message : t.errors.notImage);
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const onSignature = (asset: SignatureAsset) => {
    pendingAsset.current = asset;
    placeImage(asset, "signature");
    pendingAsset.current = null;
  };

  const goTo = React.useCallback(
    (index: number) => {
      setPosition((current) => {
        const next = clamp(index, 0, plan.length - 1);
        return next === current ? current : next;
      });
      setSelectedId(null);
      setEditingId(null);
    },
    [plan.length],
  );

  const zoomBy = (direction: 1 | -1) => zoomTo(stepScale(scaleRef.current, direction));
  const applyFit = (mode: Exclude<FitMode, null>) => {
    pendingAnchor.current = null;
    setFitMode(mode);
  };
  const atMax = percentOf(scale) >= ZOOM_PERCENT_STEPS[ZOOM_PERCENT_STEPS.length - 1]! - 0.5;
  const atMin = percentOf(scale) <= ZOOM_PERCENT_STEPS[0]! + 0.5;

  // Run the search (debounced) on the displayed document whenever the query or the document changes.
  React.useEffect(() => {
    if (panel !== "search") return;
    const query = searchQuery.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (query.length < 2) {
        setSearchResults([]);
        setSearchCurrent(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      setSearchProgress(null);
      searchDocument(displayDoc, query, {
        signal: controller.signal,
        onProgress: (done, total) => {
          if (!controller.signal.aborted) setSearchProgress({ done, total });
        },
      })
        .then((results) => {
          if (controller.signal.aborted) return;
          setSearchResults(results);
          setSearchCurrent(results.length ? 0 : null);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [panel, searchQuery, displayDoc]);

  const showSearchResult = (index: number) => {
    const result = searchResults[index];
    if (!result) return;
    setSearchCurrent(index);
    const pos = plan.findIndex((p) => p.source === result.pageIndex);
    if (pos >= 0 && pos !== position) goTo(pos);
  };

  /** Replaces the query inside the run holding a match, through the same path as "Modifier le texte". */
  const replaceMatch = async (index: number, quiet = false): Promise<boolean> => {
    const result = searchResults[index];
    const query = searchQuery.trim();
    if (!result || query.length === 0 || replacement.length === 0) return false;
    try {
      const content = await getPageContent(displayBytes, result.pageIndex);
      const status = await extractTextRuns(displayDoc, result.pageIndex, content);
      if (status.kind !== "ok") {
        if (!quiet)
          toast.error(
            status.kind === "scanned"
              ? "Ce passage est une image (page scannée) : lancez l'OCR pour le rendre modifiable."
              : "Le texte de cette page ne peut pas être modifié en toute sécurité.",
          );
        return false;
      }
      const needle = normalizeForSearch(query);
      const run = status.runs.find(
        (r) =>
          r.pageIndex === result.pageIndex &&
          normalizeForSearch(r.text).includes(needle) &&
          Math.abs(r.y - result.box.y) < Math.max(4, result.box.height),
      );
      if (!run) {
        if (!quiet)
          toast.error(
            "Passage introuvable dans le flux de la page (texte coupé entre deux fragments).",
          );
        return false;
      }
      if (!run.editable) {
        if (!quiet) toast.error(`Passage non modifiable : ${run.reason ?? "police particulière"}.`);
        return false;
      }
      const normalizedRun = normalizeForSearch(run.text);
      const at = normalizedRun.indexOf(needle);
      // Normalisation keeps the length of each character, so offsets line up with the original.
      const text = run.text.slice(0, at) + replacement + run.text.slice(at + query.length);
      commitTextEdit(run, text);
      return true;
    } catch {
      if (!quiet) toast.error("Le remplacement a échoué.");
      return false;
    }
  };

  const replaceAll = async () => {
    let done = 0;
    const total = searchResults.length;
    // Work page by page from the last match so earlier edits do not shift later ones on the same run.
    for (let i = total - 1; i >= 0; i -= 1) if (await replaceMatch(i, true)) done += 1;
    if (done === 0)
      toast.error("Aucun passage remplaçable : pages scannées ou polices non modifiables.");
    else
      toast.success(
        `${done} passage${done > 1 ? "s" : ""} remplacé${done > 1 ? "s" : ""} sur ${total}.`,
      );
  };

  // --- OCR in the editor: original pages → engine → layered copy as the new base.
  const runOcr = async () => {
    setPanel("ocr");
    setDiagnosisDismissed(true);
    const pages =
      ocrScope === "scanned" && scannedPages.length > 0
        ? scannedPages
        : pdf.pages.map((p) => p.index);
    const info = await ocr.run({
      doc: pdf.opened.doc,
      bytes: pdf.bytes,
      pages,
      language: ocrLanguage,
    });
    if (!info) return;
    try {
      const opened = await openPdf(info.bytes);
      setOcrLayer((current) => {
        void current?.opened.destroy();
        return { info, opened };
      });
      // Edits of a previous OCR layer point at operators that no longer exist.
      const kept = textEdits.filter((e) => !pages.includes(e.pageIndex) || !ocrLayerRef.current);
      if (kept.length !== textEdits.length) history.commit({ textEdits: kept }, "OCR relancé");
      toast.success(
        `OCR terminé : ${info.words} mots reconnus, qualité estimée ${info.confidence} %.`,
      );
      if (tool !== "editText") setTool("editText");
    } catch (error) {
      toast.error(
        isPdfError(error) ? error.message : "Le document reconnu n'a pas pu être rouvert.",
      );
    }
  };

  const revertOcr = () => {
    const layer = ocrLayerRef.current;
    if (!layer) return;
    setOcrLayer(null);
    void layer.opened.destroy();
    ocr.reset();
    const kept = textEdits.filter((e) => !layer.info.pages.includes(e.pageIndex));
    if (kept.length !== textEdits.length) history.commit({ textEdits: kept }, "Couche OCR retirée");
    toast.info("Couche OCR retirée : le document est revenu à son état d'origine.");
  };

  const revertAll = () => {
    revertOcr();
    history.reset({ annotations: [], textEdits: [], plan: identityPlan(pdf.pageCount) });
    setSelectedId(null);
    setPosition(0);
    toast.info("Document d'origine rétabli.");
  };

  // Background colour under a run (viewport px) from the rendered canvas: median of samples
  // taken just outside the box, so the text itself does not tint the fill.
  const sampleFill = (points: { x: number; y: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !viewport || points.length === 0) return { r: 1, g: 1, b: 1 };
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { r: 1, g: 1, b: 1 };
    const ratio = canvas.width / viewport.width;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs) - 3;
    const maxX = Math.max(...xs) + 3;
    const minY = Math.min(...ys) - 3;
    const maxY = Math.max(...ys) + 3;
    const samples = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
      { x: minX, y: (minY + maxY) / 2 },
      { x: maxX, y: (minY + maxY) / 2 },
      { x: (minX + maxX) / 2, y: minY },
      { x: (minX + maxX) / 2, y: maxY },
    ];
    const channels: number[][] = [[], [], []];
    for (const s of samples) {
      const px = clamp(Math.round(s.x * ratio), 0, canvas.width - 1);
      const py = clamp(Math.round(s.y * ratio), 0, canvas.height - 1);
      const d = ctx.getImageData(px, py, 1, 1).data;
      channels[0]!.push(d[0]!);
      channels[1]!.push(d[1]!);
      channels[2]!.push(d[2]!);
    }
    const median = (v: number[]) => {
      const s = [...v].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)]! / 255;
    };
    return { r: median(channels[0]!), g: median(channels[1]!), b: median(channels[2]!) };
  };

  // --- Export: text edits → annotations → page plan → verification by reopening.
  const planChanged = !isIdentityPlan(plan, pdf.pageCount);
  const startExport = () => {
    setExportOpen(true);
    const kept: Annotation[] = annotations.filter(
      (a) => a.type !== "text" || a.text.trim().length > 0,
    );
    void exportOp.run(async (report) => {
      let bytes = baseBytes;
      if (textEdits.length) {
        report({ current: 1, total: 4, label: "Application des textes modifiés…" });
        bytes = (await applyTextEdits(bytes, textEdits)).bytes;
      }
      report({ current: 2, total: 4, label: "Intégration des éléments ajoutés…" });
      const annotated = await applyAnnotations(bytes, kept);
      bytes = annotated.bytes;
      if (planChanged) {
        report({ current: 3, total: 4, label: "Réorganisation des pages…" });
        bytes = await applyPagePlan(bytes, plan);
      }
      report({ current: 4, total: 4, label: "Vérification du fichier produit…" });
      const check = await openPdf(bytes);
      const pageCount = check.pageCount;
      await check.destroy();
      if (pageCount !== plan.length)
        throw new PdfError(
          "PROCESSING_FAILED",
          `Le fichier produit compte ${pageCount} pages au lieu de ${plan.length}.`,
          { recoverable: true },
        );
      return { bytes, report: annotated.report, verified: { pageCount } };
    });
  };

  const dirty = annotations.length > 0 || textEdits.length > 0 || planChanged || !!ocrLayer;
  const requestClose = () => {
    if (dirty) setCloseConfirmOpen(true);
    else onClose();
  };

  // Keyboard shortcuts.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      )
        return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        startExport();
      } else if (mod && e.key.toLowerCase() === "d" && selected) {
        e.preventDefault();
        duplicateSelected();
      } else if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setPanel("search");
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(1);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomBy(-1);
      } else if (e.key === "0") {
        e.preventDefault();
        applyFit("width");
      } else if (e.key === "Enter" && selected && selected.type === "text" && tool === "select") {
        e.preventDefault();
        history.beginLive(annotations);
        setEditingId(selected.id);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        if (panel) setPanel(null);
        else if (!diagnosisDismissed && pdf.diagnosis) setDiagnosisDismissed(true);
        setSelectedId(null);
        if (tool !== "select") setToolState("select");
      } else if (e.key.startsWith("Arrow") && selected && viewport) {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) / viewportScale(viewport);
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0;
        commitAnnotations(
          annotations.map((a) => (a.id === selected.id ? translateAnnotation(a, dx, dy) : a)),
          "Élément déplacé",
        );
      } else if (e.key === "PageDown") {
        e.preventDefault();
        goTo(position + 1);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        goTo(position - 1);
      } else if (e.key === "?") {
        setPanel((p) => (p === "shortcuts" ? null : "shortcuts"));
      } else if (!mod && !e.altKey && e.key.length === 1) {
        const letter = e.key.toUpperCase();
        const match = (Object.keys(toolShortcuts) as WorkspaceTool[]).find(
          (k) => toolShortcuts[k] === letter && tools.includes(k),
        );
        if (match) {
          e.preventDefault();
          setTool(match);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const modifiedSources = React.useMemo(
    () => new Set([...annotations.map((a) => a.pageIndex), ...textEdits.map((e) => e.pageIndex)]),
    [annotations, textEdits],
  );

  const suffix =
    mode === "sign"
      ? "signe"
      : mode === "annotate"
        ? "annote"
        : mode === "text"
          ? "texte"
          : "modifie";

  // --- Header state.
  const status: DocumentStatus = (() => {
    const pages = `${pdf.pageCount} page${pdf.pageCount > 1 ? "s" : ""}`;
    if (ocrLayer)
      return {
        label: `${pages} · OCR ${ocrLayer.info.confidence} %`,
        tone: ocrLayer.info.confidence >= 80 ? "success" : "warning",
      };
    const d = pdf.diagnosis;
    if (!d) return { label: pages, tone: "neutral" };
    switch (d.kind) {
      case "native":
        return {
          label: `${pages} · ${d.ocrLayerPages > 0 ? "texte reconnu (OCR)" : "texte natif"}`,
          tone: "info",
        };
      case "mixed":
        return {
          label: `${pages} · ${d.scannedPages} scannée${d.scannedPages > 1 ? "s" : ""}`,
          tone: "warning",
        };
      case "scanned":
        return { label: `${pages} · document scanné`, tone: "warning" };
      default:
        return { label: `${pages} · sans texte`, tone: "neutral" };
    }
  })();
  const summary = [
    `${annotations.length} élément${annotations.length > 1 ? "s" : ""}`,
    textEdits.length
      ? `${textEdits.length} texte${textEdits.length > 1 ? "s" : ""} modifié${textEdits.length > 1 ? "s" : ""}`
      : null,
    planChanged ? `${plan.length} page${plan.length > 1 ? "s" : ""} (réorganisées)` : null,
    pdf.unlocked ? "déverrouillé" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const togglePanel = (next: EditorPanel) => setPanel((p) => (p === next ? null : next));
  const menu: HeaderMenuItem[] = [
    {
      id: "pages",
      label: pagesOpen ? "Masquer le panneau des pages" : "Afficher le panneau des pages",
      onSelect: () => setPagesOpen((o) => !o),
    },
    ...(isEditor
      ? [{ id: "ocr", label: "Reconnaissance de texte (OCR)…", onSelect: () => setPanel("ocr") }]
      : []),
    { id: "search", label: "Rechercher dans le document…", onSelect: () => setPanel("search") },
    { id: "document", label: "Informations sur le document", onSelect: () => setPanel("document") },
    { id: "history", label: "Historique des modifications", onSelect: () => setPanel("history") },
    { id: "shortcuts", label: "Raccourcis clavier", onSelect: () => setPanel("shortcuts") },
    {
      id: "fit-page",
      label: fitMode === "page" ? "Ajuster à la largeur" : "Afficher la page entière",
      onSelect: () => applyFit(fitMode === "page" ? "width" : "page"),
      separator: true,
    },
    {
      id: "revert",
      label: "Revenir au document d'origine",
      onSelect: revertAll,
      disabled: !dirty,
      destructive: true,
      separator: true,
    },
    { id: "close", label: "Fermer le document", onSelect: requestClose },
  ];
  const extras: ToolbarExtra[] = [
    {
      id: "pages",
      label: "Pages",
      icon: LayoutList,
      active: pagesOpen,
      onClick: () => setPagesOpen((o) => !o),
    },
    ...(isEditor
      ? [
          {
            id: "ocr",
            label: "OCR",
            icon: ScanText,
            active: panel === "ocr",
            onClick: () => togglePanel("ocr"),
            attention: !ocrLayer && scannedPages.length > 0,
          },
        ]
      : []),
    {
      id: "search",
      label: "Rechercher",
      icon: Search,
      active: panel === "search",
      onClick: () => togglePanel("search"),
    },
    {
      id: "document",
      label: "Infos",
      icon: BookOpen,
      active: panel === "document",
      onClick: () => togglePanel("document"),
    },
    {
      id: "shortcuts",
      label: "Aide",
      icon: Keyboard,
      active: panel === "shortcuts",
      onClick: () => togglePanel("shortcuts"),
    },
  ];

  // Selection box in the workspace wrapper's coordinates, for the floating bar. The page sits
  // centred in the scroll area when it fits, at the padding otherwise (see the inner flex box).
  const floatingAnchor = React.useMemo(() => {
    if (!selected || !viewport) return null;
    const box = pdfRectToViewport(viewport, annotationBounds(selected));
    const pageLeft = Math.max(PAGE_PAD, (containerSize.width - viewport.width) / 2);
    const pageTop = Math.max(PAGE_PAD, (containerSize.height - viewport.height) / 2);
    return {
      x: pageLeft - scroll.left + box.x,
      y: pageTop - scroll.top + box.y,
      width: box.width,
      height: box.height,
    };
  }, [selected, viewport, scroll, containerSize]);

  const textStatus = pageText?.key === textKey ? pageText.status : null;
  const textInfo =
    tool !== "editText"
      ? null
      : textStatus === null
        ? null
        : textStatus.kind === "ok"
          ? `${textStatus.runs.filter((r) => r.editable).length} passage${textStatus.runs.filter((r) => r.editable).length > 1 ? "s" : ""} modifiable${textStatus.runs.filter((r) => r.editable).length > 1 ? "s" : ""}`
          : textStatus.kind === "scanned"
            ? "page scannée"
            : textStatus.kind === "empty"
              ? "page sans texte"
              : "structure non prise en charge";
  const showDiagnosis =
    isEditor &&
    !!pdf.diagnosis &&
    pdf.diagnosis.kind !== "native" &&
    !diagnosisDismissed &&
    panel !== "ocr";

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="editor-shell"
    >
      <EditorHeader
        title={title}
        fileName={pdf.file.name}
        status={status}
        summary={summary}
        dirty={dirty}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        undoLabel={history.undoLabel}
        redoLabel={history.redoLabel}
        onUndo={history.undo}
        onRedo={history.redo}
        onExport={startExport}
        onClose={requestClose}
        menu={menu}
      />

      <ContextBar
        tool={tool}
        settings={settings}
        onChange={updateSettings}
        hasSelection={!!selected && tool === "select"}
        showRuns={showRuns}
        onToggleRuns={() => setShowRuns((v) => !v)}
        textInfo={textInfo}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* B. Desktop tool rail */}
        <aside className="hidden w-[76px] shrink-0 overflow-y-auto border-r border-border bg-surface p-1.5 sm:block">
          <Toolbar
            tools={tools}
            active={tool}
            onChange={setTool}
            orientation="vertical"
            extras={extras}
          />
        </aside>
        {/* D. Pages panel: docked on large screens, overlay below */}
        {pagesOpen ? (
          <aside className="absolute inset-y-0 left-0 z-20 w-[180px] shadow-xl lg:static lg:shadow-none">
            <PagesPanel
              doc={pdf.opened.doc}
              pages={pdf.pages}
              plan={plan}
              current={position}
              onSelect={goTo}
              modifiedSources={modifiedSources}
              onPlanChange={(next, label) => history.commit({ plan: next }, label)}
              onClose={() => setPagesOpen(false)}
            />
          </aside>
        ) : null}
        {/* C. Workspace: a positioned wrapper (floating bar, diagnosis card) around the scroll area */}
        <div className="relative min-w-0 flex-1" data-testid="editor-workspace">
          <div
            ref={containerRef}
            className="absolute inset-0 overflow-auto bg-muted/60"
            onScroll={(e) =>
              setScroll({ left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop })
            }
            data-testid="editor-canvas-area"
          >
            {/* Centred when smaller than the area, scrollable from its top-left corner when larger. */}
            <div
              className="flex min-h-full min-w-full items-center justify-center"
              style={{ padding: PAGE_PAD }}
            >
              <div
                ref={pageRef}
                className="relative shrink-0 shadow-lg"
                style={viewport ? { width: viewport.width, height: viewport.height } : undefined}
                data-testid="editor-page"
              >
                <canvas
                  ref={canvasRef}
                  className="block bg-white"
                  aria-label={t.common.pageOf(position + 1, plan.length)}
                />
                {viewport ? (
                  <div className={tool === "editText" ? "pointer-events-none" : undefined}>
                    <AnnotationOverlay
                      viewport={viewport}
                      pageIndex={pageIndex}
                      pageRotation={page.rotation + extraRotation}
                      annotations={annotations}
                      tool={tool}
                      settings={settings}
                      selectedId={selectedId}
                      editingId={editingId}
                      onSelect={setSelectedId}
                      onEdit={setEditingId}
                      onLiveChange={history.replaceLive}
                      onBeginInteraction={() => history.beginLive(annotations)}
                      onEndInteraction={history.endLive}
                      onCommit={(next, label) => commitAnnotations(next, label ?? "Élément ajouté")}
                      onPlaceAt={onPlaceAt}
                      onToolChange={setToolState}
                    />
                  </div>
                ) : null}
                {viewport && tool === "editText" ? (
                  <TextEditLayer
                    viewport={viewport}
                    pageRotation={page.rotation + extraRotation}
                    status={textStatus}
                    busy={previewBusy}
                    edits={textEdits.filter((e) => e.pageIndex === pageIndex)}
                    showRuns={showRuns}
                    ocrQuality={
                      ocrLayer && ocrLayer.info.pages.includes(pageIndex)
                        ? ocrLayer.info.confidence
                        : null
                    }
                    ocrRunning={ocr.state.status === "running"}
                    sampleFill={sampleFill}
                    onCommit={commitTextEdit}
                    onRevert={revertTextEdit}
                    onRequestOcr={() => void runOcr()}
                  />
                ) : null}
                {renderError ? (
                  <p className="absolute inset-x-0 top-2 text-center text-sm text-destructive">
                    {t.errors.renderFailed}
                  </p>
                ) : null}
                {viewport && panel === "search"
                  ? searchResults
                      .map((r, i) => ({ r, i }))
                      .filter(({ r }) => r.pageIndex === pageIndex)
                      .map(({ r, i }) => {
                        const box = pdfRectToViewport(viewport, r.box);
                        return (
                          <div
                            key={i}
                            className={
                              i === searchCurrent
                                ? "pointer-events-none absolute rounded-sm bg-warning/50 ring-2 ring-warning-foreground"
                                : "pointer-events-none absolute rounded-sm bg-warning/30"
                            }
                            style={{
                              left: box.x,
                              top: box.y,
                              width: box.width,
                              height: box.height,
                            }}
                            data-testid="search-highlight"
                            data-current={i === searchCurrent ? "true" : undefined}
                          />
                        );
                      })
                  : null}
              </div>
            </div>
          </div>
          {selected &&
          tool === "select" &&
          editingId !== selected.id &&
          viewport &&
          floatingAnchor ? (
            <FloatingBar
              annotation={selected}
              anchor={floatingAnchor}
              bounds={{ width: containerSize.width, height: containerSize.height }}
              onChange={updateAnnotation}
              onDuplicate={duplicateSelected}
              onDelete={deleteSelected}
              onEditText={() => {
                history.beginLive(annotations);
                setEditingId(selected.id);
              }}
              autosize={autosizeForPage}
            />
          ) : null}
          {showDiagnosis && pdf.diagnosis ? (
            <ImportDiagnosis
              diagnosis={pdf.diagnosis}
              pageCount={pdf.pageCount}
              onRunOcr={() => void runOcr()}
              onContinue={() => setDiagnosisDismissed(true)}
            />
          ) : null}
        </div>
        {/* Side panels */}
        {panel ? (
          <SidePanel panel={panel} onClose={() => setPanel(null)}>
            {panel === "ocr" ? (
              <OcrPanel
                diagnosis={pdf.diagnosis}
                pageCount={pdf.pageCount}
                state={ocr.state}
                layer={ocrLayer?.info ?? null}
                language={ocrLanguage}
                onLanguage={setOcrLanguage}
                scope={ocrScope}
                onScope={setOcrScope}
                onRun={() => void runOcr()}
                onCancel={ocr.cancel}
                onRevert={revertOcr}
              />
            ) : null}
            {panel === "document" ? (
              <DocumentPanel
                fileName={pdf.file.name}
                size={pdf.file.size}
                pageCount={pdf.pageCount}
                diagnosis={pdf.diagnosis}
                unlocked={pdf.unlocked}
                layer={ocrLayer?.info ?? null}
                planSummary={
                  planChanged
                    ? `${plan.length} à l'export (ordre, rotation ou suppression modifiés)`
                    : null
                }
                textEdits={textEdits.length}
                annotations={annotations.length}
              />
            ) : null}
            {panel === "history" ? (
              <HistoryPanel steps={history.steps} futureCount={history.canRedo ? 1 : 0} />
            ) : null}
            {panel === "shortcuts" ? <ShortcutsPanel /> : null}
            {panel === "search" ? (
              <SearchPanel
                query={searchQuery}
                onQuery={setSearchQuery}
                replacement={replacement}
                onReplacement={setReplacement}
                searching={searching}
                progress={searchProgress}
                results={searchResults}
                current={searchCurrent}
                onSelect={showSearchResult}
                onReplaceOne={(i) => void replaceMatch(i)}
                onReplaceAll={() => void replaceAll()}
                canReplace={isEditor}
              />
            ) : null}
          </SidePanel>
        ) : null}
      </div>

      {/* Bottom bar: page navigation + zoom (+ mobile toolbar) */}
      <footer className="shrink-0 border-t border-border bg-surface">
        <div className="flex h-11 items-center justify-between gap-2 px-2 sm:px-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => goTo(position - 1)}
              disabled={position === 0}
              aria-label={t.common.previous}
              data-testid="page-prev"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span
              className="min-w-24 text-center text-sm tabular-nums"
              aria-live="polite"
              data-testid="page-indicator"
            >
              {t.common.pageOf(position + 1, plan.length)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => goTo(position + 1)}
              disabled={position >= plan.length - 1}
              aria-label={t.common.next}
              data-testid="page-next"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => zoomBy(-1)}
              disabled={atMin}
              aria-label={t.common.zoomOut}
            >
              <Minus aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="min-w-14 rounded-md px-1 text-sm tabular-nums hover:bg-muted"
                  aria-label={`Zoom ${zoomLabel(scale)}${fitMode === "width" ? " (ajusté à la largeur)" : fitMode === "page" ? " (page entière)" : ""} : choisir`}
                  data-testid="zoom-level"
                  data-fit={fitMode ?? "manual"}
                >
                  {zoomLabel(scale)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => applyFit("width")} data-testid="zoom-fit-width">
                  {fitMode === "width" ? "✓ " : ""}Ajuster à la largeur
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => applyFit("page")} data-testid="zoom-fit-page">
                  {fitMode === "page" ? "✓ " : ""}Page entière
                </DropdownMenuItem>
                {ZOOM_PERCENT_STEPS.map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onSelect={() => zoomTo(scaleOfPercent(p))}
                    data-testid={`zoom-${p}`}
                  >
                    {p} %
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => zoomBy(1)}
              disabled={atMax}
              aria-label={t.common.zoomIn}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="h-[72px] border-t border-border py-1 sm:hidden">
          <Toolbar
            tools={tools}
            active={tool}
            onChange={setTool}
            orientation="horizontal"
            extras={extras}
          />
        </div>
      </footer>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(e) => void onImageFile(e.target.files?.[0])}
        aria-label={t.upload.imageBrowse}
        tabIndex={-1}
        data-testid="editor-image-input"
      />
      <SignatureDialog
        open={signatureOpen}
        onOpenChange={(open) => {
          setSignatureOpen(open);
          if (!open && tool === "signature" && !pendingAsset.current) setToolState("select");
        }}
        onConfirm={onSignature}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={(open) => {
          setExportOpen(open);
          if (!open) exportOp.reset();
        }}
        state={exportOp.state}
        summary={{
          annotations: annotations.length,
          textEdits: textEdits.length,
          pagesChanged: planChanged,
          ocr: !!ocrLayer,
          expectedPages: plan.length,
        }}
        onDownload={() =>
          exportOp.state.status === "done" &&
          downloadPdf(exportOp.state.result.bytes, pdf.file.name, suffix, toolId)
        }
      />

      <Dialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <DialogContent size="sm" className="rounded-[20px]" data-testid="close-confirm">
          <DialogHeader>
            <DialogTitle>Fermer sans télécharger ?</DialogTitle>
            <DialogDescription>
              Vos modifications ne sont pas enregistrées : le fichier d&apos;origine reste intact
              sur votre appareil, et ce qui a été fait ici sera perdu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloseConfirmOpen(false)}>
              Continuer l&apos;édition
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setCloseConfirmOpen(false);
                onClose();
              }}
              data-testid="close-confirm-discard"
            >
              Fermer sans enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
