# Security policy

This repository powers the **Le Sourire de Jojo** website (Astro + Node).  
For **French-language** operational details (headers, CSP, rate limiting, deployment), see **[docs/SECURITE.md](docs/SECURITE.md)**.

## Supported versions

Security fixes are applied on the **current main branch** of this project as maintained by the owner.

## Reporting a vulnerability

Please report security issues **privately** (do not open a public issue with exploit details).

1. Contact the **repository owner / site operator** by email (use the address published on the production site’s legal/contact page when available).
2. Include: affected URL or endpoint, steps to reproduce, impact assessment if known.

You should receive an acknowledgment within a **few business days**. Critical issues will be prioritized.

## Scope

In scope:

- This application code (`src/`), API routes, middleware, configuration that ships with the repo.

Out of scope (unless explicitly agreed):

- Third-party hosting misconfiguration without a demonstrated flaw in our code.
- Denial-of-service via volumetric traffic only (use hosting/CDN protections).

## Safe harbor

If you follow responsible disclosure (good faith, no data destruction or abuse), we will not pursue legal action for research aligned with this policy.

---

*For GDPR-related notes on the contact form, see [docs/RGPD.md](docs/RGPD.md).*
