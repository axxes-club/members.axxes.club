# Gangstarz Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax.

**Goal:** Connect Gangstarz tickets and merch to AXXES inventory, orders and Tollbooth checkout.

**Architecture:** Extend Members with tenant-scoped commerce services and public/admin routes. The Gangstarz frontend consumes the safe catalog and starts checkout through its own server routes. Reuse canonical records and add reservation/payment bookkeeping only.

**Tech Stack:** Existing Next.js, TypeScript, PostgreSQL/pg, Tollbooth API, PGlite/Node tests, GCP Cloud Run.

**Spec:** ../specs/2026-10-01-gangstarz-commerce.md

## Global Constraints

- Fixed Gangstarz tenant slug; public hostname gangstarz.axxes.club.
- No browser-supplied pricing, private catalog leakage, unverified payment fulfillment or unconfigured live sales.
- Keep original external tickets operating until their migration is configured.
- Preserve other active worktrees; reconcile current production source before any deployment.

## Review Focus

- Payment arrives before checkout attachment: verify reference and gateway lookup before fulfillment.
- Checkout transport timeout: keep reservations and retry the same gateway idempotency key.
- Duplicate/out-of-order refunds: never reissue tickets or return physical stock automatically.
- Multi-item cart failure: release no partial reservation and write no partial order.
- Admin operations: check active tenant/user membership and resource ownership on every mutation.

### Task 1: Canonical catalog, reservations and order creation

**Files:** db/gangstarz-commerce.sql; src/lib/commerce/{types,catalog,orders}.ts; tests/commerce/orders.test.ts.

**Interface:** createOrder(slug,input,key) reserves server-priced ticket/product lines and records one canonical order. catalog(slug) exposes safe published data. Retry returns the same order; a changed payload returns409.

- [ ] Write tests for cross-tenant IDs, sold-out variants, hidden/draft events, price tampering, duplicate checkout, changed retry payload and all-or-nothing carts; run and observe failure.
- [ ] Implement the additive bookkeeping migration and services; run database-backed tests and type checks.
- [ ] Commit and ledger evidence.

### Task 2: Tollbooth gateway and verified lifecycle

**Files:** src/lib/commerce/{gateway,payments,security}.ts; tests/commerce/payments.test.ts.

**Interface:** startCheckout attaches immutable gateway identity; payment notification checks signature and authoritative gateway state; reconciliation releases only terminal gateway reservations. Paid ticket lines create canonical attendees; full refunds revoke tickets.

- [ ] Test signature tampering/replay, wrong tenant/mode/amount, payment-before-attachment, duplicates, timeout retry, failed/expired release and refund validity; observe failures.
- [ ] Implement server-only gateway and transactional lifecycle; run complete commerce suite.
- [ ] Commit and ledger evidence.

### Task 3: Public storefront and operator controls

**Files:** Members src/app/api/v1/public/tenants/[slug]/commerce/** and src/app/api/v1/website/gangstarz/commerce/**; Gangstarz frontend commerce client/pages/server proxy.

- [ ] Test anonymous receipt denial, foreign workspace mutations and disabled unconfigured sales; observe failures.
- [ ] Add catalog, cart/checkout, buyer receipt/tickets, workspace order/refund/scan controls. Preserve CMS edits and original external sales.
- [ ] Run frontend/backend tests and builds; commit evidence.

### Task 4: GCP integration and end-to-end verification

**Files:** deployment/verification scripts and operator guide.

- [ ] Reconcile concurrently completed CMS/frontend code, verify migrations against actual production schema, deploy immutable Linux builds and ready revisions.
- [ ] Seed only verified Gangstarz content, bind the dedicated service to the existing DNS/TLS route, and test publication roundtrip plus test-mode order/payment/ticket/refund/stock cleanup.
- [ ] Perform a fresh whole-branch review and fix significant findings with regression tests. Report exact live merchant blockers.
