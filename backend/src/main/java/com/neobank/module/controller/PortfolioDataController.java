package com.neobank.module.controller;

import com.neobank.module.dto.AnalyticsView;
import com.neobank.module.dto.ProcessFileResponse;
import com.neobank.module.dto.ProcessedFilesResponse;
import com.neobank.module.dto.RawDataPageView;
import com.neobank.module.service.PortfolioDataService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class PortfolioDataController {

    private final PortfolioDataService portfolioData;

    public PortfolioDataController(PortfolioDataService portfolioData) {
        this.portfolioData = portfolioData;
    }

    /** One import operation; the upload alias preserves the first front-end contract. */
    @PostMapping(value = {"/processFile", "/raw-data/upload"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProcessFileResponse> processFile(@RequestParam("files") List<MultipartFile> files) {
        ProcessFileResponse response = portfolioData.processFiles(files);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/raw-data")
    public RawDataPageView rawData(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "ALL") String cardType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return portfolioData.rawData(from, to, cardType, page, size);
    }

    @GetMapping("/dashboard/analytics")
    public AnalyticsView analytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "ALL") String cardType) {
        return portfolioData.analytics(from, to, cardType);
    }

    @GetMapping("/processed-files")
    public ProcessedFilesResponse processedFiles() {
        return portfolioData.processedFiles();
    }
}
