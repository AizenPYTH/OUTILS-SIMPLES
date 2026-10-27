/**
 * Makes the English dictionary and inline messages available (`t`, `tr()`).
 * Imported for its side effect by the root layouts and the sitemap on the
 * server, by `EnglishBundle` in the English client bundle (both are needed
 * during hydration), and by the tests. The French client bundle never imports
 * it. The English text of the tools (much larger, needed by fewer pages) is
 * registered separately by `register-en-registry.ts`.
 */
import { registerDictionary } from "./index";
import { en } from "./en";
import { registerMessages } from "./messages";
import { messagesEn } from "./messages/en";

export function registerEnglish(): void {
  registerDictionary("en", en);
  registerMessages(messagesEn);
}

registerEnglish();
