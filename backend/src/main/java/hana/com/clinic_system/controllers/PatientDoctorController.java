package hana.com.clinic_system.controllers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import hana.com.clinic_system.entities.Doctor;
import hana.com.clinic_system.entities.Patient;
import hana.com.clinic_system.entities.PatientDoctor;
import hana.com.clinic_system.entities.PatientDoctorId;
import hana.com.clinic_system.repositories.DoctorRepository;
import hana.com.clinic_system.repositories.PatientDoctorRepository;
import hana.com.clinic_system.repositories.PatientRepository;

@RestController
@RequestMapping("/api/patient-doctors")
public class PatientDoctorController {

    private static final Logger log = LoggerFactory.getLogger(PatientDoctorController.class);

    private final PatientDoctorRepository patientDoctorRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public PatientDoctorController(PatientDoctorRepository patientDoctorRepository,
                                   PatientRepository patientRepository,
                                   DoctorRepository doctorRepository) {
        this.patientDoctorRepository = patientDoctorRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    @GetMapping
    public ResponseEntity<List<PatientDoctor>> getAll() {
        List<PatientDoctor> relations = patientDoctorRepository.findAll();
        log.info("Retrieved {} patient-doctor relations", relations.size());
        return ResponseEntity.ok(relations);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Map<String, Object>>> getDoctorsByPatient(@PathVariable Integer patientId) {
        log.info("Getting doctors for patient: {}", patientId);
        List<Object[]> results = patientDoctorRepository.findDoctorsByPatientId(patientId);
        List<Map<String, Object>> doctors = results.stream().map(row -> {
            Map<String, Object> doctor = new HashMap<>();
            doctor.put("id", row[0]);
            doctor.put("name", row[1]);
            doctor.put("specialization", row[2]);
            return doctor;
        }).toList();
        return ResponseEntity.ok(doctors);
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Map<String, Object>>> getPatientsByDoctor(@PathVariable Integer doctorId) {
        log.info("Getting patients for doctor: {}", doctorId);
        List<Object[]> results = patientDoctorRepository.findPatientsByDoctorId(doctorId);
        List<Map<String, Object>> patients = results.stream().map(row -> {
            Map<String, Object> patient = new HashMap<>();
            patient.put("id", row[0]);
            patient.put("name", row[1]);
            patient.put("phone", row[2]);
            patient.put("email", row[3]);
            return patient;
        }).toList();
        return ResponseEntity.ok(patients);
    }

    @PostMapping
    public ResponseEntity<PatientDoctor> createRelation(@RequestBody Map<String, Integer> request) {
        Integer patientId = request.get("patientId");
        Integer doctorId = request.get("doctorId");
        
        log.info("Creating patient-doctor relation: patient={}, doctor={}", patientId, doctorId);
        
        if (patientId == null || doctorId == null) {
            log.warn("Missing patientId or doctorId");
            return ResponseEntity.badRequest().build();
        }

        Optional<Patient> patientOpt = patientRepository.findById(patientId);
        Optional<Doctor> doctorOpt = doctorRepository.findById(doctorId);

        if (patientOpt.isEmpty() || doctorOpt.isEmpty()) {
            log.warn("Patient or Doctor not found");
            return ResponseEntity.badRequest().build();
        }

        PatientDoctorId id = new PatientDoctorId(patientId, doctorId);
        if (patientDoctorRepository.existsById(id)) {
            log.warn("Relation already exists");
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        PatientDoctor relation = new PatientDoctor();
        relation.setId(id);
        relation.setPatient(patientOpt.get());
        relation.setDoctor(doctorOpt.get());

        PatientDoctor saved = patientDoctorRepository.save(relation);
        log.info("Relation created successfully");
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/patient/{patientId}/doctor/{doctorId}")
    @Transactional
    public ResponseEntity<Void> deleteRelation(@PathVariable Integer patientId, @PathVariable Integer doctorId) {
        log.info("Deleting patient-doctor relation: patient={}, doctor={}", patientId, doctorId);
        int deleted = patientDoctorRepository.deleteByPatientIdAndDoctorId(patientId, doctorId);
        if (deleted == 0) {
            log.warn("Relation not found");
            return ResponseEntity.notFound().build();
        }
        log.info("Relation deleted successfully");
        return ResponseEntity.noContent().build();
    }
}
