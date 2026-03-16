# myx.is Shared Auth + BYOK Plan

**Goal:** Build a central `auth.myx.is` service that provides shared login across `*.myx.is` apps and supports encrypted per-user BYOK storage for AI/API keys.

**Primary Consumers:** `rusl.myx.is`, `bok.myx.is`, and future `myx.is` apps.

**Core Decision:** Identity, session, and user-managed keys live in one central service. Individual apps trust `auth.myx.is` for session validation and only keep app-local authorization rules and app data.

---

## Scope

**In scope**
- Shared user accounts across `*.myx.is`
- One session cookie scoped to `.myx.is`
- Central login, logout, refresh, and session inspection
- Per-app authorization mapping
- Encrypted BYOK storage per user
- Minimal integration path for `rusl.myx.is` first

**Out of scope**
- Full billing/subscription system
- Enterprise SSO/SAML
- Cross-device offline auth
- Fine-grained secrets delegation to third parties

---

## Architecture

### Services

**`auth.myx.is`**
- Source of truth for users, identities, sessions, refresh tokens, API keys, and app grants
- Issues signed session tokens and rotates refresh tokens
- Exposes internal verification endpoints for trusted `myx.is` apps

**Consumer apps**
- Read current session from `auth.myx.is`
- Store only app-specific user data
- Never store raw BYOK secrets locally

### Trust model

- Browser receives secure cookie scoped to `.myx.is`
- Cookie is `HttpOnly`, `Secure`, `SameSite=Lax`
- Consumer apps call `auth.myx.is/v1/session` to resolve the current user
- Internal service-to-service verification uses a shared secret or signed service token

---

## Auth Model

### Login flow

1. User opens `rusl.myx.is`
2. App checks `auth.myx.is/v1/session`
3. If no valid session, redirect to `auth.myx.is/login?return_to=...`
4. User signs in with email link, passwordless code, or selected provider
5. `auth.myx.is` sets shared cookie on `.myx.is`
6. User returns to originating app

### Session flow

- Short-lived session token in cookie
- Longer-lived refresh token managed only by `auth.myx.is`
- Silent refresh on session inspection when eligible
- Global logout clears shared cookie and revokes refresh chain

### App authorization

- Each app is identified by `app_slug` such as `rusl`, `bok`, `mytools`
- User-to-app access stored centrally
- Apps may still enforce additional local roles

---

## BYOK Model

### Supported use cases

- User supplies own Gemini/OpenAI/Anthropic key
- App requests temporary use of provider credentials for that user
- Consumer app never sees raw stored secrets unless explicitly required

### Storage rules

- Secrets encrypted at rest using a server-side master key
- Envelope encryption preferred
- Audit record on create, update, delete, and use
- Per-provider validation on save
- Optional nickname/label per key, e.g. `work Gemini`, `personal OpenAI`

### Access rules

- Only authenticated owner can manage their keys
- Apps request a scoped token or resolved provider credential from `auth.myx.is`
- Every use is logged with user, app, provider, timestamp, and result

---

## Data Model

### Core tables

**`users`**
- `id`
- `email`
- `display_name`
- `avatar_url`
- `status`
- `created_at`
- `updated_at`

**`user_identities`**
- `id`
- `user_id`
- `provider`
- `provider_user_id`
- `provider_email`
- `created_at`

**`sessions`**
- `id`
- `user_id`
- `session_token_hash`
- `refresh_token_hash`
- `expires_at`
- `last_seen_at`
- `created_ip`
- `created_user_agent`
- `revoked_at`

**`apps`**
- `id`
- `slug`
- `name`
- `base_url`
- `created_at`

**`user_app_access`**
- `id`
- `user_id`
- `app_id`
- `role`
- `status`
- `created_at`

**`user_api_keys`**
- `id`
- `user_id`
- `provider`
- `label`
- `secret_ciphertext`
- `secret_last4`
- `is_default`
- `validation_status`
- `last_validated_at`
- `created_at`
- `updated_at`

**`api_key_audit_log`**
- `id`
- `user_id`
- `app_id`
- `api_key_id`
- `action`
- `result`
- `created_at`

---

## API Surface

### Public browser endpoints

- `POST /v1/login/start`
- `POST /v1/login/verify`
- `POST /v1/logout`
- `GET /v1/session`
- `POST /v1/session/refresh`

### User BYOK endpoints

- `GET /v1/me/keys`
- `POST /v1/me/keys`
- `PATCH /v1/me/keys/:id`
- `DELETE /v1/me/keys/:id`
- `POST /v1/me/keys/:id/validate`

### Internal app endpoints

- `GET /v1/internal/session/resolve`
- `POST /v1/internal/provider-token`
- `POST /v1/internal/authorize-app`

---

## Security Requirements

- Shared cookie scoped to `.myx.is`, never readable by frontend JavaScript
- CSRF protection on state-changing browser endpoints
- Rate limiting on login and key validation endpoints
- Secrets encrypted with key rotation support
- No plaintext provider keys in app logs
- App-to-auth calls authenticated with internal secret or signed service JWT
- Audit log for session creation, logout, BYOK mutation, and BYOK use

---

## Rollout Plan

### Phase 1: Auth service foundation
- Create `auth.myx.is` Worker/service
- Add users, sessions, apps, and access tables
- Implement passwordless email-code login
- Implement shared cookie session inspection

### Phase 2: `rusl.myx.is` integration
- Add session bootstrap on app load
- Replace anonymous user flow with shared identity when present
- Keep anonymous fallback only behind explicit guest mode

### Phase 3: BYOK
- Add encrypted `user_api_keys`
- Build key management UI
- Validate Gemini/OpenAI/Anthropic keys on save
- Allow `rusl.myx.is` to prefer user key over platform key when available

### Phase 4: Cross-app adoption
- Integrate `bok.myx.is`
- Add app grants and per-app roles
- Add common profile page and account settings

---

## `rusl.myx.is` Integration Notes

- Current `userHash` model can remain as temporary guest identity
- Add server-side mapping from guest history to authenticated user on upgrade
- Scan history and stats should migrate to `user_id` once authenticated
- BYOK can directly solve the current Gemini quota bottleneck for opted-in users

---

## Open Decisions

1. Passwordless email code only, or add Google/Apple on day one
2. Whether consumer apps receive user profile via session endpoint or separate profile endpoint
3. Whether BYOK usage is proxied entirely through `auth.myx.is` or delegated to apps via short-lived scoped credentials
4. Whether guest-to-user migration is automatic or user-confirmed

---

## Recommended Next Tasks

1. Create `auth.myx.is` repo/service skeleton and Worker bindings
2. Write initial D1 schema for users, sessions, apps, user_app_access, and user_api_keys
3. Implement `GET /v1/session`, `POST /v1/login/start`, `POST /v1/login/verify`, and `POST /v1/logout`
4. Integrate `rusl.myx.is` session bootstrap and authenticated identity mapping
5. Add BYOK encryption, validation, and audit logging
