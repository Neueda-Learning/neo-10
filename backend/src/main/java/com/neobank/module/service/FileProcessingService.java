package com.neobank.module.service;

import com.neobank.module.dto.ProcessFilesResponse;
import com.neobank.module.model.ProcessedFile;
import com.neobank.module.model.RawData;
import com.neobank.module.repository.ProcessedFileRepository;
import com.neobank.module.repository.RawDataRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class FileProcessingService {

    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final Set<String> VALID_STATUSES = Set.of("ACCEPTED", "DECLINED", "COMPLETED");

    private final RawDataRepository rawDataRepository;
    private final ProcessedFileRepository processedFileRepository;
    private final TransactionTemplate transactionTemplate;
    private final Path resourcesDirectory;

    public FileProcessingService(RawDataRepository rawDataRepository,
            ProcessedFileRepository processedFileRepository,
            TransactionTemplate transactionTemplate,
            @Value("${file-processing.directory:resources}") String resourcesDirectory) {
        this.rawDataRepository = rawDataRepository;
        this.processedFileRepository = processedFileRepository;
        this.transactionTemplate = transactionTemplate;
        this.resourcesDirectory = Paths.get(resourcesDirectory);
    }

    public ProcessFilesResponse processFiles() {
        List<Path> csvFiles = listCsvFiles(resourcesDirectory);
        int processedCount = 0;

        for (Path file : csvFiles) {
            String filename = file.getFileName().toString();
            if (processedFileRepository.existsByFilenameAndStatus(filename, STATUS_COMPLETED)) {
                continue;
            }

            List<RawData> rows = parseRows(file);
            transactionTemplate.executeWithoutResult(status -> {
                rawDataRepository.saveAll(rows);
                upsertProcessedStatus(filename, STATUS_COMPLETED);
            });
            processedCount++;
        }

        if (processedCount > 0) {
            return new ProcessFilesResponse(
                    "SUCCESS",
                    "Processed new file(s) from resources directory");
        }

        return new ProcessFilesResponse(
                "NO_NEW_FILES",
                "All files in resources have already been processed");
    }

    private void upsertProcessedStatus(String filename, String status) {
        ProcessedFile processedFile = processedFileRepository.findFirstByFilenameOrderByIdDesc(filename)
                .orElseGet(() -> new ProcessedFile(filename, status));
        processedFile.markStatus(status);
        processedFileRepository.save(processedFile);
    }

    private List<Path> listCsvFiles(Path directory) {
        if (!Files.exists(directory) || !Files.isDirectory(directory)) {
            return List.of();
        }

        try (Stream<Path> files = Files.list(directory)) {
            return files
                    .filter(path -> Files.isRegularFile(path))
                    .filter(path -> path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".csv"))
                    .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .toList();
        } catch (IOException e) {
            throw new IllegalStateException("Unable to scan resources directory: " + directory, e);
        }
    }

    private List<RawData> parseRows(Path csvPath) {
        List<String> lines;
        try {
            lines = Files.readAllLines(csvPath, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to read CSV file: " + csvPath.getFileName(), e);
        }

        if (lines.isEmpty()) {
            throw new IllegalArgumentException("CSV is empty: " + csvPath.getFileName());
        }

        Map<String, Integer> headerIndex = parseHeader(lines.getFirst(), csvPath);
        List<RawData> rows = new ArrayList<>();

        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i).trim();
            if (line.isEmpty()) {
                continue;
            }

            String[] values = splitCsvLine(line);
            String status = readRequired(values, headerIndex, "status", csvPath, i + 1).toUpperCase(Locale.ROOT);
            String cardType = readRequired(values, headerIndex, "card_type", csvPath, i + 1);
            String appliedDateValue = readRequired(values, headerIndex, "applied_date", csvPath, i + 1);

            if (!VALID_STATUSES.contains(status)) {
                throw new IllegalArgumentException(
                        "Invalid status in " + csvPath.getFileName() + " at line " + (i + 1) + ": " + status);
            }

            LocalDate appliedDate;
            try {
                appliedDate = LocalDate.parse(appliedDateValue);
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException(
                        "Invalid applied_date in " + csvPath.getFileName() + " at line " + (i + 1));
            }

            rows.add(new RawData(status, cardType, appliedDate));
        }

        return rows;
    }

    private Map<String, Integer> parseHeader(String headerLine, Path csvPath) {
        String[] headers = splitCsvLine(headerLine);
        Map<String, Integer> indexMap = new HashMap<>();

        for (int i = 0; i < headers.length; i++) {
            indexMap.put(headers[i].trim().toLowerCase(Locale.ROOT), i);
        }

        requireColumn(indexMap, "status", csvPath);
        requireColumn(indexMap, "card_type", csvPath);
        requireColumn(indexMap, "applied_date", csvPath);
        return indexMap;
    }

    private void requireColumn(Map<String, Integer> indexMap, String column, Path csvPath) {
        if (!indexMap.containsKey(column)) {
            throw new IllegalArgumentException("Missing required column '" + column + "' in "
                    + csvPath.getFileName());
        }
    }

    private String readRequired(String[] values,
            Map<String, Integer> headerIndex,
            String column,
            Path csvPath,
            int lineNumber) {
        int index = headerIndex.get(column);
        if (index >= values.length) {
            throw new IllegalArgumentException("Missing value for '" + column + "' in "
                    + csvPath.getFileName() + " at line " + lineNumber);
        }

        String value = values[index].trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException("Blank value for '" + column + "' in "
                    + csvPath.getFileName() + " at line " + lineNumber);
        }
        return value;
    }

    private String[] splitCsvLine(String line) {
        return line.split(",", -1);
    }
}
