import React, { useEffect, useState } from 'react';
import { Button, Card, Field, FormActions, FormGrid, Select, TextInput } from '../design-system';

const CARD_OPTIONS = [
  { value: 'ALL', label: 'All card types' },
  { value: 'PREMIUM_CARD', label: 'Premium Card' },
  { value: 'PLATINUM_CARD', label: 'Platinum Card' },
];

export default function DashboardFilters({ filters, onApply }) {
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState(null);

  useEffect(() => setDraft(filters), [filters.from, filters.to, filters.cardType]);

  function submit(event) {
    event.preventDefault();
    if (!draft.from || !draft.to || draft.from > draft.to) {
      setError('Start date must be on or before end date.');
      return;
    }
    setError(null);
    onApply(draft);
  }

  return (
    <Card className="csv-filters" title="Reporting filters" subtitle="Only applied date and card type limit the dashboard.">
      <form onSubmit={submit}>
        <FormGrid cols={3}>
          <Field label="Start date" error={error}>
            {({ id, describedBy }) => (
              <TextInput id={id} type="date" value={draft.from} aria-describedby={describedBy} onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))} />
            )}
          </Field>
          <Field label="End date">
            {({ id, describedBy }) => (
              <TextInput id={id} type="date" value={draft.to} aria-describedby={describedBy} onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))} />
            )}
          </Field>
          <Field label="Card type">
            {({ id, describedBy }) => (
              <Select id={id} options={CARD_OPTIONS} value={draft.cardType} aria-describedby={describedBy} onChange={(event) => setDraft((value) => ({ ...value, cardType: event.target.value }))} />
            )}
          </Field>
        </FormGrid>
        <FormActions>
          <Button type="submit" variant="primary">Apply filters</Button>
        </FormActions>
      </form>
    </Card>
  );
}
