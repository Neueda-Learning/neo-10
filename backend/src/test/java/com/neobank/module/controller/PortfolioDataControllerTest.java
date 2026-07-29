package com.neobank.module.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.neobank.module.dto.AnalyticsView;
import com.neobank.module.dto.CardTypeCountView;
import com.neobank.module.dto.CardTypeStatusView;
import com.neobank.module.dto.ProcessFileItemView;
import com.neobank.module.dto.ProcessFileResponse;
import com.neobank.module.dto.ProcessedFilesResponse;
import com.neobank.module.dto.QuarterlyBreakdownView;
import com.neobank.module.dto.RawDataPageView;
import com.neobank.module.dto.StatusCountView;
import com.neobank.module.service.PortfolioDataService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PortfolioDataController.class)
class PortfolioDataControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private PortfolioDataService portfolioData;

    @Test
    void returnsAnalyticsForTheDashboard() throws Exception {
        when(portfolioData.analytics(any(), any(), eq("ALL"))).thenReturn(new AnalyticsView(
                3,
                List.of(new StatusCountView("COMPLETED", 1), new StatusCountView("REJECTED", 1), new StatusCountView("IN_PROGRESS", 1)),
                List.of(new CardTypeCountView("PREMIUM_CARD", 2), new CardTypeCountView("PLATINUM_CARD", 1)),
                List.of(new CardTypeStatusView("PREMIUM_CARD", 1, 0, 1, 2), new CardTypeStatusView("PLATINUM_CARD", 0, 1, 0, 1)),
                List.of(new QuarterlyBreakdownView("Q1", 1, 1, 1, 3))));

        mvc.perform(get("/api/v1/dashboard/analytics").param("from", "2026-01-01").param("to", "2026-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.statusBreakdown[2].status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.cardTypeStatusBreakdown[0].inProgress").value(1));
    }

    @Test
    void acceptsMultipleCsvFiles() throws Exception {
        when(portfolioData.processFiles(any())).thenReturn(new ProcessFileResponse("SUCCESS", 1,
                List.of(new ProcessFileItemView("customer_data_2026_03.csv", "PROCESSED", 1, null))));
        MockMultipartFile file = new MockMultipartFile("files", "customer_data_2026_03.csv", "text/csv",
                "status,card_type,applied_date\nCOMPLETED,PREMIUM_CARD,2026-03-01\n".getBytes());

        mvc.perform(multipart("/api/v1/processFile").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.rowsInserted").value(1));
    }

    @Test
    void returnsProcessedFiles() throws Exception {
        when(portfolioData.processedFiles()).thenReturn(new ProcessedFilesResponse(0, List.of()));
        mvc.perform(get("/api/v1/processed-files"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
    }
}
