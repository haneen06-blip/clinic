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

import hana.com.clinic_system.entities.Appointment;
import hana.com.clinic_system.entities.AppointmentDoctor;
import hana.com.clinic_system.entities.AppointmentDoctorId;
import hana.com.clinic_system.entities.Doctor;
import hana.com.clinic_system.entities.Patient;
import hana.com.clinic_system.repositories.AppointmentDoctorRepository;
import hana.com.clinic_system.repositories.AppointmentRepository;
import hana.com.clinic_system.repositories.DoctorRepository;
import hana.com.clinic_system.repositories.PatientRepository;

@RestController
@RequestMapping("/api/appointment-doctors")
public class AppointmentDoctorController {

    private static final Logger log = LoggerFactory.getLogger(AppointmentDoctorController.class);

    private final AppointmentDoctorRepository appointmentDoctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;

    public AppointmentDoctorController(AppointmentDoctorRepository appointmentDoctorRepository,
                                       AppointmentRepository appointmentRepository,
                                       DoctorRepository doctorRepository,
                                       PatientRepository patientRepository) {
        this.appointmentDoctorRepository = appointmentDoctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
    }

    @GetMapping
    public ResponseEntity<List<AppointmentDoctor>> getAll() {
        List<AppointmentDoctor> relations = appointmentDoctorRepository.findAll();
        log.info("Retrieved {} appointment-doctor relations", relations.size());
        return ResponseEntity.ok(relations);
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<Map<String, Object>>> getDoctorsByAppointment(@PathVariable Integer appointmentId) {
        log.info("Getting doctors for appointment: {}", appointmentId);
        List<Object[]> results = appointmentDoctorRepository.findDoctorsByAppointmentId(appointmentId);
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
    public ResponseEntity<List<Map<String, Object>>> getAppointmentsByDoctor(@PathVariable Integer doctorId) {
        log.info("Getting appointments for doctor: {}", doctorId);
        List<Object[]> results = appointmentDoctorRepository.findAppointmentsByDoctorId(doctorId);
        List<Map<String, Object>> appointments = results.stream().map(row -> {
            Map<String, Object> appointment = new HashMap<>();
            appointment.put("id", row[0]);
            appointment.put("date", row[1]);
            appointment.put("time", row[2]);
            appointment.put("status", row[3]);
            return appointment;
        }).toList();
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Map<String, Object>>> getAppointmentsByPatient(@PathVariable Integer patientId) {
        log.info("Getting appointments for patient: {}", patientId);
        List<Object[]> results = appointmentDoctorRepository.findAppointmentsByPatientId(patientId);
        List<Map<String, Object>> appointments = results.stream().map(row -> {
            Map<String, Object> appointment = new HashMap<>();
            appointment.put("id", row[0]);
            appointment.put("date", row[1]);
            appointment.put("time", row[2]);
            appointment.put("status", row[3]);
            return appointment;
        }).toList();
        return ResponseEntity.ok(appointments);
    }

    @PostMapping
    public ResponseEntity<AppointmentDoctor> createRelation(@RequestBody Map<String, Integer> request) {
        Integer appointmentId = request.get("appointmentId");
        Integer doctorId = request.get("doctorId");
        Integer patientId = request.get("patientId");
        
        log.info("Creating appointment-doctor relation: appointment={}, doctor={}, patient={}", 
                 appointmentId, doctorId, patientId);
        
        if (appointmentId == null || doctorId == null || patientId == null) {
            log.warn("Missing required fields");
            return ResponseEntity.badRequest().build();
        }

        Optional<Appointment> appointmentOpt = appointmentRepository.findById(appointmentId);
        Optional<Doctor> doctorOpt = doctorRepository.findById(doctorId);
        Optional<Patient> patientOpt = patientRepository.findById(patientId);

        if (appointmentOpt.isEmpty() || doctorOpt.isEmpty() || patientOpt.isEmpty()) {
            log.warn("Appointment, Doctor or Patient not found");
            return ResponseEntity.badRequest().build();
        }

        AppointmentDoctorId id = new AppointmentDoctorId(appointmentId, doctorId);
        if (appointmentDoctorRepository.existsById(id)) {
            log.warn("Relation already exists");
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        AppointmentDoctor relation = new AppointmentDoctor();
        relation.setId(id);
        relation.setAppointment(appointmentOpt.get());
        relation.setDoctor(doctorOpt.get());
        relation.setPatient(patientOpt.get());

        AppointmentDoctor saved = appointmentDoctorRepository.save(relation);
        log.info("Relation created successfully");
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/appointment/{appointmentId}/doctor/{doctorId}")
    @Transactional
    public ResponseEntity<Void> deleteRelation(@PathVariable Integer appointmentId, @PathVariable Integer doctorId) {
        log.info("Deleting appointment-doctor relation: appointment={}, doctor={}", appointmentId, doctorId);
        int deleted = appointmentDoctorRepository.deleteByAppointmentIdAndDoctorId(appointmentId, doctorId);
        if (deleted == 0) {
            log.warn("Relation not found");
            return ResponseEntity.notFound().build();
        }
        log.info("Relation deleted successfully");
        return ResponseEntity.noContent().build();
    }
}
