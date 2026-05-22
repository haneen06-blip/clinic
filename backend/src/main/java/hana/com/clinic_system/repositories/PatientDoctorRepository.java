package hana.com.clinic_system.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import hana.com.clinic_system.entities.PatientDoctor;
import hana.com.clinic_system.entities.PatientDoctorId;

@Repository
public interface PatientDoctorRepository extends JpaRepository<PatientDoctor, PatientDoctorId> {

    List<PatientDoctor> findByPatientId(Integer patientId);
    
    List<PatientDoctor> findByDoctorId(Integer doctorId);
    
    @Query("SELECT pd FROM PatientDoctor pd WHERE pd.patient.id = :patientId AND pd.doctor.id = :doctorId")
    PatientDoctor findByPatientIdAndDoctorId(@Param("patientId") Integer patientId, @Param("doctorId") Integer doctorId);
    
    @Modifying
    @Query("DELETE FROM PatientDoctor pd WHERE pd.patient.id = :patientId AND pd.doctor.id = :doctorId")
    int deleteByPatientIdAndDoctorId(@Param("patientId") Integer patientId, @Param("doctorId") Integer doctorId);
    
    @Modifying
    @Query("DELETE FROM PatientDoctor pd WHERE pd.patient.id = :patientId")
    int deleteByPatientId(@Param("patientId") Integer patientId);
    
    @Modifying
    @Query("DELETE FROM PatientDoctor pd WHERE pd.doctor.id = :doctorId")
    int deleteByDoctorId(@Param("doctorId") Integer doctorId);
    
    @Query("SELECT d.id, d.name, d.specialization FROM PatientDoctor pd JOIN pd.doctor d WHERE pd.patient.id = :patientId")
    List<Object[]> findDoctorsByPatientId(@Param("patientId") Integer patientId);
    
    @Query("SELECT p.id, p.name, p.phone, p.email FROM PatientDoctor pd JOIN pd.patient p WHERE pd.doctor.id = :doctorId")
    List<Object[]> findPatientsByDoctorId(@Param("doctorId") Integer doctorId);
}
