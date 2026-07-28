package com.neobank.module.repository;

import com.neobank.module.model.RawData;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RawDataRepository extends JpaRepository<RawData, Long> {
}
