# /check-types - Run TypeScript Type Checking

Run TypeScript compiler to check for type errors without building.

## What This Command Does

1. Runs type checking on both PWA and worker
2. Counts errors by category
3. Suggests fixes for common errors

## Usage

```bash
/check-types
```

## Execution Steps

1. **Run type checker for PWA**:
   ```bash
   npx tsc --noEmit
   ```

2. **Run type checker for Worker**:
   ```bash
   cd worker && npx tsc --noEmit
   ```

3. **Categorize errors** (if any):
   ```bash
   npx tsc --noEmit 2>&1 | grep "error TS" | cut -d':' -f4 | sort | uniq -c | sort -rn
   ```

## Example Output

```
═══════════════════════════════════════════════
   TYPESCRIPT TYPE CHECKING
═══════════════════════════════════════════════

Running typecheck...

PWA (Frontend):
✅ 0 errors

Worker (Backend):
✅ 0 errors

───────────────────────────────────────────────
SUMMARY:
───────────────────────────────────────────────

Total Errors: 0
Ready for deployment!
```

## Common Error Fixes

| Error Code | Meaning | Fix |
|------------|---------|-----|
| TS2345 | Implicit any | Add type annotations |
| TS7053 | Element has any type | Add index signature |
| TS2339 | Property doesn't exist | Check interface definition |
| TS2554 | Wrong argument count | Check function signature |
| TS2571 | Object possibly undefined | Add null check |

## Notes

- Fast (no build, just type checking)
- Safe (doesn't modify code)
- Run before every deployment
