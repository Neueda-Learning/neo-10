package com.neobank.module.dto;

public record ResetDataResponse(
        String status,
        long rawRowsDeleted,
        long processedFilesDeleted,
        long demoRowsDeleted) { }
