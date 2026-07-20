/**
 * features/notes/markdown.ts — 極簡、無外部依賴的 Markdown -> 安全 HTML 轉換。
 *
 * 設計原則：
 * - 一律先 escape 使用者輸入的 HTML 特殊字元，再套用我們自己產生的固定標籤，避免 XSS。
 * - 支援：標題 #~######、粗體/斜體、行內程式碼、程式碼區塊（```lang）、
 *   有序/無序清單、引用、連結、圖片、水平線、雙向連結 [[標題]]。
 * - 雙向連結渲染成 <button data-wikilink="標題"> 由呼叫端用事件代理處理點擊。
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface CodeBlockToken {
  token: string;
  html: string;
}

function extractCodeBlocks(escaped: string): { text: string; blocks: CodeBlockToken[] } {
  const blocks: CodeBlockToken[] = [];
  const text = escaped.replace(/```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g, (_match, lang: string, code: string) => {
    const token = `@@CODEBLOCK_${blocks.length}@@`;
    const langClass = lang ? ` class="language-${lang}"` : "";
    const langLabel = lang ? `<div class="mb-1 text-label uppercase text-ink-faint">${lang}</div>` : "";
    blocks.push({
      token,
      html: `<figure class="my-3">${langLabel}<pre class="overflow-x-auto rounded-md border border-line bg-paper-sunken p-3 text-mono"><code${langClass}>${code.replace(/\n$/, "")}</code></pre></figure>`,
    });
    return token;
  });
  return { text, blocks };
}

function renderInline(line: string): string {
  let out = line;

  // 行內程式碼（先處理，避免內部符號被其他規則誤判）
  const inlineCodeTokens: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    const idx = inlineCodeTokens.length;
    inlineCodeTokens.push(`<code class="rounded bg-paper-sunken px-1 py-0.5 text-mono">${code}</code>`);
    return `@@INLINECODE_${idx}@@`;
  });

  // 圖片 ![alt](url)
  out = out.replace(
    /!\[([^\]]*)]\(([^)\s]+)\)/g,
    '<img src="$2" alt="$1" class="my-2 max-w-full rounded-md border border-line" loading="lazy" />',
  );

  // 雙向連結 [[標題]]（需在一般連結之前處理）
  out = out.replace(
    /\[\[([^[\]]+)]]/g,
    (_m, title: string) =>
      `<button type="button" class="wikilink rounded px-1 text-accent underline decoration-dotted underline-offset-2 hover:bg-accent-soft" data-wikilink="${title.trim()}">${title.trim()}</button>`,
  );

  // 一般連結 [text](url)
  out = out.replace(
    /\[([^\]]+)]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent underline underline-offset-2">$1</a>',
  );

  // 粗體 + 斜體
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // 還原行內程式碼 token
  out = out.replace(/@@INLINECODE_(\d+)@@/g, (_m, idx: string) => inlineCodeTokens[Number(idx)] ?? "");

  return out;
}

export function renderMarkdown(source: string): string {
  const escaped = escapeHtml(source ?? "");
  const { text, blocks } = extractCodeBlocks(escaped);
  const lines = text.split("\n");

  const htmlParts: string[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
  let paragraphBuffer: string[] = [];
  let quoteBuffer: string[] = [];

  function flushList() {
    if (!listBuffer) return;
    const tag = listBuffer.type;
    htmlParts.push(
      `<${tag} class="${tag === "ul" ? "list-disc" : "list-decimal"} my-2 space-y-1 pl-6 text-body text-ink-soft">${listBuffer.items
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("")}</${tag}>`,
    );
    listBuffer = null;
  }

  function flushParagraph() {
    if (paragraphBuffer.length === 0) return;
    htmlParts.push(`<p class="my-2 text-body text-ink-soft">${renderInline(paragraphBuffer.join(" "))}</p>`);
    paragraphBuffer = [];
  }

  function flushQuote() {
    if (quoteBuffer.length === 0) return;
    htmlParts.push(
      `<blockquote class="my-2 border-l-2 border-line-strong pl-3 text-body italic text-ink-muted">${renderInline(
        quoteBuffer.join(" "),
      )}</blockquote>`,
    );
    quoteBuffer = [];
  }

  function flushAll() {
    flushList();
    flushParagraph();
    flushQuote();
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^@@CODEBLOCK_\d+@@$/.test(line.trim())) {
      flushAll();
      const block = blocks.find((b) => b.token === line.trim());
      if (block) htmlParts.push(block.html);
      continue;
    }

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1]?.length ?? 1;
      const sizeClass = level <= 1 ? "text-h1" : level === 2 ? "text-h2" : level === 3 ? "text-h3" : "text-body font-semibold";
      htmlParts.push(`<h${level} class="mt-4 mb-2 ${sizeClass} text-ink">${renderInline(headingMatch[2] ?? "")}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushAll();
      htmlParts.push('<hr class="my-4 border-line" />');
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      flushParagraph();
      quoteBuffer.push(line.replace(/^>\s?/, ""));
      continue;
    }

    const ulMatch = /^[-*+]\s+(.*)$/.exec(line);
    const olMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ulMatch || olMatch) {
      flushParagraph();
      flushQuote();
      const type = ulMatch ? "ul" : "ol";
      const itemText = (ulMatch ?? olMatch)?.[1] ?? "";
      if (!listBuffer || listBuffer.type !== type) {
        flushList();
        listBuffer = { type, items: [] };
      }
      listBuffer.items.push(itemText);
      continue;
    }

    // 一般段落文字
    flushList();
    flushQuote();
    paragraphBuffer.push(line);
  }

  flushAll();

  return htmlParts.join("\n") || '<p class="text-body text-ink-faint">（尚無內容）</p>';
}
