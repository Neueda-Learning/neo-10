package com.neobank.module.dto;

import com.neobank.module.model.RawData;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record RawDataView(
        Long id, String applicationId, Instant submittedAt, String channel, String productCode,
        BigDecimal requestedLimit, String status, int stepsReached, String stoppedAtStep,
        String declineReasonCode, Instant decidedAt, BigDecimal grantedLimit, Instant lastUpdatedAt,
        String ageBand, String residenceCountry, String employmentStatus, BigDecimal annualIncome,
        BigDecimal dtiRatio, String creditBand, BigDecimal apr, String screeningOutcome,
        String kycOutcome, String agreementOutcome, String sourceFilename, LocalDate sourceFileDate,
        Instant importedAt) {
    public static RawDataView of(RawData row) {
        return new RawDataView(row.getId(), row.getApplicationId(), row.getSubmittedAt(), row.getChannel(),
                row.getProductCode().name(), row.getRequestedLimit(), row.getStatus().name(), row.getStepsReached(),
                row.getStoppedAtStep(), row.getDeclineReasonCode(), row.getDecidedAt(), row.getGrantedLimit(),
                row.getLastUpdatedAt(), row.getAgeBand(), row.getResidenceCountry(), row.getEmploymentStatus(),
                row.getAnnualIncome(), row.getDtiRatio(), row.getCreditBand(), row.getApr(),
                row.getScreeningOutcome(), row.getKycOutcome(), row.getAgreementOutcome(),
                row.getSourceFilename(), row.getSourceFileDate(), row.getImportedAt());
    }
}
