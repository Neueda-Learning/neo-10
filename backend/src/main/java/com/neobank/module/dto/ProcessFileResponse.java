package com.neobank.module.dto;

import java.util.List;

public record ProcessFileResponse(
        String status,
        int filesFound,
        int filesProcessed,
        int filesSkipped,
        int filesFailed,
        int rowsInserted,
        List<ProcessFileItemView> results) { }
