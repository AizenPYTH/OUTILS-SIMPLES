"use client";

// English pages: the tool texts must be registered before hydration, since
// the server HTML is already in English. Loaded only with this tool's chunk.
import "@/lib/i18n/register-en-messages";

export { default } from "./qr-generator-entry";
