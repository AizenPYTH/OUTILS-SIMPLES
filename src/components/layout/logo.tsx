import Image from "next/image";
import Link from "next/link";
import markImage from "@/assets/brand/averopdf-mark.png";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * The AVEROPDF mark: the document wrapped in its green ribbon, cut from the
 * supplied logo (docs/Logo AVEROPDF au document vert.png, transparent
 * background so that it also sits on the dark theme).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={markImage}
      alt=""
      aria-hidden="true"
      priority
      sizes="52px"
      className={cn("h-10 w-auto", className)}
    />
  );
}

/**
 * Mark and wordmark: "AVERO" in dark green, "PDF" in the logo's bright green, deepened
 * just enough for 3:1 on the light background (large bold text, WCAG 1.4.3).
 */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 items-center gap-2 rounded-md", className)}
      aria-label={`${siteConfig.name} – ${siteConfig.tagline}`}
    >
      <LogoMark />
      {withText ? (
        <span className="font-heading text-[21px] font-extrabold leading-none tracking-[0.01em]">
          <span className="text-brand-dark dark:text-foreground">AVERO</span>
          <span className="text-[#36a01d] dark:text-brand-bright">PDF</span>
        </span>
      ) : null}
    </Link>
  );
}
