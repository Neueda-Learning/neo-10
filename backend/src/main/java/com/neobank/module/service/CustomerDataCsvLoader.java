package com.neobank.module.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class CustomerDataCsvLoader implements ApplicationRunner {

    private static final String RESOURCE_PATTERN = "classpath*:custumor_data/*.csv";
    private static final String PROCESSED_STATUS = "PROCESSED";

    private final JdbcTemplate jdbcTemplate;
    private final PathMatchingResourcePatternResolver resourceResolver =
        new PathMatchingResourcePatternResolver();

    public CustomerDataCsvLoader(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** What one call to {@link #loadAll()} did — read by the admin endpoint that triggers it. */
    public record LoadSummary(List<String> loadedFiles, List<String> skippedFiles, int rowsInserted) {
    }

    @Override
    public void run(ApplicationArguments args) {
        // Startup keeps doing exactly what it always did — just via the shared method, so the
        // manual trigger (CustomerDataController) and the automatic one can never drift apart.
        loadAll();
    }

    /**
     * Scan {@code custumor_data/*.csv}, skip files already recorded in {@code processed}, load the
     * rest into {@code raw_data}, and record their filenames as processed. Safe to call more than
     * once — already-processed files are always skipped.
     */
    public LoadSummary loadAll() {
        try {
            Resource[] csvResources = resourceResolver.getResources(RESOURCE_PATTERN);
            Arrays.sort(csvResources, Comparator.comparing(this::resourceName));

            List<String> loadedFiles = new ArrayList<>();
            List<String> skippedFiles = new ArrayList<>();
            int rowsInserted = 0;

            for (Resource csvResource : csvResources) {
                String filename = resourceName(csvResource);
                if (alreadyProcessed(filename)) {
                    skippedFiles.add(filename);
                    continue;
                }

                rowsInserted += loadCsvIntoRawData(csvResource);
                markFileAsProcessed(filename);
                loadedFiles.add(filename);
            }

            return new LoadSummary(loadedFiles, skippedFiles, rowsInserted);
        } catch (IOException e) {
            throw new UncheckedIOException("Unable to load customer data CSV files", e);
        }
    }

    private boolean alreadyProcessed(String filename) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM processed WHERE filename = ?",
            Integer.class,
            filename
        );
        return count != null && count > 0;
    }

    private int loadCsvIntoRawData(Resource csvResource) throws IOException {
        int rowsInserted = 0;
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(csvResource.getInputStream(), StandardCharsets.UTF_8)
        )) {
            String line = reader.readLine();
            if (line == null) {
                return rowsInserted;
            }

            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }

                String[] fields = line.split(",", -1);
                if (fields.length != 4) {
                    throw new IllegalStateException("Unexpected CSV format in " + resourceName(csvResource));
                }

                Timestamp timestamp = Timestamp.valueOf(fields[3].trim());
                LocalDate appliedDate = timestamp.toLocalDateTime().toLocalDate();

                jdbcTemplate.update(
                    "INSERT INTO raw_data (status, card_type, applied_date) VALUES (?, ?, ?)",
                    fields[1].trim(),
                    fields[2].trim(),
                    Date.valueOf(appliedDate)
                );
                rowsInserted++;
            }
        }
        return rowsInserted;
    }

    private void markFileAsProcessed(String filename) {
        jdbcTemplate.update(
            "INSERT INTO processed (filename, status) VALUES (?, ?)",
            filename,
            PROCESSED_STATUS
        );
    }

    private String resourceName(Resource resource) {
        try {
            return resource.getFilename() == null ? resource.getURL().toString() : resource.getFilename();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to resolve resource name", exception);
        }
    }
}