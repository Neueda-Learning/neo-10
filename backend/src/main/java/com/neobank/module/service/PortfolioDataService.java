package com.neobank.module.service;

import com.neobank.module.dto.AnalyticsView;
import com.neobank.module.dto.AnalyticsView.JourneyStepView;
import com.neobank.module.dto.AnalyticsView.LabelCountView;
import com.neobank.module.dto.AnalyticsView.LimitComparisonView;
import com.neobank.module.dto.AnalyticsView.OutcomeGroupView;
import com.neobank.module.dto.AnalyticsView.RateView;
import com.neobank.module.dto.AnalyticsView.ReasonCountView;
import com.neobank.module.dto.AnalyticsView.TimeStatusView;
import com.neobank.module.dto.ProcessFileItemView;
import com.neobank.module.dto.ProcessFileResponse;
import com.neobank.module.dto.ProcessedFileView;
import com.neobank.module.dto.ProcessedFilesResponse;
import com.neobank.module.dto.RawDataPageView;
import com.neobank.module.dto.RawDataView;
import com.neobank.module.dto.ResetDataResponse;
import com.neobank.module.dto.StatusCountView;
import com.neobank.module.model.CardType;
import com.neobank.module.model.ProcessedFileStatus;
import com.neobank.module.model.RawData;
import com.neobank.module.model.RawDataStatus;
import com.neobank.module.repository.DemoShowcaseRepository;
import com.neobank.module.repository.ProcessedFileRepository;
import com.neobank.module.repository.RawDataRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PortfolioDataService {
    private static final Pattern DAILY_FILE = Pattern.compile("neo_daily_\\d{4}-\\d{2}-\\d{2}\\.csv");
    private static final List<String> STEPS = List.of("verification", "policy", "kyc", "screening", "credit", "agreement", "account", "card");
    private final RawDataRepository rawData;
    private final ProcessedFileRepository processedFiles;
    private final DemoShowcaseRepository demoShowcase;
    private final CsvFileImportService importer;
    private final Path dataDirectory;

    public PortfolioDataService(RawDataRepository rawData, ProcessedFileRepository processedFiles,
            DemoShowcaseRepository demoShowcase, CsvFileImportService importer,
            @Value("${portfolio.data-directory}") String dataDirectory) {
        this.rawData = rawData; this.processedFiles = processedFiles; this.demoShowcase = demoShowcase;
        this.importer = importer;
        Path configuredDirectory = Path.of(dataDirectory).normalize();
        if (configuredDirectory.isAbsolute()) {
            throw new IllegalArgumentException("portfolio.data-directory must be a relative path");
        }
        // Resolve once against the backend process working directory. Configuration
        // remains portable across local, Docker and AWS environments.
        this.dataDirectory = configuredDirectory.toAbsolutePath().normalize();
    }

    public ProcessFileResponse scanFolder() {
        if (!Files.isDirectory(dataDirectory)) throw new IllegalArgumentException("CSV directory does not exist: " + dataDirectory);
        List<Path> files;
        try (var stream = Files.list(dataDirectory)) {
            files = stream.filter(Files::isRegularFile)
                    .filter(path -> DAILY_FILE.matcher(path.getFileName().toString()).matches())
                    .sorted(Comparator.comparing(path -> path.getFileName().toString())).toList();
        } catch (IOException ex) { throw new IllegalArgumentException("CSV directory could not be read"); }

        List<ProcessFileItemView> results = new ArrayList<>();
        int processed = 0, skipped = 0, failed = 0, inserted = 0;
        for (Path path : files) {
            var existing = processedFiles.findByFilename(path.getFileName().toString());
            if (existing.isPresent() && existing.get().getStatus() == ProcessedFileStatus.PROCESSED) {
                skipped++;
                results.add(new ProcessFileItemView(path.getFileName().toString(), "SKIPPED", 0, 0, null));
                continue;
            }
            try {
                ProcessFileItemView result = importer.importFile(path);
                results.add(result); processed++; inserted += result.rowsInserted();
            } catch (CsvValidationException ex) {
                results.add(importer.recordFailure(path, ex.getMessage())); failed++;
            }
        }
        String status = processed == 0 && failed == 0 ? "NO_NEW_FILES" : failed > 0 && processed > 0 ? "PARTIAL_SUCCESS" : failed > 0 ? "FAILED" : "SUCCESS";
        return new ProcessFileResponse(status, files.size(), processed, skipped, failed, inserted, results);
    }

    @Transactional
    public ResetDataResponse resetData() {
        long rows = rawData.count(), files = processedFiles.count(), demoRows = demoShowcase.count();
        rawData.deleteAllInBatch();
        processedFiles.deleteAllInBatch();
        demoShowcase.deleteAllInBatch();
        return new ResetDataResponse("RESET_COMPLETE", rows, files, demoRows);
    }

    @Transactional(readOnly = true)
    public RawDataPageView rawData(LocalDate from, LocalDate to, String productCode, String channel, int page, int size) {
        List<RawData> filtered = filteredRows(from, to, productCode, channel);
        int safeSize = Math.min(Math.max(size, 1), 200);
        int start = Math.min(Math.max(page, 0) * safeSize, filtered.size());
        int end = Math.min(start + safeSize, filtered.size());
        return new RawDataPageView(filtered.size(), filtered.subList(start, end).stream().map(RawDataView::of).toList());
    }

    @Transactional(readOnly = true)
    public AnalyticsView analytics(LocalDate from, LocalDate to, String productCode, String channel) {
        List<RawData> rows = filteredRows(from, to, productCode, channel);
        EnumMap<RawDataStatus, Long> statuses = statusCounts(rows);
        long completed = statuses.get(RawDataStatus.COMPLETED);
        BigDecimal requested = sum(rows, RawData::getRequestedLimit);
        BigDecimal granted = sum(rows, RawData::getGrantedLimit);
        List<Long> decisionMinutes = rows.stream().filter(r -> r.getDecidedAt() != null && !r.getDecidedAt().isBefore(r.getSubmittedAt()))
                .map(r -> Duration.between(r.getSubmittedAt(), r.getDecidedAt()).toMinutes()).sorted().toList();
        Long median = decisionMinutes.isEmpty() ? null : decisionMinutes.get(decisionMinutes.size() / 2);

        return new AnalyticsView(rows.size(), percent(completed, rows.size()), requested, granted, median,
                List.of(new StatusCountView("COMPLETED", statuses.get(RawDataStatus.COMPLETED)),
                        new StatusCountView("REJECTED", statuses.get(RawDataStatus.REJECTED)),
                        new StatusCountView("REFERRED", statuses.get(RawDataStatus.REFERRED)),
                        new StatusCountView("IN_PROGRESS", statuses.get(RawDataStatus.IN_PROGRESS)),
                        new StatusCountView("FAILED", statuses.get(RawDataStatus.FAILED))),
                monthlyTrend(rows), topReasons(rows), journey(rows), labelCounts(rows, RawData::getStoppedAtStep),
                outcomes(rows, r -> r.getProductCode().name(), List.of(CardType.values()).stream().map(Enum::name).toList()),
                outcomes(rows, RawData::getChannel, List.of("WEB", "MOBILE_APP", "BRANCH", "AGGREGATOR")),
                productLimits(rows), outcomes(rows, RawData::getCreditBand, List.of("A", "B", "C", "D", "E")),
                outcomes(rows, r -> dtiBand(r.getDtiRatio()), List.of("≤ 0.25", "0.26–0.35", "0.36–0.45", "0.46–0.55", "> 0.55")),
                incomeRates(rows), labelCounts(rows, RawData::getScreeningOutcome), labelCounts(rows, RawData::getKycOutcome),
                labelCounts(rows, RawData::getAgreementOutcome),
                outcomes(rows, RawData::getAgeBand, List.of("18-24", "25-34", "35-44", "45-54", "55-64", "65+")),
                outcomes(rows, RawData::getEmploymentStatus, List.of("PERMANENT", "SELF_EMPLOYED", "CONTRACT", "RETIRED", "STUDENT", "UNEMPLOYED")));
    }

    @Transactional(readOnly = true)
    public ProcessedFilesResponse processedFiles() {
        List<ProcessedFileView> items = processedFiles.findAllByOrderByIdDesc().stream().map(ProcessedFileView::of).toList();
        return new ProcessedFilesResponse(items.size(), items);
    }

    private List<RawData> filteredRows(LocalDate from, LocalDate to, String productCode, String channel) {
        if (from != null && to != null && from.isAfter(to)) throw new IllegalArgumentException("from must be on or before to");
        CardType product = parseProduct(productCode);
        String selectedChannel = channel == null || channel.isBlank() || channel.equalsIgnoreCase("ALL") ? null : channel.toUpperCase(Locale.ROOT);
        return rawData.findAllByOrderBySubmittedAtDescIdDesc().stream()
                .filter(r -> from == null || !r.getSubmittedAt().atZone(ZoneOffset.UTC).toLocalDate().isBefore(from))
                .filter(r -> to == null || !r.getSubmittedAt().atZone(ZoneOffset.UTC).toLocalDate().isAfter(to))
                .filter(r -> product == null || r.getProductCode() == product)
                .filter(r -> selectedChannel == null || r.getChannel().equals(selectedChannel)).toList();
    }

    private CardType parseProduct(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("ALL")) return null;
        try { return CardType.valueOf(value.toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException ex) { throw new IllegalArgumentException("unsupported productCode: " + value); }
    }

    private EnumMap<RawDataStatus, Long> statusCounts(List<RawData> rows) {
        EnumMap<RawDataStatus, Long> counts = new EnumMap<>(RawDataStatus.class);
        for (RawDataStatus status : RawDataStatus.values()) counts.put(status, 0L);
        rows.forEach(row -> counts.compute(row.getStatus(), (key, count) -> count + 1));
        return counts;
    }

    private List<TimeStatusView> monthlyTrend(List<RawData> rows) {
        Map<YearMonth, List<RawData>> grouped = rows.stream().collect(Collectors.groupingBy(
                r -> YearMonth.from(r.getSubmittedAt().atZone(ZoneOffset.UTC)), LinkedHashMap::new, Collectors.toList()));
        return grouped.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(entry -> {
            var c = statusCounts(entry.getValue());
            return new TimeStatusView(entry.getKey().toString(), c.get(RawDataStatus.COMPLETED), c.get(RawDataStatus.REJECTED),
                    c.get(RawDataStatus.REFERRED), c.get(RawDataStatus.IN_PROGRESS), c.get(RawDataStatus.FAILED), entry.getValue().size());
        }).toList();
    }

    private List<ReasonCountView> topReasons(List<RawData> rows) {
        Map<String, List<RawData>> grouped = rows.stream().filter(r -> r.getDeclineReasonCode() != null)
                .collect(Collectors.groupingBy(RawData::getDeclineReasonCode));
        long total = grouped.values().stream().mapToLong(List::size).sum();
        return grouped.entrySet().stream().sorted((a, b) -> Integer.compare(b.getValue().size(), a.getValue().size())).limit(10)
                .map(entry -> new ReasonCountView(entry.getKey(), entry.getValue().size(), percent(entry.getValue().size(), total),
                        entry.getValue().stream().filter(r -> r.getStoppedAtStep() != null)
                                .collect(Collectors.groupingBy(RawData::getStoppedAtStep, Collectors.counting()))
                                .entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null)))
                .toList();
    }

    private List<JourneyStepView> journey(List<RawData> rows) {
        List<JourneyStepView> result = new ArrayList<>();
        for (int i = 0; i < STEPS.size(); i++) {
            int step = i + 1; String name = STEPS.get(i);
            List<RawData> reachedRows = rows.stream().filter(r -> r.getStepsReached() >= step - 1).toList();
            var counts = statusCounts(reachedRows);
            List<RawData> stopped = rows.stream().filter(r -> name.equalsIgnoreCase(r.getStoppedAtStep())).toList();
            String topReason = stopped.stream().filter(r -> r.getDeclineReasonCode() != null)
                    .collect(Collectors.groupingBy(RawData::getDeclineReasonCode, Collectors.counting()))
                    .entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
            result.add(new JourneyStepView(step, name, reachedRows.size(), stopped.size(), counts.get(RawDataStatus.COMPLETED),
                    counts.get(RawDataStatus.REJECTED), counts.get(RawDataStatus.REFERRED), counts.get(RawDataStatus.IN_PROGRESS),
                    counts.get(RawDataStatus.FAILED), topReason));
        }
        return result;
    }

    private List<OutcomeGroupView> outcomes(List<RawData> rows, Function<RawData, String> key, List<String> order) {
        Map<String, List<RawData>> grouped = rows.stream().filter(r -> key.apply(r) != null)
                .collect(Collectors.groupingBy(key, LinkedHashMap::new, Collectors.toList()));
        List<String> labels = new ArrayList<>(order); grouped.keySet().stream().filter(k -> !labels.contains(k)).sorted().forEach(labels::add);
        return labels.stream().map(label -> {
            List<RawData> group = grouped.getOrDefault(label, List.of()); var c = statusCounts(group);
            return new OutcomeGroupView(label, c.get(RawDataStatus.COMPLETED), c.get(RawDataStatus.REJECTED),
                    c.get(RawDataStatus.REFERRED), c.get(RawDataStatus.IN_PROGRESS), c.get(RawDataStatus.FAILED),
                    group.size(), percent(c.get(RawDataStatus.COMPLETED), group.size()));
        }).toList();
    }

    private List<LimitComparisonView> productLimits(List<RawData> rows) {
        return List.of(CardType.values()).stream().map(product -> {
            List<RawData> group = rows.stream().filter(r -> r.getProductCode() == product).toList();
            return new LimitComparisonView(product.name(), average(group, RawData::getRequestedLimit),
                    average(group, RawData::getGrantedLimit), average(group, RawData::getApr));
        }).toList();
    }

    private List<RateView> incomeRates(List<RawData> rows) {
        List<String> order = List.of("< £15k", "£15–25k", "£25–40k", "£40–60k", "£60k+");
        Map<String, List<RawData>> grouped = rows.stream().collect(Collectors.groupingBy(r -> incomeBand(r.getAnnualIncome())));
        return order.stream().map(label -> { List<RawData> group = grouped.getOrDefault(label, List.of());
            long completed = group.stream().filter(r -> r.getStatus() == RawDataStatus.COMPLETED).count();
            return new RateView(label, group.size(), percent(completed, group.size())); }).toList();
    }

    private List<LabelCountView> labelCounts(List<RawData> rows, Function<RawData, String> key) {
        return rows.stream().map(key).filter(value -> value != null && !value.isBlank())
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting())).entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue())).map(e -> new LabelCountView(e.getKey(), e.getValue())).toList();
    }

    private BigDecimal sum(List<RawData> rows, Function<RawData, BigDecimal> value) {
        return rows.stream().map(value).filter(v -> v != null).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal average(List<RawData> rows, Function<RawData, BigDecimal> value) {
        List<BigDecimal> values = rows.stream().map(value).filter(v -> v != null).toList();
        return values.isEmpty() ? BigDecimal.ZERO : values.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private double percent(long value, long total) { return total == 0 ? 0 : Math.round(value * 1000.0 / total) / 10.0; }
    private String dtiBand(BigDecimal value) { double v = value.doubleValue(); return v <= .25 ? "≤ 0.25" : v <= .35 ? "0.26–0.35" : v <= .45 ? "0.36–0.45" : v <= .55 ? "0.46–0.55" : "> 0.55"; }
    private String incomeBand(BigDecimal value) { int v = value.intValue(); return v < 15000 ? "< £15k" : v < 25000 ? "£15–25k" : v < 40000 ? "£25–40k" : v < 60000 ? "£40–60k" : "£60k+"; }
}
