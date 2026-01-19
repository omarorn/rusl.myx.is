# Cloudflare Workers Assets Binding

How static assets are served in this Cloudflare Workers project.

## Assets Configuration

In `wrangler.json`:
```json
"assets": {
  "directory": "./public",
  "binding": "ASSETS"
}
```

This automatically uploads files from `public/` and serves them at root paths.

## Serving Pattern

| File Path | Served At | Example |
|-----------|-----------|---------|
| `public/manifest.json` | `/manifest.json` | PWA manifest |
| `public/icons/*.png` | `/icons/*.png` | App icons |
| `public/*.js` | `/*.js` | Static scripts |

## Fallback Chain

For critical assets, implement this pattern:

```typescript
if (path === '/some-asset.css') {
  // 1. Try Assets binding first (automatic from public/)
  if (env.ASSETS) {
    try {
      const assetResponse = await env.ASSETS.fetch(new Request(request.url));
      if (assetResponse.ok) {
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          headers: {
            'Content-Type': 'text/css',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (e) {
      console.error('Assets fetch failed:', e);
    }
  }

  // 2. Fallback to R2 bucket
  const cssFile = await env.IMAGES.get('assets/some-asset.css');
  if (cssFile) {
    return new Response(cssFile.body, {
      headers: {
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }

  // 3. Return 404 (NOT redirect to avoid loops)
  console.error('Asset not found in Assets or R2!');
  return new Response('/* File not found */', {
    status: 404,
    headers: { 'Content-Type': 'text/css' },
  });
}
```

## Critical: Avoid Infinite Redirects

| Don't do this | Do this instead |
|---------------|----------------|
| `return Response.redirect('/asset.css', 302)` | `return new Response('...', { status: 404 })` |
| Redirect to same path as route | Return error with helpful message |

**Why**: Redirecting to the same path that triggered the route creates an infinite loop.

## Deployment

Assets are automatically uploaded when running:
```bash
cd worker && npx wrangler deploy
```
