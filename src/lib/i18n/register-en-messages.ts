/**
 * Registers the English text of every tool interface (`messages/en`). Loaded
 * on the server by the root layouts, and on the client only with a tool
 * component on an English page (`tool-renderer.tsx`): tool components are
 * not server-rendered, so their messages are not needed at hydration.
 */
import { registerMessages } from "./messages";
import { messagesEn } from "./messages/en";

registerMessages(messagesEn);
