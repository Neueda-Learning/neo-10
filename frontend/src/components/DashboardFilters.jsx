import React, { useEffect, useState } from 'react';
import { Button, Card, Field, FormActions, FormGrid, Select, TextInput } from '../design-system';

const PRODUCT_OPTIONS = [
  { value: 'ALL', label: 'All products' },
  { value: 'CREDIT_CARD_STANDARD', label: 'Standard Card' },
  { value: 'CREDIT_CARD_REWARDS', label: 'Rewards Card' },
  { value: 'CREDIT_CARD_STUDENT', label: 'Student Card' },
];
const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'All channels' }, { value: 'WEB', label: 'Web' },
  { value: 'MOBILE_APP', label: 'Mobile app' }, { value: 'BRANCH', label: 'Branch' },
  { value: 'AGGREGATOR', label: 'Aggregator' },
];

export default function DashboardFilters({ filters, onApply }) {
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState(null);
  useEffect(() => setDraft(filters), [filters.from, filters.to, filters.productCode, filters.channel]);

  function submit(event) {
    event.preventDefault();
    if (!draft.from || !draft.to || draft.from > draft.to) { setError('From date must be on or before To date.'); return; }
    setError(null); onApply(draft);
  }

  return <Card className="csv-filters" title="Reporting filters" subtitle="All analytics use application submission date, product and channel.">
    <form onSubmit={submit}>
      <FormGrid cols={4}>
        <Field label="From" error={error}>{({ id, describedBy }) => <TextInput id={id} type="date" value={draft.from} aria-describedby={describedBy} onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))} />}</Field>
        <Field label="To">{({ id, describedBy }) => <TextInput id={id} type="date" value={draft.to} aria-describedby={describedBy} onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))} />}</Field>
        <Field label="Product">{({ id, describedBy }) => <Select id={id} options={PRODUCT_OPTIONS} value={draft.productCode} aria-describedby={describedBy} onChange={(event) => setDraft((value) => ({ ...value, productCode: event.target.value }))} />}</Field>
        <Field label="Channel">{({ id, describedBy }) => <Select id={id} options={CHANNEL_OPTIONS} value={draft.channel} aria-describedby={describedBy} onChange={(event) => setDraft((value) => ({ ...value, channel: event.target.value }))} />}</Field>
      </FormGrid>
      <FormActions><Button type="submit" variant="primary">Apply filters</Button></FormActions>
    </form>
  </Card>;
}
