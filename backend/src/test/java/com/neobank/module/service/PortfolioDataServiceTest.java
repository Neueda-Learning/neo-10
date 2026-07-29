package com.neobank.module.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.neobank.module.model.Decision;
import com.neobank.module.model.DemoShowcase;
import com.neobank.module.model.RawDataStatus;
import com.neobank.module.repository.DemoShowcaseRepository;
import com.neobank.module.repository.ProcessedFileRepository;
import com.neobank.module.repository.RawDataRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:portfolioimport;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
@Transactional
class PortfolioDataServiceTest {
    @Autowired private PortfolioDataService portfolioData;
    @Autowired private RawDataRepository rawData;
    @Autowired private ProcessedFileRepository processedFiles;
    @Autowired private DemoShowcaseRepository demoShowcase;

    @BeforeEach void clearPortfolioTables() {
        rawData.deleteAll();
        processedFiles.deleteAll();
        demoShowcase.deleteAll();
    }

    @Test void scansOnceAndAllowsDuplicateApplicationIds() {
        var first = portfolioData.scanFolder();
        assertThat(first.status()).isEqualTo("SUCCESS");
        assertThat(first.rowsInserted()).isEqualTo(3);
        assertThat(rawData.findAll().stream().filter(row -> row.getApplicationId().equals("APP-001"))).hasSize(2);
        assertThat(rawData.findAll().stream().map(row -> row.getStatus()))
                .containsExactlyInAnyOrder(RawDataStatus.COMPLETED, RawDataStatus.REJECTED, RawDataStatus.REFERRED);
        var second = portfolioData.scanFolder();
        assertThat(second.status()).isEqualTo("NO_NEW_FILES");
        assertThat(second.filesSkipped()).isEqualTo(1);
        assertThat(rawData.count()).isEqualTo(3);
    }

    @Test void resetClearsAllBusinessTables() {
        portfolioData.scanFolder();
        demoShowcase.save(new DemoShowcase("APP-DEMO-RESET", Decision.ACCEPTED));
        var result = portfolioData.resetData();
        assertThat(result.rawRowsDeleted()).isEqualTo(3);
        assertThat(result.processedFilesDeleted()).isEqualTo(1);
        assertThat(result.demoRowsDeleted()).isEqualTo(1);
        assertThat(rawData.count()).isZero();
        assertThat(processedFiles.count()).isZero();
        assertThat(demoShowcase.count()).isZero();
    }
}
