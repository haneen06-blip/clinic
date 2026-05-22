CREATE DATABASE clinic_db COLLATE Arabic_100_CI_AS;
USE clinic_db;

-- 1. جدول الدكاترة
CREATE TABLE doctors (
    id             INT IDENTITY PRIMARY KEY,
    name           NVARCHAR(100) COLLATE Arabic_100_CI_AS NOT NULL,
    specialization NVARCHAR(100) COLLATE Arabic_100_CI_AS NOT NULL
);

-- 2. جدول المرضى
CREATE TABLE patients (
    id    INT IDENTITY PRIMARY KEY,
    name  NVARCHAR(100) COLLATE Arabic_100_CI_AS NOT NULL,
    phone NVARCHAR(20)  COLLATE Arabic_100_CI_AS NOT NULL,
    email NVARCHAR(100) COLLATE Arabic_100_CI_AS UNIQUE NOT NULL
);

-- 3. جدول المواعيد
CREATE TABLE appointments (
    id         INT IDENTITY PRIMARY KEY,
    date       DATE NOT NULL,
    time       NVARCHAR(20) COLLATE Arabic_100_CI_AS NULL,
    status     NVARCHAR(50) COLLATE Arabic_100_CI_AS DEFAULT N'Pending',
    patient_id INT NULL,
    doctor_id  INT NULL,
    CONSTRAINT fk_app_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    CONSTRAINT fk_app_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE SET NULL
);

-- 4. جدول وسيط: patients ↔ doctors (Many-to-Many)
CREATE TABLE patient_doctors (
    patient_id INT NOT NULL,
    doctor_id  INT NOT NULL,
    PRIMARY KEY (patient_id, doctor_id),
    CONSTRAINT fk_pd_patient 
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_pd_doctor  
        FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE CASCADE
);

-- 5. جدول وسيط: appointments ↔ doctors (Many-to-Many)
CREATE TABLE appointment_doctors (
    appointment_id INT NOT NULL,
    doctor_id      INT NOT NULL,
    patient_id     INT NOT NULL,
    PRIMARY KEY (appointment_id, doctor_id),
    CONSTRAINT fk_ad_appointment 
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_ad_doctor      
        FOREIGN KEY (doctor_id)      REFERENCES doctors(id)      ON DELETE CASCADE,
    CONSTRAINT fk_ad_patient     
        FOREIGN KEY (patient_id)     REFERENCES patients(id)     ON DELETE CASCADE
);

-- =================== INSERT DATA ===================

INSERT INTO doctors (name, specialization) VALUES
('Dr. Ahmed Hassan',  'Cardiology'),
('Dr. Sara Mahmoud',  'Dermatology'),
('Dr. Omar Khaled',   'Orthopedics'),
('Dr. Nadia Farouk',  'Pediatrics'),
('Dr. Youssef Nabil', 'Neurology');

INSERT INTO patients (name, phone, email) VALUES
('Mohamed Ali',   '01001234567', 'mohamed@email.com'),
('Hana Mostafa',  '01112345678', 'hana@email.com'),
('Karim Samy',    '01223456789', 'karim@email.com'),
('Laila Adel',    '01334567890', 'laila@email.com'),
('Tarek Ibrahim', '01445678901', 'tarek@email.com');

INSERT INTO appointments (date, time, status, patient_id, doctor_id) VALUES
('2025-08-01', '10:00', 'Confirmed', 1, 1),
('2025-08-02', '11:30', 'Confirmed', 2, 2),
('2025-08-03', '14:00', 'Confirmed', 3, 1),
('2025-08-04', '16:45', 'Confirmed', 4, 3),
('2025-08-05', '18:15', 'Confirmed', 5, 4);

-- مريض بيتعالج عند أكتر من دكتور
INSERT INTO patient_doctors (patient_id, doctor_id) VALUES
(1, 1),  -- Mohamed → Dr. Ahmed
(1, 2),  -- Mohamed → Dr. Sara
(2, 2),  -- Hana    → Dr. Sara
(3, 1),  -- Karim   → Dr. Ahmed
(3, 3),  -- Karim   → Dr. Omar
(4, 3),  -- Laila   → Dr. Omar
(5, 4);  -- Tarek   → Dr. Nadia

-- موعد فيه أكتر من دكتور
INSERT INTO appointment_doctors (appointment_id, doctor_id, patient_id) VALUES
(1, 1, 1),  -- موعد 1: Mohamed → Dr. Ahmed
(1, 2, 1),  -- موعد 1: Mohamed → Dr. Sara  (نفس الموعد دكتورين!)
(2, 2, 2),  -- موعد 2: Hana    → Dr. Sara
(3, 1, 3),  -- موعد 3: Karim   → Dr. Ahmed
(4, 3, 4),  -- موعد 4: Laila   → Dr. Omar
(5, 4, 5);  -- موعد 5: Tarek   → Dr. Nadia

-- =================== SELECT ===================

-- كل الدكاترة
SELECT * FROM doctors;

-- كل المرضى
SELECT * FROM patients;

-- مين بيتعالج عند مين
SELECT 
    p.name AS patient_name,
    d.name AS doctor_name,
    d.specialization
FROM patient_doctors pd
JOIN patients p ON pd.patient_id = p.id
JOIN doctors  d ON pd.doctor_id  = d.id;

-- كل المواعيد مع المرضى والدكاترة
SELECT 
    a.id   AS appointment_id,
    p.name AS patient_name,
    d.name AS doctor_name,
    d.specialization,
    a.date,
    a.time,
    a.status
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN doctors  d ON a.doctor_id  = d.id
ORDER BY a.id;
