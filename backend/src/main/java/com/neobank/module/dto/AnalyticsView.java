package com.neobank.module.dto;

import java.math.BigDecimal;
import java.util.List;

public record AnalyticsView(
        long total,
        double completionRate,
        BigDecimal totalRequestedLimit,
        BigDecimal totalGrantedLimit,
        Long medianDecisionMinutes,
        List<StatusCountView> statusBreakdown,
        List<TimeStatusView> monthlyTrend,
        List<ReasonCountView> topReasons,
        List<JourneyStepView> journeySteps,
        List<LabelCountView> stoppedByStep,
        List<OutcomeGroupView> productOutcomes,
        List<OutcomeGroupView> channelOutcomes,
        List<LimitComparisonView> productLimits,
        List<OutcomeGroupView> creditBandOutcomes,
        List<OutcomeGroupView> dtiBandOutcomes,
        List<RateView> incomeCompletionRates,
        List<LabelCountView> screeningOutcomes,
        List<LabelCountView> kycOutcomes,
        List<LabelCountView> agreementOutcomes,
        List<OutcomeGroupView> ageOutcomes,
        List<OutcomeGroupView> employmentOutcomes) {

    public record TimeStatusView(String period, long completed, long rejected, long referred,
            long inProgress, long failed, long total) { }

    public record ReasonCountView(String reason, long count, double percentage, String topStep) { }

    public record JourneyStepView(int step, String name, long reached, long stopped,
            long completed, long rejected, long referred, long inProgress, long failed, String topReason) { }

    public record LabelCountView(String label, long count) { }

    public record OutcomeGroupView(String label, long completed, long rejected, long referred,
            long inProgress, long failed, long total, double completionRate) { }

    public record LimitComparisonView(String label, BigDecimal averageRequested,
            BigDecimal averageGranted, BigDecimal averageApr) { }

    public record RateView(String label, long total, double rate) { }
}
