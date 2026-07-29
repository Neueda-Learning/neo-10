# Portfolio dashboard API contract

The current complete contract is documented in
[`../PORTFOLIO_ANALYTICS_IMPLEMENTATION.md`](../PORTFOLIO_ANALYTICS_IMPLEMENTATION.md).

The React client in `src/api.js` uses:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/files/scan` | Scan the fixed backend folder and import new/retry failed daily files. |
| `DELETE` | `/api/v1/data/reset` | Delete all rows from `raw_data`, `processed_files` and `demo_showcase`. |
| `GET` | `/api/v1/raw-data` | Read filtered, paged imported rows. |
| `GET` | `/api/v1/dashboard/analytics` | Read all filtered dashboard aggregations. |
| `GET` | `/api/v1/processed-files` | Read file-processing history. |

Both read endpoints accept the global filters:

```text
from=YYYY-MM-DD
to=YYYY-MM-DD
productCode=ALL|CREDIT_CARD_STANDARD|CREDIT_CARD_REWARDS|CREDIT_CARD_STUDENT
channel=ALL|WEB|MOBILE_APP|BRANCH|AGGREGATOR
```

`GET /api/v1/raw-data` additionally accepts `page` and `size`.

There is no browser file-upload endpoint in the current contract. Source files are named
`neo_daily_YYYY-MM-DD.csv` and are read from the configured backend folder.

Docker builds with `VITE_DATA_MODE=api`. Optional frontend-only development can use
`VITE_DATA_MODE=mock`; the mock implements the same five client methods and final data shape.
