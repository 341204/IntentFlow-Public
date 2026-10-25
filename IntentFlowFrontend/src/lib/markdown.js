import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdown(content) {
  return DOMPurify.sanitize(
    marked.parse(String(content), { breaks: true, async: false }),
    {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "del",
        "blockquote",
        "ul",
        "ol",
        "li",
        "pre",
        "code",
        "a",
        "h1",
        "h2",
        "h3",
        "h4",
        "hr",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      ALLOWED_ATTR: ["href", "title", "class"],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    },
  );
}
