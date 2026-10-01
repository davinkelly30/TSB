# Customer updates validation — 2026-10-01

Implemented: simpler rental enquiry, optional technical details, JPEG/PNG attachments on parts/general/rental requests, request references, Reviewing/Scheduled admin statuses, protected photo downloads, actual equipment/workshop gallery, and sourced generator catalog/import.

Passed locally:
- JavaScript parsing including inline scripts in admin, parts, rental, RFQ, services and catalog.
- Photo input rejection for invalid type/base64, excess count and oversized data; genuine JPEG accepted.
- Reference format and uniqueness across 1,000 generated samples.
- 216 unique generator records and exact source name/URL fingerprint; 215 public after excluding one disputed listing.
- Seed operation uses only $setOnInsert, preserving existing database records.
- Mobile 390px rental, catalog and services show no document horizontal overflow.
- Rental submission with actual equipment photo: image resized to 318,632 bytes, validated locally, unique reference displayed.
- Generator KD100 added to quote cart and submitted locally as Generator Sales with its name included; reference displayed.
- Mobile menu opened; test cart emptied afterward.

Preview: http://127.0.0.1:3003/catalog.html#offeredGenerators
Preview receiver writes a local test file only; no MongoDB connection or email.

Not yet verified: production deployment, actual MongoDB import/persistence, authenticated admin photo retrieval and status updates against the live database. No live business records or customer emails created by these tests.
