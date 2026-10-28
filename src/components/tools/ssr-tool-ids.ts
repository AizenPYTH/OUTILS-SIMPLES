/** Tools rendered on the server as well (see server-rendered-tools.tsx). */
export const SERVER_RENDERED_TOOL_IDS = ["qr-generate", "dev-regex", "dev-uuid"] as const;
export type ServerRenderedToolId = (typeof SERVER_RENDERED_TOOL_IDS)[number];

export function isServerRenderedTool(id: string): id is ServerRenderedToolId {
  return (SERVER_RENDERED_TOOL_IDS as readonly string[]).includes(id);
}
