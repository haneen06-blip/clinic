package hana.com.clinic_system.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import hana.com.clinic_system.entities.AppointmentDoctor;
import hana.com.clinic_system.entities.AppointmentDoctorId;

@Repository
public interface AppointmentDoctorRepository extends JpaRepository<AppointmentDoctor, AppointmentDoctorId> {

    List<AppointmentDoctor> findByAppointmentId(Integer appointmentId);
    
    List<AppointmentDoctor> findByDoctorId(Integer doctorId);
    
    List<AppointmentDoctor> findByPatientId(Integer patientId);
    
    @Query("SELECT ad FROM AppointmentDoctor ad WHERE ad.appointment.id = :appointmentId AND ad.doctor.id = :doctorId")
    AppointmentDoctor findByAppointmentIdAndDoctorId(@Param("appointmentId") Integer appointmentId, @Param("doctorId") Integer doctorId);
    
    @Modifying
    @Query("DELETE FROM AppointmentDoctor ad WHERE ad.appointment.id = :appointmentId AND ad.doctor.id = :doctorId")
    int deleteByAppointmentIdAndDoctorId(@Param("appointmentId") Integer appointmentId, @Param("doctorId") Integer doctorId);
    
    @Modifying
    @Query("DELETE FROM AppointmentDoctor ad WHERE ad.appointment.id = :appointmentId")
    int deleteByAppointmentId(@Param("appointmentId") Integer appointmentId);
    
    @Modifying
    @Query("DELETE FROM AppointmentDoctor ad WHERE ad.doctor.id = :doctorId")
    int deleteByDoctorId(@Param("doctorId") Integer doctorId);
    
    @Modifying
    @Query("DELETE FROM AppointmentDoctor ad WHERE ad.patient.id = :patientId")
    int deleteByPatientId(@Param("patientId") Integer patientId);
    
    @Query("SELECT d.id, d.name, d.specialization FROM AppointmentDoctor ad JOIN ad.doctor d WHERE ad.appointment.id = :appointmentId")
    List<Object[]> findDoctorsByAppointmentId(@Param("appointmentId") Integer appointmentId);
    
    @Query("SELECT a.id, a.date, a.time, a.status FROM AppointmentDoctor ad JOIN ad.appointment a WHERE ad.doctor.id = :doctorId")
    List<Object[]> findAppointmentsByDoctorId(@Param("doctorId") Integer doctorId);
    
    @Query("SELECT a.id, a.date, a.time, a.status FROM AppointmentDoctor ad JOIN ad.appointment a WHERE ad.patient.id = :patientId")
    List<Object[]> findAppointmentsByPatientId(@Param("patientId") Integer patientId);
}
