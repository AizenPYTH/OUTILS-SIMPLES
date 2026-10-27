import { unescapeHtml } from "@/lib/dev/encoding";
import { tr } from "@/lib/i18n/messages";

/**
 * Converts the simple, well-formed HTML produced by mammoth (Word → HTML) into
 * GitHub-flavoured Markdown for the text-to-PDF renderer: headings, paragraphs,
 * bold/italic/strike, links, images (kept as data URIs), nested lists, tables,
 * code, quotes and rules. Pure string processing: no DOM, runs in Node too.
 */
interface Node {
  tag: string;
  attrs: Record<string, string>;
  children: (Node | string)[];
}

const VOID = new Set(["br", "img", "hr", "input", "meta", "link", "col", "wbr"]);
const BLOCK = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "pre",
  "blockquote",
  "hr",
  "section",
  "article",
  "header",
  "footer",
  "figure",
  "figcaption",
]);

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of raw.matchAll(
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g,
  )) {
    attrs[m[1]!.toLowerCase()] = unescapeHtml(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

export function parseHtml(html: string): Node {
  const root: Node = { tag: "#root", attrs: {}, children: [] };
  const stack: Node[] = [root];
  const re =
    /<!--[\s\S]*?-->|<\/([a-zA-Z][a-zA-Z0-9]*)\s*>|<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)\/?>|([^<]+)/g;
  for (const m of html.matchAll(re)) {
    const [whole, close, open, rawAttrs, text] = m;
    if (whole.startsWith("<!--")) continue;
    if (text !== undefined) {
      stack[stack.length - 1]!.children.push(unescapeHtml(text));
    } else if (open) {
      const tag = open.toLowerCase();
      const node: Node = { tag, attrs: parseAttrs(rawAttrs ?? ""), children: [] };
      stack[stack.length - 1]!.children.push(node);
      if (!VOID.has(tag) && !whole.endsWith("/>")) stack.push(node);
    } else if (close) {
      const tag = close.toLowerCase();
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i]!.tag === tag) {
          stack.length = i;
          break;
        }
      }
    }
  }
  return root;
}

/** Escapes characters that would otherwise be read as Markdown syntax inside text. */
function escapeText(text: string): string {
  return text.replace(/([\\`*_~[\]<>])/g, "\\$1");
}

function escapeLineStart(line: string): string {
  return line.replace(/^(\s*)([#>+-]|\d+[.)])(\s)/, "$1\\$2$3");
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ");
}

class Writer {
  private readonly out: string[] = [];
  readonly warnings: string[] = [];

  render(root: Node): string {
    this.blocks(root.children, "");
    return this.out
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private blocks(children: (Node | string)[], prefix: string): void {
    let inlineBuffer: (Node | string)[] = [];
    const flush = () => {
      const text = this.inline(inlineBuffer).trim();
      if (text) this.paragraph(text, prefix);
      inlineBuffer = [];
    };
    for (const child of children) {
      if (typeof child === "string" || !BLOCK.has(child.tag)) {
        inlineBuffer.push(child);
        continue;
      }
      flush();
      this.block(child, prefix);
    }
    flush();
  }

  private paragraph(text: string, prefix: string): void {
    const lines = text.split("\n").map((l) => prefix + escapeLineStart(l));
    this.out.push(`${lines.join("\n")}\n\n`);
  }

  private block(node: Node, prefix: string): void {
    switch (node.tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = Number(node.tag[1]);
        const text = collapse(this.inline(node.children)).trim();
        if (text) this.out.push(`${prefix}${"#".repeat(level)} ${text}\n\n`);
        break;
      }
      case "ul":
      case "ol":
        this.list(node, prefix, 0);
        this.out.push("\n");
        break;
      case "table":
        this.table(node, prefix);
        break;
      case "pre": {
        const code = this.text(node.children).replace(/\n$/, "");
        this.out.push(
          `${prefix}\`\`\`\n${code
            .split("\n")
            .map((l) => prefix + l)
            .join("\n")}\n${prefix}\`\`\`\n\n`,
        );
        break;
      }
      case "blockquote":
        this.blocks(node.children, `${prefix}> `);
        break;
      case "hr":
        this.out.push(`${prefix}---\n\n`);
        break;
      case "li":
        // A stray list item outside a list: render as a paragraph.
        this.blocks(node.children, prefix);
        break;
      default:
        this.blocks(node.children, prefix);
    }
  }

  private list(node: Node, prefix: string, level: number): void {
    const ordered = node.tag === "ol";
    let index = Number(node.attrs.start ?? "1") || 1;
    for (const child of node.children) {
      if (typeof child === "string" || child.tag !== "li") continue;
      const marker = ordered ? `${index}. ` : "- ";
      index += 1;
      const nested: Node[] = [];
      const own: (Node | string)[] = [];
      for (const c of child.children) {
        if (typeof c !== "string" && (c.tag === "ul" || c.tag === "ol")) nested.push(c);
        else own.push(c);
      }
      const text = collapse(this.inline(own)).trim();
      const indent = " ".repeat(level * 4);
      this.out.push(`${prefix}${indent}${marker}${escapeLineStart(text) || " "}\n`);
      for (const sub of nested) this.list(sub, prefix, level + 1);
    }
  }

  private table(node: Node, prefix: string): void {
    const rows: string[][] = [];
    const walk = (n: Node) => {
      for (const c of n.children) {
        if (typeof c === "string") continue;
        if (c.tag === "tr") {
          rows.push(
            c.children
              .filter(
                (cell): cell is Node =>
                  typeof cell !== "string" && (cell.tag === "td" || cell.tag === "th"),
              )
              .map((cell) => {
                const span = Math.max(1, Number(cell.attrs.colspan ?? "1") || 1);
                const text = collapse(this.inlineCell(cell.children)).trim().replace(/\|/g, "\\|");
                return span > 1 ? [text, ...Array<string>(span - 1).fill("")] : [text];
              })
              .flat(),
          );
        } else walk(c);
      }
    };
    walk(node);
    if (rows.length === 0) return;
    const columns = Math.max(...rows.map((r) => r.length));
    const pad = (r: string[]) => [...r, ...Array<string>(columns - r.length).fill("")];
    const line = (r: string[]) => `${prefix}| ${pad(r).join(" | ")} |\n`;
    this.out.push(line(rows[0]!));
    this.out.push(`${prefix}| ${Array<string>(columns).fill("---").join(" | ")} |\n`);
    for (const row of rows.slice(1)) this.out.push(line(row));
    this.out.push("\n");
  }

  /** Cell content: block children (paragraphs) are joined with spaces. */
  private inlineCell(children: (Node | string)[]): string {
    return children
      .map((c) =>
        typeof c === "string"
          ? escapeText(c)
          : BLOCK.has(c.tag)
            ? ` ${this.inlineCell(c.children)} `
            : this.inlineNode(c),
      )
      .join("");
  }

  private inline(children: (Node | string)[]): string {
    return children
      .map((c) => (typeof c === "string" ? escapeText(c) : this.inlineNode(c)))
      .join("");
  }

  private inlineNode(node: Node): string {
    const inner = () => this.inline(node.children);
    switch (node.tag) {
      case "strong":
      case "b": {
        const t = inner();
        return t.trim() ? `**${t.trim()}**${t.endsWith(" ") ? " " : ""}` : t;
      }
      case "em":
      case "i": {
        const t = inner();
        return t.trim() ? `*${t.trim()}*${t.endsWith(" ") ? " " : ""}` : t;
      }
      case "s":
      case "del":
      case "strike": {
        const t = inner();
        return t.trim() ? `~~${t.trim()}~~${t.endsWith(" ") ? " " : ""}` : t;
      }
      case "code":
        return `\`${this.text(node.children)}\``;
      case "br":
        return "\n";
      case "a": {
        const href = node.attrs.href ?? "";
        const t = inner();
        return /^(https?:|mailto:)/i.test(href) ? `[${t || href}](${href})` : t;
      }
      case "img": {
        const src = node.attrs.src ?? "";
        const alt = (node.attrs.alt ?? "").replace(/[[\]]/g, "");
        if (/^data:image\/(png|jpe?g);base64,/i.test(src)) return `\n\n![${alt}](${src})\n\n`;
        this.warnings.push(
          /^data:/i.test(src)
            ? tr(
                "Une image dans un format non pris en charge (EMF, WMF, GIF, TIFF…) a été ignorée.",
              )
            : tr("Une image liée (non incorporée) a été ignorée."),
        );
        return alt ? `*[${alt}]*` : "";
      }
      case "sup":
      case "sub":
      case "u":
      case "span":
      case "mark":
      case "small":
        return inner();
      default:
        if (BLOCK.has(node.tag)) return ` ${inner()} `;
        return inner();
    }
  }

  private text(children: (Node | string)[]): string {
    return children
      .map((c) => (typeof c === "string" ? c : c.tag === "br" ? "\n" : this.text(c.children)))
      .join("");
  }
}

export interface HtmlToMarkdownResult {
  markdown: string;
  warnings: string[];
}

export function htmlToMarkdown(html: string): HtmlToMarkdownResult {
  const writer = new Writer();
  const markdown = writer.render(parseHtml(html));
  return { markdown, warnings: Array.from(new Set(writer.warnings)) };
}
