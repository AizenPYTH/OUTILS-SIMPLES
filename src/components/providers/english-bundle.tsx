"use client";

// Side effects only: register the English texts in the client module graph of
// the English tree (see src/lib/i18n/register-en.ts). Both render nothing.
import "@/lib/i18n/register-en";

export function EnglishBundle() {
  return null;
}
