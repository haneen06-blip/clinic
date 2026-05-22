/* ==================== NABD CLINIC - DATA SERVICE LAYER ==================== */
/* API Integration with Error Handling and Validation */

const API_BASE_URL = 'http://localhost:8080/api';

const CONFIG = {
  API_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

const ENDPOINTS = {
  DOCTORS: '/doctors',
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  PATIENT_DOCTORS: '/patient-doctors',
  APPOINTMENT_DOCTORS: '/appointment-doctors',
};

const STORAGE_KEYS = {
  DOCTORS_CACHE: 'nabd_doctors_cache',
  PATIENTS_CACHE: 'nabd_patients_cache',
  APPOINTMENTS_CACHE: 'nabd_appointments_cache',
  CACHE_TIMESTAMP: 'nabd_cache_timestamp',
};

const CACHE_DURATION = 5 * 60 * 1000;

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.timeout = CONFIG.API_TIMEOUT;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.handleError(response);
        throw error;
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.');
      }
      throw error;
    }
  }

  async handleError(response) {
    let message = 'حدث خطأ غير متوقع';
    
    switch (response.status) {
      case 400:
        message = 'البيانات المدخلة غير صحيحة';
        break;
      case 401:
        message = 'غير مصرح بالوصول';
        break;
      case 403:
        message = 'محظور الوصول';
        break;
      case 404:
        message = 'البيانات غير موجودة';
        break;
      case 500:
        message = 'خطأ في الخادم. يرجى المحاولة لاحقاً';
        break;
      case 503:
        message = 'الخدمة غير متاحة حالياً';
        break;
      default:
        try {
          const errorData = await response.json();
          message = errorData.message || errorData.error || message;
        } catch {
          message = `خطأ HTTP: ${response.status}`;
        }
    }

    const error = new Error(message);
    error.status = response.status;
    console.error(`API Error [${response.status}]: ${message}`);
    return error;
  }

  async get(endpoint, useCache = false) {
    if (useCache) {
      const cached = this.getFromCache(endpoint);
      if (cached) return cached;
    }

    const data = await this.request(endpoint, { method: 'GET' });
    
    if (useCache) {
      this.saveToCache(endpoint, data);
    }
    
    return data;
  }

  async post(endpoint, data) {
    const response = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.clearCache(endpoint);
    return response;
  }

  async put(endpoint, data) {
    const response = await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.clearCache(endpoint);
    return response;
  }

  async delete(endpoint) {
    const response = await this.request(endpoint, {
      method: 'DELETE',
    });
    this.clearCache(endpoint);
    return response;
  }

  getFromCache(endpoint) {
    try {
      const key = this.getCacheKey(endpoint);
      const cached = localStorage.getItem(key);
      const timestamp = localStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP);
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  saveToCache(endpoint, data) {
    try {
      const key = this.getCacheKey(endpoint);
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    } catch {
      console.warn('Cache storage failed');
    }
  }

  clearCache(endpoint) {
    try {
      const key = this.getCacheKey(endpoint);
      localStorage.removeItem(key);
    } catch {
      // Ignore cache errors
    }
  }

  getCacheKey(endpoint) {
    return `nabd_${endpoint.replace(/\//g, '_')}_cache`;
  }

  clearAllCache() {
    Object.values(STORAGE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    });
  }
}

class DoctorsService extends ApiService {
  async getAll() {
    return this.get(ENDPOINTS.DOCTORS, true);
  }

  async getById(id) {
    return this.get(`${ENDPOINTS.DOCTORS}/${id}`);
  }

  async deleteDoctor(id) {
    return super.delete(`${ENDPOINTS.DOCTORS}/${id}`);
  }

  getSpecialtyLabel(specialty) {
    const specialties = {
      'Cardiology': 'القلب والأوعية الدموية',
      'Dermatology': 'الجلدية',
      'Orthopedics': 'العظام والمفاصل',
      'Pediatrics': 'الأطفال',
      'Neurology': 'المخ والأعصاب',
      'General Surgery': 'الجراحة العامة',
      'ENT': 'الأذن والأنف والحنجرة',
      'Ophthalmology': 'العيون',
      'Psychiatry': 'النفسية والعصبية',
    };
    return specialties[specialty] || specialty;
  }
}

class PatientsService extends ApiService {
  async getAll() {
    return this.get(ENDPOINTS.PATIENTS);
  }

  async getById(id) {
    return this.get(`${ENDPOINTS.PATIENTS}/${id}`);
  }

  async create(patientData) {
    const validatedData = this.validatePatient(patientData);
    return this.post(ENDPOINTS.PATIENTS, validatedData);
  }

  async update(id, patientData) {
    const validatedData = this.validatePatient(patientData, true);
    return this.put(`${ENDPOINTS.PATIENTS}/${id}`, validatedData);
  }

  async deletePatient(id) {
    return super.delete(`${ENDPOINTS.PATIENTS}/${id}`);
  }

  async getByEmail(email) {
    return this.get(`${ENDPOINTS.PATIENTS}/email/${email}`);
  }

  validatePatient(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.name !== undefined) {
      if (!data.name || data.name.trim().length < 2) {
        errors.push('الاسم يجب أن يكون حرفين على الأقل');
      }
    }

    if (!isUpdate || data.phone !== undefined) {
      if (!data.phone || !/^01[0-9]{9}$/.test(data.phone)) {
        errors.push('رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقم');
      }
    }

    if (!isUpdate || data.email !== undefined) {
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('البريد الإلكتروني غير صالح');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return {
      name: data.name?.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim().toLowerCase(),
    };
  }

  async findByPhone(phone) {
    const patients = await this.getAll();
    return patients.find(p => p.phone === phone);
  }

  async findByEmail(email) {
    const patients = await this.getAll();
    return patients.find(p => p.email.toLowerCase() === email.toLowerCase());
  }
}

class AppointmentsService extends ApiService {
  async getAll() {
    return this.get(ENDPOINTS.APPOINTMENTS);
  }

  async getById(id) {
    return this.get(`${ENDPOINTS.APPOINTMENTS}/${id}`);
  }

  async create(appointmentData) {
    const validatedData = this.validateAppointment(appointmentData);
    return this.post(ENDPOINTS.APPOINTMENTS, validatedData);
  }

  async update(id, appointmentData) {
    const validatedData = this.validateAppointment(appointmentData, true);
    return this.put(`${ENDPOINTS.APPOINTMENTS}/${id}`, validatedData);
  }

  async deleteAppointment(id) {
    return super.delete(`${ENDPOINTS.APPOINTMENTS}/${id}`);
  }

  async cancel(id) {
    return this.update(id, { status: 'Cancelled' });
  }

  async confirm(id) {
    return this.update(id, { status: 'Confirmed' });
  }

  validateAppointment(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.date !== undefined) {
      if (!data.date) {
        errors.push('التاريخ مطلوب');
      } else {
        const selectedDate = new Date(data.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          errors.push('لا يمكن حجز موعد في تاريخ سابق');
        }
      }
    }

    if (!isUpdate || data.time !== undefined) {
      if (!data.time) {
        errors.push('الوقت مطلوب');
      }
    }

    if (!isUpdate || data.patientId !== undefined) {
      if (!data.patientId) {
        errors.push('يجب اختيار المريض');
      }
    }

    if (!isUpdate || data.doctorId !== undefined) {
      if (!data.doctorId) {
        errors.push('يجب اختيار الطبيب');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return {
      date: data.date,
      time: data.time,
      status: data.status || 'Pending',
      patientId: data.patientId ? parseInt(data.patientId) : null,
      doctorId: data.doctorId ? parseInt(data.doctorId) : null,
    };
  }

  async getByDate(date) {
    const appointments = await this.getAll();
    return appointments.filter(a => a.date === date);
  }

  async getByDoctor(doctorId) {
    const appointments = await this.getAll();
    return appointments.filter(a => a.doctorId === parseInt(doctorId));
  }

  async getByPatient(patientId) {
    const appointments = await this.getAll();
    return appointments.filter(a => a.patientId === parseInt(patientId));
  }

  async getUpcoming() {
    const appointments = await this.getAll();
    const today = new Date().toISOString().split('T')[0];
    return appointments
      .filter(a => a.date >= today && a.status !== 'Cancelled')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  async getAvailableSlots(doctorId, date) {
    const allSlots = this.generateTimeSlots();
    const appointments = await this.getByDoctor(doctorId);
    const bookedSlots = appointments
      .filter(a => a.date === date && a.status !== 'Cancelled')
      .map(a => a.time);

    return allSlots.map(slot => ({
      time: slot,
      available: !bookedSlots.includes(slot),
    }));
  }

  generateTimeSlots() {
    const slots = [];
    for (let hour = 9; hour < 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }
}

class PatientDoctorsService extends ApiService {
  async getAll() {
    return this.get(ENDPOINTS.PATIENT_DOCTORS);
  }

  async getDoctorsByPatient(patientId) {
    return this.get(`${ENDPOINTS.PATIENT_DOCTORS}/patient/${patientId}`);
  }

  async getPatientsByDoctor(doctorId) {
    return this.get(`${ENDPOINTS.PATIENT_DOCTORS}/doctor/${doctorId}`);
  }

  async createRelation(patientId, doctorId) {
    return this.post(ENDPOINTS.PATIENT_DOCTORS, { patientId, doctorId });
  }

  async deleteRelation(patientId, doctorId) {
    return this.delete(`${ENDPOINTS.PATIENT_DOCTORS}/patient/${patientId}/doctor/${doctorId}`);
  }
}

class AppointmentDoctorsService extends ApiService {
  async getAll() {
    return this.get(ENDPOINTS.APPOINTMENT_DOCTORS);
  }

  async getDoctorsByAppointment(appointmentId) {
    return this.get(`${ENDPOINTS.APPOINTMENT_DOCTORS}/appointment/${appointmentId}`);
  }

  async getAppointmentsByDoctor(doctorId) {
    return this.get(`${ENDPOINTS.APPOINTMENT_DOCTORS}/doctor/${doctorId}`);
  }

  async getAppointmentsByPatient(patientId) {
    return this.get(`${ENDPOINTS.APPOINTMENT_DOCTORS}/patient/${patientId}`);
  }

  async createRelation(appointmentId, doctorId, patientId) {
    return this.post(ENDPOINTS.APPOINTMENT_DOCTORS, { appointmentId, doctorId, patientId });
  }

  async deleteRelation(appointmentId, doctorId) {
    return this.delete(`${ENDPOINTS.APPOINTMENT_DOCTORS}/appointment/${appointmentId}/doctor/${doctorId}`);
  }
}

class ValidationError extends Error {
  constructor(errors) {
    super(errors.join(', '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

const doctorsService = new DoctorsService();
const patientsService = new PatientsService();
const appointmentsService = new AppointmentsService();
const patientDoctorsService = new PatientDoctorsService();
const appointmentDoctorsService = new AppointmentDoctorsService();

const MockData = {
  doctors: [
    { id: 1, name: 'د. أحمد حسن', specialization: 'Cardiology', image: 'images/doctor-1.jpg', experience: 25, price: 750 },
    { id: 2, name: 'د. سارة محمود', specialization: 'Dermatology', image: 'images/doctor-2.jpg', experience: 7, price: 450 },
    { id: 3, name: 'د. عمر خالد', specialization: 'Orthopedics', image: 'images/doctor-3.jpg', experience: 6, price: 400 },
    { id: 4, name: 'د. نادية فاروق', specialization: 'Pediatrics', image: 'images/doctor-4.jpg', experience: 5, price: 350 },
    { id: 5, name: 'د. يوسف نبيل', specialization: 'Neurology', image: 'images/doctor-5.jpg', experience: 13, price: 550 },
  ],
  
  services: [
    { id: 1, title: 'القلب والأوعية الدموية', icon: 'fas fa-heartbeat', description: 'رعاية قلبية متكاملة باستخدام أحدث التقنيات العالمية' },
    { id: 2, title: 'المخ والأعصاب', icon: 'fas fa-brain', description: 'تشخيص وعلاج أمراض الجهاز العصبي بدقة عالية' },
    { id: 3, title: 'العظام والمفاصل', icon: 'fas fa-bone', description: 'علاج إصابات العظام والمفاصل بأحدث الأساليب' },
    { id: 4, title: 'الأطفال', icon: 'fas fa-baby', description: 'رعاية صحية شاملة لأطفالكم من الولادة حتى المراهقة' },
    { id: 5, title: 'الجلدية', icon: 'fas fa-allergies', description: 'علاج أمراض الجلد والتجميل بأحدث التقنيات' },
  ],
  
  stats: [
    { number: 15234, suffix: '+', label: 'مريض سعيد', icon: 'fas fa-users' },
    { number: 52, suffix: '+', label: 'طبيب متخصص', icon: 'fas fa-user-md' },
    { number: 15, suffix: '+', label: 'سنة خبرة', icon: 'fas fa-award' },
    { number: 99.8, suffix: '%', label: 'نسبة النجاح', icon: 'fas fa-chart-line' },
  ],
  
  whyChooseUs: [
    { icon: 'fas fa-user-md', title: 'نخبة الأطباء', description: 'نخبة من أفضل الأطباء المتخصصين في مختلف المجالات' },
    { icon: 'fas fa-microscope', title: 'أحدث التقنيات', description: 'أحدث التقنيات والمعدات الطبية العالمية' },
    { icon: 'fas fa-clock', title: 'رعاية 24/7', description: 'رعاية طبية على مدار الساعة طوال أيام الأسبوع' },
    { icon: 'fas fa-shield-alt', title: 'بيئة آمنة', description: 'بيئة علاجية مريحة وآمنة للمرضى' },
    { icon: 'fas fa-hand-holding-usd', title: 'أسعار تنافسية', description: 'أسعار تنافسية وخطط دفع مرنة تناسب الجميع' },
    { icon: 'fas fa-star', title: 'جودة عالمية', description: 'معايير جودة عالمية في جميع خدماتنا الطبية' },
  ],
};

const Utils = {
  formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-EG', options);
  },

  formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  },

  formatDateTime(date, time) {
    return `${this.formatDate(date)} - ${this.formatTime(time)}`;
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidEgyptianPhone(phone) {
    return /^01[0-9]{9}$/.test(phone);
  },

  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  },

  getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  },

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async retry(fn, attempts = CONFIG.RETRY_ATTEMPTS, delay = CONFIG.RETRY_DELAY) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        await this.sleep(delay * (i + 1));
      }
    }
  },
};

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'success', duration = 5000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: 'fas fa-check',
      error: 'fas fa-times',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info',
    };

    const titles = {
      success: 'تم بنجاح',
      error: 'حدث خطأ',
      warning: 'تحذير',
      info: 'معلومات',
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="${icons[type]}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${titles[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.hide(toast));

    this.container.appendChild(toast);

    setTimeout(() => this.hide(toast), duration);
  },

  hide(toast) {
    toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error', 7000);
  },

  warning(message) {
    this.show(message, 'warning');
  },

  info(message) {
    this.show(message, 'info');
  },
};

const Modal = {
  show(options) {
    const { title, content, buttons = [], onClose } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${buttons.length ? `
          <div class="modal-footer">
            ${buttons.map(btn => `
              <button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.action}">
                ${btn.text}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    const closeBtn = overlay.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => this.hide(overlay, onClose));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide(overlay, onClose);
      }
    });

    buttons.forEach(btn => {
      const btnEl = overlay.querySelector(`[data-action="${btn.action}"]`);
      if (btnEl && btn.onClick) {
        btnEl.addEventListener('click', () => {
          btn.onClick();
          this.hide(overlay, onClose);
        });
      }
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    return overlay;
  },

  hide(overlay, onClose) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 300);
  },

  confirm(message, onConfirm, onCancel) {
    return this.show({
      title: 'تأكيد',
      content: `<p>${message}</p>`,
      buttons: [
        {
          text: 'إلغاء',
          class: 'btn-secondary',
          action: 'cancel',
          onClick: onCancel,
        },
        {
          text: 'تأكيد',
          class: 'btn-primary',
          action: 'confirm',
          onClick: onConfirm,
        },
      ],
    });
  },

  alert(message, title = 'تنبيه') {
    return this.show({
      title,
      content: `<p>${message}</p>`,
      buttons: [
        {
          text: 'حسناً',
          class: 'btn-primary',
          action: 'ok',
        },
      ],
    });
  },
};

const CacheManager = {
  get(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const { data, expiry } = JSON.parse(item);
      if (Date.now() > expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  set(key, data, ttl = CACHE_DURATION) {
    try {
      const item = {
        data,
        expiry: Date.now() + ttl,
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch {
      console.warn('Cache storage failed');
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },
};

const FormUtils = {
  clearAllErrors(form) {
    form.querySelectorAll('.form-group').forEach(group => {
      group.classList.remove('error');
    });
  },

  validateRequired(value) {
    return value && value.trim().length > 0;
  },

  validatePhone(phone) {
    return /^01[0-9]{9}$/.test(phone);
  },

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  showError(input, message) {
    const group = input.closest('.form-group');
    if (group) {
      group.classList.add('error');
      const errorEl = group.querySelector('.form-error');
      if (errorEl && message) {
        errorEl.textContent = message;
      }
    }
  },

  clearError(input) {
    const group = input.closest('.form-group');
    if (group) {
      group.classList.remove('error');
    }
  },

  setLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }
};

const CalendarUtils = {
  formatMonthYear(year, month) {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return `${months[month]} ${year}`;
  },

  getFirstDayOfMonth(year, month) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  },

  getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  getDayNames() {
    return ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  },

  isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
};

window.NabdClinic = {
  API: {
    doctors: doctorsService,
    patients: patientsService,
    appointments: appointmentsService,
    patientDoctors: patientDoctorsService,
    appointmentDoctors: appointmentDoctorsService,
  },
  Utils,
  Toast,
  Modal,
  Cache: CacheManager,
  MockData,
  ValidationError,
  FormUtils,
  CalendarUtils,
};

console.log('%c نبض - عيادة نبض الطبية ', 'background: linear-gradient(135deg, #0066ff, #00d4ff); color: white; font-size: 20px; padding: 10px 20px; border-radius: 5px; font-family: Arial, sans-serif;');
console.log('%c Pulse of Life in Your Hands ', 'color: #00d4ff; font-size: 14px; font-family: Arial, sans-serif;');
