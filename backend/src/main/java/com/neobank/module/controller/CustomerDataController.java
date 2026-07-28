package com.neobank.module.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.neobank.module.service.CustomerDataCsvLoader;
import com.neobank.module.service.CustomerDataCsvLoader.LoadSummary;

/**
 * Admin/data-ops endpoint for this module's own CSV ingestion pipeline.
 *
 * <p><b>Not part of the orchestrator contract.</b> {@code api-contract.md} only fixes
 * {@code /api/v1/applications}; this is a separate feature this module added for itself, so a UI
 * button calling it is not the "module calls itself" shortcut {@link ApplicationController}'s
 * Javadoc warns against — it just lets an operator (re)run the same load that
 * {@link CustomerDataCsvLoader} already performs once at startup.</p>
 */
@RestController
@RequestMapping("/api/v1/customer-data")
public class CustomerDataController {

    private final CustomerDataCsvLoader loader;

    public CustomerDataController(CustomerDataCsvLoader loader) {
        this.loader = loader;
    }

    /**
     * (Re)load {@code custumor_data/*.csv} into {@code raw_data}. Already-processed files are
     * skipped, so calling this repeatedly is safe — it only ever loads what is new.
     */
    @PostMapping("/load")
    public ResponseEntity<LoadSummary> load() {
        return ResponseEntity.ok(loader.loadAll());
    }
}
