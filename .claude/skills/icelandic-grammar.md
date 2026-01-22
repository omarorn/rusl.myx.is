---
description: Review Icelandic text for spelling and grammar errors using GreynirCorrect via Yfirlestur.is API. Use when checking Icelandic prompts, UI text, or any Icelandic content for correct declensions (fallbeygingar) and spelling.
---

# Icelandic Grammar Reviewer

Review Icelandic text for spelling, grammar, and declension errors.

## Available Resources

### Yfirlestur.is API (GreynirCorrect)
REST API for grammar checking: `https://yfirlestur.is/correct.api`

```bash
# Check text for errors
curl -X POST "https://yfirlestur.is/correct.api" \
  -H "Content-Type: application/json" \
  -d '{"text": "Ég fer í skólann"}'
```

### BÍN Lookup (Beygingarlýsing íslensks nútímamáls)
For word inflection lookups: `https://bin.arnastofnun.is/`

## Common Icelandic Grammar Issues

### Fallbeygingar (Case Declensions)

| Fall | Spurning | Dæmi |
|------|----------|------|
| Nefnifall | Hver/hvað? | hestur, kona |
| Þolfall | Hvern/hvað? | hest, konu |
| Þágufall | Hverjum/hverju? | hesti, konu |
| Eignarfall | Hvers? | hests, konu |

### Með + þágufall
"Með" takes dative case:
- ✅ "með skilagjaldi" (not "með skilagjald")
- ✅ "með plastinu" (not "með plastið")

### Í + þolfall (motion) vs þágufall (location)
- Motion: "Ég fer í skólann" (þolfall)
- Location: "Ég er í skólanum" (þágufall)

### Verb Conjugation (2nd person singular)
- ✅ "þú skilar" (not "þú skila")
- ✅ "þú setur" (not "þú setja")
- ✅ "þú ferð" (not "þú fara")

### Definite Article
- ✅ "endurvinnsluna" (accusative with article)
- ✅ "tunnuna" (accusative with article)
- ✅ "peninginn" (accusative singular with article)

## Review Process

1. **Identify text to review** - prompts, UI strings, translations
2. **Check via Yfirlestur.is** - automated grammar check
3. **Manual BÍN lookup** - verify specific word forms
4. **Apply corrections** - update source files

## Example Workflow

```typescript
// Before review
"Gosdósir með skilagjald skila þú í Endurvinnslan"

// Errors found:
// - "skilagjald" → "skilagjaldi" (þágufall eftir "með")
// - "skila þú" → "skilar þú" (2. persóna eintölu)
// - "Endurvinnslan" → "endurvinnsluna" (þolfall með greini)

// After correction
"Gosdósir með skilagjaldi skilar þú í endurvinnsluna"
```

## Files to Review in This Project

- `worker/src/services/gemini.ts` - AI prompts with Icelandic examples
- `worker/src/services/cloudflare-ai.ts` - AI prompts
- `src/locales/translations.ts` - UI translations
- `src/components/*.tsx` - Hardcoded Icelandic strings
