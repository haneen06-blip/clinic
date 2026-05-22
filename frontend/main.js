/* ==================== NABD CLINIC - MAIN JAVASCRIPT ==================== */
/* Navigation, Animations, and UI Logic */

document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initNavigation();
  initScrollAnimations();
  initGlobalTextAnimations();
  initCounterAnimations();
  initParticles();
  initHero3D();
  initDoctorSlider();
  initSmoothScroll();
  initScrollProgress();
  initAccessibility();
  initLazyLoading();
  initParallax();
  initHeroAnimations();
  loadServices();
  loadDoctors();
});

/* ==================== GLOBAL TEXT ANIMATIONS ==================== */
function initGlobalTextAnimations() {
  const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p:not(.hero-tagline), .section-subtitle');
  
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('aos-animate');
        observer.unobserve(entry.target); // Animate only once
      }
    });
  }, observerOptions);

  textElements.forEach(el => {
    if (!el.classList.contains('hero-animate')) {
       el.classList.add('reveal-text');
       observer.observe(el);
    }
  });
}

/* ==================== HERO ANIMATIONS ==================== */
function splitTextIntoWords(element, baseDelay = 0, wordInterval = 0.2) {
  if (!element) return;
  const text = element.textContent.trim();
  const words = text.split(/\s+/);
  element.innerHTML = '';
  element.classList.add('word-reveal-container');

  words.forEach((word, i) => {
    const wrapper = document.createElement('span');
    wrapper.className = 'word-wrapper';
    const span = document.createElement('span');
    span.className = 'word-animate';
    span.textContent = word;
    // حساب التأخير الزمني 0.2 ثانية بين كل كلمة
    span.style.animationDelay = `${baseDelay + i * wordInterval}s`;
    
    const spacer = document.createTextNode('\u00A0');
    wrapper.appendChild(span);
    element.appendChild(wrapper);
    element.appendChild(spacer);
  });
}

function initHeroAnimations() {
  const badge = document.querySelector('.hero-badge');
  const titlePart1 = document.querySelector('.hero-title-1');
  const titlePart2 = document.querySelector('.hero-title-2');
  const tagline = document.querySelector('.hero-tagline');
  const buttons = document.querySelector('.hero-buttons');

  // البدء بعد انتهاء الـ Preloader (تقريباً 2.5 ثانية)
  const startTime = 2800;

  if (badge) {
    setTimeout(() => badge.classList.add('visible'), startTime);
  }

  if (titlePart1) splitTextIntoWords(titlePart1, (startTime + 300) / 1000, 0.12);
  if (titlePart2) splitTextIntoWords(titlePart2, (startTime + 800) / 1000, 0.12);
  if (tagline) splitTextIntoWords(tagline, (startTime + 1500) / 1000, 0.05);

  if (buttons) {
    setTimeout(() => {
      buttons.style.opacity = '1';
      buttons.style.transform = 'translateY(0)';
      buttons.classList.add('visible');
    }, startTime + 3000);
  }
}

/* ==================== LOAD SERVICES ==================== */
function loadServices() {
  const container = document.getElementById('services-container');
  if (!container) return;

  const services = NabdClinic.MockData.services;

  container.innerHTML = services.map((service, index) => `
    <div class="service-card" data-aos="fade-up" data-aos-delay="${index * 100}">
      <div class="service-icon">
        <i class="${service.icon}"></i>
      </div>
      <h3 class="service-title">${service.title}</h3>
      <p class="service-description">${service.description}</p>
      <a href="booking.html" class="service-link">
        احجز الآن
        <i class="fas fa-arrow-left"></i>
      </a>
    </div>
  `).join('');
}

/* ==================== LOAD DOCTORS ==================== */
async function loadDoctors() {
  const container = document.getElementById('doctors-container');
  if (!container) return;

  let doctors = [];
  try {
    doctors = await NabdClinic.API.doctors.getAll();
    // Add extra info for UI from MockData or defaults
    doctors = doctors.map(d => {
      const mock = (NabdClinic.MockData.doctors || []).find(m => m.id === d.id) || {};
      const prices = [400, 450, 500, 550, 600, 650, 700, 750, 800];
      const price = mock.price || prices[d.id % prices.length];
      return {
        ...d,
        image: mock.image || `images/doctor-${(d.id % 5) + 1}.jpg`,
        experience: mock.experience || 10,
        price: price,
        bio: mock.bio || `استشاري متخصص في ${NabdClinic.API.doctors.getSpecialtyLabel(d.specialization)}.`
      };
    });
  } catch (error) {
    console.error('Error loading doctors for home page:', error);
    doctors = (NabdClinic.MockData.doctors || []).map((d, index) => {
      const prices = [400, 450, 500, 550, 600, 650, 700, 750, 800];
      return {
        ...d,
        price: d.price || prices[index % prices.length],
        bio: d.bio || `استشاري متخصص في ${NabdClinic.API.doctors.getSpecialtyLabel(d.specialization)}.`
      };
    });
  }

  container.innerHTML = doctors.map((doctor, index) => `
    <div class="doctor-card" data-aos="fade-up" data-aos-delay="${index * 100}">
      <div class="doctor-image">
        <img src="${doctor.image}" alt="${doctor.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/350x300?text=Doctor'">
        <div class="doctor-overlay"></div>
      </div>
      <div class="doctor-info">
        <h3 class="doctor-name">${doctor.name}</h3>
        <span class="doctor-specialty">${NabdClinic.API.doctors.getSpecialtyLabel(doctor.specialization)}</span>
        <p class="doctor-experience">خبرة <span>${doctor.experience}+</span> سنة</p>
        <p class="doctor-bio">${doctor.bio}</p>
        <div class="doctor-price">
          <i class="fas fa-tag"></i>
          <span>سعر الكشف: ${doctor.price}</span>
          <span class="currency">جنية</span>
        </div>
        <a href="booking.html" class="btn btn-primary btn-sm">
          <i class="fas fa-calendar-check"></i>
          احجز موعد
        </a>
      </div>
    </div>
  `).join('');
  
  // Re-initialize scroll animations for new elements
  if (typeof initScrollAnimations === 'function') initScrollAnimations();
}

/* ==================== PRELOADER ==================== */
function initPreloader() {
  const preloader = document.querySelector('.preloader');
  if (!preloader) return;

  const logoText = preloader.querySelector('.preloader-text');
  if (logoText) {
    const text = logoText.textContent;
    logoText.innerHTML = text.split('').map((char, i) => 
      `<span style="animation-delay: ${i * 0.1}s">${char}</span>`
    ).join('');
  }

  window.addEventListener('load', () => {
    setTimeout(() => {
      preloader.classList.add('hidden');
      document.body.style.overflow = '';
      triggerEntranceAnimations();
    }, 2500);
  });

  document.body.style.overflow = 'hidden';
}

function triggerEntranceAnimations() {
  const elements = document.querySelectorAll('[data-entrance]');
  elements.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add('animated');
    }, index * 100);
  });
}

/* ==================== NAVIGATION ==================== */
function initNavigation() {
  const navbar = document.querySelector('.navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      navToggle.classList.toggle('active');
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu) navMenu.classList.remove('active');
      if (navToggle) navToggle.classList.remove('active');
    });
  });

  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (navbar) {
      if (currentScroll > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }

      if (currentScroll > lastScroll && currentScroll > 200) {
        navbar.style.transform = 'translateY(-100%)';
      } else {
        navbar.style.transform = 'translateY(0)';
      }
    }

    lastScroll = currentScroll;
  });

  updateActiveNavLink();
  if (window.NabdClinic && window.NabdClinic.Utils && window.NabdClinic.Utils.throttle) {
    window.addEventListener('scroll', NabdClinic.Utils.throttle(updateActiveNavLink, 100));
  }
}

function updateActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  let currentSection = '';

  sections.forEach(section => {
    const sectionTop = section.offsetTop - 200;
    if (window.pageYOffset >= sectionTop) {
      currentSection = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && href.startsWith('#') && href.substring(1) === currentSection) {
      link.classList.add('active');
    }
  });
}

/* ==================== SCROLL ANIMATIONS ==================== */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('aos-animate');
        
        const delay = entry.target.getAttribute('data-aos-delay');
        if (delay) {
          entry.target.style.transitionDelay = `${delay}ms`;
        }
      }
    });
  }, observerOptions);

  document.querySelectorAll('[data-aos]').forEach(el => {
    observer.observe(el);
  });
}

/* ==================== COUNTER ANIMATIONS ==================== */
function initCounterAnimations() {
  const counters = document.querySelectorAll('.stat-number');

  const observerOptions = {
    threshold: 0.5,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
        animateCounter(entry.target);
        entry.target.classList.add('counted');
      }
    });
  }, observerOptions);

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
  const targetAttr = element.getAttribute('data-count');
  const target = parseFloat(targetAttr || element.textContent.replace(/[^0-9.]/g, ''));
  const suffixEl = element.querySelector('.suffix');
  const suffix = suffixEl ? suffixEl.textContent : '';
  const duration = 2000;
  const start = 0;
  const startTime = performance.now();

  const isDecimal = target % 1 !== 0;

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * easeOut;

    const displayValue = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString('ar-EG');
    
    if (suffixEl) {
      element.innerHTML = `${displayValue}<span class="suffix">${suffix}</span>`;
    } else {
      element.textContent = displayValue + suffix;
    }

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    }
  }

  requestAnimationFrame(updateCounter);
}

/* ==================== PARTICLES ==================== */
function initParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;

  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation-delay: ${Math.random() * 15}s;
      animation-duration: ${15 + Math.random() * 10}s;
      opacity: ${0.1 + Math.random() * 0.3};
      width: ${2 + Math.random() * 4}px;
      height: ${2 + Math.random() * 4}px;
    `;
    container.appendChild(particle);
  }
}

/* ==================== HERO 3D EFFECT ==================== */
function initHero3D() {
  const heroVisual = document.querySelector('.hero-visual');
  const heroSphere = document.querySelector('.hero-sphere');

  if (!heroVisual || !heroSphere) return;

  heroVisual.addEventListener('mousemove', (e) => {
    const rect = heroVisual.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    heroSphere.style.transform = `
      perspective(1000px)
      rotateY(${x * 20}deg)
      rotateX(${-y * 20}deg)
    `;
  });

  heroVisual.addEventListener('mouseleave', () => {
    heroSphere.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
  });
}

/* ==================== DOCTOR SLIDER ==================== */
function initDoctorSlider() {
  const track = document.querySelector('.doctors-track');
  const prevBtn = document.querySelector('.doctors-nav .prev');
  const nextBtn = document.querySelector('.doctors-nav .next');

  if (!track) return;

  let currentIndex = 0;
  const cards = track.querySelectorAll('.doctor-card');
  const cardWidth = 380;
  const containerWidth = track.parentElement ? track.parentElement.offsetWidth : 1200;
  const visibleCards = Math.floor(containerWidth / cardWidth) || 3;
  const maxIndex = Math.max(0, cards.length - visibleCards);

  function updateSlider() {
    track.style.transform = `translateX(${currentIndex * cardWidth}px)`;
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentIndex = Math.max(0, currentIndex - 1);
      updateSlider();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentIndex = Math.min(maxIndex, currentIndex + 1);
      updateSlider();
    });
  }

  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        currentIndex = Math.min(maxIndex, currentIndex + 1);
      } else {
        currentIndex = Math.max(0, currentIndex - 1);
      }
      updateSlider();
    }
  }, { passive: true });
}

/* ==================== SMOOTH SCROLL ==================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#' || !href.startsWith('#')) return;

      e.preventDefault();
      const target = document.querySelector(href);

      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    });
  });
}

/* ==================== SCROLL PROGRESS ==================== */
function initScrollProgress() {
  let progressBar = document.querySelector('.scroll-progress');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #0066ff, #00d4ff);
      z-index: 9999;
      transition: width 0.1s ease;
      width: 0%;
    `;
    document.body.appendChild(progressBar);
  }

  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight > 0) {
      const progress = (scrollTop / scrollHeight) * 100;
      progressBar.style.width = `${progress}%`;
    }
  });
}

/* ==================== ACCESSIBILITY ==================== */
function initAccessibility() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.querySelector('.modal-overlay.active');
      if (modal && window.NabdClinic && window.NabdClinic.Modal) {
        window.NabdClinic.Modal.hide(modal);
      }

      const navMenu = document.querySelector('.nav-menu.active');
      if (navMenu) {
        navMenu.classList.remove('active');
        document.querySelector('.nav-toggle')?.classList.remove('active');
      }
    }
  });

  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  document.querySelectorAll(focusableElements).forEach(el => {
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
    }
  });
}

/* ==================== TYPEWRITER EFFECT ==================== */
function typeWriter(element, text, speed = 50) {
  let i = 0;
  element.textContent = '';

  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }

  type();
}

/* ==================== LAZY LOADING ==================== */
function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '100px',
  });

  images.forEach(img => imageObserver.observe(img));
}

/* ==================== PARALLAX EFFECT ==================== */
function initParallax() {
  const parallaxElements = document.querySelectorAll('[data-parallax]');

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    parallaxElements.forEach(el => {
      const speed = el.getAttribute('data-parallax') || 0.5;
      el.style.transform = `translateY(${scrollY * speed}px)`;
    });
  });
}

window.FormUtils = window.FormUtils || {};
window.CalendarUtils = window.CalendarUtils || {};
window.typeWriter = typeWriter;
window.initLazyLoading = initLazyLoading;
window.initParallax = initParallax;
