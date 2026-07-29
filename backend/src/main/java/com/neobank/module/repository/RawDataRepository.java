package com.neobank.module.repository;

import com.neobank.module.model.CardType;
import com.neobank.module.model.RawData;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RawDataRepository extends JpaRepository<RawData, Long> {
    List<RawData> findAllByOrderByAppliedDateDescIdDesc();
    List<RawData> findByAppliedDateBetweenOrderByAppliedDateDescIdDesc(LocalDate from, LocalDate to);
    List<RawData> findByAppliedDateBetweenAndCardTypeOrderByAppliedDateDescIdDesc(LocalDate from, LocalDate to, CardType cardType);
}
