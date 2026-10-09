# Product discovery policy

Decided by the user on 2026-10-09. These instructions supersede earlier branding and catalog visibility guidance.

- Stock / Manifest must not be promoted in any All Apps menu, on AXXES.app, or in Handshake. Keep its stable `manifest` key, direct operational access and integrations.
- WebMaster is owner-only platform operations. Never advertise it in public catalogs or app launchers. Keep its protected operational functionality.
- The display label “AXXES Pay” is retired. Use neutral “Payments” where a label is needed; preserve stable product IDs, API contracts and routes. “AXXES Payments” remains the distinct central checkout service.
- Handshake / AXXES Account is identity and account management. Link account management separately instead of advertising it as an AXXES.app service.
- Filtering discovery is not decommissioning a service or changing authorization. Do not delete service, security or identity functionality to enforce these rules.

The members catalog filters private and unpromoted keys at read time, so existing database rows do not have to be migrated before the policy takes effect. Shared public catalog projection and each deployed app switcher apply defensive filtering as well. The catalog seed marks Manifest as hidden; no production migration is authorized by this document.
