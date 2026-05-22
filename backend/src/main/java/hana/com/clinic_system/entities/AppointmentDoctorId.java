package hana.com.clinic_system.entities;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class AppointmentDoctorId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "appointment_id", nullable = false)
    private Integer appointmentId;

    @Column(name = "doctor_id", nullable = false)
    private Integer doctorId;
}

