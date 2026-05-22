package hana.com.clinic_system.controllers;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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

import hana.com.clinic_system.entities.Appointment;
import hana.com.clinic_system.entities.AppointmentDTO;
import hana.com.clinic_system.entities.AppointmentDoctor;
import hana.com.clinic_system.entities.AppointmentDoctorId;
import hana.com.clinic_system.entities.PatientDoctor;
import hana.com.clinic_system.entities.PatientDoctorId;
import hana.com.clinic_system.repositories.AppointmentDoctorRepository;
import hana.com.clinic_system.repositories.AppointmentRepository;
import hana.com.clinic_system.repositories.DoctorRepository;
import hana.com.clinic_system.repositories.PatientDoctorRepository;
import hana.com.clinic_system.repositories.PatientRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/appointments")
@SuppressWarnings("null")
public class AppointmentController {

    private static final Logger log = LoggerFactory.getLogger(AppointmentController.class);
    private static final String DEFAULT_STATUS = "Pending";

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PatientDoctorRepository patientDoctorRepository;
    private final AppointmentDoctorRepository appointmentDoctorRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    public AppointmentController(AppointmentRepository appointmentRepository,
                                 PatientRepository patientRepository,
                                 DoctorRepository doctorRepository,
                                 PatientDoctorRepository patientDoctorRepository,
                                 AppointmentDoctorRepository appointmentDoctorRepository) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.patientDoctorRepository = patientDoctorRepository;
        this.appointmentDoctorRepository = appointmentDoctorRepository;
    }

    @GetMapping
    public ResponseEntity<List<AppointmentDTO>> getAllAppointments() {
        List<AppointmentDTO> appointments = appointmentRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentDTO> getAppointmentById(@PathVariable Integer id) {
        return appointmentRepository.findById(id)
                .map(appointment -> ResponseEntity.ok(convertToDTO(appointment)))
                .orElse(ResponseEntity.notFound().<AppointmentDTO>build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<AppointmentDTO> createAppointment(@Valid @RequestBody AppointmentDTO appointmentDTO) {
        log.info("=== Starting createAppointment() ===");
        log.info("Request data: date={}, time={}, patientId={}, doctorId={}", 
                 appointmentDTO.getDate(), appointmentDTO.getTime(), 
                 appointmentDTO.getPatientId(), appointmentDTO.getDoctorId());
        
        if (appointmentDTO.getDate() == null
                || appointmentDTO.getTime() == null
                || appointmentDTO.getPatientId() == null
                || appointmentDTO.getDoctorId() == null) {
            log.warn("Missing required fields in appointment creation");
            return ResponseEntity.badRequest().<AppointmentDTO>build();
        }

        Appointment appointment = new Appointment();
        appointment.setDate(appointmentDTO.getDate());
        appointment.setTime(appointmentDTO.getTime());
        appointment.setStatus(appointmentDTO.getStatus() != null ? appointmentDTO.getStatus() : DEFAULT_STATUS);

        if (!setPatientIfPresent(appointment, appointmentDTO.getPatientId())) {
            log.warn("Patient not found with id: {}", appointmentDTO.getPatientId());
            return ResponseEntity.badRequest().<AppointmentDTO>build();
        }
        log.info("Patient set successfully: id={}, name={}", 
                 appointment.getPatient().getId(), appointment.getPatient().getName());
        
        if (!setDoctorIfPresent(appointment, appointmentDTO.getDoctorId())) {
            log.warn("Doctor not found with id: {}", appointmentDTO.getDoctorId());
            return ResponseEntity.badRequest().<AppointmentDTO>build();
        }
        log.info("Doctor set successfully: id={}, name={}", 
                 appointment.getDoctor().getId(), appointment.getDoctor().getName());

        log.info("Saving appointment to database...");
        Appointment savedAppointment = appointmentRepository.save(appointment);
        log.info("Appointment saved with id: {}", savedAppointment.getId());
        
        // Flush to ensure the appointment is persisted and ID is generated
        log.info("Flushing entity manager to ensure persistence...");
        entityManager.flush();
        log.info("Flush completed. Appointment ID: {}", savedAppointment.getId());
        
        // Verify the appointment has all required data
        if (savedAppointment.getId() == null) {
            log.error("CRITICAL: Appointment ID is null after save and flush!");
            throw new RuntimeException("Failed to generate appointment ID");
        }
        if (savedAppointment.getPatient() == null) {
            log.error("CRITICAL: Appointment patient is null after save!");
            throw new RuntimeException("Appointment patient is null after save");
        }
        if (savedAppointment.getDoctor() == null) {
            log.error("CRITICAL: Appointment doctor is null after save!");
            throw new RuntimeException("Appointment doctor is null after save");
        }
        
        log.info("Appointment verification passed. Proceeding to update relationships...");
        
        // Update relationship tables
        updateRelationships(savedAppointment);
        
        log.info("=== createAppointment() completed successfully ===");
        log.info("Final appointment details - ID: {}, Patient: {}, Doctor: {}, Date: {}, Time: {}",
                 savedAppointment.getId(), 
                 savedAppointment.getPatient().getName(),
                 savedAppointment.getDoctor().getName(),
                 savedAppointment.getDate(),
                 savedAppointment.getTime());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDTO(savedAppointment));
    }

    private void updateRelationships(Appointment appointment) {
        log.info("=== Starting updateRelationships() ===");
        
        if (appointment == null) {
            log.error("Appointment is null - cannot update relationships");
            throw new IllegalStateException("Appointment cannot be null when updating relationships");
        }
        
        if (appointment.getId() == null) {
            log.error("Appointment ID is null - appointment may not have been saved properly");
            throw new IllegalStateException("Appointment ID is null - ensure appointment is saved first");
        }
        
        if (appointment.getPatient() == null) {
            log.error("Appointment patient is null");
            throw new IllegalStateException("Appointment must have a patient");
        }
        
        if (appointment.getDoctor() == null) {
            log.error("Appointment doctor is null");
            throw new IllegalStateException("Appointment must have a doctor");
        }

        Integer patientId = appointment.getPatient().getId();
        Integer doctorId = appointment.getDoctor().getId();
        Integer appointmentId = appointment.getId();

        log.info("Extracted IDs - patientId: {}, doctorId: {}, appointmentId: {}", patientId, doctorId, appointmentId);

        if (patientId == null || doctorId == null || appointmentId == null) {
            log.error("One or more required IDs are null - patientId: {}, doctorId: {}, appointmentId: {}", 
                     patientId, doctorId, appointmentId);
            throw new IllegalStateException("All IDs (patient, doctor, appointment) must be non-null");
        }

        try {
            // 1. Update patient_doctors if relationship doesn't exist
            log.info("Checking if patient-doctor relationship exists for patient {} and doctor {}", patientId, doctorId);
            PatientDoctorId pdId = new PatientDoctorId(patientId, doctorId);
            boolean pdExists = patientDoctorRepository.existsById(pdId);
            log.info("Patient-doctor relationship exists: {}", pdExists);
            
            if (!pdExists) {
                log.info("Creating new patient-doctor relationship for patient {} and doctor {}", patientId, doctorId);
                PatientDoctor pd = new PatientDoctor(pdId, appointment.getPatient(), appointment.getDoctor());
                PatientDoctor savedPd = patientDoctorRepository.save(pd);
                log.info("Patient-doctor relationship saved successfully: {}", savedPd.getId());
            } else {
                log.info("Patient-doctor relationship already exists, skipping creation");
            }
        } catch (Exception e) {
            log.error("Failed to create patient-doctor relationship: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create patient-doctor relationship: " + e.getMessage(), e);
        }

        try {
            // 2. Update appointment_doctors
            log.info("Checking if appointment-doctor relationship exists for appointment {} and doctor {}", appointmentId, doctorId);
            AppointmentDoctorId adId = new AppointmentDoctorId(appointmentId, doctorId);
            boolean adExists = appointmentDoctorRepository.existsById(adId);
            log.info("Appointment-doctor relationship exists: {}", adExists);
            
            if (!adExists) {
                log.info("Creating new appointment-doctor relationship for appointment {} and doctor {}", appointmentId, doctorId);
                AppointmentDoctor ad = new AppointmentDoctor(adId, appointment, appointment.getDoctor(), appointment.getPatient());
                AppointmentDoctor savedAd = appointmentDoctorRepository.save(ad);
                log.info("Appointment-doctor relationship saved successfully: {}", savedAd.getId());
            } else {
                log.info("Appointment-doctor relationship already exists, skipping creation");
            }
        } catch (Exception e) {
            log.error("Failed to create appointment-doctor relationship: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create appointment-doctor relationship: " + e.getMessage(), e);
        }

        log.info("=== updateRelationships() completed successfully ===");
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentDTO> updateAppointment(@PathVariable Integer id,
                                                            @Valid @RequestBody AppointmentDTO appointmentDTO) {
        return appointmentRepository.findById(id)
                .map(existingAppointment -> {
                    if (!updateAppointmentFields(existingAppointment, appointmentDTO)) {
                        return ResponseEntity.badRequest().<AppointmentDTO>build();
                    }
                    Appointment savedAppointment = appointmentRepository.save(existingAppointment);
                    return ResponseEntity.ok(convertToDTO(savedAppointment));
                })
                .orElse(ResponseEntity.notFound().<AppointmentDTO>build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteAppointment(@PathVariable Integer id) {
        log.info("Attempting to delete appointment with id: {}", id);
        int deleted = appointmentRepository.hardDeleteById(id);
        log.info("Delete result: {} rows affected", deleted);
        if (deleted == 0) {
            log.warn("Appointment with id {} not found", id);
            return ResponseEntity.notFound().build();
        }
        log.info("Successfully deleted appointment with id: {}", id);
        return ResponseEntity.noContent().build();
    }

    private AppointmentDTO convertToDTO(Appointment appointment) {
        AppointmentDTO dto = new AppointmentDTO();
        dto.setId(appointment.getId());
        dto.setDate(appointment.getDate());
        dto.setTime(appointment.getTime());
        dto.setStatus(appointment.getStatus());

        Optional.ofNullable(appointment.getPatient()).ifPresent(patient -> {
            dto.setPatientId(patient.getId());
            dto.setPatientName(patient.getName());
        });

        Optional.ofNullable(appointment.getDoctor()).ifPresent(doctor -> {
            dto.setDoctorId(doctor.getId());
            dto.setDoctorName(doctor.getName());
        });

        return dto;
    }

    private boolean updateAppointmentFields(Appointment existing, AppointmentDTO updates) {
        if (updates.getDate() != null) {
            existing.setDate(updates.getDate());
        }
        if (updates.getTime() != null) {
            existing.setTime(updates.getTime());
        }
        if (updates.getStatus() != null) {
            existing.setStatus(updates.getStatus());
        }
        if (updates.getPatientId() != null) {
            if (!setPatientIfPresent(existing, updates.getPatientId())) {
                return false;
            }
        }
        if (updates.getDoctorId() != null) {
            if (!setDoctorIfPresent(existing, updates.getDoctorId())) {
                return false;
            }
        }
        return true;
    }

    private boolean setPatientIfPresent(Appointment appointment, Integer patientId) {
        if (patientId == null) {
            return true;
        }
        return patientRepository.findById(patientId)
                .map(patient -> {
                    appointment.setPatient(patient);
                    return true;
                })
                .orElse(false);
    }

    private boolean setDoctorIfPresent(Appointment appointment, Integer doctorId) {
        if (doctorId == null) {
            return true;
        }
        return doctorRepository.findById(doctorId)
                .map(doctor -> {
                    appointment.setDoctor(doctor);
                    return true;
                })
                .orElse(false);
    }
}
