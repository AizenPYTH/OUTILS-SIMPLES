import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Rounded indigo square, white ring and a lilac dot (design handoff). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#5146E5" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="#fff" strokeWidth="3" />
      <circle cx="21.5" cy="10.5" r="2.2" fill="#C9BFFF" />
    </svg>
  );
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 rounded-md", className)}
      aria-label={`${siteConfig.name} – ${siteConfig.tagline}`}
    >
      <LogoMark />
      {withText ? (
        <span className="font-heading text-[19px] font-extrabold tracking-[0.02em]">
          {siteConfig.name}
        </span>
      ) : null}
    </Link>
  );
}
