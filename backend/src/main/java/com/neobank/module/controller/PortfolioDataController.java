package com.neobank.module.controller;

import com.neobank.module.dto.AnalyticsView;
import com.neobank.module.dto.ProcessFileResponse;
import com.neobank.module.dto.ProcessedFilesResponse;
import com.neobank.module.dto.RawDataPageView;
import com.neobank.module.dto.ResetDataResponse;
import com.neobank.module.service.PortfolioDataService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PortfolioDataController {
    private final PortfolioDataService portfolioData;

    public PortfolioDataController(PortfolioDataService portfolioData) { this.portfolioData = portfolioData; }

    @PostMapping("/files/scan")
    public ProcessFileResponse scanFiles() { return portfolioData.scanFolder(); }

    @DeleteMapping("/data/reset")
    public ResetDataResponse resetData() { return portfolioData.resetData(); }

    @GetMapping("/raw-data")
    public RawDataPageView rawData(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "ALL") String productCode,
            @RequestParam(defaultValue = "ALL") String channel,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return portfolioData.rawData(from, to, productCode, channel, page, size);
    }

    @GetMapping("/dashboard/analytics")
    public AnalyticsView analytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "ALL") String productCode,
            @RequestParam(defaultValue = "ALL") String channel) {
        return portfolioData.analytics(from, to, productCode, channel);
    }

    @GetMapping("/processed-files")
    public ProcessedFilesResponse processedFiles() { return portfolioData.processedFiles(); }
}
