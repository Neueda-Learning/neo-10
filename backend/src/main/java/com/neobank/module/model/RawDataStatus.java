package com.neobank.module.model;

/** Business outcomes plus the source feed's technical failure state. */
public enum RawDataStatus {
    COMPLETED,
    REJECTED,
    REFERRED,
    IN_PROGRESS,
    FAILED
}
