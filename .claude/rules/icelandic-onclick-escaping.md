# Icelandic Character Escaping in onclick Attributes

When embedding Icelandic text (or any text with special characters) in onclick attributes, always escape backslashes, apostrophes, and quotes to prevent JavaScript syntax errors.

## Pattern

| If Claude suggests... | Use instead... |
|----------------------|----------------|
| `onclick="fn('${text}')"` | `onclick="fn('${text.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'")}')"` |
| `data-name="${name}"` | `data-name="${escapeForJavaScript(name)}"` (preferred) |

## Context

Icelandic text may contain characters that break JavaScript string literals:
- Special characters: á, ð, þ, æ, ö, ý
- Apostrophes in item descriptions
- Backslashes in certain contexts
- Quotes in user input

## Solution

### Manual Escaping (inline)
```typescript
const escapedText = text
  .replace(/\\\\/g, '\\\\\\\\')  // Escape backslashes first
  .replace(/'/g, "\\\\'");       // Then escape apostrophes

const html = `<div onclick="selectItem('${escapedText}')">${text}</div>`;
```

### Preferred: Use Utility Function
```typescript
function escapeForJavaScript(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

const html = `<div onclick="selectItem('${escapeForJavaScript(text)}')">${text}</div>`;
```

## When to Apply

- Generating HTML with onclick/onchange/other inline event handlers
- Embedding user-generated content in JavaScript string literals
- Working with Icelandic text (item names, descriptions, fun facts)
- Any dynamic content in inline JavaScript
