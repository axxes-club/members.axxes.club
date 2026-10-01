# Gangstarz commerce through AXXES

Gangstarz must remain at gangstarz.axxes.club. Its website, tickets, merch, checkout, orders, attendees and fulfillment are managed through AXXES. The original Gangstarz foundation spec remains the authority for branding, CMS publication and preserving existing ticket sales.

Use Members' existing events, ticket_types, attendees, products, product_variants, orders and order_items as canonical records. Add only payment/reservation bookkeeping. Prices and stock are read on the server; browser amounts are never authoritative. Reserve inventory transactionally before calling Tollbooth. Repeated checkout requests use a stable idempotency key and cannot reserve or charge twice. Checkout expiry is governed by the gateway, not an earlier arbitrary stock timeout.

Tollbooth handles payment processing and merchant payouts. Validate signed notifications against the configured tenant, mode, payment ID, reference, amount and currency. Persist processed notifications in the same transaction as fulfillment. Only confirmed payment creates attendee tickets. Failed/expired gateway payments release reservations; duplicate/out-of-order notifications cannot issue extra tickets or return stock twice. Refunds cancel ticket validity and update the canonical order; physical stock returns only after a recorded return.

Public catalog includes published, non-private future events and visible ticket tiers plus active, published merch. Orders and ticket codes require a buyer capability or an authorized workspace member. Ticket scan, refund and fulfillment require explicit tenant membership and role checks. Never accept a caller-supplied tenant as authorization.

Keep original external tickets operating until their sales migration is explicitly configured. Do not invent capacities, prices, stock, shipping promises or connected accounts. New native live sales require confirmed merchant configuration; test mode must be visibly separate and cannot use live payment keys. Merchant credentials remain server-side.

Acceptance: dedicated Gangstarz HTTPS page on GCP; editable published content; native ticket and merch catalog/cart; confirmed order/receipt; signed payment confirmation; idempotency, inventory race, cross-tenant, refund and scan tests; Linux build and public DNS/TLS verification. Report unconfigured merchant inventory and live payouts as incomplete rather than claiming live sales.
