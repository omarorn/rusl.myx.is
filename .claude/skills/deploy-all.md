# /deploy-all - Deploy Worker

Deploy the rusl.myx.is worker to production with verification.

## What This Command Does

1. Runs type checking
2. Deploys worker to Cloudflare
3. Verifies deployment
4. Monitors logs for errors

## Usage

```bash
/deploy-all
```

## Execution Steps

1. **Pre-deployment checks**:
   ```bash
   cd worker && npm run typecheck  # Should pass with 0 errors
   ```

2. **Deploy worker**:
   ```bash
   cd worker && npm run deploy
   ```

3. **Verify deployment**:
   ```bash
   # Check API status
   curl https://rusl.myx.is/api/stats/global
   ```

4. **Monitor logs** (watch for errors):
   ```bash
   cd worker && npx wrangler tail
   ```

## Example Output

```
═══════════════════════════════════════════════
   DEPLOYING RUSL.MYX.IS WORKER
═══════════════════════════════════════════════

[1/4] Pre-deployment checks...
  ✅ TypeScript: 0 errors

[2/4] Deploying worker...
  ✅ Published rusl-myx-is (2.3s)
     https://rusl.myx.is
     Version: f4e7b2a1

[3/4] Verifying deployment...
  ✅ Worker: 200 OK

[4/4] Monitoring logs (60 seconds)...
  📊 2026-01-19 14:30:25 POST /api/identify 200 (1.2s)
  📊 2026-01-19 14:30:27 GET /api/stats 200 (45ms)
  ✅ No errors detected

═══════════════════════════════════════════════
   DEPLOYMENT COMPLETE ✅
═══════════════════════════════════════════════

Worker deployed successfully.
No errors in first 60 seconds of production logs.

Next steps:
1. Test classification in production
2. Monitor logs: cd worker && npx wrangler tail
```

## Rollback (if needed)

```bash
# Rollback to previous version
cd worker && npx wrangler rollback [previous-version-id]
```

## Notes

- Single worker deployment (no multi-worker setup)
- Deploy after significant changes
- Monitor logs for classification errors
