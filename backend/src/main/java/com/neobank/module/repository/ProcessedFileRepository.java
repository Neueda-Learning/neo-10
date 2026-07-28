package com.neobank.module.repository;

import com.neobank.module.model.ProcessedFile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedFileRepository extends JpaRepository<ProcessedFile, Long> {
    Optional<ProcessedFile> findByFilename(String filename);
    List<ProcessedFile> findAllByOrderByIdDesc();
}
