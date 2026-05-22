package hana.com.clinic_system.entities;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentDTO {
    private Integer id;
    private LocalDate date;
    private String time;
    private String status;
    private Integer patientId;
    private Integer doctorId;
    private String patientName;
    private String doctorName;
}
