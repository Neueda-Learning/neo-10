package com.neobank.module.model;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

/**
 * The enum names are the exact strings the orchestrator expects on the callback — this
 * pins them so a rename cannot slip through unnoticed.
 */
class DecisionTest {

    @Test
    void hasExactlyTheThreeContractOutcomes() {
        assertThat(Decision.values())
                .extracting(Enum::name)
                .containsExactly("ACCEPTED", "REJECTED", "REFERRED");
    }

    @Test
    void valueOfRoundTripsForEachOutcome() {
        for (Decision decision : Decision.values()) {
            assertThat(Decision.valueOf(decision.name())).isEqualTo(decision);
        }
    }
}
