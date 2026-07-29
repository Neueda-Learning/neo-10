package com.neobank.module.dto;

import java.util.List;

public record AnalyticsView(
        long total,
        List<StatusCountView> statusBreakdown,
        List<CardTypeCountView> cardTypeBreakdown,
        List<CardTypeStatusView> cardTypeStatusBreakdown,
        List<QuarterlyBreakdownView> quarterlyBreakdown) { }
