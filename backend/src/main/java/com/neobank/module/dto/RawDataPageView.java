package com.neobank.module.dto;

import java.util.List;

public record RawDataPageView(long total, List<RawDataView> items) { }
