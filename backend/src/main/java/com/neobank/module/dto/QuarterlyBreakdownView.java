package com.neobank.module.dto;

public record QuarterlyBreakdownView(String quarter, long completed, long rejected, long inProgress, long total) { }
