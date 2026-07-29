package com.neobank.module.dto;

public record CardTypeStatusView(String cardType, long completed, long rejected, long inProgress, long total) { }
