---
paths:
  - "backend/src/dweb/dj_*/api/**"
  - "backend/src/smarti/**"
  - ".env*"
  - "apps/**"
---

# Security Rules

## Secrets Management

- NEVER commit secrets, API keys, or credentials to git
- Use `.env.local` for local development (already in .gitignore)
- Use `VITE_` prefix ONLY for values safe to expose in browser (Vite convention)
- Document all required env vars in `.env.local.example` with dummy values
- Niemals Secrets als `VITE_`-Variable — diese landen im Browser-Bundle

## Input Validation

- Django-Ninja Schema (Pydantic) validiert Input automatisch
- Zusätzliche Business-Validierung via `@handle_api_result` + Result-Pattern (rules/backend.md §Result-Pattern & Error-Contract)
- Sanitize data before database insertion

## Authentication

- Always verify authentication before processing API requests
- Implement rate limiting on authentication endpoints

## Security Headers

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security with includeSubDomains
- In Vercel via `vercel.json` konfiguriert

## Code Review Triggers

- Any changes to authentication flow require explicit user approval
- Any new environment variables must be documented in .env.local.example
