package com.neobank.module.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "processed")
public class ProcessedFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150, unique = true)
    private String filename;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ProcessedFileStatus status;

    protected ProcessedFile() { }

    public ProcessedFile(String filename, ProcessedFileStatus status) {
        this.filename = filename;
        this.status = status;
    }

    public void markProcessed() { this.status = ProcessedFileStatus.PROCESSED; }
    public void markFailed() { this.status = ProcessedFileStatus.FAILED; }
    public Long getId() { return id; }
    public String getFilename() { return filename; }
    public ProcessedFileStatus getStatus() { return status; }
}
