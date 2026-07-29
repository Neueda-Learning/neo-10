package com.neobank.module.service;

/** A CSV can be read but does not meet the import contract. */
public class CsvValidationException extends RuntimeException {
    public CsvValidationException(String message) { super(message); }
}
