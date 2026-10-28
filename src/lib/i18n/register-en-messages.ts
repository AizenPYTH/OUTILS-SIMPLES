/**
 * Registers the English text of every tool interface (`messages/en`). Loaded
 * on the server by the root layouts, and on the client only with a tool
 * component on an English page: lazily with client-only tools
 * (`tool-renderer.tsx`), before hydration with the server-rendered ones
 * (`tools/ssr/*-entry-en.tsx`), whose server HTML is already in English.
 */
import { registerMessages } from "./messages";
import { messagesEn } from "./messages/en";

registerMessages(messagesEn);
