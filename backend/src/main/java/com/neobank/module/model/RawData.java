package com.neobank.module.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "raw_data")
public class RawData {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "application_id", nullable = false, length = 64) private String applicationId;
    @Column(name = "submitted_at", nullable = false) private Instant submittedAt;
    @Column(nullable = false, length = 32) private String channel;
    @Enumerated(EnumType.STRING) @Column(name = "product_code", nullable = false, length = 64) private CardType productCode;
    @Column(name = "requested_limit", nullable = false, precision = 12, scale = 2) private BigDecimal requestedLimit;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private RawDataStatus status;
    @Column(name = "steps_reached", nullable = false) private int stepsReached;
    @Column(name = "stopped_at_step", length = 32) private String stoppedAtStep;
    @Column(name = "decline_reason_code", length = 80) private String declineReasonCode;
    @Column(name = "decided_at") private Instant decidedAt;
    @Column(name = "granted_limit", precision = 12, scale = 2) private BigDecimal grantedLimit;
    @Column(name = "last_updated_at", nullable = false) private Instant lastUpdatedAt;
    @Column(name = "age_band", nullable = false, length = 16) private String ageBand;
    @Column(name = "residence_country", nullable = false, length = 8) private String residenceCountry;
    @Column(name = "employment_status", nullable = false, length = 32) private String employmentStatus;
    @Column(name = "annual_income", nullable = false, precision = 12, scale = 2) private BigDecimal annualIncome;
    @Column(name = "dti_ratio", nullable = false, precision = 6, scale = 4) private BigDecimal dtiRatio;
    @Column(name = "credit_band", nullable = false, length = 8) private String creditBand;
    @Column(nullable = false, precision = 5, scale = 2) private BigDecimal apr;
    @Column(name = "screening_outcome", length = 32) private String screeningOutcome;
    @Column(name = "kyc_outcome", length = 32) private String kycOutcome;
    @Column(name = "agreement_outcome", length = 32) private String agreementOutcome;
    @Column(name = "source_filename", nullable = false, length = 150) private String sourceFilename;
    @Column(name = "source_file_date", nullable = false) private LocalDate sourceFileDate;
    @Column(name = "imported_at", nullable = false) private Instant importedAt;

    protected RawData() { }

    public RawData(String applicationId, Instant submittedAt, String channel, CardType productCode,
            BigDecimal requestedLimit, RawDataStatus status, int stepsReached, String stoppedAtStep,
            String declineReasonCode, Instant decidedAt, BigDecimal grantedLimit, Instant lastUpdatedAt,
            String ageBand, String residenceCountry, String employmentStatus, BigDecimal annualIncome,
            BigDecimal dtiRatio, String creditBand, BigDecimal apr, String screeningOutcome,
            String kycOutcome, String agreementOutcome, String sourceFilename, LocalDate sourceFileDate) {
        this.applicationId = applicationId;
        this.submittedAt = submittedAt;
        this.channel = channel;
        this.productCode = productCode;
        this.requestedLimit = requestedLimit;
        this.status = status;
        this.stepsReached = stepsReached;
        this.stoppedAtStep = stoppedAtStep;
        this.declineReasonCode = declineReasonCode;
        this.decidedAt = decidedAt;
        this.grantedLimit = grantedLimit;
        this.lastUpdatedAt = lastUpdatedAt;
        this.ageBand = ageBand;
        this.residenceCountry = residenceCountry;
        this.employmentStatus = employmentStatus;
        this.annualIncome = annualIncome;
        this.dtiRatio = dtiRatio;
        this.creditBand = creditBand;
        this.apr = apr;
        this.screeningOutcome = screeningOutcome;
        this.kycOutcome = kycOutcome;
        this.agreementOutcome = agreementOutcome;
        this.sourceFilename = sourceFilename;
        this.sourceFileDate = sourceFileDate;
        this.importedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getApplicationId() { return applicationId; }
    public Instant getSubmittedAt() { return submittedAt; }
    public String getChannel() { return channel; }
    public CardType getProductCode() { return productCode; }
    public BigDecimal getRequestedLimit() { return requestedLimit; }
    public RawDataStatus getStatus() { return status; }
    public int getStepsReached() { return stepsReached; }
    public String getStoppedAtStep() { return stoppedAtStep; }
    public String getDeclineReasonCode() { return declineReasonCode; }
    public Instant getDecidedAt() { return decidedAt; }
    public BigDecimal getGrantedLimit() { return grantedLimit; }
    public Instant getLastUpdatedAt() { return lastUpdatedAt; }
    public String getAgeBand() { return ageBand; }
    public String getResidenceCountry() { return residenceCountry; }
    public String getEmploymentStatus() { return employmentStatus; }
    public BigDecimal getAnnualIncome() { return annualIncome; }
    public BigDecimal getDtiRatio() { return dtiRatio; }
    public String getCreditBand() { return creditBand; }
    public BigDecimal getApr() { return apr; }
    public String getScreeningOutcome() { return screeningOutcome; }
    public String getKycOutcome() { return kycOutcome; }
    public String getAgreementOutcome() { return agreementOutcome; }
    public String getSourceFilename() { return sourceFilename; }
    public LocalDate getSourceFileDate() { return sourceFileDate; }
    public Instant getImportedAt() { return importedAt; }
}
