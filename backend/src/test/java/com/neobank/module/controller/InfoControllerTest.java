package com.neobank.module.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Basic check for {@code GET /info}: defaults are served when no {@code service.*}
 * properties are configured, and {@code mockedDependencies} is an empty list rather than
 * a single blank entry.
 */
@WebMvcTest(InfoController.class)
class InfoControllerTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void returnsTheServiceIdentityWithDefaults() throws Exception {
        mvc.perform(get("/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceId").value("neo10"))
                .andExpect(jsonPath("$.mockedDependencies").isArray())
                .andExpect(jsonPath("$.mockedDependencies").isEmpty());
    }
}
