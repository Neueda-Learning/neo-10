package com.neobank.module.dto;

public record ProcessFileItemView(String filename, String result, int rowsInserted, String error) { }
