"use client";

import { UuidTool } from "@/components/dev/uuid-tool";
import { SsrToolShell } from "@/components/tools/ssr-tool-shell";

/** Server-rendered entry of the tool (see src/components/tools/server-rendered-tools.tsx). */
export default function Entry() {
  return (
    <SsrToolShell>
      <UuidTool />
    </SsrToolShell>
  );
}
