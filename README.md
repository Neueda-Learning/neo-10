# neo-10 — Portfolio & Regulatory Analytics

> **Current implementation:** the final daily-feed requirements, CSV contract, database
> schema, APIs, dashboard screens, changed files and verification results are documented in
> [`PORTFOLIO_ANALYTICS_IMPLEMENTATION.md`](PORTFOLIO_ANALYTICS_IMPLEMENTATION.md).

## Implemented portfolio analytics module

`neo-10` turns daily credit-card application journey files into an auditable portfolio,
operational and regulatory monitoring dashboard. It solves four connected problems:

1. safely importing new daily files without duplicating a successfully processed filename;
2. retaining row-level source lineage and file-level processing history;
3. producing one consistent set of portfolio, journey, product, channel and credit-risk metrics;
4. presenting technical banking data as readable business information while preserving exact
   source codes for audit.

```text
backend/src/main/resources/customer_data/neo_daily_YYYY-MM-DD.csv
        ↓
Validate filename, headers and every row
        ↓
Check processed_files by unique filename
        ↓
Insert valid file atomically into raw_data
        ↓
Record checksum, row counts and result in processed_files
        ↓
Aggregate and filter through REST APIs
        ↓
React portfolio analytics dashboard
```

## Frontend Dashboard

The left sidebar contains four analytics pages, two data/audit pages and two actions:

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

All analytics pages and Raw data use one filter contract:

- **From** and **To** — inclusive date range applied to application submission time;
- **Product** — All, Standard Card, Rewards Card or Student Card;
- **Channel** — All, Web, Mobile app, Branch or Aggregator.

Database enumerations are converted to readable labels in presentation views. Examples include
`CREDIT_CARD_STANDARD` → `Standard Card`, `MOBILE_APP` → `Mobile app`,
`SELF_EMPLOYED` → `Self-employed` and `IN_PROGRESS` → `In progress`. Exact reason codes and
source filenames remain available on Raw data for traceability.

### Overview

| Component | What it shows |
|---|---|
| Applications | Number of imported application snapshots in the selected window. |
| Completed | Applications with a completed business outcome. |
| Completion rate | Completed records divided by all matching records. |
| Total granted | Sum of granted limits for matching completed applications. |
| Average granted | Average granted limit per completed application. |
| Median decision time | Median elapsed time from submission to decision. |
| Monthly outcome trend | Four separate monthly bars for Completed, Rejected, Referred and In progress. |
| Outcome distribution | Overall portfolio state mix. |
| Leading decision reasons | Most frequent decision/exception reasons using plain-language labels. |

### Journey funnel

The journey uses eight business stages:

```text
Application verification → Customer policy → Identity verification (KYC)
→ Fraud / AML screening → Credit decision → Agreement → Account setup → Card issuing
```

| Component | What it shows |
|---|---|
| Step outcome distribution | Completed, Rejected, Referred and In progress counts associated with every reached stage. |
| Stopped applications by step | Stages where the largest number of applications stopped. |
| Top decline and referral reasons | Ranked explanation of rejection, referral or journey interruption. |
| Step exception summary | Exact reached, stopped and status counts plus the leading reason. |

### Product & channel

| Component | What it shows |
|---|---|
| Outcome by card product | Outcome mix for Standard Card, Rewards Card and Student Card. |
| Outcome by acquisition channel | Outcome mix for Web, Mobile app, Branch and Aggregator. |
| Requested versus granted limit | Average requested and granted limits per product. |
| Product performance summary | Applications, completion rate, average limits and APR. |

### Credit & risk

| Component | What it shows |
|---|---|
| Outcomes by credit band | Status mix across credit bands A–E. |
| Outcomes by DTI band | Outcome variation as debt-to-income commitments rise. |
| Completion by income band | Observed completion rate for each annual-income cohort. |
| Screening, KYC and agreement checks | Fraud/AML, identity and signature-control outcomes. |
| Outcomes by age band | Regulatory/fairness portfolio monitoring. |
| Outcomes by employment status | Cohort monitoring with readable employment labels. |
| Credit-band summary | Exact applications, completion, rejection, referral and in-progress values. |

Age and employment are monitoring dimensions only. The UI does not present either as a
standalone automated approval rule.

### Raw data and Scan history

- **Raw data** shows up to 50 matching application snapshots and supports expandable details.
  Duplicate `application_id` values are deliberately retained because daily files can contain
  multiple snapshots of the same application.
- **Scan history** shows the filename, processing result, rows read/inserted, checksum,
  processing time and validation error.

### Frontend actions

- **Scan folder** invokes the backend scanner and opens Scan history.
- **Reset data** requires confirmation and deletes application rows, file-processing history and
  demonstration records. CSV source files and Liquibase migration history are not deleted.
- After Reset, the UI immediately displays zero/empty states. Data returns only after Scan folder
  imports the fixed directory again.

## Backend implementation

The backend owns file handling, validation, idempotency, transactions, filtering, aggregation
and database reset. The browser never uploads or parses CSV data.

### Scan and import logic

1. Resolve the fixed relative directory `src/main/resources/customer_data`.
2. List files matching `neo_daily_YYYY-MM-DD.csv`.
3. Check `processed_files` for the filename.
4. Skip filenames already marked `PROCESSED`.
5. Retry files previously marked `FAILED`.
6. Validate the filename date, required headers and every field in every row.
7. Parse dates, timestamps, decimals, products, channels and statuses into typed values.
8. Calculate the SHA-256 checksum.
9. Insert the entire valid file into `raw_data` in one transaction.
10. Record the file result and row counts in `processed_files`.

One invalid row causes that file to insert zero raw rows. The failure is recorded in a separate
transaction so it remains visible and retryable.

Filename is the idempotency key. Checksum is an audit fingerprint, not the deduplication key.
Repeated `application_id` values are valid and are not used for idempotency.

### Filtering and analytics

The backend applies the same optional filters to Raw data and Dashboard analytics:

- inclusive submission date range;
- product code;
- acquisition channel.

It calculates status totals, monthly trends, journey reach/stop counts, leading reasons,
product/channel outcome groups, requested/granted limits, credit-band outcomes, DTI bands,
income completion rates, age/employment cohorts and operational-control distributions.

## REST APIs

The Dashboard uses five endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/files/scan` | Scan the fixed server folder and import new/retryable CSV files. |
| `DELETE` | `/api/v1/data/reset` | Clear `raw_data`, `processed_files` and `demo_showcase`. |
| `GET` | `/api/v1/raw-data` | Return filtered and paginated application snapshots. |
| `GET` | `/api/v1/dashboard/analytics` | Return all filtered Dashboard aggregations in one response. |
| `GET` | `/api/v1/processed-files` | Return file-processing history. |

Shared query parameters for Raw data and Analytics:

```text
from=2026-01-01
to=2026-07-31
productCode=ALL|CREDIT_CARD_STANDARD|CREDIT_CARD_REWARDS|CREDIT_CARD_STUDENT
channel=ALL|WEB|MOBILE_APP|BRANCH|AGGREGATOR
```

`GET /api/v1/raw-data` additionally supports `page` and `size`.

The original platform endpoint remains available:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/applications` | Accept an orchestrator envelope, respond `202`, process asynchronously and callback the orchestrator. |

## CSV contract

Required filename:

```text
neo_daily_YYYY-MM-DD.csv
```

Required headers, in source order:

```text
application_id,submitted_at,channel,product_code,requested_limit,status,
steps_reached,stopped_at_step,decline_reason_code,decided_at,granted_limit,
last_updated_at,age_band,residence_country,employment_status,annual_income,
dti_ratio,credit_band,apr,screening_outcome,kyc_outcome,agreement_outcome
```

Supported products:

```text
CREDIT_CARD_STANDARD
CREDIT_CARD_REWARDS
CREDIT_CARD_STUDENT
```

Supported primary business statuses:

```text
COMPLETED
REJECTED
REFERRED
IN_PROGRESS
```

`FAILED` is retained for technical journey failures.

## Database tables

Liquibase owns the schema. The final analytics schema is defined by change set
`005-rebuild-portfolio-analytics-tables.yaml`.

### `raw_data`

Analytical source of truth. Every successfully imported CSV row becomes one row.

| Column | SQL type | Purpose |
|---|---|---|
| `id` | `BIGINT` auto increment | Database primary key. |
| `application_id` | `VARCHAR(64)` | Source application reference; indexed but not unique. |
| `submitted_at` | `TIMESTAMP` | Submission instant and reporting date. |
| `channel` | `VARCHAR(32)` | Acquisition channel. |
| `product_code` | `VARCHAR(64)` | Card product code. |
| `requested_limit` | `DECIMAL(12,2)` | Requested credit limit. |
| `status` | `VARCHAR(32)` | Application/journey status. |
| `steps_reached` | `INTEGER` | Number of completed journey stages. |
| `stopped_at_step` | `VARCHAR(32)` nullable | Stage where processing stopped. |
| `decline_reason_code` | `VARCHAR(80)` nullable | Decision or exception reason. |
| `decided_at` | `TIMESTAMP` nullable | Decision time. |
| `granted_limit` | `DECIMAL(12,2)` nullable | Granted credit limit. |
| `last_updated_at` | `TIMESTAMP` | Source update time. |
| `age_band` | `VARCHAR(16)` | Age monitoring cohort. |
| `residence_country` | `VARCHAR(8)` | Residence country. |
| `employment_status` | `VARCHAR(32)` | Employment monitoring cohort. |
| `annual_income` | `DECIMAL(12,2)` | Annual income. |
| `dti_ratio` | `DECIMAL(6,4)` | Debt-to-income ratio. |
| `credit_band` | `VARCHAR(8)` | Credit-risk band. |
| `apr` | `DECIMAL(5,2)` | Annual percentage rate. |
| `screening_outcome` | `VARCHAR(32)` nullable | Fraud/AML screening result. |
| `kyc_outcome` | `VARCHAR(32)` nullable | Identity-verification result. |
| `agreement_outcome` | `VARCHAR(32)` nullable | Agreement/signature result. |
| `source_filename` | `VARCHAR(150)` | Source CSV filename. |
| `source_file_date` | `DATE` | Date parsed from the filename. |
| `imported_at` | `TIMESTAMP` | Database import time. |

Indexes cover submission time, product/channel, status and application ID.

### `processed_files`

File-level audit and filename idempotency registry.

| Column | SQL type | Purpose |
|---|---|---|
| `id` | `BIGINT` auto increment | Database primary key. |
| `filename` | `VARCHAR(150)` unique | Idempotency key. |
| `status` | `VARCHAR(32)` | `PROCESSED` or `FAILED`. |
| `checksum` | `VARCHAR(64)` nullable | SHA-256 content fingerprint. |
| `rows_read` | `INTEGER` | Rows examined. |
| `rows_inserted` | `INTEGER` | Rows committed to `raw_data`. |
| `error_message` | `VARCHAR(1000)` nullable | Validation/import failure. |
| `processed_at` | `TIMESTAMP` | Latest processing attempt. |

### `demo_showcase`

Retained for the original orchestrator demonstration endpoint. It is not a Dashboard source,
but Reset clears it so all module business data is removed.

| Column | SQL type | Purpose |
|---|---|---|
| `id` | `BIGINT` auto increment | Database primary key. |
| `application_id` | `VARCHAR(64)` | Orchestrator envelope application ID. |
| `status` | `VARCHAR(32)` | Demonstration result. |
| `created_at` | `TIMESTAMP` | Creation time. |

`processed_files.filename` corresponds to `raw_data.source_filename`; no database foreign key is
required. Liquibase's `DATABASECHANGELOG` and `DATABASECHANGELOGLOCK` tables are migration
metadata and are never cleared by Reset.

## Verification

The current implementation has been checked with:

```text
Frontend production build: success
Backend Maven verify:      success
Backend tests:             25 passed
Compose configuration:     valid
Whitespace/diff check:     clean
```

The supplied folder contains 208 matching daily files and 4577 source rows. In the verified
dataset, 196 valid files insert 4291 rows and 12 malformed files are recorded as failed with zero
partial inserts.

## Platform integration

**Module 10 of ten**, owned by **Team 10**. The original neo-bank orchestrator integration remains
alongside the portfolio analytics workflow. [`neo-00`](https://github.com/Neueda-Learning/neo-00)
sends applications to `POST /api/v1/applications`; the module responds `202`, processes
asynchronously, writes its demonstration result and sends the callback to the orchestrator.

The platform application flow and the CSV Dashboard flow are deliberately separate:

```text
Orchestrator application → ApplicationService → demo_showcase → callback
Daily CSV folder          → PortfolioDataService → raw_data / processed_files → Dashboard
```

## What pushing does

**This repo deploys itself.** Trunk-based:

- push to a **feature branch** → build + test only. Nothing is published, nothing deploys.
- push to **`main`** → build + test → publish two images to ghcr.io pinned by `@sha256` →
  deploy **this service** to dev → smoke it through the load balancer → record the digest
  as the promote source.
- *Run workflow → `promote: true`* on `main` → **prod**, which pauses for a required
  reviewer and then ships the exact digest dev proved. No rebuild.

There are no stored AWS keys: each job assumes this repo's own IAM role via GitHub OIDC, and
that role can only touch this repo's own `neobank-<env>-neo-10` stack. You never hold AWS
credentials yourself — everything that reaches AWS goes through a workflow in this repo.

The front-end image is built with `APP_BASE_PATH=/neo-10`, because in the deployed stack
every UI shares one port and is told apart by its path. Vite bakes asset URLs at build time and
a load balancer cannot rewrite paths, so the prefix has to be a build argument — the pipeline
reads it from `infra/env/dev.params`'s `PathPrefix` so the image and the stack cannot drift.

### Where your module ends up

| | Your module | Your API | The board |
|---|---|---|---|
| **dev** | [`/neo-10/`](http://neobank-dev-571740187.ap-southeast-1.elb.amazonaws.com/neo-10/) | [`/neo-10/health`](http://neobank-dev-571740187.ap-southeast-1.elb.amazonaws.com/neo-10/health) · [`/neo-10/info`](http://neobank-dev-571740187.ap-southeast-1.elb.amazonaws.com/neo-10/info) | [orchestrator](http://neobank-dev-571740187.ap-southeast-1.elb.amazonaws.com/) |
| **prod** | [`/neo-10/`](http://neobank-prod-294820685.ap-southeast-1.elb.amazonaws.com/neo-10/) | [`/neo-10/health`](http://neobank-prod-294820685.ap-southeast-1.elb.amazonaws.com/neo-10/health) · [`/neo-10/info`](http://neobank-prod-294820685.ap-southeast-1.elb.amazonaws.com/neo-10/info) | [orchestrator](http://neobank-prod-294820685.ap-southeast-1.elb.amazonaws.com/) |

**dev is yours** — it moves every time you merge to `main`, so that link is the honest answer
to "is my module working?". **prod is not**: it only ever runs an image dev has already
proven, and only after a human approves the promote. A 404 on prod means your module has not
been promoted yet — not that it is broken.

`/info` is the quickest check that a deploy actually landed: it reports the `serviceId`,
domain, team and mocked-dependency register **this running container** believes in. If that
does not match what you configured, the deploy did not go where you think it did.

Plain HTTP, no DNS name: those hostnames belong to the load balancers and change if one is
ever replaced. The live values are always in SSM
(`/neobank/dev/alb-dns`, `/neobank/prod/alb-dns`), and the instructor can read them out.

## If you break your database

Liquibase owns the schema (`ddl-auto: validate`), and there are a few ways to get stuck. **Read
the symptom before reaching for the destructive fix** — the first row here is the common one and
is not a database problem at all:

| Symptom | What it means | Fix |
|---|---|---|
| `Schema-validation: missing table/column …` | your entity and your changelog disagree | **write a changeset.** Resetting only hides it until the next startup |
| App never starts; log repeats *"waiting for changelog lock"* | a task died mid-migration and left `DATABASECHANGELOGLOCK` held | *Database repair* → **`unlock`**. No data loss |
| You add a changeset and *that* deploy hangs on the lock, though the last one was fine | same stale lock — Liquibase's fast check skips the lock entirely while the schema is up to date, so it stayed hidden until something was actually pending | *Database repair* → **`unlock`**, then re-deploy |
| Crash-loop on a checksum mismatch | you edited a changeset that had already run | *Database repair* → **`reset`** |
| A changeset failed halfway | MySQL DDL isn't transactional, so objects exist with no changelog row | *Database repair* → **`reset`** |
| Local only | — | `docker compose down -v` |

**Never edit a changeset that has already been applied — add a new one.** That is the rule the
checksum row above exists to enforce.

*Database repair* is a workflow in this repo's **Actions** tab (`.github/workflows/db-reset.yml`).
Pick the environment and the action; `reset` also asks you to type your `DbName` from
`infra/env/<env>.params` so you can't fire it by accident. **dev runs straight away. prod pauses
for an approver** — the same reviewer gate that guards a promote.

A `reset` destroys **only this service's schema** (`neo_10`). Every other service and the
orchestrator's own journey data live in separate schemas and are untouched — but the orchestrator
will still remember applications whose module rows you just deleted, so expect stale rows on the
board until it is reset too.

## Run it

Normally you don't: you run the whole system from `neo-00`. To work on this service
alone:

```bash
docker compose up --build
# http://localhost:9000   THE SIDECAR — send applications, watch what comes back
# http://localhost:5173   React UI — what this service has seen and answered
# http://localhost:8080/  zero-build status page served by Spring Boot
# http://localhost:8080/health · /info · /swagger-ui.html
```

**First run after adding the sidecar: `docker compose down -v` once.** MySQL creates the
sidecar's schema from `db/init/*.sql`, and it runs those only on an empty data directory — an
existing volume means the schema was never created. The sidecar's log says so if you forget.

Backend only, for fast iteration:

```bash
docker compose up -d mysql sidecar
cd backend
./mvnw test                                              # 25 tests, H2, no Docker
DB_URL=jdbc:mysql://localhost:3307/neo_10 ./mvnw spring-boot:run
```

Run this way and callbacks still land: the module's default `ORCHESTRATOR_URL` is
`http://localhost:9000`, which is exactly where the sidecar is. Set the sidecar's **module base
URL** field to `http://host.docker.internal:8080` so it can reach back into your IDE.

## Sending applications: the sidecar

The orchestrator is not running on your laptop, and waiting for it is not a development loop —
so a **sidecar** plays it at **http://localhost:9000**. It ships **26 applications** covering the
happy path, both sides of every boundary the rules care about, the integration failure modes,
and one envelope that must be rejected.

It matters that it works both ways. It sends to your real `POST /api/v1/applications`, *and* it
serves `PUT /api/v1/applications/{id}` — so your answer has somewhere to land and you can see the half
of the contract curl cannot show you.

```bash
open http://localhost:9000          # pick a scenario, Send, watch Ack then Callback

# or, if you prefer curl:
curl -s  localhost:9000/api/v1/scenarios  | jq '.scenarios[].id'
curl -sX POST localhost:9000/api/v1/dispatch \
     -H 'Content-Type: application/json' -d '{"scenarioId":"SIM-01"}'
curl -s  localhost:9000/api/v1/dispatches | jq '.[0]'
```

The sidecar lives in **its own repo** ([`Neueda-Learning/neobank-sidecar`](https://github.com/Neueda-Learning/neobank-sidecar))
and compose builds it straight from there — there is no sidecar source in this repo and nothing
for you to maintain. **The first build takes a few minutes**; after that it is cached.
`docker compose up --build sidecar` picks up a new version. Its full guide, the corpus table and
the planted failure triggers are in [its README](https://github.com/Neueda-Learning/neobank-sidecar#readme).

`./scripts/reset-db.sh` empties **this module's** tables for a clean board; the sidecar's own log
is cleared from its page.

## The contract

Full detail in [`api-contract.md`](https://github.com/Neueda-Learning/neo-00/blob/main/api-contract.md).
In short:

**The first endpoint below is the fixed orchestrator contract.** The read endpoint is retained
for the original demonstration UI. The five module-owned portfolio APIs are documented in
[REST APIs](#rest-apis) above.

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/applications` | the orchestrator sends an application → `202 {status:"in-progress", applicationId, serviceId, command}` |
| `GET /api/v1/applications` | the `demo_showcase` rows — read by *your* UI, never by the orchestrator |
| `GET /health` · `GET /info` | DB-backed health · identity, BIAN domain, and what is mocked |

Add whatever else your operator screen needs — a search, a detail lookup, a manual override. Those
are yours; the `POST` is not.

Once the work is done — off the request thread, so within milliseconds unless you call something
slow — it PUTs `${ORCHESTRATOR_URL}/api/v1/applications/{applicationId}`:

```json
{ "serviceId": "neo10", "status": "ACCEPTED",
  "comment": "hello world from processApplication" }
```

**Three fields: the application id is in the URL, not the body.** This is an update to an
application the orchestrator already owns, so the id identifies the resource. The `comment` is your
reason — write it for the bank employee who has to explain the outcome to a customer: which rule
fired, and with what value.

## Configuration

Every knob is an env var, which is how one image serves as any slot:

| Env | Default | What |
|---|---|---|
| `SERVICE_ID` | `neo10` | the id sent on callbacks — note **no `-a`**, unlike the repo name |
| `SERVICE_NAME` | `Portfolio & Regulatory Analytics` | display name |
| `SERVICE_DOMAIN` | `unassigned` | the BIAN domain you own, reported on `/info` |
| `ORCHESTRATOR_URL` | `http://localhost:9000` | where callbacks go — see the three targets below |
| `MOCKED_DEPENDENCIES` | *(empty)* | comma-separated systems you fake — the register, served live |
| `WORKER_POOL_SIZE` | `8` | threads available to run your rules |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | see compose | this service's own schema |
| `PORTFOLIO_DATA_DIRECTORY` | `src/main/resources/customer_data` | relative daily-CSV source directory, resolved from the backend working directory; absolute paths are rejected |
| `SIDECAR_PORT` / `SIDECAR_REF` / `MODULE_URL` | `9000` / `v1` / `http://backend:8080` | the mock orchestrator (`SIDECAR_REF` is the git ref compose builds) |

**There are no decision knobs.** What this module answers comes from your rules, not from a
weight, a seed or a delay. Those env vars existed when the decision was a seeded coin flip; the
coin flip is gone.

### The three things `ORCHESTRATOR_URL` can point at

Only this value changes between them. The module's code does not.

| Set it to | When |
|---|---|
| `http://sidecar:8080` | the mock orchestrator, from inside this repo's compose — **the default there** |
| `http://localhost:9000` | that same sidecar, from a module you run in your IDE — **the default in `application.yml`**, so this needs no configuration at all |
| `http://orchestrator:8080` | the **real** orchestrator, in the `neo-00` system stack — which sets it for you |

## Tests

```bash
cd backend
./mvnw test                       # 25: unit + web-slice + full-context H2
./mvnw verify -DskipITs=false     # + RequestRepositoryIT against real MySQL 8 (needs Docker)
```

`*Test` runs Docker-free. `*IT` needs Docker and is skipped locally unless you ask for it;
CI sets `CI=true`, which activates the `integration` profile and runs it for real.

## Conventions

- **Own schema only.** This service reads and writes its own MySQL schema, never another's.
- **Liquibase owns the schema**; JPA runs `ddl-auto=validate`. Migrations are append-only —
  add a change set, never edit an applied one.
- `backend/` and `frontend/` **stay at the repo root** — the system compose builds
  `./neo-10/backend` and `./neo-10/frontend` by path.
