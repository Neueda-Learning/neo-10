package com.neobank.module.controller;

import com.neobank.module.dto.ProcessFilesResponse;
import com.neobank.module.service.FileProcessingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FileProcessingController {

    private final FileProcessingService fileProcessingService;

    public FileProcessingController(FileProcessingService fileProcessingService) {
        this.fileProcessingService = fileProcessingService;
    }

    @PostMapping("/processFile")
    public ResponseEntity<ProcessFilesResponse> processFiles() {
        return ResponseEntity.ok(fileProcessingService.processFiles());
    }
}
