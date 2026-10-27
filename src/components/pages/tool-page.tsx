import { Alert } from "@/components/ui/alert";
import { ToolPageLayout } from "@/components/tools/tool-page-layout";
import { ToolRenderer } from "@/components/tools/tool-renderer";
import type { ToolCategory, ToolDefinition } from "@/lib/tools";
import { isToolUiTranslated } from "@/lib/i18n/ui-coverage";
import { getLocale, t } from "@/lib/i18n";

export function ToolPage({ tool, category }: { tool: ToolDefinition; category: ToolCategory }) {
  const partial =
    getLocale() !== "fr" && (tool.translated === false || !isToolUiTranslated(tool.id));
  return (
    <ToolPageLayout tool={tool} category={category}>
      {partial ? (
        <Alert variant="info" className="mb-4" data-testid="partial-translation">
          {t.languageSwitcher.partial}
        </Alert>
      ) : null}
      <ToolRenderer toolId={tool.id} />
    </ToolPageLayout>
  );
}
