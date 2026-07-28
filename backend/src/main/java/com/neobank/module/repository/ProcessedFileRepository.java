package com.neobank.module.repository;

import com.neobank.module.model.ProcessedFile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedFileRepository extends JpaRepository<ProcessedFile, Long> {

    boolean existsByFilenameAndStatus(String filename, String status);

    Optional<ProcessedFile> findFirstByFilenameOrderByIdDesc(String filename);
}
