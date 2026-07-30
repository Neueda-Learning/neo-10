package com.neobank.module.controller;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.neobank.module.dto.DemoShowcaseView;
import com.neobank.module.integrations.orchestrator.ApplicationRequest;
import com.neobank.module.service.ApplicationService;

/**
 * Pins the inbound wire — the JSON the orchestrator parses, and what this module tolerates.
 *
 * <p><b>Most of these tests exist to stop the {@code Application} model being tightened.</b> Typed
 * dates and enums look like better modelling and would turn three of the sidecar's scenarios into
 * {@code 400}s — scenarios that exist specifically to check the module <em>reports</em> bad input
 * rather than refusing it. If one of these fails after you change {@code Application}, the model is
 * wrong, not the test.</p>
 */
@WebMvcTest(ApplicationController.class)
class ApplicationControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private ApplicationService applications;

    @Test
    void acceptsAnApplicationAndHandsItToTheService() throws Exception {
        mvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "applicationId": "SIM-01",
                                  "correlationId": "sim-0001",
                                  "command": "process-application",
                                  "application": {
                                    "channel": "MOBILE_APP",
                                    "applicant": {"fullName": "Maria Nowak"},
                                    "product": {"productCode": "CREDIT_CARD_REWARDS",
                                                "requestedCreditLimit": 3000}
                                  }
                                }
                                """))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("in-progress"))
                .andExpect(jsonPath("$.applicationId").value("SIM-01"))
                .andExpect(jsonPath("$.serviceId").value("neo10"))
                .andExpect(jsonPath("$.command").value("process-application"));

        ArgumentCaptor<ApplicationRequest> sent = ArgumentCaptor.forClass(ApplicationRequest.class);
        verify(applications).processApplicationAsync(sent.capture());

        // The typed model really is populated, not silently swallowed into nulls.
        ApplicationRequest request = sent.getValue();
        assertThat(request.application().applicant().fullName()).isEqualTo("Maria Nowak");
        assertThat(request.application().product().requestedCreditLimit()).isEqualTo(3000);
        assertThat(request.application().channel()).isEqualTo("MOBILE_APP");
    }

    @Test
    void rejectsAnEnvelopeWithNoApplicationId() throws Exception {
        mvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"command":"process-application","application":{"channel":"WEB"}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("applicationId")));

        verifyNoInteractions(applications);
    }

    @Test
    void acceptsAMissingCommandAndReturnsItAsNullInTheAck() throws Exception {
        mvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "applicationId": "SIM-27",
                                  "application": {
                                    "channel": "WEB"
                                  }
                                }
                                """))
                .andExpect(status().isAccepted())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.applicationId").value("SIM-27"))
                .andExpect(jsonPath("$.command").value(nullValue()))
                .andExpect(content().string(
                        "{\"status\":\"in-progress\",\"applicationId\":\"SIM-27\",\"serviceId\":\"neo10\",\"command\":null}"));

        ArgumentCaptor<ApplicationRequest> sent = ArgumentCaptor.forClass(ApplicationRequest.class);
        verify(applications).processApplicationAsync(sent.capture());
        assertThat(sent.getValue().command()).isNull();
    }

    @Test
    void bindsNestedApplicationObjectsWithoutCollapsingMissingAndExplicitValues() throws Exception {
        mvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "applicationId": "SIM-42",
                                  "correlationId": "corr-42424242",
                                  "command": "process-application",
                                  "application": {
                                    "applicationId": "INNER-IGNORED",
                                    "channel": "BRANCH",
                                    "submittedAt": "2026-07-25T09:14:00Z",
                                    "applicant": {
                                      "fullName": "Alicja Kowalska",
                                      "dateOfBirth": "1990-03-12",
                                      "taxResidencies": ["PL", "DE"],
                                      "currentAddress": {
                                        "line1": "1 Main St",
                                        "city": "Warsaw",
                                        "postcode": "00-001",
                                        "country": "PL"
                                      },
                                      "monthsAtAddress": 18,
                                      "dependants": 2
                                    },
                                    "employment": {
                                      "status": "PERMANENT",
                                      "employerName": "Neo Bank",
                                      "monthsInEmployment": 48
                                    },
                                    "delivery": {
                                      "useCurrentAddress": false,
                                      "address": {
                                        "line1": "99 Side St",
                                        "city": "Gdansk",
                                        "postcode": "80-001",
                                        "country": "PL"
                                      }
                                    },
                                    "consents": {
                                      "termsAccepted": true,
                                      "paperlessStatements": false,
                                      "marketingConsent": null
                                    },
                                    "product": {
                                      "productCode": "CREDIT_CARD_REWARDS",
                                      "requestedCreditLimit": 4500
                                    }
                                  }
                                }
                                """))
                .andExpect(status().isAccepted());

        ArgumentCaptor<ApplicationRequest> sent = ArgumentCaptor.forClass(ApplicationRequest.class);
        verify(applications).processApplicationAsync(sent.capture());

        ApplicationRequest request = sent.getValue();
        assertThat(request.applicationId()).isEqualTo("SIM-42");
        assertThat(request.application().applicationId()).isEqualTo("INNER-IGNORED");
        assertThat(request.application().applicant().taxResidencies()).containsExactly("PL", "DE");
        assertThat(request.application().applicant().currentAddress().city()).isEqualTo("Warsaw");
        assertThat(request.application().applicant().monthsAtAddress()).isEqualTo(18);
        assertThat(request.application().applicant().dependants()).isEqualTo(2);
        assertThat(request.application().employment().monthsInEmployment()).isEqualTo(48);
        assertThat(request.application().delivery().useCurrentAddress()).isFalse();
        assertThat(request.application().delivery().address().city()).isEqualTo("Gdansk");
        assertThat(request.application().consents().termsAccepted()).isTrue();
        assertThat(request.application().consents().paperlessStatements()).isFalse();
        assertThat(request.application().consents().marketingConsent()).isNull();
        assertThat(request.application().product().requestedCreditLimit()).isEqualTo(4500);
    }

    @Test
    void malformedDatesAreAcceptedBecauseJudgingThemIsTheModulesJob() throws Exception {
        // The sidecar's SIM-09 shape: every date in the wrong format, on purpose. It must reach the
        // service so the module can report WHICH field was malformed. Typing these as LocalDate
        // would make Jackson answer 400 and the module would never see the application.
        mvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "applicationId": "SIM-09",
                                  "command": "process-application",
                                  "application": {
                                    "applicant": {"dateOfBirth": "12/03/1990",
                                                  "email": "ines.dacosta(at)example.com",
                                                  "nationality": "PRT"},
                                    "identityDocument": {"expiryDate": "31-12-2030"}
                                  }
                                }
                                """))
                .andExpect(status().isAccepted());

        verify(applications).processApplicationAsync(any(ApplicationRequest.class));
    }

    @Test
    void anUnknownProductCodeIsAcceptedRatherThanRefusedAtTheDoor() throws Exception {
        // The sidecar's SIM-24 shape: a product outside the locked catalogue. An enum would reject
        // it here; the module is supposed to answer "that product does not exist".
        mvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"applicationId":"SIM-24","command":"process-application",
                                 "application":{"product":{"productCode":"CREDIT_CARD_PREMIUM"}}}
                                """))
                .andExpect(status().isAccepted());

        verify(applications).processApplicationAsync(any(ApplicationRequest.class));
    }

    @Test
    void unknownFieldsAreIgnoredAtEveryLevel() throws Exception {
        // The sidecar's SIM-23 shape: extra fields at the envelope, application, applicant and
        // product levels. The orchestrator must be able to add a field without breaking ten modules.
        mvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "applicationId": "SIM-23",
                                  "command": "process-application",
                                  "referrer": "partner-site",
                                  "application": {
                                    "campaignCode": "SUMMER26",
                                    "applicant": {"fullName": "Maria Nowak", "middleName": "Anna"},
                                    "product": {"productCode": "CREDIT_CARD_REWARDS",
                                                "promoRate": 0.0}
                                  }
                                }
                                """))
                .andExpect(status().isAccepted());

        ArgumentCaptor<ApplicationRequest> sent = ArgumentCaptor.forClass(ApplicationRequest.class);
        verify(applications).processApplicationAsync(sent.capture());
        assertThat(sent.getValue().application().applicant().fullName()).isEqualTo("Maria Nowak");
    }

    @Test
    void listsPreviouslyProcessedApplications() throws Exception {
        when(applications.findAll()).thenReturn(List.of(
                new DemoShowcaseView("SIM-01", "ACCEPTED", Instant.parse("2026-07-30T09:14:00Z")),
                new DemoShowcaseView("SIM-00", "REFERRED", Instant.parse("2026-07-30T08:00:00Z"))));

        mvc.perform(get("/api/v1/applications"))
                .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].applicationId").value("SIM-01"))
                .andExpect(jsonPath("$[0].status").value("ACCEPTED"))
        .andExpect(jsonPath("$[0].createdAt").value("2026-07-30T09:14:00Z"))
                .andExpect(jsonPath("$[1].applicationId").value("SIM-00"))
        .andExpect(jsonPath("$[1].status").value("REFERRED"))
        .andExpect(jsonPath("$[1].createdAt").value("2026-07-30T08:00:00Z"));

      verify(applications).findAll();
      verifyNoMoreInteractions(applications);
    }
}
