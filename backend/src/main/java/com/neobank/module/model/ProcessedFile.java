package com.neobank.module.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "processed_files")
public class ProcessedFile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 150, unique = true) private String filename;
    @Column(length = 64) private String checksum;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private ProcessedFileStatus status;
    @Column(name = "rows_read", nullable = false) private int rowsRead;
    @Column(name = "rows_inserted", nullable = false) private int rowsInserted;
    @Column(name = "error_message", length = 1000) private String errorMessage;
    @Column(name = "processed_at", nullable = false) private Instant processedAt;

    protected ProcessedFile() { }

    public ProcessedFile(String filename) {
        this.filename = filename;
        this.status = ProcessedFileStatus.FAILED;
        this.processedAt = Instant.now();
    }

    public void markProcessed(String checksum, int rowsRead, int rowsInserted) {
        this.checksum = checksum; this.rowsRead = rowsRead; this.rowsInserted = rowsInserted;
        this.status = ProcessedFileStatus.PROCESSED; this.errorMessage = null; this.processedAt = Instant.now();
    }

    public void markFailed(String checksum, int rowsRead, String errorMessage) {
        this.checksum = checksum; this.rowsRead = rowsRead; this.rowsInserted = 0;
        this.status = ProcessedFileStatus.FAILED; this.errorMessage = errorMessage; this.processedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getFilename() { return filename; }
    public String getChecksum() { return checksum; }
    public ProcessedFileStatus getStatus() { return status; }
    public int getRowsRead() { return rowsRead; }
    public int getRowsInserted() { return rowsInserted; }
    public String getErrorMessage() { return errorMessage; }
    public Instant getProcessedAt() { return processedAt; }
}
