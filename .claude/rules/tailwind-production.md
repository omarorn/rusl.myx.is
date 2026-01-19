# Tailwind CSS Production Requirements

Best practices for Tailwind CSS in this Cloudflare Workers project.

## Build Process

For PWA frontend:
```bash
npm run build
```

This compiles Tailwind CSS as part of the Vite build process.

## Development vs Production

| Development | Production |
|-------------|-----------|
| Vite dev server handles CSS | Pre-compiled, minified CSS |
| Fast HMR updates | Optimized for performance |
| Full Tailwind classes | Purged unused classes |

## PWA Configuration

The PWA uses Vite with Tailwind CSS plugin. Configuration in:
- `tailwind.config.js` - Tailwind settings
- `postcss.config.js` - PostCSS with Tailwind
- `vite.config.ts` - Vite build configuration

## Worker (Backend)

The worker serves API endpoints only. Static assets (CSS, JS) are served via:
1. Cloudflare Pages (if using Pages)
2. Assets binding from `public/` directory
3. R2 bucket for uploaded files

## Commands

```bash
# Development (PWA)
npm run dev

# Production build (PWA)
npm run build

# Preview production build
npm run preview
```

## Notes

- PWA uses React + Vite + Tailwind
- Worker is API-only (Hono framework)
- Keep CSS in the PWA, not the worker
