package com.neobank.module.service;

import com.neobank.module.dto.AnalyticsView;
import com.neobank.module.dto.CardTypeCountView;
import com.neobank.module.dto.CardTypeStatusView;
import com.neobank.module.dto.ProcessFileItemView;
import com.neobank.module.dto.ProcessFileResponse;
import com.neobank.module.dto.ProcessedFileView;
import com.neobank.module.dto.ProcessedFilesResponse;
import com.neobank.module.dto.QuarterlyBreakdownView;
import com.neobank.module.dto.RawDataPageView;
import com.neobank.module.dto.RawDataView;
import com.neobank.module.dto.StatusCountView;
import com.neobank.module.model.CardType;
import com.neobank.module.model.ProcessedFile;
import com.neobank.module.model.ProcessedFileStatus;
import com.neobank.module.model.RawData;
import com.neobank.module.model.RawDataStatus;
import com.neobank.module.repository.ProcessedFileRepository;
import com.neobank.module.repository.RawDataRepository;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PortfolioDataService {

    private final RawDataRepository rawData;
    private final ProcessedFileRepository processedFiles;

    public PortfolioDataService(RawDataRepository rawData, ProcessedFileRepository processedFiles) {
        this.rawData = rawData;
        this.processedFiles = processedFiles;
    }

    /** Processes each selected CSV once; a PROCESSED filename is never inserted twice. */
    @Transactional
    public ProcessFileResponse processFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("choose at least one CSV file");
        }

        List<ProcessFileItemView> results = new ArrayList<>();
        int rowsInserted = 0;
        for (MultipartFile file : files) {
            String filename = filename(file);
            Optional<ProcessedFile> existing = processedFiles.findByFilename(filename);
            if (existing.isPresent() && existing.get().getStatus() == ProcessedFileStatus.PROCESSED) {
                results.add(new ProcessFileItemView(filename, "ALREADY_IMPORTED", 0, null));
                continue;
            }

            try {
                List<RawData> parsedRows = parse(file, filename);
                rawData.saveAll(parsedRows);
                ProcessedFile processed = existing.orElseGet(() -> new ProcessedFile(filename, ProcessedFileStatus.PROCESSED));
                processed.markProcessed();
                processedFiles.save(processed);
                rowsInserted += parsedRows.size();
                results.add(new ProcessFileItemView(filename, "PROCESSED", parsedRows.size(), null));
            } catch (CsvValidationException ex) {
                ProcessedFile failed = existing.orElseGet(() -> new ProcessedFile(filename, ProcessedFileStatus.FAILED));
                failed.markFailed();
                processedFiles.save(failed);
                results.add(new ProcessFileItemView(filename, "FAILED", 0, ex.getMessage()));
            }
        }

        boolean anyProcessed = results.stream().anyMatch(item -> item.result().equals("PROCESSED"));
        boolean anyFailed = results.stream().anyMatch(item -> item.result().equals("FAILED"));
        String status = anyFailed && anyProcessed ? "PARTIAL_SUCCESS" : anyFailed ? "FAILED" : anyProcessed ? "SUCCESS" : "NO_NEW_FILES";
        return new ProcessFileResponse(status, rowsInserted, results);
    }

    @Transactional(readOnly = true)
    public RawDataPageView rawData(LocalDate from, LocalDate to, String cardType, int page, int size) {
        List<RawData> filtered = filteredRows(from, to, cardType);
        int start = Math.min(Math.max(page, 0) * Math.max(size, 1), filtered.size());
        int end = Math.min(start + Math.min(Math.max(size, 1), 200), filtered.size());
        return new RawDataPageView(filtered.size(), filtered.subList(start, end).stream().map(RawDataView::of).toList());
    }

    @Transactional(readOnly = true)
    public AnalyticsView analytics(LocalDate from, LocalDate to, String cardType) {
        List<RawData> filtered = filteredRows(from, to, cardType);
        EnumMap<RawDataStatus, Long> statusCounts = new EnumMap<>(RawDataStatus.class);
        EnumMap<CardType, Long> cardCounts = new EnumMap<>(CardType.class);
        for (RawDataStatus status : RawDataStatus.values()) statusCounts.put(status, 0L);
        for (CardType type : CardType.values()) cardCounts.put(type, 0L);
        for (RawData row : filtered) {
            statusCounts.compute(row.getStatus(), (key, count) -> count + 1);
            cardCounts.compute(row.getCardType(), (key, count) -> count + 1);
        }

        List<StatusCountView> statusBreakdown = List.of(
                new StatusCountView("COMPLETED", statusCounts.get(RawDataStatus.COMPLETED)),
                new StatusCountView("REJECTED", statusCounts.get(RawDataStatus.REJECTED)),
                new StatusCountView("IN_PROGRESS", statusCounts.get(RawDataStatus.IN_PROGRESS)));
        List<CardTypeCountView> cardTypeBreakdown = List.of(
                new CardTypeCountView("PREMIUM_CARD", cardCounts.get(CardType.PREMIUM_CARD)),
                new CardTypeCountView("PLATINUM_CARD", cardCounts.get(CardType.PLATINUM_CARD)));
        List<CardTypeStatusView> cardTypeStatusBreakdown = List.of(
                cardTypeStatus(filtered, CardType.PREMIUM_CARD), cardTypeStatus(filtered, CardType.PLATINUM_CARD));
        List<QuarterlyBreakdownView> quarterlyBreakdown = List.of(quarter(filtered, 1), quarter(filtered, 2), quarter(filtered, 3), quarter(filtered, 4));
        return new AnalyticsView(filtered.size(), statusBreakdown, cardTypeBreakdown, cardTypeStatusBreakdown, quarterlyBreakdown);
    }

    @Transactional(readOnly = true)
    public ProcessedFilesResponse processedFiles() {
        List<ProcessedFileView> items = processedFiles.findAllByOrderByIdDesc().stream().map(ProcessedFileView::of).toList();
        return new ProcessedFilesResponse(items.size(), items);
    }

    private List<RawData> filteredRows(LocalDate from, LocalDate to, String cardType) {
        if (from != null && to != null && from.isAfter(to)) throw new IllegalArgumentException("from must be on or before to");
        CardType type = parseFilterCardType(cardType);
        if (from == null || to == null) {
            return rawData.findAllByOrderByAppliedDateDescIdDesc().stream()
                    .filter(row -> (from == null || !row.getAppliedDate().isBefore(from)) && (to == null || !row.getAppliedDate().isAfter(to)))
                    .filter(row -> type == null || row.getCardType() == type)
                    .toList();
        }
        return type == null ? rawData.findByAppliedDateBetweenOrderByAppliedDateDescIdDesc(from, to)
                : rawData.findByAppliedDateBetweenAndCardTypeOrderByAppliedDateDescIdDesc(from, to, type);
    }

    private CardTypeStatusView cardTypeStatus(List<RawData> rows, CardType cardType) {
        long completed = rows.stream().filter(row -> row.getCardType() == cardType && row.getStatus() == RawDataStatus.COMPLETED).count();
        long rejected = rows.stream().filter(row -> row.getCardType() == cardType && row.getStatus() == RawDataStatus.REJECTED).count();
        long inProgress = rows.stream().filter(row -> row.getCardType() == cardType && row.getStatus() == RawDataStatus.IN_PROGRESS).count();
        return new CardTypeStatusView(cardType.name(), completed, rejected, inProgress, completed + rejected + inProgress);
    }

    private QuarterlyBreakdownView quarter(List<RawData> rows, int quarter) {
        List<RawData> quarterRows = rows.stream().filter(row -> ((row.getAppliedDate().getMonthValue() - 1) / 3) + 1 == quarter).toList();
        long completed = quarterRows.stream().filter(row -> row.getStatus() == RawDataStatus.COMPLETED).count();
        long rejected = quarterRows.stream().filter(row -> row.getStatus() == RawDataStatus.REJECTED).count();
        long inProgress = quarterRows.stream().filter(row -> row.getStatus() == RawDataStatus.IN_PROGRESS).count();
        return new QuarterlyBreakdownView("Q" + quarter, completed, rejected, inProgress, completed + rejected + inProgress);
    }

    private List<RawData> parse(MultipartFile file, String filename) {
        if (file.isEmpty()) throw new CsvValidationException(filename + ": file is empty");
        if (!filename.toLowerCase(Locale.ROOT).endsWith(".csv")) throw new CsvValidationException(filename + ": file must be a CSV");
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) throw new CsvValidationException(filename + ": missing header row");
            Map<String, Integer> headers = headers(headerLine);
            require(headers, "status", filename);
            require(headers, "card_type", filename);
            int dateIndex = headers.containsKey("applied_date") ? headers.get("applied_date") : headers.getOrDefault("timestamp", -1);
            if (dateIndex < 0) throw new CsvValidationException(filename + ": missing applied_date or timestamp column");

            List<RawData> result = new ArrayList<>();
            String line;
            int rowNumber = 1;
            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.isBlank()) continue;
                String[] values = line.split(",", -1);
                result.add(new RawData(
                        parseStatus(value(values, headers.get("status"), filename, rowNumber)),
                        parseCardType(value(values, headers.get("card_type"), filename, rowNumber)),
                        parseDate(value(values, dateIndex, filename, rowNumber), filename, rowNumber)));
            }
            if (result.isEmpty()) throw new CsvValidationException(filename + ": no data rows");
            return result;
        } catch (IOException ex) {
            throw new CsvValidationException(filename + ": could not read file");
        }
    }

    private Map<String, Integer> headers(String line) {
        Map<String, Integer> result = new HashMap<>();
        String[] values = line.replace("\uFEFF", "").split(",", -1);
        for (int index = 0; index < values.length; index++) result.put(values[index].trim().toLowerCase(Locale.ROOT), index);
        return result;
    }

    private void require(Map<String, Integer> headers, String name, String filename) {
        if (!headers.containsKey(name)) throw new CsvValidationException(filename + ": missing " + name + " column");
    }

    private String value(String[] values, int index, String filename, int rowNumber) {
        if (index >= values.length || values[index].trim().isEmpty()) throw new CsvValidationException(filename + ": row " + rowNumber + " has an empty required value");
        return values[index].trim();
    }

    private RawDataStatus parseStatus(String source) {
        return switch (source.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_')) {
            case "COMPLETED", "COM" -> RawDataStatus.COMPLETED;
            case "REJECTED", "REJ", "DECLINED" -> RawDataStatus.REJECTED;
            case "IN_PROGRESS", "INPROGRESS", "ACCEPTED" -> RawDataStatus.IN_PROGRESS;
            default -> throw new CsvValidationException("unsupported status: " + source);
        };
    }

    private CardType parseCardType(String source) {
        return switch (source.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_')) {
            case "PREMIUM", "PREMIUM_CARD" -> CardType.PREMIUM_CARD;
            case "PLATINUM", "PLATINUM_CARD" -> CardType.PLATINUM_CARD;
            default -> throw new CsvValidationException("unsupported card_type: " + source);
        };
    }

    private CardType parseFilterCardType(String source) {
        if (source == null || source.isBlank() || source.equalsIgnoreCase("ALL")) return null;
        return parseCardType(source);
    }

    private LocalDate parseDate(String source, String filename, int rowNumber) {
        try {
            String date = source.length() >= 10 ? source.substring(0, 10) : source;
            return LocalDate.parse(date);
        } catch (DateTimeParseException ex) {
            throw new CsvValidationException(filename + ": row " + rowNumber + " has an invalid date");
        }
    }

    private String filename(MultipartFile file) {
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) throw new IllegalArgumentException("uploaded file must have a filename");
        return filename.replace('\\', '/').substring(filename.replace('\\', '/').lastIndexOf('/') + 1);
    }
}
