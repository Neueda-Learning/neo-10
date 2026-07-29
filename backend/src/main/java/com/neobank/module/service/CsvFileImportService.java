package com.neobank.module.service;

import com.neobank.module.dto.ProcessFileItemView;
import com.neobank.module.model.CardType;
import com.neobank.module.model.ProcessedFile;
import com.neobank.module.model.RawData;
import com.neobank.module.model.RawDataStatus;
import com.neobank.module.repository.ProcessedFileRepository;
import com.neobank.module.repository.RawDataRepository;
import java.io.IOException;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CsvFileImportService {
    private static final Pattern FILE_NAME = Pattern.compile("neo_daily_(\\d{4}-\\d{2}-\\d{2})\\.csv");
    private static final Set<String> CHANNELS = Set.of("WEB", "MOBILE_APP", "BRANCH", "AGGREGATOR");
    private static final List<String> REQUIRED_HEADERS = List.of(
            "application_id", "submitted_at", "channel", "product_code", "requested_limit", "status",
            "steps_reached", "stopped_at_step", "decline_reason_code", "decided_at", "granted_limit",
            "last_updated_at", "age_band", "residence_country", "employment_status", "annual_income",
            "dti_ratio", "credit_band", "apr", "screening_outcome", "kyc_outcome", "agreement_outcome");

    private final RawDataRepository rawData;
    private final ProcessedFileRepository processedFiles;

    public CsvFileImportService(RawDataRepository rawData, ProcessedFileRepository processedFiles) {
        this.rawData = rawData;
        this.processedFiles = processedFiles;
    }

    @Transactional
    public ProcessFileItemView importFile(Path path) {
        String filename = path.getFileName().toString();
        ParsedFile parsed = parse(path);
        rawData.saveAll(parsed.rows());
        ProcessedFile file = processedFiles.findByFilename(filename).orElseGet(() -> new ProcessedFile(filename));
        file.markProcessed(parsed.checksum(), parsed.rowsRead(), parsed.rows().size());
        processedFiles.save(file);
        return new ProcessFileItemView(filename, "PROCESSED", parsed.rowsRead(), parsed.rows().size(), null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ProcessFileItemView recordFailure(Path path, String error) {
        String filename = path.getFileName().toString();
        ProcessedFile file = processedFiles.findByFilename(filename).orElseGet(() -> new ProcessedFile(filename));
        file.markFailed(safeChecksum(path), 0, error);
        processedFiles.save(file);
        return new ProcessFileItemView(filename, "FAILED", 0, 0, error);
    }

    private ParsedFile parse(Path path) {
        String filename = path.getFileName().toString();
        Matcher matcher = FILE_NAME.matcher(filename);
        if (!matcher.matches()) throw new CsvValidationException(filename + ": expected neo_daily_YYYY-MM-DD.csv");
        LocalDate fileDate;
        try { fileDate = LocalDate.parse(matcher.group(1)); }
        catch (DateTimeParseException ex) { throw new CsvValidationException(filename + ": invalid file date"); }

        try (Reader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader().setSkipHeaderRecord(true).setTrim(true).setIgnoreSurroundingSpaces(true).build()
                     .parse(reader)) {
            Map<String, Integer> headers = parser.getHeaderMap();
            for (String required : REQUIRED_HEADERS) {
                boolean present = headers.keySet().stream().map(this::normaliseHeader).anyMatch(required::equals);
                if (!present) throw new CsvValidationException(filename + ": missing " + required + " column");
            }
            List<RawData> rows = new ArrayList<>();
            int rowsRead = 0;
            for (CSVRecord record : parser) {
                rowsRead++;
                rows.add(toEntity(record, filename, fileDate));
            }
            if (rows.isEmpty()) throw new CsvValidationException(filename + ": no data rows");
            return new ParsedFile(rowsRead, rows, checksum(path));
        } catch (IOException ex) {
            throw new CsvValidationException(filename + ": could not read CSV");
        }
    }

    private RawData toEntity(CSVRecord row, String filename, LocalDate fileDate) {
        long number = row.getRecordNumber() + 1;
        try {
            String channel = required(row, "channel", filename, number).toUpperCase(Locale.ROOT);
            if (!CHANNELS.contains(channel)) throw invalid(filename, number, "channel");
            int steps = Integer.parseInt(required(row, "steps_reached", filename, number));
            if (steps < 0 || steps > 8) throw invalid(filename, number, "steps_reached");
            return new RawData(
                    required(row, "application_id", filename, number),
                    instant(required(row, "submitted_at", filename, number), filename, number, "submitted_at"),
                    channel,
                    CardType.valueOf(required(row, "product_code", filename, number).toUpperCase(Locale.ROOT)),
                    decimal(required(row, "requested_limit", filename, number), filename, number, "requested_limit"),
                    RawDataStatus.valueOf(required(row, "status", filename, number).toUpperCase(Locale.ROOT)),
                    steps,
                    optional(row, "stopped_at_step"), optional(row, "decline_reason_code"),
                    optionalInstant(row, "decided_at", filename, number),
                    optionalDecimal(row, "granted_limit", filename, number),
                    instant(required(row, "last_updated_at", filename, number), filename, number, "last_updated_at"),
                    required(row, "age_band", filename, number), required(row, "residence_country", filename, number),
                    required(row, "employment_status", filename, number),
                    decimal(required(row, "annual_income", filename, number), filename, number, "annual_income"),
                    decimal(required(row, "dti_ratio", filename, number), filename, number, "dti_ratio"),
                    required(row, "credit_band", filename, number),
                    decimal(required(row, "apr", filename, number), filename, number, "apr"),
                    optional(row, "screening_outcome"), optional(row, "kyc_outcome"), optional(row, "agreement_outcome"),
                    filename, fileDate);
        } catch (IllegalArgumentException ex) {
            throw new CsvValidationException(filename + ": row " + number + " contains an unsupported enum value");
        }
    }

    private String required(CSVRecord row, String name, String filename, long number) {
        String value = get(row, name).trim();
        if (value.isEmpty()) throw new CsvValidationException(filename + ": row " + number + " has empty " + name);
        return value;
    }

    private String optional(CSVRecord row, String name) {
        String value = get(row, name).trim();
        return value.isEmpty() ? null : value;
    }

    private String get(CSVRecord row, String name) {
        for (String header : row.getParser().getHeaderMap().keySet()) {
            if (normaliseHeader(header).equals(name)) return row.get(header);
        }
        return "";
    }

    private String normaliseHeader(String value) { return value.replace("\uFEFF", "").trim().toLowerCase(Locale.ROOT); }

    private Instant instant(String value, String filename, long row, String field) {
        try { return Instant.parse(value); }
        catch (DateTimeParseException ex) { throw invalid(filename, row, field); }
    }

    private Instant optionalInstant(CSVRecord record, String name, String filename, long row) {
        String value = optional(record, name); return value == null ? null : instant(value, filename, row, name);
    }

    private BigDecimal decimal(String value, String filename, long row, String field) {
        try { return new BigDecimal(value); }
        catch (NumberFormatException ex) { throw invalid(filename, row, field); }
    }

    private BigDecimal optionalDecimal(CSVRecord record, String name, String filename, long row) {
        String value = optional(record, name); return value == null ? null : decimal(value, filename, row, name);
    }

    private CsvValidationException invalid(String filename, long row, String field) {
        return new CsvValidationException(filename + ": row " + row + " has invalid " + field);
    }

    private String safeChecksum(Path path) {
        try { return checksum(path); } catch (CsvValidationException ex) { return null; }
    }

    private String checksum(Path path) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(path)));
        } catch (IOException | NoSuchAlgorithmException ex) {
            throw new CsvValidationException(path.getFileName() + ": checksum could not be calculated");
        }
    }

    private record ParsedFile(int rowsRead, List<RawData> rows, String checksum) { }
}
