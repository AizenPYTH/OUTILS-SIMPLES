import {
  ArrowRightLeft,
  Briefcase,
  Calculator,
  ClipboardList,
  Droplets,
  Eraser,
  FileOutput,
  FileText,
  Highlighter,
  Image as ImageIcon,
  LayoutGrid,
  ListChecks,
  Merge,
  Minimize2,
  PenLine,
  QrCode,
  RotateCw,
  Scissors,
  Sparkles,
  SquarePen,
  Type,
  type LucideProps,
} from "lucide-react";
import type { ToolIconName } from "@/lib/tools";

const icons: Record<ToolIconName, React.ComponentType<LucideProps>> = {
  merge: Merge,
  scissors: Scissors,
  minimize: Minimize2,
  "layout-grid": LayoutGrid,
  "rotate-cw": RotateCw,
  "file-output": FileOutput,
  type: Type,
  highlighter: Highlighter,
  "pen-line": PenLine,
  droplets: Droplets,
  eraser: Eraser,
  "clipboard-list": ClipboardList,
  "square-pen": SquarePen,
  "file-text": FileText,
  image: ImageIcon,
  calculator: Calculator,
  "qr-code": QrCode,
  briefcase: Briefcase,
  sparkles: Sparkles,
  "arrow-right-left": ArrowRightLeft,
  "list-checks": ListChecks,
};

export function ToolIcon({ name, ...props }: { name: ToolIconName } & LucideProps) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" {...props} />;
}
