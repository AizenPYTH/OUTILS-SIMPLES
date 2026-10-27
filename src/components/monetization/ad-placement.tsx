"use client";

import dynamic from "next/dynamic";
import { adsConfig, type AdPlacementId } from "@/config/ads";

/*
 * Client-side split point (same pattern as consent-gate.tsx): a client
 * component referenced from a server component always ships with the page,
 * so the slot itself (and the consent hook) is only downloaded when a
 * placement is active or the development preview is on. With the default
 * configuration this gate renders nothing and costs a few hundred bytes.
 */
const AdSlot = dynamic(() => import("./ad-slot").then((m) => m.AdSlot), { ssr: false });

export function AdPlacement({
  placement,
  className,
}: {
  placement: AdPlacementId;
  className?: string;
}) {
  const config = adsConfig();
  if (!config.preview && !config.active.has(placement)) return null;
  return <AdSlot placement={placement} className={className} />;
}
