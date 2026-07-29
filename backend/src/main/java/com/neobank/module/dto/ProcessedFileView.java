package com.neobank.module.dto;

import com.neobank.module.model.ProcessedFile;

public record ProcessedFileView(Long id, String filename, String checksum, String status,
        int rowsRead, int rowsInserted, String errorMessage, java.time.Instant processedAt) {
    public static ProcessedFileView of(ProcessedFile file) {
        return new ProcessedFileView(file.getId(), file.getFilename(), file.getChecksum(), file.getStatus().name(),
                file.getRowsRead(), file.getRowsInserted(), file.getErrorMessage(), file.getProcessedAt());
    }
}
