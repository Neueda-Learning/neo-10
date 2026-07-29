# Portfolio dashboard front-end design

The full screen, chart and calculation specification is in
[`../PORTFOLIO_ANALYTICS_IMPLEMENTATION.md`](../PORTFOLIO_ANALYTICS_IMPLEMENTATION.md).

Current navigation:

```text
Analytics: Overview · Journey funnel · Product & channel · Credit & risk
Data:      Raw data · Scan history
Actions:   Scan folder · Reset data
```

Global filters on analytics and Raw data:

```text
From · To · Product · Channel
```

Screen summary:

- **Overview**: six presentation KPIs, monthly grouped four-outcome bars, status donut and
  reason ranking.
- **Journey funnel**: eight step rows with separate Completed, Rejected, Referred and
  In-progress bars; stopped-step ranking; reason ranking; exception table.
- **Product & channel**: outcome mix by product/channel, requested-versus-granted limits and
  product summary.
- **Credit & risk**: credit/DTI/income cohorts, controls, age and employment outcome monitoring.
- **Raw data**: filtered source rows with expandable full details and provenance.
- **Scan history**: checksum, file result, row counts, error details and action summaries.

The implementation keeps the existing design-system and places all product-specific layout
and chart styling in `src/styles.css`.
