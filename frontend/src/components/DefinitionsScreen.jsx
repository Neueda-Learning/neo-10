import React from 'react';
import {
  Card,
  EmptyState,
  PageHeader,
  Section,
  Tag,
} from '../design-system';
import { formatUtc } from '../dashboard/format.js';

export default function DefinitionsScreen({ definitions, loading, error }) {
  return (
    <>
      <PageHeader
        title="Counting definitions"
        lede="rules explain what the code computes · versions are insert-only"
        meta="An analyst should be able to answer “How do you count?” from this page alone."
      />

      {error ? (
        <EmptyState title="Could not load current definitions">{error}</EmptyState>
      ) : loading ? (
        <EmptyState title="Loading published definitions">Reading current versions for each analytics contract.</EmptyState>
      ) : (
        <Section title="Current rulebook" aside="Publishing a new version records meaning; it does not change historical numbers.">
          <div className="analytics-definition-grid">
            {definitions.map((definition) => (
              <Card
                key={definition.key}
                title={definition.key}
                subtitle={'Version ' + definition.version + ' · effective ' + formatUtc(definition.effectiveFrom)}
                tone={definition.key === 'EXTRACT' ? 'info' : undefined}
              >
                <p>{definition.text}</p>
                {definition.columns && (
                  <ol className="analytics-column-list">
                    {definition.columns.map((column) => (
                      <li key={column}>
                        <Tag>{column}</Tag>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
