package com.neobank.module.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Column(name = "filename", nullable = false, length = 150)
    private String filename;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    protected ProcessedFile() {
        // JPA
    }

    public ProcessedFile(String filename, String status) {
        this.filename = filename;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public String getFilename() {
        return filename;
    }

    public String getStatus() {
        return status;
    }

    public void markStatus(String status) {
        this.status = status;
    }
}
