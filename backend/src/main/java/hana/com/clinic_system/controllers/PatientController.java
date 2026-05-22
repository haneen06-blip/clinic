package hana.com.clinic_system.controllers;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import hana.com.clinic_system.entities.Patient;
import hana.com.clinic_system.repositories.PatientRepository;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/patients")
@SuppressWarnings("null")
public class PatientController {

    private static final Logger log = LoggerFactory.getLogger(PatientController.class);

    private final PatientRepository patientRepository;

    public PatientController(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @GetMapping
    public ResponseEntity<List<Patient>> getAllPatients() {
        List<Patient> patients = patientRepository.findAll();
        log.info("Retrieved {} patients", patients.size());
        return ResponseEntity.ok(patients);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Patient> getPatientById(@PathVariable Integer id) {
        return patientRepository.findById(id)
                .map(patient -> {
                    log.info("Found patient: {}", patient.getName());
                    return ResponseEntity.ok(patient);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<Patient> getPatientByEmail(@PathVariable String email) {
        log.info("Looking up patient by email: {}", email);
        return patientRepository.findByEmail(email)
                .map(patient -> {
                    log.info("Found patient by email: {}", patient.getName());
                    return ResponseEntity.ok(patient);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Patient> createPatient(@Valid @RequestBody Patient patient) {
        log.info("Creating patient: name={}, email={}", patient.getName(), patient.getEmail());
        Patient savedPatient = patientRepository.save(patient);
        log.info("Patient saved successfully with id: {}", savedPatient.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPatient);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patient> updatePatient(@PathVariable Integer id, @Valid @RequestBody Patient patientDetails) {
        return patientRepository.findById(id)
                .map(existingPatient -> {
                    log.info("Updating patient with id: {}", id);
                    updatePatientFields(existingPatient, patientDetails);
                    Patient updatedPatient = patientRepository.save(existingPatient);
                    log.info("Patient updated successfully: {}", updatedPatient.getName());
                    return ResponseEntity.ok(updatedPatient);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deletePatient(@PathVariable Integer id) {
        if (!patientRepository.existsById(id)) {
            log.warn("Patient not found for deletion: {}", id);
            return ResponseEntity.notFound().build();
        }
        patientRepository.deleteById(id);
        log.info("Patient deleted successfully: {}", id);
        return ResponseEntity.noContent().build();
    }

    private void updatePatientFields(Patient existing, Patient updates) {
        if (updates.getName() != null) {
            existing.setName(updates.getName());
        }
        if (updates.getPhone() != null) {
            existing.setPhone(updates.getPhone());
        }
        if (updates.getEmail() != null) {
            existing.setEmail(updates.getEmail());
        }
    }
}
