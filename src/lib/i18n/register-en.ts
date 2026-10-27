/**
 * Makes the English dictionary and the shared inline messages available
 * (`t`, `tr()` for the page chrome). Imported for its side effect by the root
 * layouts and the sitemap on the server, by `EnglishBundle` in the English
 * client bundle (needed during hydration), and by the tests. The French
 * client bundle never imports it. The much larger per-tool messages and the
 * English registry are registered separately (`register-en-messages.ts`,
 * `register-en-registry.ts`) with the tool component that needs them.
 */
import { registerDictionary } from "./index";
import { en } from "./en";
import { registerMessages } from "./messages";
import { sharedEn } from "./messages/en/shared";

export function registerEnglish(): void {
  registerDictionary("en", en);
  registerMessages(sharedEn);
}

registerEnglish();
