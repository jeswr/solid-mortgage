# Tour multi-zone shell

The tour app is the public shell for all eight Next.js zones. It serves its own root route and
uses plain Next.js rewrites for every sibling path prefix. Set each value to the sibling
deployment origin, with a URL scheme and no trailing slash.

| Environment variable | Routed prefix |
| --- | --- |
| `MORTGAGE_WALLET_ZONE_URL` | `/wallet` |
| `MORTGAGE_VERIFICATIONS_ZONE_URL` | `/verifications` |
| `MORTGAGE_PRIMARY_LENDER_ZONE_URL` | `/lender-boa` |
| `MORTGAGE_COMPARISON_LENDER_ZONE_URL` | `/lender-53` |
| `MORTGAGE_UNDERWRITING_ZONE_URL` | `/gse` |
| `MORTGAGE_PROPERTY_ZONE_URL` | `/property` |
| `MORTGAGE_CLOSING_ZONE_URL` | `/closing` |

Non-routable `.invalid` origins let the shell build before deployment configuration exists;
all seven variables are required for a working deployed shell. Local tooling should allocate
ports dynamically and pass the resulting origins through these variables.
