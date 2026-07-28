# Card portfolio dashboard front-end design

One page provides the full workflow:

1. Select one or more local CSV files.
2. Upload and process them into `raw_data`.
3. Choose start date, end date and card type.
4. Read filtered data and analytics.
5. Show the raw records and the corresponding charts together.

## Page regions

- **Import CSV files**: local multi-file selector, upload button, file list and import result.
- **Reporting filters**: start date, end date, card type. There is deliberately no status filter.
- **Metrics**: matching records, completed count, rejected count and in-progress count.
- **Status breakdown**: donut chart comparing Completed, Rejected and In progress.
- **Card type breakdown**: donut chart comparing Premium Card and Platinum Card.
- **Quarterly outcome trend**: Q1 to Q4 stacked columns; completed is green, rejected is red and in progress is blue.
- **Imported raw data**: table of generated ID, status, card type and applied date.

All data regions below the filters use exactly the same `from`, `to` and
`cardType` query values. The status chart therefore remains a useful comparison
instead of becoming a single-slice chart through a status filter.

## Demo and API modes

`src/dashboard/rawDataMock.js` is an in-memory demo gateway. It supports local
CSV selection and enables visual testing without a backend. No browser demo data
is persistent. Set `VITE_DATA_MODE=api` to switch the same UI to the backend API
contract documented in `API_CONTRACT.md`.
