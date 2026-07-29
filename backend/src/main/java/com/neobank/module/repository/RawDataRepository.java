package com.neobank.module.repository;

import com.neobank.module.model.RawData;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RawDataRepository extends JpaRepository<RawData, Long> {
    List<RawData> findAllByOrderBySubmittedAtDescIdDesc();
}
