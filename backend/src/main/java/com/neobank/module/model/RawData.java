package com.neobank.module.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 150)
    private RawDataStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", nullable = false, length = 32)
    private CardType cardType;

    @Column(name = "applied_date", nullable = false)
    private LocalDate appliedDate;

    protected RawData() { }

    public RawData(RawDataStatus status, CardType cardType, LocalDate appliedDate) {
        this.status = status;
        this.cardType = cardType;
        this.appliedDate = appliedDate;
    }

    public Long getId() { return id; }
    public RawDataStatus getStatus() { return status; }
    public CardType getCardType() { return cardType; }
    public LocalDate getAppliedDate() { return appliedDate; }
}
