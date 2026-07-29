package com.neobank.module.dto;

import java.util.List;

public record ProcessedFilesResponse(long total, List<ProcessedFileView> items) { }
