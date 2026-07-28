package com.neobank.module.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.neobank.module.dto.ProcessFileResponse;
import com.neobank.module.model.RawDataStatus;
import com.neobank.module.repository.ProcessedFileRepository;
import com.neobank.module.repository.RawDataRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:portfolioimport;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
@Transactional
class PortfolioDataServiceTest {

    @Autowired
    private PortfolioDataService portfolioData;

    @Autowired
    private RawDataRepository rawData;

    @Autowired
    private ProcessedFileRepository processedFiles;

    @BeforeEach
    void clearPortfolioTables() {
        rawData.deleteAll();
        processedFiles.deleteAll();
    }

    @Test
    void importsLegacyValuesOnceAndSkipsTheSameFilenameLater() {
        ProcessFileResponse firstImport = portfolioData.processFiles(List.of(csv("customer_data_2026_01.csv")));

        assertThat(firstImport.status()).isEqualTo("SUCCESS");
        assertThat(firstImport.rowsInserted()).isEqualTo(3);
        assertThat(rawData.count()).isEqualTo(3);
        assertThat(processedFiles.count()).isEqualTo(1);
        assertThat(rawData.findAll().stream().map(row -> row.getStatus()))
                .containsExactlyInAnyOrder(
                        RawDataStatus.COMPLETED,
                        RawDataStatus.REJECTED,
                        RawDataStatus.IN_PROGRESS);

        ProcessFileResponse secondImport = portfolioData.processFiles(List.of(csv("customer_data_2026_01.csv")));

        assertThat(secondImport.status()).isEqualTo("NO_NEW_FILES");
        assertThat(secondImport.rowsInserted()).isZero();
        assertThat(secondImport.results()).singleElement().extracting(item -> item.result()).isEqualTo("ALREADY_IMPORTED");
        assertThat(rawData.count()).isEqualTo(3);
        assertThat(processedFiles.count()).isEqualTo(1);
    }

    private MockMultipartFile csv(String filename) {
        String body = "id,status,card_type,timestamp\n"
                + "APP-001,COMPLETED,premium,2026-01-12 09:30:00\n"
                + "APP-002,DECLINED,platinum,2026-01-14 10:00:00\n"
                + "APP-003,ACCEPTED,premium,2026-01-31 16:15:00\n";
        return new MockMultipartFile("files", filename, "text/csv", body.getBytes(StandardCharsets.UTF_8));
    }
}
