# neo-10 Portfolio & Regulatory Analytics

## Final requirements and implementation record

Status: implemented and verified on 29 July 2026.

This document is the current source of truth for the CSV folder scanner, database model,
REST APIs and dashboard UI. It replaces the earlier three-column upload design based on
`status`, `card_type` and `applied_date`.

## Contents

1. Final business requirement
2. End-to-end flow
3. Idempotency rules
4. Fixed source folder and filenames
5. CSV contract
6. Database design
7. REST API
8. Dashboard UI
9. Main code changes
10. Supplied dataset verification
11. Verification completed
12. Run locally
13. Layer responsibilities and project summary

## 0. Project overview

`neo-10` is a portfolio and regulatory analytics module for daily credit-card application
journey data. It provides four connected capabilities:

1. Scan a fixed server-side folder for daily CSV files.
2. Validate and import new files without inserting the same successfully processed file twice.
3. Preserve row-level source data and file-level processing history in MySQL.
4. Present operational, product, journey and credit-risk analytics in a React dashboard.

The implementation is deliberately separated into layers:

```text
Daily CSV folder
      ↓
Spring Boot scanner and CSV validator
      ↓
MySQL raw_data + processed_files
      ↓
REST API aggregation layer
      ↓
React dashboard
```

### 0.1 Problems solved

Before this implementation, the module did not provide a controlled way to turn daily
application-journey files into repeatable portfolio reporting. The project solves the following
business and operational problems:

1. **Duplicate batch ingestion** — a daily file can be scanned repeatedly without inserting the
   same successfully processed file twice.
2. **Untraceable reporting data** — every analytical row retains its source filename and source
   date, while every file has a processing status, checksum, row counts and error message.
3. **Partial or misleading imports** — validation is file-atomic; one invalid row causes that
   file to insert zero analytical rows.
4. **Fragmented portfolio reporting** — volume, outcome, product, channel, journey, credit-risk
   and operational-control views all read the same filtered source of truth.
5. **Weak operational visibility** — failed files remain visible and retryable instead of being
   silently ignored.
6. **Poor presentation of technical values** — database enumerations are translated into
   business labels in presentation views, while exact source codes remain available for audit.
7. **No reproducible reset/demo cycle** — Reset clears business data, and Scan rebuilds it from
   the fixed source folder for repeatable demonstrations.

### 0.2 Banking analytics capability stack

In this document, the primary “technology stack” means the banking and analytical capabilities
used to solve the problem, rather than only programming frameworks.

| Banking capability | Data used | What it provides |
|---|---|---|
| Credit-card application portfolio analytics | Application ID, submission time, product, channel and status | Measures application volume and business outcomes across the selected portfolio window. |
| Application journey analytics | `steps_reached`, stopped stage and outcome | Shows how far applications progressed and where operational or decision friction occurs. |
| Credit decision analytics | Requested/granted limit, APR, credit band and decision reason | Compares decision outcomes, credit limits and the leading causes of rejection or referral. |
| Affordability monitoring | Annual income, requested limit and debt-to-income ratio | Observes whether outcomes differ as customer repayment headroom changes. |
| KYC / identity control monitoring | KYC outcome and identity-related reason codes | Monitors verification, review and failed identity outcomes. |
| Fraud and AML screening monitoring | Screening outcome, screening stage and screening reason codes | Shows clear, review and hit volumes and identifies screening-related journey stops. |
| Agreement and fulfilment monitoring | Agreement outcome, agreement/account/card stages | Tracks signature completion and downstream account/card fulfilment exceptions. |
| Product and acquisition-channel analytics | Product code and channel | Compares volume, completion mix, APR and granted/requested limits by product and source channel. |
| Regulatory and fairness monitoring | Age band, employment cohort, residence and outcome | Supports cohort-level monitoring without presenting protected or socioeconomic attributes as standalone automated decision rules. |
| Operational risk and exception analytics | Referral/rejection reason, stopped stage and failed controls | Ranks the exceptions that create manual review, rejection or process interruption. |
| Data lineage and auditability | Source filename, source date, checksum, row counts and timestamps | Traces every dashboard record back to a file and every file to its processing result. |
| Idempotent batch processing | Unique filename registry and transactional import | Makes repeated daily scans safe and prevents duplicate successful batch ingestion. |

### 0.3 Supporting implementation platform

The business capabilities above are implemented with the following supporting components:

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 18, Vite, existing neo design system, Nginx | Navigation, filters, charts, tables, Scan and Reset actions. |
| Backend | Java 21, Spring Boot 3, Spring MVC, Spring Data JPA | File scanning, validation, idempotency, persistence, filtering and aggregation. |
| CSV parsing | Apache Commons CSV | Header-safe and row-safe CSV parsing. |
| Database | MySQL 8.4 | Raw application rows, file history and the original module demo records. |
| Migrations | Liquibase | Creates and upgrades the database schema reproducibly. |
| Runtime | Docker Compose | Runs MySQL, backend and frontend locally. |

## 1. Final business requirement

The module reads daily credit-card application journey files from a fixed backend folder.
Users do not upload local files in the browser.

The left sidebar contains:

```text
Analytics
  Overview
  Journey funnel
  Product & channel
  Credit & risk

Data
  Raw data
  Scan history

Actions
  Scan folder
  Reset data
```

All analytics and Raw data screens use the same four filters:

- From date
- To date
- Product
- Channel

The date range is inclusive and is applied to `submitted_at` in UTC.

## 2. End-to-end flow

```text
User clicks Scan folder
        ↓
Backend lists neo_daily_YYYY-MM-DD.csv files in the configured folder
        ↓
For each filename, check processed_files
        ↓
PROCESSED filename ───────────────→ SKIPPED; no raw rows are inserted
        ↓ new or previously FAILED
Validate filename, header and every CSV row
        ↓ valid
Insert the whole file into raw_data in one transaction
        ↓
Record filename, checksum, row counts and PROCESSED in processed_files
        ↓
Dashboard queries filtered and aggregated data from raw_data
```

If any row in a file is invalid, that file inserts zero raw rows and is recorded as
`FAILED`. A later scan retries failed files. This gives file-level atomicity: a file is
never half imported.

## 3. Idempotency rules

- The unique idempotency key is the CSV filename.
- A filename already marked `PROCESSED` is always skipped.
- Repeated `application_id` values are valid and are retained, including repetitions in
  the same file or in different files.
- `raw_data.application_id` is indexed but is not unique.
- A `FAILED` filename may be corrected and retried.
- Reset deletes database records only. It does not delete source CSV files, so the next
  scan imports the folder again.
- The SHA-256 checksum is an audit fingerprint. It proves which file content was processed;
  it is not the idempotency key and does not override the filename rule.

## 4. Fixed source folder and filenames

The user-facing source folder is fixed. Relative to the `neo-10` repository root it is:

```text
backend/src/main/resources/customer_data
```

The Java standard directory name is `resources` (plural), not `resource`.

The scanner configuration is always the following relative path:

```text
src/main/resources/customer_data
```

It is resolved relative to the backend working directory. Absolute scan paths are rejected at
backend startup so local developer paths cannot leak into AWS configuration.

Docker Compose bind-mounts the fixed host folder read-only to the location produced by resolving
that same relative path from container working directory `/app`:

```text
./backend/src/main/resources/customer_data:/app/src/main/resources/customer_data:ro
```

The backend process therefore resolves the same logical source folder as:

```text
Local backend working directory: src/main/resources/customer_data
Docker backend container:       /app/src/main/resources/customer_data
AWS backend container:          /app/src/main/resources/customer_data
```

`POST /api/v1/files/scan` accepts no path parameter and no request body. The browser cannot
select or change the folder. Adding a CSV to the fixed host directory makes it available to the
next Scan immediately; Docker does not need to be rebuilt because the directory is bind-mounted.

For AWS Dev, the container image contains this directory. If files must arrive after deployment,
S3 download, EFS or another deployment mechanism must place them at the resolved container
location `/app/src/main/resources/customer_data`; the API path itself still remains relative and
unchanged.

Accepted filename pattern:

```text
neo_daily_YYYY-MM-DD.csv
```

Example:

```text
neo_daily_2026-01-01.csv
```

Files such as the old `customer_data_2026_01.csv` do not match the pattern and are ignored
by the scanner.

## 5. CSV contract

The header must contain all 22 columns:

```csv
application_id,submitted_at,channel,product_code,requested_limit,status,steps_reached,stopped_at_step,decline_reason_code,decided_at,granted_limit,last_updated_at,age_band,residence_country,employment_status,annual_income,dti_ratio,credit_band,apr,screening_outcome,kyc_outcome,agreement_outcome
```

| CSV column | Required | Accepted form and purpose |
|---|---:|---|
| `application_id` | Yes | Application reference. Duplicates are allowed. |
| `submitted_at` | Yes | ISO-8601 UTC instant, for example `2026-01-01T11:24:55Z`. |
| `channel` | Yes | `WEB`, `MOBILE_APP`, `BRANCH` or `AGGREGATOR`. |
| `product_code` | Yes | One of the three supported credit-card product codes. |
| `requested_limit` | Yes | Decimal requested credit limit. |
| `status` | Yes | Business/application state described below. |
| `steps_reached` | Yes | Integer from 0 to 8. |
| `stopped_at_step` | No | Journey step at which processing stopped. |
| `decline_reason_code` | No | Rejection/referral/technical reason code. |
| `decided_at` | No | ISO-8601 UTC decision instant. |
| `granted_limit` | No | Decimal granted limit, normally present for completed applications. |
| `last_updated_at` | Yes | ISO-8601 UTC last-update instant. |
| `age_band` | Yes | Customer age cohort. |
| `residence_country` | Yes | Residence country code. |
| `employment_status` | Yes | Employment cohort. |
| `annual_income` | Yes | Decimal annual income. |
| `dti_ratio` | Yes | Decimal debt-to-income ratio. |
| `credit_band` | Yes | Credit band, normally `A` to `E`. |
| `apr` | Yes | Decimal annual percentage rate. |
| `screening_outcome` | No | Screening control result. |
| `kyc_outcome` | No | KYC control result. |
| `agreement_outcome` | No | Agreement/signature result. |

Supported products:

```text
CREDIT_CARD_STANDARD
CREDIT_CARD_REWARDS
CREDIT_CARD_STUDENT
```

Supported application statuses:

```text
COMPLETED
REJECTED
REFERRED
IN_PROGRESS
FAILED
```

`FAILED` is retained in the data/API for technical journey failures. The presentation
charts compare the four primary business outcomes: Completed, Rejected, Referred and
In progress.

The eight journey steps are:

```text
verification → policy → kyc → screening → credit → agreement → account → card
```

## 6. Database design

Liquibase change set:

```text
backend/src/main/resources/db/changelog/changes/005-rebuild-portfolio-analytics-tables.yaml
```

The change set rebuilds the obsolete four-column `raw_data` table, renames `processed` to
`processed_files`, and adds the audit fields. Existing legacy import data is deliberately
cleared because it does not conform to the new daily journey schema.

### 6.1 `raw_data`

Purpose: stores every row from each successfully validated daily file. Every dashboard
metric, chart, filter and raw-data view reads from this table.

| Column | SQL type | Nullable | Purpose |
|---|---|---:|---|
| `id` | `BIGINT` auto increment | No | Database primary key. |
| `application_id` | `VARCHAR(64)` | No | Source application reference; not unique. |
| `submitted_at` | `TIMESTAMP` | No | Submission instant and reporting date. |
| `channel` | `VARCHAR(32)` | No | Acquisition channel. |
| `product_code` | `VARCHAR(64)` | No | Credit-card product. |
| `requested_limit` | `DECIMAL(12,2)` | No | Requested credit limit. |
| `status` | `VARCHAR(32)` | No | Application/journey status. |
| `steps_reached` | `INTEGER` | No | Number of completed journey stages. |
| `stopped_at_step` | `VARCHAR(32)` | Yes | Stage at which the application stopped. |
| `decline_reason_code` | `VARCHAR(80)` | Yes | Decision or exception reason. |
| `decided_at` | `TIMESTAMP` | Yes | Decision instant. |
| `granted_limit` | `DECIMAL(12,2)` | Yes | Granted credit limit. |
| `last_updated_at` | `TIMESTAMP` | No | Source row last-update instant. |
| `age_band` | `VARCHAR(16)` | No | Age monitoring cohort. |
| `residence_country` | `VARCHAR(8)` | No | Residence country. |
| `employment_status` | `VARCHAR(32)` | No | Employment monitoring cohort. |
| `annual_income` | `DECIMAL(12,2)` | No | Annual income. |
| `dti_ratio` | `DECIMAL(6,4)` | No | Debt-to-income ratio. |
| `credit_band` | `VARCHAR(8)` | No | Credit-risk band. |
| `apr` | `DECIMAL(5,2)` | No | Product APR. |
| `screening_outcome` | `VARCHAR(32)` | Yes | Screening result. |
| `kyc_outcome` | `VARCHAR(32)` | Yes | KYC result. |
| `agreement_outcome` | `VARCHAR(32)` | Yes | Agreement result. |
| `source_filename` | `VARCHAR(150)` | No | CSV provenance. |
| `source_file_date` | `DATE` | No | Date parsed from the filename. |
| `imported_at` | `TIMESTAMP` | No | Database import time. |

Indexes:

- `idx_raw_data_submitted`
- `idx_raw_data_product_channel`
- `idx_raw_data_status`
- `idx_raw_data_application`

### 6.2 `processed_files`

Purpose: file-processing audit and filename-level idempotency.

| Column | SQL type | Nullable | Purpose |
|---|---|---:|---|
| `id` | `BIGINT` auto increment | No | Database primary key. |
| `filename` | `VARCHAR(150)` | No | Unique source filename/idempotency key. |
| `status` | `VARCHAR(32)` | No | `PROCESSED` or `FAILED`. |
| `checksum` | `VARCHAR(64)` | Yes | SHA-256 content fingerprint. |
| `rows_read` | `INTEGER` | No | Number of CSV rows read. |
| `rows_inserted` | `INTEGER` | No | Number of raw rows committed. |
| `error_message` | `VARCHAR(1000)` | Yes | File validation/import error. |
| `processed_at` | `TIMESTAMP` | No | Time of the latest attempt. |

There is a unique constraint on `filename`.

### 6.3 Existing `demo_showcase`

Purpose: stores the result of the original module/orchestrator demonstration endpoint. It is
independent from the CSV analytics flow and is not read by any Dashboard chart.

| Column | SQL type | Nullable | Purpose |
|---|---|---:|---|
| `id` | `BIGINT` auto increment | No | Database primary key. |
| `application_id` | `VARCHAR(64)` | No | Application ID from the orchestrator request envelope. |
| `status` | `VARCHAR(32)` | No | Demonstration application result. |
| `created_at` | `TIMESTAMP` | No | Time the demonstration record was created. |

Index:

- `idx_demo_showcase_application`

The table remains because the platform endpoint `POST /api/v1/applications` still uses it.
Although it is not a Dashboard source, `Reset data` clears it so that the user-requested reset
really removes all module business data.

### 6.4 Liquibase metadata tables

Liquibase also creates `DATABASECHANGELOG` and `DATABASECHANGELOGLOCK`. These are infrastructure
metadata, not business data:

- `DATABASECHANGELOG` records which schema migrations have run and their checksums.
- `DATABASECHANGELOGLOCK` prevents two application instances from changing the schema at once.
- Reset never deletes these tables. Removing them would damage migration history rather than
  reset Dashboard data.

### 6.5 Table relationships

There is intentionally no foreign key from `raw_data` to `processed_files`. The file audit is
linked by filename:

```text
processed_files.filename  ←→  raw_data.source_filename
```

This design supports two separate needs:

- `processed_files.filename` is unique and answers “has this file already been processed?”
- `raw_data.source_filename` can appear on many rows and answers “which file produced this row?”

`application_id` is not a relationship key because duplicate application IDs are explicitly
allowed across daily snapshots.

## 7. REST API

The portfolio dashboard uses five endpoints.

### 7.1 Scan fixed folder

```http
POST /api/v1/files/scan
```

No request body is required.

Response summary:

```json
{
  "status": "PARTIAL_SUCCESS",
  "filesFound": 208,
  "filesProcessed": 196,
  "filesSkipped": 0,
  "filesFailed": 12,
  "rowsInserted": 4291,
  "results": [
    {
      "filename": "neo_daily_2026-01-01.csv",
      "result": "PROCESSED",
      "rowsRead": 13,
      "rowsInserted": 13,
      "error": null
    }
  ]
}
```

Summary statuses:

- `SUCCESS`: one or more new files succeeded and none failed.
- `PARTIAL_SUCCESS`: at least one file succeeded and at least one failed.
- `FAILED`: no file succeeded and at least one failed/retried.
- `NO_NEW_FILES`: every matching file was already marked `PROCESSED`.

Per-file results are `PROCESSED`, `SKIPPED` or `FAILED`.

### 7.2 Reset imported data

```http
DELETE /api/v1/data/reset
```

This deletes all rows from `raw_data`, `processed_files` and `demo_showcase` in one transaction.
It does not delete Liquibase metadata or CSV files.

```json
{
  "status": "RESET_COMPLETE",
  "rawRowsDeleted": 4291,
  "processedFilesDeleted": 208,
  "demoRowsDeleted": 51
}
```

The UI requires confirmation before calling this destructive endpoint.

Browser behaviour after a successful reset:

1. The frontend immediately clears its local Dashboard and scan-history state.
2. In-flight older read requests are ignored so they cannot restore stale rows.
3. The frontend reloads analytics and history with `cache: no-store` to verify that the database
   is empty.
4. The UI returns to Overview and displays all metrics as zero plus a success message.
5. Data appears again only after the user clicks `Scan folder`.

The backend CORS configuration explicitly allows `DELETE`. This matters because browsers attach
an `Origin` header; without `DELETE` in `allowedMethods`, Spring returns `403 Invalid CORS
request` even though a command-line curl without an Origin header may succeed.

### 7.3 Read raw data

```http
GET /api/v1/raw-data?from=2026-01-01&to=2026-07-31&productCode=ALL&channel=ALL&page=0&size=50
```

Rules:

- `from` and `to` are optional inclusive ISO dates.
- `productCode` is `ALL` or a supported product.
- `channel` is `ALL` or a supported channel.
- `page` defaults to 0.
- `size` defaults to 50 and is capped at 200.
- `from` after `to` returns a validation error.

Response:

```json
{
  "total": 4291,
  "items": [
    {
      "id": 4288,
      "applicationId": "APP-2026-02434",
      "submittedAt": "2026-07-28T21:41:11Z",
      "channel": "WEB",
      "productCode": "CREDIT_CARD_REWARDS",
      "status": "REJECTED",
      "sourceFilename": "neo_daily_2026-07-28.csv"
    }
  ]
}
```

The actual item contains all imported fields plus the three provenance fields.

### 7.4 Read aggregated analytics

```http
GET /api/v1/dashboard/analytics?from=2026-01-01&to=2026-07-31&productCode=ALL&channel=ALL
```

The response supplies:

- total applications
- completed rate
- total requested/granted limit
- median decision minutes
- status breakdown
- monthly trend
- ranked decision reasons
- eight journey-step outcomes
- stopped applications by step
- product outcomes
- channel outcomes
- average requested/granted limits and APR by product
- credit-band outcomes
- DTI-band outcomes
- income-band completion rates
- screening, KYC and agreement outcomes
- age-band outcomes
- employment outcomes

All aggregations use the same filter set as Raw data.

### 7.5 Read scan history

```http
GET /api/v1/processed-files
```

Returns the newest file attempts first:

```json
{
  "total": 208,
  "items": [
    {
      "id": 208,
      "filename": "neo_daily_2026-07-28.csv",
      "checksum": "…",
      "status": "PROCESSED",
      "rowsRead": 21,
      "rowsInserted": 21,
      "errorMessage": null,
      "processedAt": "2026-07-29T06:07:12Z"
    }
  ]
}
```

### 7.6 Fixed orchestrator endpoint

The existing platform contract remains:

```http
POST /api/v1/applications
```

It is not used by the CSV dashboard and was not changed by this implementation.

### 7.7 API count and responsibility

The Dashboard uses five APIs:

| # | Method and path | Reads/writes | Used by |
|---:|---|---|---|
| 1 | `POST /api/v1/files/scan` | Reads CSV files; writes `raw_data` and `processed_files`. | Scan folder action. |
| 2 | `DELETE /api/v1/data/reset` | Deletes all rows from the three business-data tables. | Reset data action. |
| 3 | `GET /api/v1/raw-data` | Reads filtered rows from `raw_data`. | Raw data page. |
| 4 | `GET /api/v1/dashboard/analytics` | Reads and aggregates filtered `raw_data`. | Four analytics pages. |
| 5 | `GET /api/v1/processed-files` | Reads `processed_files`. | Scan history page. |

The pre-existing orchestrator endpoint is a sixth module endpoint, but it is outside the
Dashboard workflow.

### 7.8 Validation and error behaviour

- Invalid date ranges, filter values or paging values return a client error rather than silently
  changing the request.
- A malformed CSV file is recorded as `FAILED` with an error message.
- File import is transactional: an invalid row prevents all rows in that file from being
  committed.
- A failure record is written in a separate transaction so the audit remains available after
  the import transaction rolls back.
- Failed files can be corrected and retried; successfully processed filenames are skipped.
- The frontend shows API failures as visible alerts and does not pretend that an action succeeded.

## 8. Dashboard UI

The frontend retains the existing neo-10 glass design system. Only app-level components and
styles were changed.

### 8.1 Overview

Purpose: concise portfolio position for a presentation.

- Applications
- Completed
- Completion rate
- Total granted
- Average granted limit per completed application
- Median decision time
- Monthly outcome trend with four separate status bars per month on one shared scale
- Outcome distribution donut
- Leading decision reasons ranking, shown with plain-language business labels

| Component | Calculation / display | Business meaning |
|---|---|---|
| Applications | Count of matching imported application snapshots | Portfolio volume inside the current reporting window. |
| Completed | Count where status is Completed | Applications that reached a completed business outcome. |
| Completion rate | Completed divided by all matching records | High-level portfolio outcome indicator; it is not the same as a statutory approval rate. |
| Total granted | Sum of granted limits | Total credit limit granted by completed outcomes in scope. |
| Average granted | Total granted divided by completed count | Typical granted exposure per completed application. |
| Median decision time | Median elapsed minutes from submission to decision | Operational speed while reducing distortion from unusually slow cases. |
| Monthly outcome trend | Four side-by-side status bars per month on one scale | Shows whether volume and outcome composition change over time. |
| Outcome distribution | Donut split across Completed, Rejected, Referred and In progress | Shows the overall portfolio state mix. |
| Leading decision reasons | Ranked count of non-empty decision/exception reasons | Identifies the exceptions generating the most customer or operational impact. |

### 8.2 Journey funnel

Purpose: show where applications reach and stop without incorrectly treating the process as
a simple status filter.

- `Step outcome distribution`: eight step rows; each row contains separate Completed,
  Rejected, Referred and In progress bars on one common numerical scale.
- `Stopped applications by step`: ranked horizontal bars.
- `Top decline and referral reasons`: ranked bars with plain-language business labels.
- `Step exception summary`: reached, stopped and status counts with the leading reason shown
  as a plain-language label.

Decision-reason charts and summaries do not expose database codes such as
`CRE_AFFORDABILITY_EXCEEDED` as their primary labels. The frontend maps known codes to labels
such as `Affordability limit exceeded` and applies a readable fallback to future codes. The
original `decline_reason_code` remains unchanged in the `Raw data` page, where the column is
named `Reason code`, so audit and troubleshooting workflows retain the exact source value.

`steps_reached = 3` and `stopped_at_step = screening`, for example, means the application
completed three stages and entered/stopped at screening. The screen therefore counts it as
reaching the screening stage.

| Component | What is compared | How to interpret it |
|---|---|---|
| Step outcome distribution | Completed, Rejected, Referred and In progress counts at each reached stage | Shows which final/current outcomes are associated with applications that reached each stage. It is not a simple funnel conversion percentage. |
| Stopped applications by step | Count grouped by the stage where processing stopped | Highlights operational bottlenecks or decision stages that interrupt the most applications. |
| Top decline and referral reasons | Reason-code frequency displayed with plain-language labels | Explains why applications reject, refer or fail to progress. |
| Step exception summary | Exact reached/stopped/status counts plus the leading reason | Provides presentation charts and auditable numbers in the same view. |

### 8.3 Product & channel

- `Outcome by card product`: outcome mix for `Standard Card`, `Rewards Card` and
  `Student Card`.
- `Outcome by acquisition channel`: outcome mix for `Web`, `Mobile app`, `Branch` and
  `Aggregator`.
- Average requested versus granted limit by product
- Product performance summary table including application count, completion rate and APR

The frontend never uses database-style values such as `CREDIT_CARD_STANDARD` or `MOBILE_APP`
as primary presentation labels. It formats them as `Standard Card` and `Mobile app` in filters,
charts, summary tables and Raw data. API requests and database rows continue to use the original
enumeration values, so presentation formatting does not change filtering or persistence.

| Component | What is compared | Business use |
|---|---|---|
| Outcome by card product | Outcome composition and volume for each of the three card products | Identifies products with different completion, rejection, referral or work-in-progress patterns. |
| Outcome by acquisition channel | Outcome composition and volume for Web, Mobile app, Branch and Aggregator | Compares customer acquisition sources and highlights channel-specific friction. |
| Average requested versus granted limit | Mean requested and granted limit per product | Shows customer demand versus actual granted exposure. |
| Product performance summary | Applications, completion rate, average requested/granted limit and average APR | Gives exact product-level values for presentation and follow-up analysis. |

### 8.4 Credit & risk

Purpose: explain how affordability, credit profile and operational checks relate to application
outcomes. The page begins with a plain-language definition card:

- `Credit band`: groups applications from stronger credit profile (`A`) toward higher observed
  risk (`E`).
- `DTI ratio`: debt-to-income ratio. It describes how much income is already committed to debt;
  a higher ratio indicates less repayment headroom.
- `Income completion rate`: Completed applications divided by all applications in the same
  annual-income band. This is an observed portfolio rate, not an automatic approval rule.
- `Operational controls`: screening covers fraud/AML signals, KYC covers identity verification,
  and Agreement covers signature status.

Charts and table:

- `Application outcomes by credit band`: compares all four primary statuses inside A–E cohorts.
- `Application outcomes by DTI band`: compares outcomes as existing debt commitments rise.
- `Completion rate by annual-income band`: compares completed percentages across income cohorts.
- `Screening, identity and agreement checks`: exact control outcomes for fraud/AML screening,
  KYC and agreement signing.
- `Application outcomes by age band`: fairness and portfolio monitoring.
- `Application outcomes by employment status`: portfolio monitoring. Stored values such as
  `SELF_EMPLOYED` are presented as `Self-employed`.
- `Credit-band summary table`: exact application, completion, rejection, referral and
  in-progress values.

Age and employment are clearly labelled as monitoring views only. The Dashboard does not present
either field as an automated decision rule.

| Component | What is compared | Business / regulatory meaning |
|---|---|---|
| Outcomes by credit band | Status mix for bands A through E | Observes how outcome patterns vary from stronger to higher-risk credit profiles. |
| Outcomes by DTI band | Status mix across debt-to-income ranges | Monitors affordability outcomes as existing debt commitments rise. |
| Completion rate by annual-income band | Completed count divided by total count in each income cohort | Portfolio monitoring of outcome variation by income range; not a standalone decision rule. |
| Screening, identity and agreement checks | Counts of clear/review/hit, verified/review/failed and signed/pending/declined/expired | Monitors operational controls that can create manual review, rejection or journey delay. |
| Outcomes by age band | Status mix for age cohorts | Regulatory/fairness monitoring for disproportionate outcome patterns. |
| Outcomes by employment status | Status mix for employment cohorts | Portfolio/fairness monitoring without treating employment type as an automatic rule. |
| Credit-band summary table | Exact count and completion rate by credit band | Supports audit, presentation questions and reconciliation with the visual chart. |

### 8.5 Raw data

- Shows up to 50 records from the filtered result.
- Displays application, submission time, channel, product, status, journey position, reason,
  limits, credit band and source file.
- A row can be expanded to show remaining imported and provenance fields.
- Duplicate `application_id` values remain visible as separate source rows.

This page answers “which imported records support the charts?” Product, channel, status,
employment and control outcomes use readable labels. The exact decision reason code and source
filename are intentionally retained because this is the traceability view.

### 8.6 Scan history

- File history, processed count, failed count and total inserted rows
- Filename, status, rows read/inserted, shortened checksum, processed time and error
- Scan/reset result alerts

This page answers “which files were attempted, which were committed, which failed, and why?”
The checksum identifies the exact content handled, while filename status controls idempotency.

### 8.7 Actions

- `Scan folder` immediately scans the server folder and opens Scan history.
- `Reset data` opens a confirmation modal, then clears all three business-data tables:
  `raw_data`, `processed_files` and `demo_showcase`.
- The sidebar spacing is presentation-safe at a conventional 1280×768 viewport.

### 8.8 Shared UI and presentation rules

- All analytics pages share the same From, To, Product and Channel filters.
- Product, channel, application-status and operational-control enumeration values are converted
  into readable labels before display. Exact source values remain unchanged in API requests and
  the database.
- Status colours remain consistent across all charts.
- Desktop two-column chart cards stretch to equal width and height.
- Metric cards use a consistent minimum height.
- Dashboard tables use one alignment rule: headers, text and numeric values are all left aligned.
- At smaller widths, two-column layouts become one column rather than shrinking charts until
  labels are unreadable.
- Empty data is an explicit state: after Reset the UI shows zero metrics and “No matching
  records”, not old data or broken blank containers.
- Scan and Reset buttons are disabled while their action is running.
- Reset success is visible from every screen, not only Scan history.

Presentation mapping examples:

| Stored/API value | Frontend label | Used in |
|---|---|---|
| `CREDIT_CARD_STANDARD` | `Standard Card` | Filter, product chart, summary and Raw data |
| `CREDIT_CARD_REWARDS` | `Rewards Card` | Filter, product chart, summary and Raw data |
| `CREDIT_CARD_STUDENT` | `Student Card` | Filter, product chart, summary and Raw data |
| `WEB` | `Web` | Filter, channel chart and Raw data |
| `MOBILE_APP` | `Mobile app` | Filter, channel chart and Raw data |
| `SELF_EMPLOYED` | `Self-employed` | Employment outcome chart and Raw-data detail |
| `IN_PROGRESS` | `In progress` | Status badge, charts and legends |
| `KYC_LOW_CONFIDENCE` | `Low identity confidence` | Reason rankings and journey summary |
| `CRE_AFFORDABILITY_EXCEEDED` | `Affordability limit exceeded` | Reason rankings and journey summary |

Journey stages are also presented as business activities rather than raw stage keys:

| Stored stage | Frontend label |
|---|---|
| `verification` | `Application verification` |
| `policy` | `Customer policy` |
| `kyc` | `Identity verification (KYC)` |
| `screening` | `Fraud / AML screening` |
| `credit` | `Credit decision` |
| `agreement` | `Agreement` |
| `account` | `Account setup` |
| `card` | `Card issuing` |

Reason codes are a deliberate exception on the Raw data screen: its `Reason code` column keeps
the exact source value for audit and troubleshooting. Everywhere intended for presentation, the
same code is converted to a plain-language business label.

## 9. Main code changes

### Backend and database

| File | Change |
|---|---|
| `backend/pom.xml` | Added Apache Commons CSV. |
| `backend/Dockerfile` | Copies the daily feed into the runtime image. |
| `docker-compose.yml` | Read-only mounts the fixed relative CSV folder and configures its container path. |
| `backend/src/main/resources/application.yml` | Adds the configurable source folder. |
| `backend/src/main/resources/db/changelog/db.changelog-master.yaml` | Includes change set 005. |
| `backend/src/main/resources/db/changelog/changes/005-rebuild-portfolio-analytics-tables.yaml` | Creates the final database schema and indexes. |
| `backend/src/main/java/com/neobank/module/model/RawData.java` | Maps the full raw journey row. |
| `backend/src/main/java/com/neobank/module/model/ProcessedFile.java` | Maps the file audit. |
| `backend/src/main/java/com/neobank/module/model/CardType.java` | Defines the three products. |
| `backend/src/main/java/com/neobank/module/model/RawDataStatus.java` | Defines the five stored statuses. |
| `backend/src/main/java/com/neobank/module/service/CsvFileImportService.java` | Filename/header/row validation, SHA-256 and transactional import. |
| `backend/src/main/java/com/neobank/module/service/PortfolioDataService.java` | Scan, idempotency, reset, filtering and all aggregations. |
| `backend/src/main/java/com/neobank/module/controller/PortfolioDataController.java` | Exposes the five dashboard endpoints. |
| `backend/src/main/java/com/neobank/module/config/WebConfig.java` | Allows browser CORS methods including the Reset `DELETE` request. |
| `backend/src/main/java/com/neobank/module/dto/*` | Expands raw, audit, action and analytics response contracts. |
| `backend/src/main/java/com/neobank/module/repository/*` | Adds current ordering and filename lookup. |
| `backend/src/main/resources/customer_data/neo_daily_*.csv` | Adds 208 daily source files from the supplied example dataset. |

### Frontend

| File | Change |
|---|---|
| `frontend/src/App.jsx` | Final sidebar, screens, live loading, Scan/Reset actions, stale-response protection and immediate reset state. |
| `frontend/src/api.js` | Final five-endpoint client, query parameters and no-cache reads. |
| `frontend/src/components/DashboardFilters.jsx` | From, To, Product and Channel filters. |
| `frontend/src/components/DataDashboard.jsx` | Implements all six screens, global action feedback and business explanations. |
| `frontend/src/components/AnalyticsCharts.jsx` | Reusable journey, outcome, trend, ranking, limit and control charts. |
| `frontend/src/components/DonutChart.jsx` | Supports the final status distribution. |
| `frontend/src/dashboard/rawDataMock.js` | Updates optional mock mode to the new schema/API. |
| `frontend/src/status.js` | Central product, channel, status and decision-reason presentation labels plus visual tones. |
| `frontend/src/styles.css` | Equal desktop cards, left-aligned tables and app-level dashboard/chart/sidebar layout. |

### Tests

| File | Coverage |
|---|---|
| `backend/src/test/java/com/neobank/module/service/PortfolioDataServiceTest.java` | First scan, second-scan idempotency, duplicate application IDs and reset. |
| `backend/src/test/java/com/neobank/module/controller/PortfolioDataControllerTest.java` | Scan, reset, raw-data and analytics HTTP contracts, including browser-Origin CORS for Reset. |
| `backend/src/test/resources/customer_data/neo_daily_2026-01-01.csv` | Three-row valid test feed including a duplicate application ID. |
| `backend/src/test/resources/application-test.yml` | Isolated test folder configuration. |

## 10. Supplied dataset verification

The copied daily dataset contains 208 matching files and 4577 source rows.

Actual first-scan result:

```text
files found:       208
files processed:   196
files failed:       12
rows inserted:    4291
```

The 12 failed files contain intentionally malformed values such as invalid timestamps,
channels, requested limits, empty application IDs or unsupported enum values. Each failed file
inserted zero rows and has its exact validation error in `processed_files`.

Actual second scan:

```text
files processed:     0
files skipped:     196
rows inserted:       0
```

The 12 failed files are retried and remain failed, so the overall second response is `FAILED`
rather than `NO_NEW_FILES`. With a folder containing only valid/processed files, the second scan
returns `NO_NEW_FILES`.

## 11. Verification completed

- `./mvnw test`: 25 tests passed.
- `./mvnw verify`: build success.
- Liquibase 001–005 executed against H2/MySQL-compatible test mode.
- `npm run build`: Vite production build success.
- `git diff --check`: no whitespace errors.
- `docker compose config --quiet`: valid.
- Backend and frontend Docker images built.
- MySQL, backend and frontend containers became healthy/running.
- Live scan, second-scan idempotency, raw-data, analytics and history APIs were exercised.
- Browser verification covered navigation, Product filtering, Journey, Credit & risk and Scan
  history.
- Presentation-label verification confirmed that product, channel, status, employment,
  operational-control and journey-stage values are shown as business language rather than raw
  database enumerations.
- Raw-data detail verification confirmed readable field names, formatted income/DTI/APR values
  and no underscore-separated enum values.
- Browser action verification covered `Scan → 4291 rows → Reset → all zero → Scan → 4291 rows`.
- Desktop layout verification confirmed equal paired card dimensions.
- Table verification confirmed left alignment for headers and values.
- No browser console errors were present.

## 12. Run locally

From the repository root:

```bash
cd /Users/lynne/Downloads/neo-10
docker compose up -d --build mysql backend frontend
```

Open:

```text
http://localhost:5173
```

Useful checks:

```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/v1/files/scan
curl "http://localhost:8080/api/v1/dashboard/analytics?from=2026-01-01&to=2026-07-31&productCode=ALL&channel=ALL"
curl http://localhost:8080/api/v1/processed-files
```

Reset from the backend port:

```bash
curl -X DELETE http://localhost:8080/api/v1/data/reset
```

After Reset, the CSV source files still exist. Import the folder again with:

```bash
curl -X POST http://localhost:8080/api/v1/files/scan
```

To start the original sidecar as well:

```bash
docker compose up --build
```

## 13. Layer responsibilities and project summary

### 13.1 What the frontend does

- Provides sidebar navigation for four analytics pages and two data pages.
- Captures and applies global reporting filters.
- Calls the five Dashboard APIs.
- Renders KPI cards, grouped monthly bars, status distributions, outcome mixes, rankings,
  journey charts, cohort comparisons and data tables.
- Shows loading, empty, success and failure states.
- Confirms destructive Reset actions.
- Clears visible data immediately after Reset and prevents stale reads from restoring it.
- Keeps chart cards presentation-friendly and tables consistently aligned.

The frontend does not parse or insert CSV files. `Scan folder` asks the backend to scan its
configured server directory.

### 13.2 What the backend does

- Finds files matching `neo_daily_YYYY-MM-DD.csv`.
- Reads only the fixed `backend/src/main/resources/customer_data` source directory.
- Validates filenames, all required headers and every row.
- Converts CSV values to typed Java values.
- Calculates SHA-256 checksums for audit.
- Applies filename-based idempotency.
- Imports a valid file atomically.
- Records successful and failed file attempts.
- Filters raw data by submission date, product and channel.
- Computes every Dashboard aggregation.
- Clears all business data transactionally on Reset.
- Supports browser-origin requests through CORS.

### 13.3 What the database does

- `raw_data` is the analytical source of truth for imported application snapshots.
- `processed_files` is the file audit and idempotency registry.
- `demo_showcase` supports the original orchestrator demonstration and is cleared by Reset.
- Liquibase metadata protects schema migration history and is not Dashboard data.

### 13.4 What each Dashboard answers

| Dashboard | Business question |
|---|---|
| Overview | How many applications are in scope, what happened to them, how much limit was granted, and how quickly were decisions made? |
| Journey funnel | Which journey steps were reached, where did applications stop, and what reasons explain exceptions? |
| Product & channel | Which products and acquisition channels drive volume, outcomes and credit-limit differences? |
| Credit & risk | How do credit, affordability and operational-control cohorts relate to outcomes? |
| Raw data | Which exact imported records support the charts? |
| Scan history | Which files were processed, skipped or failed, and why? |

### 13.5 Definition of completion

The project is complete when:

- the stack starts successfully;
- a first Scan imports valid files and records invalid ones;
- scanning again does not duplicate successfully imported files;
- all filters affect all relevant analytics consistently;
- Reset clears `raw_data`, `processed_files` and `demo_showcase`;
- the Dashboard shows zero data immediately after Reset;
- only a subsequent Scan repopulates the Dashboard;
- backend tests and frontend production build pass.
