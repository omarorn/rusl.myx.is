# HTML Content Escaping

When embedding dynamic content in JavaScript strings or HTML attributes, always escape special characters to prevent syntax errors and XSS vulnerabilities.

## Pattern

| If Claude suggests... | Use instead... |
|----------------------|----------------|
| `const title = '${item.name}'` | `const title = '${escapeHtml(item.name)}'` |
| `data-content="${content}"` | `data-content="${escapeHtml(content)}"` |
| `onclick="fn('${name}')"` | `onclick="fn('${escapeHtml(name)}')"` |

## Required Helper Function

Add this to any file that embeds dynamic content in JS:

```typescript
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
```

## Symptoms of Missing Escaping

- `Uncaught SyntaxError: Invalid regular expression`
- `Uncaught SyntaxError: Unexpected end of input`
- `Uncaught SyntaxError: Unexpected token`
- Content with quotes, backslashes, or newlines breaks page

## Context

This is especially important for:
- User-generated content
- AI classification results that may contain special characters
- Icelandic text with special characters (á, ð, þ, æ, ö)
- Any dynamic content embedded in inline scripts
