# Rental operations and team access — 2026-10-02

## Roles
- Owner: all administration and team account management. The existing configured administrator retains Owner access.
- Manager: read and manage business records, products, fleet, unit photos and public rental terms; cannot manage accounts.
- Staff: read business records and create customer requests with request-photo attachments; cannot edit existing records, manage products/fleet or accounts.
- Viewer: read-only administration.

Every protected route enforces permissions on the server. Staff account state/version is checked on every request; role changes, disabling and password resets invalidate existing sessions. Public customer enquiries remain accessible without a staff login. Existing shared Owner credentials must not be distributed to staff; the Owner creates individual accounts under Rentals & Team Access.

## Rental tools
Three-step equipment/date/location enquiry guide; comparison of up to three models using Rehlko source ratings; dedicated rental enquiry list and status controls; actual fleet unit management with publication toggle, unit photos and availability status; editable public delivery/setup/fuel/collection terms. No actual fleet inventory or unconfirmed policy is seeded. Existing rental enquiries remain visible using the legacy message prefix. Actual unit dimensions/connections need verified team entries.

## Verification
Passed: role and inherited-property checks; direct HTTP read/write permissions for all four roles; case-insensitive route protection; account creation privilege checks; disabled/downgraded/reset session rejection; self-change guard; invalid rental dates; unpublished fleet/photo exclusion; published photo MIME and nosniff; request field whitelisting; Staff request creation and Viewer rejection; JavaScript/inline-script parsing and git diff checks.
Browser checks against local fixtures: three-model comparison, guide to enquiry including structured data and reference, Staff restrictions, Viewer hidden write controls. Local fixtures use no production DB and send no email.

New MongoDB collections: staff_accounts, rental_units, rental_policy. Startup initializes indexes before accepting traffic. Existing env ADMIN_USER, ADMIN_PASSWORD_HASH and JWT_SECRET are retained. No production accounts created or passwords changed by implementation tests.

Deployment verification still required: authenticated Owner screen, new collection persistence and real fleet updates after deployment. Public preview fallback is not evidence of live MongoDB persistence.
