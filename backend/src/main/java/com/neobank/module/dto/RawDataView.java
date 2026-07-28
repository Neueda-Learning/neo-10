package com.neobank.module.dto;

import com.neobank.module.model.RawData;
import java.time.LocalDate;

public record RawDataView(Long id, String status, String cardType, LocalDate appliedDate) {
    public static RawDataView of(RawData row) {
        return new RawDataView(row.getId(), row.getStatus().name(), row.getCardType().name(), row.getAppliedDate());
    }
}
