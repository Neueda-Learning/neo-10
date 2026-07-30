package com.neobank.module.controller;

import java.sql.Connection;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Basic checks for {@code GET /health}: it reports UP when the database probe succeeds, and
 * DOWN (with a 503) when it does not.
 */
@WebMvcTest(HealthController.class)
class HealthControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private DataSource dataSource;

    @Test
    void reportsUpWhenTheDatabaseIsReachable() throws Exception {
        Connection connection = org.mockito.Mockito.mock(Connection.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(2)).thenReturn(true);

        mvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.serviceId").value("neo10"));
    }

    @Test
    void reportsDownWhenTheDatabaseProbeFails() throws Exception {
        when(dataSource.getConnection()).thenThrow(new java.sql.SQLException("no connection"));

        mvc.perform(get("/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("DOWN"));
    }
}
