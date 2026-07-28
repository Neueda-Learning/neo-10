package com.neobank.module.dto;

import com.neobank.module.model.ProcessedFile;

public record ProcessedFileView(Long id, String filename, String status) {
    public static ProcessedFileView of(ProcessedFile file) {
        return new ProcessedFileView(file.getId(), file.getFilename(), file.getStatus().name());
    }
}
