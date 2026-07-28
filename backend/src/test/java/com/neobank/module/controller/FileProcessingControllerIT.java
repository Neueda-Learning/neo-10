package com.neobank.module.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "file-processing.directory=src/test/resources/test-csv")
class FileProcessingControllerIT {

    @Autowired
    private MockMvc mvc;

    @Test
    void importsNewCsvAndSkipsItOnSecondRun() throws Exception {
        mvc.perform(post("/processFile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        mvc.perform(post("/processFile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NO_NEW_FILES"));
    }
}
