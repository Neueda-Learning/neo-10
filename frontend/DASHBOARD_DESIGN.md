# Card portfolio dashboard front-end design

The application uses a left sidebar to separate analysis from data operations:

```text
Analytics: Overview · Quarterly trend · Card analysis
Data: Raw data · Processed files
```

The sidebar upload action opens Processed files, where the local multi-file CSV
selector and the processing history are displayed together.

## Screens and charts

- **Overview**: four outcome metrics and the three-status donut chart.
- **Quarterly trend**: Q1–Q4 stacked columns for Completed, Rejected and In progress.
- **Card analysis**: card-type donut plus a 100% stacked outcome mix for Premium and Platinum Card.
- **Raw data**: the filtered `raw_data` records table.
- **Processed files**: CSV import action and `processed_files` history table.

## Global reporting filters

The following workflow applies on Overview, Quarterly trend, Card analysis and
Raw data:

1. Choose start date, end date and card type.
2. Read filtered data and analytics.
3. Use the appropriate sidebar screen to view the chart or raw records.

There is deliberately no status filter. All analytics screens use exactly the
same `from`, `to` and `cardType` query values, so the three-status chart remains
a meaningful comparison.

## Demo and API modes

`src/dashboard/rawDataMock.js` is an in-memory demo gateway. It supports local
CSV selection and enables visual testing without a backend. No browser demo data
is persistent. Set `VITE_DATA_MODE=api` to switch the same UI to the backend API
contract documented in `API_CONTRACT.md`.
