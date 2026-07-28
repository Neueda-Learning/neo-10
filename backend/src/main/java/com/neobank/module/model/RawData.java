package com.neobank.module.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "raw_data")
public class RawData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "status", nullable = false, length = 150)
    private String status;

    @Column(name = "card_type", nullable = false, length = 32)
    private String cardType;

    @Column(name = "applied_date", nullable = false)
    private LocalDate appliedDate;

    protected RawData() {
        // JPA
    }

    public RawData(String status, String cardType, LocalDate appliedDate) {
        this.status = status;
        this.cardType = cardType;
        this.appliedDate = appliedDate;
    }

    public Long getId() {
        return id;
    }

    public String getStatus() {
        return status;
    }

    public String getCardType() {
        return cardType;
    }

    public LocalDate getAppliedDate() {
        return appliedDate;
    }
}
