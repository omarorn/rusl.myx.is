# /db-backup - Backup D1 Database

Create a timestamped backup of the trash-myx-db D1 database.

## What This Command Does

1. Exports entire D1 database to SQL file
2. Timestamps the backup file
3. Displays backup size and record counts

## Usage

```bash
/db-backup
```

## Execution Steps

1. **Create backup**:
   ```bash
   cd worker && npx wrangler d1 export trash-myx-db --remote \
     --output=backups/backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Verify backup created**:
   ```bash
   ls -lh backups/backup-*.sql
   ```

3. **Count records**:
   ```bash
   grep "INSERT INTO" backups/backup-*.sql | wc -l
   ```

## Example Output

```
═══════════════════════════════════════════════
   DATABASE BACKUP
═══════════════════════════════════════════════

Creating backup of trash-myx-db (production)...

✅ Backup complete!

File: backups/backup-20260119-143530.sql
Size: 2.1 MB
Records: 5,847 total

Record Counts by Table:
  5,200 scans
    580 users
     67 fun_facts
  ────────────────
  5,847 total

───────────────────────────────────────────────
BACKUP VERIFICATION:
───────────────────────────────────────────────

✅ All tables backed up
✅ File size reasonable (2.1 MB)
✅ Record counts match production
```

## When to Backup

**ALWAYS backup before:**
- Schema migrations
- Major code deployments
- Testing destructive operations

## Restore from Backup (if needed)

```bash
cd worker

# 1. Restore to local database (test first!)
npx wrangler d1 execute trash-myx-db --local --file=backups/backup-[timestamp].sql

# 2. Verify restoration
npx wrangler d1 execute trash-myx-db --local \
  --command="SELECT COUNT(*) FROM scans"

# 3. If verified, restore to production
npx wrangler d1 execute trash-myx-db --remote --file=backups/backup-[timestamp].sql
```

## Safety Notes

- **NEVER restore to production without testing locally first**
- Keep at least 3 recent backups
- Test restoration process periodically
