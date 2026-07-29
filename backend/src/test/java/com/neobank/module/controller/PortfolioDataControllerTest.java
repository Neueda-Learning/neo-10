package com.neobank.module.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.neobank.module.dto.AnalyticsView;
import com.neobank.module.dto.ProcessFileItemView;
import com.neobank.module.dto.ProcessFileResponse;
import com.neobank.module.dto.ProcessedFilesResponse;
import com.neobank.module.dto.ResetDataResponse;
import com.neobank.module.dto.StatusCountView;
import com.neobank.module.service.PortfolioDataService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PortfolioDataController.class)
class PortfolioDataControllerTest {
    @Autowired private MockMvc mvc;
    @MockBean private PortfolioDataService portfolioData;

    @Test void returnsAnalyticsForFourFilters() throws Exception {
        when(portfolioData.analytics(any(), any(), eq("ALL"), eq("WEB"))).thenReturn(emptyAnalytics());
        mvc.perform(get("/api/v1/dashboard/analytics").param("from", "2026-01-01").param("to", "2026-12-31").param("channel", "WEB"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.statusBreakdown[2].status").value("REFERRED"));
    }

    @Test void scansTheConfiguredFolder() throws Exception {
        when(portfolioData.scanFolder()).thenReturn(new ProcessFileResponse("SUCCESS", 1, 1, 0, 0, 3,
                List.of(new ProcessFileItemView("neo_daily_2026-01-01.csv", "PROCESSED", 3, 3, null))));
        mvc.perform(post("/api/v1/files/scan")).andExpect(status().isOk())
                .andExpect(jsonPath("$.filesProcessed").value(1)).andExpect(jsonPath("$.rowsInserted").value(3));
    }

    @Test void resetsPortfolioData() throws Exception {
        when(portfolioData.resetData()).thenReturn(new ResetDataResponse("RESET_COMPLETE", 3, 1, 2));
        mvc.perform(delete("/api/v1/data/reset").header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(jsonPath("$.rawRowsDeleted").value(3))
                .andExpect(jsonPath("$.processedFilesDeleted").value(1))
                .andExpect(jsonPath("$.demoRowsDeleted").value(2));
    }

    @Test void returnsProcessedFiles() throws Exception {
        when(portfolioData.processedFiles()).thenReturn(new ProcessedFilesResponse(0, List.of()));
        mvc.perform(get("/api/v1/processed-files")).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
    }

    private AnalyticsView emptyAnalytics() {
        return new AnalyticsView(3, 33.3, BigDecimal.TEN, BigDecimal.ONE, 60L,
                List.of(new StatusCountView("COMPLETED", 1), new StatusCountView("REJECTED", 1),
                        new StatusCountView("REFERRED", 1), new StatusCountView("IN_PROGRESS", 0), new StatusCountView("FAILED", 0)),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
    }
}
