import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/content/legal-page";
import { setRequestLocale } from "@/lib/i18n/locale";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  setRequestLocale("en");
  return buildPageMetadata({
    title: "Check it yourself",
    description: `How to see for yourself that ${siteConfig.name} does not transmit your files: the browser's Network tab, offline mode, the code of the libraries used.`,
    path: "/en/verify-it/",
    locale: "en",
  });
}

export default function VerifyItPage() {
  setRequestLocale("en");
  return (
    <LegalPage
      title="Check it yourself"
      path="/en/verify-it/"
      intro="“Your files do not leave your browser” is an easy promise to make. Here are three ways to check it, in a few minutes, with no special skills."
    >
      <section>
        <h2>1. Watch the network traffic during a job</h2>
        <ol>
          <li>
            Open a tool, for example Merge PDFs, then the browser&apos;s developer tools (F12, or
            Ctrl/Cmd + Shift + I) and the “Network” tab.
          </li>
          <li>Tick “Preserve log”, drop your files, run the job, download the result.</li>
          <li>
            Look at the requests: only files from the site itself are loaded (scripts, fonts,
            WebAssembly engines under /pdfjs, /ocr, /qpdf, /fonts, /heif). No POST request, no
            upload to another domain, no request whose size would match your document.
          </li>
        </ol>
        <p>
          With the default configuration, the site loads no third-party service. If the publisher
          enables analytics or advertising, it only loads after your consent and never has access to
          the content of your files.
        </p>
      </section>
      <section>
        <h2>2. Cut the connection</h2>
        <p>
          Open the tool&apos;s page, then switch to aeroplane mode or turn off Wi-Fi. Drop a file
          and run the job: it completes, because all the code needed was loaded with the page. With
          “Use offline”, the tool even stays available for later visits without a network (see{" "}
          <Link href="/en/offline/">the offline page</Link>).
        </p>
      </section>
      <section>
        <h2>3. Read the code</h2>
        <p>
          Processing relies on open-source libraries you can inspect: pdf.js and pdf-lib (PDF),
          Tesseract.js (text recognition), qpdf (encryption), libheif (HEIC photos), mammoth,
          exceljs and docx (Office conversions). They are served by the site itself, without a
          third-party CDN, and run in your browser.
        </p>
        <p>
          The site&apos;s security policy (the Content-Security-Policy header, visible in the
          Network tab) forbids the code from contacting any domain other than the site itself: even
          a programming mistake could not send a file elsewhere without the browser blocking it.
        </p>
      </section>
      <section>
        <h2>What this does not cover</h2>
        <ul>
          <li>
            Your browser and its extensions may themselves send data (sync, capture extensions):
            this does not depend on the site.
          </li>
          <li>
            The downloaded file is saved on your device, in the downloads folder: protecting or
            deleting it is up to you.
          </li>
          <li>
            Nothing is stored by the site, but the browser&apos;s memory keeps the document open as
            long as the tab is: close the tab on a shared device.
          </li>
        </ul>
      </section>
      <p>
        <Link href="/en/privacy/">Privacy policy</Link> · <Link href="/en/about/">About</Link>
      </p>
    </LegalPage>
  );
}
