import type { Context } from 'hono';
import type { Env } from '../types';

function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }
  return authorizationHeader.slice('Bearer '.length).trim() || null;
}

export function requireAdmin(
  c: Context<{ Bindings: Env }>,
  passwordFromBody?: string
): Response | null {
  const configuredPassword = c.env.ADMIN_PASSWORD?.trim();
  if (!configuredPassword) {
    return c.json({ error: 'Admin aðgangur ekki uppsettur' }, 503);
  }

  const tokenFromHeader = extractBearerToken(c.req.header('Authorization'));
  const candidate = passwordFromBody ?? tokenFromHeader;

  if (candidate !== configuredPassword) {
    return c.json({ error: 'Rangt lykilorð' }, 403);
  }

  return null;
}
