package com.neobank.module.dto;

import java.util.List;

public record ProcessFileResponse(String status, int rowsInserted, List<ProcessFileItemView> results) { }
