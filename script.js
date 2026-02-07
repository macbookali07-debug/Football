// Глобальные переменные
let currentSlideIndex = 0;
let selectedTimeSlot = null;
let selectedField = null;
let selectedDate = null;
let selectedPrice = 0;

let arenaSettings = {
    price5x5: 1000,
    price8x8: 1500,
    workStart: '08:00',
    workEnd: '23:00'
};

function loadSettingsFromStorage() {
    try {
        const raw = localStorage.getItem('arenaSettings');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        arenaSettings = {
            ...arenaSettings,
            ...parsed,
            price5x5: Number(parsed.price5x5 ?? arenaSettings.price5x5),
            price8x8: Number(parsed.price8x8 ?? arenaSettings.price8x8)
        };
    } catch (_) {
        // ignore
    }
}

function initRevealOnScroll() {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    if (!elements.length) return;

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
        elements.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            });
        },
        {
            threshold: 0.12,
            rootMargin: '0px 0px -10% 0px'
        }
    );

    elements.forEach(el => observer.observe(el));
}

function triggerBookingHighlight() {
    const bookingForm = document.querySelector('#booking .booking-form');
    if (!bookingForm) return;

    bookingForm.classList.add('is-visible');

    bookingForm.classList.remove('booking-highlight');
    void bookingForm.offsetWidth;
    bookingForm.classList.add('booking-highlight');

    setTimeout(() => {
        bookingForm.classList.remove('booking-highlight');
    }, 1300);
}

function applySettingsToUI() {
    const price5 = Number(arenaSettings.price5x5) || 1000;
    const price8 = Number(arenaSettings.price8x8) || 1500;

    const option5 = document.querySelector('#field option[value="5x5"]');
    const option8 = document.querySelector('#field option[value="8x8"]');
    if (option5) option5.textContent = `Поле 5x5 - ${price5}сом/час`;
    if (option8) option8.textContent = `Поле 8x8 - ${price8}сом/час`;

    document.querySelectorAll('.field-card').forEach(card => {
        const onclick = card.getAttribute('onclick') || '';
        const priceEl = card.querySelector('.field-price .price');
        if (!priceEl) return;
        if (onclick.includes("'5x5'")) priceEl.textContent = `${price5}сом/час`;
        if (onclick.includes("'8x8'")) priceEl.textContent = `${price8}сом/час`;
    });

    const price5Input = document.getElementById('price5x5');
    const price8Input = document.getElementById('price8x8');
    const workStartInput = document.getElementById('workStart');
    const workEndInput = document.getElementById('workEnd');
    if (price5Input) price5Input.value = price5;
    if (price8Input) price8Input.value = price8;
    if (workStartInput) workStartInput.value = arenaSettings.workStart;
    if (workEndInput) workEndInput.value = arenaSettings.workEnd;
}

// Имитация занятых временных слотов
const bookedSlots = {
    '2024-01-15': ['10:00', '11:00', '18:00', '19:00'],
    '2024-01-16': ['09:00', '15:00', '16:00', '20:00'],
    '2024-01-17': ['08:00', '12:00', '13:00', '21:00'],
    '2024-01-18': ['14:00', '17:00', '18:00', '22:00'],
    '2024-01-19': ['10:00', '11:00', '12:00', '19:00', '20:00']
};

// Данные разовых бронирований с полной информацией
let singleBookingsData = {};

// Постоянные бронирования
const permanentBookings = [
    {
        id: 1,
        field: '5x5',
        days: ['monday', 'wednesday', 'friday'],
        time: '18:00',
        duration: 12,
        startDate: '2024-01-15',
        customerName: 'Иван Петров',
        customerPhone: '+7 (900) 123-45-67'
    },
    {
        id: 2,
        field: '8x8',
        days: ['tuesday', 'thursday'],
        time: '20:00',
        duration: 8,
        startDate: '2024-01-16',
        customerName: 'ФК "Звезда"',
        customerPhone: '+7 (900) 987-65-43'
    }
];

// Выбор поля и открытие формы бронирования
function selectFieldAndOpenBooking(fieldType) {
    // Устанавливаем выбранное поле
    selectedField = fieldType;
    
    // Выбираем соответствующий option в форме
    const fieldSelect = document.getElementById('field');
    if (fieldSelect) {
        fieldSelect.value = fieldType;
    }

    // Синхронизируем расписание с выбранным полем
    const scheduleField = document.getElementById('scheduleField');
    if (scheduleField) {
        scheduleField.value = fieldType;
    }

    const scheduleDate = document.getElementById('scheduleDate');
    if (scheduleDate && !scheduleDate.value) {
        scheduleDate.value = new Date().toISOString().split('T')[0];
    }
    
    // Обновляем сводку
    updateSummary();
    updateTimeSlotPrices();
    updateBookedSlots();
    updateBookingUIState();

    if (typeof refreshSchedule === 'function') {
        refreshSchedule();
    }
    
    // Показываем уведомление
    showNotification(`Выбрано поле: ${fieldType === '5x5' ? 'Поле 5x5' : 'Поле 8x8'}`, 'success');

    // Функция для прокрутки к полям
    function scrollToFields() {
        document.getElementById('fields').scrollIntoView({ behavior: 'smooth' });
    }
        
    // Прокручиваем к форме бронирования
    setTimeout(() => {
        scrollToSchedule();
    }, 500);
}

function scrollToSchedule() {
    const scheduleSection = document.getElementById('schedule');
    if (scheduleSection) {
        scheduleSection.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
            triggerScheduleHighlight();
        }, 250);
    }
}

function triggerScheduleHighlight() {
    const scheduleTable = document.querySelector('#schedule .schedule-table');
    if (!scheduleTable) return;

    scheduleTable.classList.remove('booking-highlight');
    void scheduleTable.offsetWidth;
    scheduleTable.classList.add('booking-highlight');

    setTimeout(() => {
        scheduleTable.classList.remove('booking-highlight');
    }, 1300);
}

function updateBookingUIState() {
    const bookingType = document.getElementById('bookingType')?.value;
    const field = document.getElementById('field')?.value;
    const date = document.getElementById('date')?.value;
    const name = document.getElementById('name')?.value?.trim();
    const phone = document.getElementById('phone')?.value?.trim();
    const submitBtn = document.getElementById('submitBooking');
    const hint = document.getElementById('timeSlotsHint');
    const timeSlots = document.querySelectorAll('.time-slot');

    const isPermanent = bookingType === 'permanent';
    const canPickTime = !!field && (isPermanent || !!date);

    timeSlots.forEach(slot => {
        const isBooked = slot.classList.contains('booked');
        slot.disabled = !canPickTime || isBooked;
        slot.setAttribute('aria-disabled', slot.disabled ? 'true' : 'false');
    });

    if (hint) {
        hint.textContent = canPickTime
            ? 'Выберите удобное время (Tab/Enter).'
            : `Сначала выберите поле${isPermanent ? '' : ' и дату'}, затем время.`;
    }

    let canSubmit = !!field && !!selectedTimeSlot && !!name && !!phone;
    if (!isPermanent) {
        canSubmit = canSubmit && !!date;
    } else {
        const selectedDays = document.querySelectorAll('input[name="days"]:checked');
        canSubmit = canSubmit && selectedDays.length > 0;
    }

    if (submitBtn) {
        submitBtn.disabled = !canSubmit;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Оптимизация для мобильных устройств
    if (window.innerWidth <= 768) {
        // Отключаем тяжелые анимации на мобильных
        document.body.classList.add('mobile-optimized');
        
        // Убираем загрузочный экран сразу на мобильных
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        // Оптимизация скролла
        document.body.style.scrollBehavior = 'smooth';
        
        // Предотвращаем двойной тап
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Оптимизация форм для мобильных
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                // Увеличиваем размер при фокусе
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
        });
    }
    
    // Показываем загрузочный экран только на десктопе
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && window.innerWidth > 768) {
        // Запускаем анимацию подсказок
        startLoadingTips();
        
        // Запускаем анимацию процентов
        startLoadingPercentage();
    }
    
    // Инициализация всех модулей
    loadBookingsFromStorage(); // Загружаем сохраненные бронирования
    loadSettingsFromStorage();
    applySettingsToUI();
    initSlider();
    initMobileMenu();
    initBookingForm();
    initPaymentForm();
    initCardFormatting();
    setMinDate();
    updateBookedSlots();
    initSchedule();
    initRevealOnScroll();
    initMyBookings();
    updatePermanentBookingsList();
    updateSingleBookingsList();
    
    // Скрываем загрузочный экран после загрузки
    setTimeout(() => {
        if (loadingScreen && window.innerWidth > 768) {
            loadingScreen.classList.add('hide');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        
        // Запускаем анимации появления элементов
        if (window.innerWidth > 768) {
            animateElementsOnLoad();
        }
    }, window.innerWidth <= 768 ? 1000 : 4000); // Быстрая загрузка на мобильных
});

// Анимация подсказок при загрузке
function startLoadingTips() {
    const tips = document.querySelectorAll('.tip');
    let currentTip = 0;
    
    // Показываем первую подсказку сразу
    if (tips.length > 0) {
        tips[0].classList.add('active');
    }
    
    // Меняем подсказки каждые 1.2 секунды
    const tipInterval = setInterval(() => {
        tips[currentTip].classList.remove('active');
        currentTip = (currentTip + 1) % tips.length;
        tips[currentTip].classList.add('active');
    }, 1200);
    
    // Останавливаем через 3.5 секунды
    setTimeout(() => {
        clearInterval(tipInterval);
    }, 3500);
}

// Анимация процентов при загрузке
function startLoadingPercentage() {
    const percentageElement = document.querySelector('.loading-percentage');
    let percentage = 0;
    
    const percentageInterval = setInterval(() => {
        percentage += Math.random() * 15 + 5; // Случайный прирост
        if (percentage >= 100) {
            percentage = 100;
            clearInterval(percentageInterval);
        }
        if (percentageElement) {
            percentageElement.textContent = Math.floor(percentage) + '%';
        }
    }, 350); // Обновляем каждые 350мс
}

// Анимация появления элементов после загрузки
function animateElementsOnLoad() {
    // Анимируем заголовки
    const titles = document.querySelectorAll('.section-title');
    titles.forEach((title, index) => {
        title.style.opacity = '0';
        title.style.transform = 'translateY(50px)';
        setTimeout(() => {
            title.style.transition = 'all 0.8s ease-out';
            title.style.opacity = '1';
            title.style.transform = 'translateY(0)';
        }, index * 200);
    });
    
    // Анимируем карточки полей
    const fieldCards = document.querySelectorAll('.field-card');
    fieldCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(100px) scale(0.8)';
        setTimeout(() => {
            card.style.transition = 'all 0.8s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
        }, 800 + index * 200);
    });
    
    // Анимируем навигацию
    const nav = document.querySelector('.header');
    if (nav) {
        nav.style.transform = 'translateY(-100%)';
        setTimeout(() => {
            nav.style.transition = 'transform 0.8s ease-out';
            nav.style.transform = 'translateY(0)';
        }, 600);
    }
}

// Загрузка бронирований из localStorage
function loadBookingsFromStorage() {
    const savedBookedSlots = localStorage.getItem('bookedSlots');
    const savedPermanentBookings = localStorage.getItem('permanentBookings');
    const savedSingleBookingsData = localStorage.getItem('singleBookingsData');
    
    if (savedBookedSlots) {
        Object.assign(bookedSlots, JSON.parse(savedBookedSlots));
    }
    
    if (savedPermanentBookings) {
        const loaded = JSON.parse(savedPermanentBookings);
        permanentBookings.length = 0; // Очищаем массив
        permanentBookings.push(...loaded);
    }
    
    if (savedSingleBookingsData) {
        singleBookingsData = JSON.parse(savedSingleBookingsData);
    }
}

// Сохранение бронирований в localStorage
function saveBookingsToStorage() {
    localStorage.setItem('bookedSlots', JSON.stringify(bookedSlots));
    localStorage.setItem('permanentBookings', JSON.stringify(permanentBookings));
    localStorage.setItem('singleBookingsData', JSON.stringify(singleBookingsData));
    
    // Также сохраняем все бронирования для админ-панели
    const allBookings = getAllBookings();
    localStorage.setItem('allBookings', JSON.stringify(allBookings));
}

// Получение всех бронирований для админ-панели
function getAllBookings() {
    const allBookings = [];
    
    // Добавляем разовые бронирования с полной информацией
    Object.keys(bookedSlots).forEach(date => {
        bookedSlots[date].forEach(time => {
            const key = `${date}_${time}`;
            const dataKey = Object.keys(singleBookingsData).find(k => k.startsWith(key));
            
            if (dataKey && singleBookingsData[dataKey]) {
                // Используем сохраненные данные
                allBookings.push({
                    ...singleBookingsData[dataKey],
                    id: `single_${key}`,
                    date: date,
                    time: time,
                    type: 'single',
                    status: 'paid',
                    createdAt: singleBookingsData[dataKey].createdAt || new Date().toISOString()
                });
            } else {
                // Fallback если данные не найдены
                allBookings.push({
                    id: `single_${date}_${time}`,
                    date: date,
                    time: time,
                    type: 'single',
                    field: 'Не указано',
                    customerName: 'Не указано',
                    customerPhone: 'Не указано',
                    price: 1000,
                    status: 'paid',
                    createdAt: new Date().toISOString()
                });
            }
        });
    });
    
    // Добавляем постоянные бронирования
    permanentBookings.forEach(booking => {
        allBookings.push({
            ...booking,
            type: 'permanent',
            price: calculatePermanentPrice(booking),
            status: 'paid'
        });
    });
    
    return allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Админ-панель функции
function toggleAdminPanel(event) {
    if (event) event.preventDefault();
    const panel = document.getElementById('adminPanel');
    if (!panel) return;

    const willOpen = !panel.classList.contains('active');

    if (willOpen) {
        panel.hidden = false;
        requestAnimationFrame(() => {
            panel.classList.add('active');
        });
        loadSettingsFromStorage();
        applySettingsToUI();
        loadBookingsTable();
        return;
    }

    panel.classList.remove('active');
    setTimeout(() => {
        panel.hidden = true;
    }, 300);
}

function showAdminTab(tabName, event) {
    // Скрываем все табы
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убираем активный класс с кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранный таб
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Добавляем активный класс на кнопку
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function loadBookingsTable() {
    const tbody = document.getElementById('bookingsTableBody');
    const allBookings = getAllBookings();
    
    tbody.innerHTML = '';
    
    allBookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(booking.date || booking.startDate)}</td>
            <td>${booking.field}</td>
            <td>${booking.time}</td>
            <td>${booking.customerName}</td>
            <td>${booking.customerPhone}</td>
            <td><span class="badge ${booking.type}">${booking.type === 'permanent' ? 'Постоянное' : 'Разовое'}</span></td>
            <td>${booking.price}с</td>
            <td><span class="status-${booking.status}">${getStatusText(booking.status)}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function getStatusText(status) {
    const statusMap = {
        'paid': 'Оплачено',
        'pending': 'Ожидает',
        'cancelled': 'Отменено'
    };
    return statusMap[status] || status;
}

function exportBookings() {
    const allBookings = getAllBookings();
    const dataStr = JSON.stringify(allBookings, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function exportToJSON() {
    exportBookings();
}

function exportToCSV() {
    const allBookings = getAllBookings();
    let csv = 'Дата,Поле,Время,Клиент,Телефон,Тип,Сумма,Статус\n';
    
    allBookings.forEach(booking => {
        csv += `${booking.date || booking.startDate},${booking.field},${booking.time},${booking.customerName},${booking.customerPhone},${booking.type === 'permanent' ? 'Постоянное' : 'Разовое'},${booking.price}с,${getStatusText(booking.status)}\n`;
    });
    
    const dataBlob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function printBookings() {
    window.print();
}

function saveSettings() {
    const settings = {
        price5x5: document.getElementById('price5x5').value,
        price8x8: document.getElementById('price8x8').value,
        workStart: document.getElementById('workStart').value,
        workEnd: document.getElementById('workEnd').value
    };
    
    localStorage.setItem('arenaSettings', JSON.stringify(settings));
    loadSettingsFromStorage();
    applySettingsToUI();
    updateTimeSlotPrices();
    updateBookedSlots();
    updateBookingUIState();
    showNotification('Настройки сохранены!', 'success');
}

// Поиск и фильтрация
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchBookings');
    const filterSelect = document.getElementById('filterType');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterBookings);
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', filterBookings);
    }
});

function filterBookings() {
    const searchTerm = document.getElementById('searchBookings').value.toLowerCase();
    const filterType = document.getElementById('filterType').value;
    const allBookings = getAllBookings();
    
    const filteredBookings = allBookings.filter(booking => {
        const matchesSearch = booking.customerName.toLowerCase().includes(searchTerm) || 
                              booking.customerPhone.toLowerCase().includes(searchTerm);
        const matchesType = filterType === 'all' || booking.type === filterType;
        
        return matchesSearch && matchesType;
    });
    
    // Обновляем таблицу с отфильтрованными данными
    const tbody = document.getElementById('bookingsTableBody');
    tbody.innerHTML = '';
    
    filteredBookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(booking.date || booking.startDate)}</td>
            <td>${booking.field}</td>
            <td>${booking.time}</td>
            <td>${booking.customerName}</td>
            <td>${booking.customerPhone}</td>
            <td><span class="badge ${booking.type}">${booking.type === 'permanent' ? 'Постоянное' : 'Разовое'}</span></td>
            <td>${booking.price}с</td>
            <td><span class="status-${booking.status}">${getStatusText(booking.status)}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Слайдер
function initSlider() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;
    
    // Автоматическая смена слайдов
    setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        showSlide(currentSlideIndex);
    }, 5000);
}

function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    slides[index].classList.add('active');
    dots[index].classList.add('active');
}

function currentSlide(index) {
    currentSlideIndex = index - 1;
    showSlide(currentSlideIndex);
}

// Мобильное меню
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');

            const isOpen = navMenu.classList.contains('active');
            hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        
        // Закрытие меню при клике на ссылку
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }
}

// Форма бронирования
function initBookingForm() {
    const form = document.getElementById('bookingForm');
    const fieldSelect = document.getElementById('field');
    const dateInput = document.getElementById('date');
    const timeSlots = document.querySelectorAll('.time-slot');
    const bookingTypeSelect = document.getElementById('bookingType');
    const permanentOptions = document.getElementById('permanentOptions');
    
    // Обработка типа бронирования
    if (bookingTypeSelect) {
        bookingTypeSelect.addEventListener('change', function() {
            const isPermanent = this.value === 'permanent';
            permanentOptions.style.display = isPermanent ? 'block' : 'none';
            
            // Показываем/скрываем выбор даты
            if (dateInput) {
                dateInput.parentElement.style.display = isPermanent ? 'none' : 'block';
            }
            
            updateSummary();
            updateBookingUIState();
        });
    }
    
    // Обработка выбора поля
    if (fieldSelect) {
        fieldSelect.addEventListener('change', function() {
            selectedField = this.value;
            updateSummary();
            updateTimeSlotPrices();
            updateBookedSlots(); // Добавляем обновление занятых слотов
            updateBookingUIState();
        });
    }
    
    // Обработка выбора даты
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            selectedDate = this.value;
            updateBookedSlots();
            updateSummary();
            updateBookingUIState();
        });
    }
    
    // Обработка выбора времени
    timeSlots.forEach(slot => {
        slot.addEventListener('click', function() {
            if (this.classList.contains('booked') || this.disabled) return;
            
            // Удаляем предыдущий выбор
            timeSlots.forEach(s => {
                s.classList.remove('selected');
                s.setAttribute('aria-pressed', 'false');
            });
            
            // Выбираем новый слот
            this.classList.add('selected');
            this.setAttribute('aria-pressed', 'true');
            selectedTimeSlot = this.dataset.time;
            selectedPrice = parseInt(this.dataset.price);
            updateSummary();
            updateBookingUIState();
        });
    });
    
    // Обработка отправки формы
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateBookingForm()) {
                openPaymentModal();
            }
        });
    }
    
    // Обработка чекбоксов дней недели
    const dayCheckboxes = document.querySelectorAll('input[name="days"]');
    dayCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSummary();
            updateBookingUIState();
        });
    });
    
    // Обработка изменения длительности
    const durationSelect = document.getElementById('duration');
    if (durationSelect) {
        durationSelect.addEventListener('change', function() {
            updateSummary();
            updateBookingUIState();
        });
    }

    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    if (nameInput) {
        nameInput.addEventListener('input', updateBookingUIState);
    }
    if (phoneInput) {
        phoneInput.addEventListener('input', updateBookingUIState);
    }

    updateBookingUIState();
}

// Валидация формы бронирования
function validateBookingForm() {
    const field = document.getElementById('field').value;
    const date = document.getElementById('date').value;
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const bookingType = document.getElementById('bookingType').value;
    
    if (!field) {
        showNotification('Пожалуйста, выберите поле', 'error');
        return false;
    }
    
    if (!selectedTimeSlot) {
        showNotification('Пожалуйста, выберите время', 'error');
        return false;
    }
    
    if (bookingType === 'permanent') {
        // Валидация для постоянного бронирования
        const selectedDays = document.querySelectorAll('input[name="days"]:checked');
        if (selectedDays.length === 0) {
            showNotification('Пожалуйста, выберите хотя бы один день недели', 'error');
            return false;
        }
    } else {
        // Валидация для разового бронирования
        if (!date) {
            showNotification('Пожалуйста, выберите дату', 'error');
            return false;
        }
    }
    
    if (!name.trim()) {
        showNotification('Пожалуйста, введите ваше имя', 'error');
        return false;
    }
    
    if (!phone.trim()) {
        showNotification('Пожалуйста, введите ваш телефон', 'error');
        return false;
    }
    
    if (!validatePhone(phone)) {
        showNotification('Пожалуйста, введите корректный номер телефона', 'error');
        return false;
    }
    
    return true;
}

// Валидация телефона
function validatePhone(phone) {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
}

// Расписание
function initSchedule() {
    const scheduleField = document.getElementById('scheduleField');
    const scheduleDate = document.getElementById('scheduleDate');
    
    // Устанавливаем значение по умолчанию для поля (если не установлено)
    if (scheduleField && !scheduleField.value) {
        scheduleField.value = '5x5';
    }
    
    // Устанавливаем текущую дату
    const today = new Date();
    scheduleDate.value = today.toISOString().split('T')[0];
    
    // Добавляем обработчики событий
    if (scheduleField) {
        scheduleField.addEventListener('change', refreshSchedule);
    }
    
    if (scheduleDate) {
        scheduleDate.addEventListener('change', refreshSchedule);
    }
    
    // Генерируем расписание при загрузке
    refreshSchedule();
    updatePermanentBookingsList();
}

function refreshSchedule() {
    const field = document.getElementById('scheduleField').value;
    const date = document.getElementById('scheduleDate').value;
    
    if (!field || !date) return;
    
    generateScheduleTable(field, date);
}

function generateScheduleTable(field, date) {
    const scheduleTable = document.getElementById('scheduleTable');
    if (!scheduleTable) return;
    
    const timeSlots = [];
    for (let hour = 8; hour <= 23; hour++) {
        timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const startDate = new Date(date);
    const startOfWeek = new Date(startDate);
    startOfWeek.setDate(startDate.getDate() - startDate.getDay() + 1);
    
    let html = '<div class="time-grid">';
    
    // Заголовки
    html += '<div class="time-header">Время</div>';
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        html += `<div class="day-header">${weekDays[i]}<br><small>${currentDate.getDate()}.${currentDate.getMonth() + 1}</small></div>`;
    }
    
    // Ячейки времени
    timeSlots.forEach(time => {
        html += `<div class="time-cell">${time}</div>`;
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];
            
            const status = getSlotStatus(field, dateStr, time, dayOfWeek);
            const statusClass = status.class;
            const statusText = status.text;
            
            html += `<div class="slot-cell ${statusClass}" data-field="${field}" data-date="${dateStr}" data-time="${time}">${statusText}</div>`;
        }
    });
    
    html += '</div>';
    scheduleTable.innerHTML = html;
    
    // Добавляем обработчики кликов на свободные слоты
    document.querySelectorAll('.slot-cell.free').forEach(cell => {
        cell.addEventListener('click', function() {
            const field = this.dataset.field;
            const date = this.dataset.date;
            const time = this.dataset.time;
            
            // Заполняем форму бронирования
            document.getElementById('bookingType').value = 'single';
            document.getElementById('permanentOptions').style.display = 'none';
            document.getElementById('date').parentElement.style.display = 'block';
            document.getElementById('field').value = field;
            selectedField = field;
            document.getElementById('date').value = date;
            selectedDate = date;
            updateTimeSlotPrices();
            updateBookedSlots();
            
            // Выбираем временной слот
            selectedTimeSlot = time;
            document.querySelectorAll('.time-slot').forEach(slot => {
                slot.classList.remove('selected');
                slot.setAttribute('aria-pressed', 'false');
                if (slot.dataset.time === time) {
                    slot.classList.add('selected');
                    slot.setAttribute('aria-pressed', 'true');
                    selectedPrice = parseInt(slot.dataset.price);
                }
            });
            
            updateSummary();
            updateBookingUIState();

            // Простой переход: плавная прокрутка к форме и подсветка
            scrollToBooking(true);
        });
    });
}

// Decorative football animation removed — use simple scroll + highlight instead

function getSlotStatus(field, date, time, dayOfWeek) {
    // Проверяем постоянные бронирования
    const permanentBooking = permanentBookings.find(booking => 
        booking.field === field &&
        booking.days.includes(dayOfWeek) &&
        booking.time === time &&
        isPermanentBookingActive(booking, date)
    );
    
    if (permanentBooking) {
        return {
            class: 'permanent',
            text: `${permanentBooking.customerName}`
        };
    }
    
    // Проверяем разовые бронирования
    if (bookedSlots[date] && bookedSlots[date].includes(time)) {
        return {
            class: 'booked',
            text: 'Занято'
        };
    }
    
    return {
        class: 'free',
        text: 'Свободно'
    };
}

function isPermanentBookingActive(booking, date) {
    const bookingDate = new Date(date);
    const startDate = new Date(booking.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (booking.duration * 7) - 1);
    
    return bookingDate >= startDate && bookingDate <= endDate;
}

function updatePermanentBookingsList() {
    const permanentList = document.getElementById('permanentList');
    if (!permanentList) return;
    
    const activeBookings = permanentBookings.filter(booking => 
        isPermanentBookingActive(booking, new Date().toISOString().split('T')[0])
    );
    
    if (activeBookings.length === 0) {
        permanentList.innerHTML = '<p>Нет активных постоянных бронирований</p>';
        return;
    }
    
    let html = '';
    activeBookings.forEach(booking => {
        const daysNames = {
            monday: 'Пн',
            tuesday: 'Вт',
            wednesday: 'Ср',
            thursday: 'Чт',
            friday: 'Пт',
            saturday: 'Сб',
            sunday: 'Вс'
        };
        
        const daysText = booking.days.map(day => daysNames[day]).join(', ');
        const totalPrice = calculatePermanentPrice(booking);
        
        html += `
            <div class="permanent-item">
                <div class="permanent-item-info">
                    <div class="permanent-item-field">Поле ${booking.field.toUpperCase()}</div>
                    <div class="permanent-item-details">
                        ${daysText} в ${booking.time} (${booking.duration} недель)<br>
                        ${booking.customerName} • ${booking.customerPhone}
                    </div>
                </div>
                <div class="permanent-item-price">${totalPrice}с</div>
            </div>
        `;
    });
    
    permanentList.innerHTML = html;
}

function calculatePermanentPrice(booking) {
    const pricePerHour = booking.field === '8x8' ? (Number(arenaSettings.price8x8) || 1500) : (Number(arenaSettings.price5x5) || 1000); // Базовая цена
    const sessionsPerWeek = booking.days.length;
    const totalSessions = sessionsPerWeek * booking.duration;
    return pricePerHour * totalSessions;
}

// Update single (one-time) bookings list
function updateSingleBookingsList() {
    const singleList = document.getElementById('singleBookingsList');
    if (!singleList) return;
    
    try {
        const allBookings = getAllBookings();
        const today = new Date().toISOString().split('T')[0];
        
        // Filter: only FUTURE bookings (strictly > today, not >= today)
        const upcomingBookings = allBookings.filter(b => b.date > today);
        
        if (upcomingBookings.length === 0) {
            singleList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Нет активных разовых бронирований</p>';
            return;
        }
        
        // Sort by date and time
        upcomingBookings.sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return a.time.localeCompare(b.time);
        });
        
        let html = '';
        upcomingBookings.forEach(booking => {
            const bookingDate = new Date(booking.date);
            const formattedDate = bookingDate.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            
            const endTime = String(parseInt(booking.time.split(':')[0]) + 1).padStart(2, '0') + ':00';
            
            // Fallback for undefined/missing values
            const fieldDisplay = booking.field && booking.field !== 'undefined' ? booking.field.toUpperCase() : 'Не указано';
            const nameDisplay = booking.name && booking.name !== 'undefined' ? booking.name : '—';
            const phoneDisplay = booking.phone && booking.phone !== 'undefined' ? booking.phone : '—';
            const priceDisplay = booking.price && booking.price !== 'undefined' ? `${booking.price}с` : '0с';
            
            html += `
                <div class="single-booking-item" style="
                    background: rgba(231,76,60,0.08);
                    border-left: 4px solid #e74c3c;
                    padding: 12px 14px;
                    margin-bottom: 10px;
                    border-radius: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #2c3e50; font-size: 0.95rem;">Поле ${fieldDisplay}</div>
                        <div style="color: #666; font-size: 0.85rem; margin-top: 4px;">
                            ${formattedDate} • ${booking.time} - ${endTime}<br>
                            ${nameDisplay} • ${phoneDisplay}
                        </div>
                    </div>
                    <div style="
                        color: #e74c3c;
                        font-weight: 700;
                        font-size: 0.95rem;
                        text-align: right;
                    ">${priceDisplay}</div>
                </div>
            `;
        });
        
        singleList.innerHTML = html;
    } catch (e) {
        singleList.innerHTML = '<p style="color: #999; font-size: 0.9rem;">Ошибка загрузки бронирований</p>';
    }
}

// Обновление занятых слотов
function updateBookedSlots() {
    const date = document.getElementById('date').value;
    const field = document.getElementById('field').value;
    const timeSlots = document.querySelectorAll('.time-slot');
    
    // Сбрасываем все слоты
    timeSlots.forEach(slot => {
        slot.classList.remove('booked', 'selected');
        slot.disabled = false;
        slot.setAttribute('aria-pressed', 'false');
        slot.setAttribute('aria-disabled', 'false');
    });
    
    if (!date || !field) return;
    
    // Определяем день недели для проверки постоянных бронирований
    const dateObj = new Date(date);
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
    
    // Помечаем занятые слоты из постоянных бронирований
    permanentBookings.forEach(booking => {
        if (booking.field === field && 
            booking.days.includes(dayOfWeek) && 
            booking.time && 
            isPermanentBookingActive(booking, date)) {
            
            timeSlots.forEach(slot => {
                if (slot.dataset.time === booking.time) {
                    slot.classList.add('booked');
                    slot.disabled = true;
                    slot.setAttribute('aria-disabled', 'true');
                }
            });
        }
    });
    
    // Помечаем занятые слоты из разовых бронирований
    if (bookedSlots[date]) {
        bookedSlots[date].forEach(bookedTime => {
            timeSlots.forEach(slot => {
                if (slot.dataset.time === bookedTime) {
                    slot.classList.add('booked');
                    slot.disabled = true;
                    slot.setAttribute('aria-disabled', 'true');
                }
            });
        });
    }
    
    // Сбрасываем выбор если текущий слот занят
    if (selectedTimeSlot) {
        const selectedSlot = document.querySelector(`.time-slot[data-time="${selectedTimeSlot}"]`);
        if (selectedSlot && selectedSlot.classList.contains('booked')) {
            selectedTimeSlot = null;
            selectedPrice = 0;
            updateSummary();
            updateBookingUIState();
        }
    }

    updateBookingUIState();
}

// Обновление цен временных слотов в зависимости от поля
function updateTimeSlotPrices() {
    const timeSlots = document.querySelectorAll('.time-slot');
    const fieldPrices = {
        '5x5': { base: Number(arenaSettings.price5x5) || 1000, peak: Number(arenaSettings.price5x5) || 1000, evening: Number(arenaSettings.price5x5) || 1000 },
        '8x8': { base: Number(arenaSettings.price8x8) || 1500, peak: Number(arenaSettings.price8x8) || 1500, evening: Number(arenaSettings.price8x8) || 1500 }
    };
    
    if (!selectedField || !fieldPrices[selectedField]) return;
    
    const prices = fieldPrices[selectedField];
    
    timeSlots.forEach(slot => {
        const time = slot.dataset.time;
        const hour = parseInt(time.split(':')[0]);
        
        let price;
        if (hour >= 18 && hour <= 21) {
            price = prices.evening;
        } else if (hour >= 12 && hour <= 17) {
            price = prices.peak;
        } else {
            price = prices.base;
        }
        
        slot.dataset.price = price;
        slot.innerHTML = `${time} - ${String(hour + 1).padStart(2, '0')}:00<br><small>${price}с</small>`;
    });

    if (selectedTimeSlot) {
        const selectedSlot = document.querySelector(`.time-slot[data-time="${selectedTimeSlot}"]`);
        if (selectedSlot) {
            selectedPrice = parseInt(selectedSlot.dataset.price);
        }
    }

    updateSummary();
    updateBookingUIState();
}

// Обновление сводки бронирования
function updateSummary() {
    const fieldSelect = document.getElementById('field');
    const dateInput = document.getElementById('date');
    const bookingTypeSelect = document.getElementById('bookingType');
    
    // Обновление текста выбранного поля
    const fieldText = fieldSelect.options[fieldSelect.selectedIndex]?.text || '-';
    document.getElementById('summaryField').textContent = fieldText;
    
    // Обновление даты и времени в зависимости от типа бронирования
    if (bookingTypeSelect.value === 'permanent') {
        // Для постоянного бронирования
        const selectedDays = Array.from(document.querySelectorAll('input[name="days"]:checked'))
            .map(cb => {
                const label = cb.parentElement;
                return label.textContent.trim();
            });
        const duration = document.getElementById('duration').value;
        
        document.getElementById('summaryDate').textContent = selectedDays.length > 0 ? 
            selectedDays.join(', ') : 'Выберите дни';
        
        if (selectedTimeSlot) {
            document.getElementById('summaryTime').textContent = `Каждый выбранный день в ${selectedTimeSlot}`;
        } else {
            document.getElementById('summaryTime').textContent = 'Выберите время';
        }
        
        // Расчет цены для постоянного бронирования
        if (selectedTimeSlot && selectedDays.length > 0) {
            const pricePerHour = selectedPrice || 0;
            const totalSessions = selectedDays.length * parseInt(duration);
            const totalPrice = pricePerHour * totalSessions;
            document.getElementById('summaryPrice').textContent = `${totalPrice}с`;
        } else {
            document.getElementById('summaryPrice').textContent = '0с';
        }
    } else {
        // Для разового бронирования
        if (dateInput.value) {
            const date = new Date(dateInput.value);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            document.getElementById('summaryDate').textContent = formattedDate;
        } else {
            document.getElementById('summaryDate').textContent = '-';
        }
        
        // Обновление времени
        if (selectedTimeSlot) {
            const hour = parseInt(selectedTimeSlot.split(':')[0]);
            const endTime = String(hour + 1).padStart(2, '0') + ':00';
            document.getElementById('summaryTime').textContent = `${selectedTimeSlot} - ${endTime}`;
        } else {
            document.getElementById('summaryTime').textContent = '-';
        }
        
        // Обновление цены
        document.getElementById('summaryPrice').textContent = `${selectedPrice}с`;
    }
}

// Модальное окно оплаты
function openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    
    // Заполнение данных заказа
    const fieldSelect = document.getElementById('field');
    const fieldText = fieldSelect.options[fieldSelect.selectedIndex]?.text || '-';
    
    document.getElementById('paymentField').textContent = fieldText;
    document.getElementById('paymentDate').textContent = document.getElementById('summaryDate').textContent;
    document.getElementById('paymentTime').textContent = document.getElementById('summaryTime').textContent;
    document.getElementById('paymentPrice').textContent = document.getElementById('summaryPrice').textContent;
    
    // Обновляем сумму в интерфейсе Мбанка
    const price = document.getElementById('summaryPrice').textContent;
    const mbankAmount = document.getElementById('mbankAmount');
    const mbankAmount2 = document.getElementById('mbankAmount2');
    
    if (mbankAmount) {
        mbankAmount.textContent = price;
    }
    if (mbankAmount2) {
        mbankAmount2.textContent = price;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Выбор способа оплаты
function selectPaymentMethod(method) {
    // Удаляем активный класс со всех кнопок
    document.querySelectorAll('.payment-method').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Добавляем активный класс на выбранную кнопку
    document.querySelector(`[data-method="${method}"]`).classList.add('active');
    
    // Показываем/скрываем соответствующие формы
    const cardForm = document.getElementById('cardPaymentForm');
    const mbankForm = document.getElementById('mbankPaymentForm');
    const payButton = document.getElementById('payButton');
    
    if (method === 'card') {
        cardForm.style.display = 'block';
        mbankForm.style.display = 'none';
        payButton.textContent = 'Оплатить';
        payButton.onclick = null; // Сбрасываем обработчик клика
    } else if (method === 'mbank') {
        cardForm.style.display = 'none';
        mbankForm.style.display = 'block';
        payButton.textContent = 'Оплатить через Мбанк';
        payButton.onclick = function(e) {
            e.preventDefault();
            processMbankPayment();
        };
        
        // Обновляем сумму в интерфейсе Мбанка
        const price = document.getElementById('paymentPrice').textContent;
        const mbankAmount = document.getElementById('mbankAmount');
        if (mbankAmount) {
            mbankAmount.textContent = price;
        }
    }
}

// Функция для копирования номера телефона
function copyPhoneNumber() {
    const phoneNumber = '0705005415';
    
    // Создаем временный элемент для копирования
    const tempInput = document.createElement('input');
    tempInput.value = phoneNumber;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        document.execCommand('copy');
        showNotification('Номер ' + phoneNumber + ' скопирован!', 'success');
    } catch (err) {
        showNotification('Не удалось скопировать номер', 'error');
    }
    
    document.body.removeChild(tempInput);
}

// Функция для прямого открытия приложения Мбанк
function openMbankApp() {
    const phoneNumber = '0705005415';
    const amount = document.getElementById('mbankAmount').textContent.replace('с', '').trim();
    
    // Все возможные URL схемы для Мбанка Кыргызстан
    const mbankUrls = [
        // Самые распространенные схемы
        `mbank://payment?phone=${phoneNumber}&amount=${amount}`,
        `mbank://transfer?phone=${phoneNumber}&amount=${amount}`,
        `mbank://send?phone=${phoneNumber}&amount=${amount}`,
        
        // С доменом kg
        `mbank.kg://payment?phone=${phoneNumber}&amount=${amount}`,
        `mbank.kg://transfer?phone=${phoneNumber}&amount=${amount}`,
        
        // Альтернативные схемы
        `mbankkg://payment?phone=${phoneNumber}&amount=${amount}`,
        `mbankkg://transfer?phone=${phoneNumber}&amount=${amount}`,
        
        // Android Intent
        `intent://payment?phone=${phoneNumber}&amount=${amount}#Intent;scheme=mbank;package=kg.mbank.android;end`,
        `intent://transfer?phone=${phoneNumber}&amount=${amount}#Intent;scheme=mbank;package=kg.mbank.android;end`,
        
        // Универсальные схемы
        `mbank://open?phone=${phoneNumber}&amount=${amount}`,
        `mbank://pay?phone=${phoneNumber}&amount=${amount}`,
        
        // Если ничего не работает - открываем App Store/Google Play
        `https://apps.apple.com/app/mbank/id123456789`,
        `https://play.google.com/store/apps/details?id=kg.mbank.android`
    ];
    
    showNotification('Пробуем открыть приложение Мбанк...', 'info');
    
    let urlIndex = 0;
    const tryOpenMbank = () => {
        if (urlIndex < mbankUrls.length) {
            console.log('Пробуем URL:', mbankUrls[urlIndex]);
            
            // Создаем невидимый iframe для попытки открытия
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = mbankUrls[urlIndex];
            document.body.appendChild(iframe);
            
            setTimeout(() => {
                document.body.removeChild(iframe);
                urlIndex++;
                
                // Пробуем следующий URL через 1 секунду
                if (urlIndex < mbankUrls.length) {
                    setTimeout(tryOpenMbank, 1000);
                } else {
                    showNotification('Пожалуйста, откройте приложение Мбанк вручную', 'warning');
                }
            }, 1000);
        }
    };
    
    tryOpenMbank();
}

// Функция для имитации оплаты (для тестирования)
function simulateMbankPayment() {
    if (window.mbankPaymentCallback) {
        window.mbankPaymentCallback();
        delete window.mbankPaymentCallback;
    }
}

// Обработка оплаты через Мбанк
function processMbankPayment() {
    const payButton = document.getElementById('payButton');
    const originalText = payButton.textContent;
    
    // Получаем данные о заказе
    const orderData = {
        field: document.getElementById('paymentField').textContent,
        date: document.getElementById('paymentDate').textContent,
        time: document.getElementById('paymentTime').textContent,
        price: document.getElementById('paymentPrice').textContent,
        customerName: document.getElementById('name').value,
        customerPhone: document.getElementById('phone').value
    };
    
    const phoneNumber = '0705005415';
    const amount = orderData.price.replace('с', '').trim();
    
    // Блокируем кнопку и показываем загрузку
    payButton.disabled = true;
    payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Открытие Мбанка...';
    
    // Определяем тип устройства
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Для мобильных устройств - сразу открываем приложение Мбанк
        setTimeout(() => {
            // URL схемы для открытия приложения Мбанк (Кыргызстан)
            const mbankUrls = [
                // Основная схема для приложения Мбанк
                `mbank://payment?phone=${phoneNumber}&amount=${amount}&description=Аренда поля ${orderData.field} ${orderData.date} ${orderData.time}`,
                // Альтернативная схема
                `mbank://transfer?phone=${phoneNumber}&amount=${amount}&description=Аренда поля`,
                // Для Android - прямой Intent
                `intent://payment?phone=${phoneNumber}&amount=${amount}&description=Аренда поля#Intent;scheme=mbank;package=kg.mbank.android;end`,
                // Другая возможная схема
                `mbankkg://payment?phone=${phoneNumber}&amount=${amount}&description=Аренда поля`,
                // Универсальная схема
                `mbank.kg://payment?phone=${phoneNumber}&amount=${amount}&description=Аренда поля`
            ];
            
            let urlIndex = 0;
            const tryOpenMbank = () => {
                if (urlIndex < mbankUrls.length) {
                    // Пытаемся открыть приложение
                    const link = document.createElement('a');
                    link.href = mbankUrls[urlIndex];
                    link.target = '_self';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    urlIndex++;
                    
                    // Проверяем, открылось ли приложение (через 1.5 секунды)
                    setTimeout(() => {
                        // Если страница все еще активна, пробуем следующий URL
                        if (!document.hidden && urlIndex < mbankUrls.length) {
                            tryOpenMbank();
                        } else if (urlIndex >= mbankUrls.length) {
                            // Если все URL не сработали
                            showNotification('Пожалуйста, откройте приложение Мбанк вручную и переведите ' + orderData.price + ' на номер ' + phoneNumber, 'info');
                            payButton.innerHTML = '<i class="fas fa-clock"></i> Ожидание оплаты...';
                            setupPaymentTimeout(orderData, phoneNumber, payButton, originalText);
                        }
                    }, 1500);
                }
            };
            
            // Начинаем попытки открытия приложения
            tryOpenMbank();
            
            // Показываем сообщение
            showNotification('Открываем приложение Мбанк...', 'info');
            
            // Устанавливаем ожидание оплаты
            setTimeout(() => {
                payButton.innerHTML = '<i class="fas fa-clock"></i> Ожидание оплаты...';
                setupPaymentTimeout(orderData, phoneNumber, payButton, originalText);
            }, 2000);
            
        }, 1000);
    } else {
        // Для десктопа - показываем инструкции
        setTimeout(() => {
            showNotification('Пожалуйста, откройте Мбанк на телефоне и переведите ' + orderData.price + ' на номер ' + phoneNumber, 'info');
            payButton.innerHTML = '<i class="fas fa-clock"></i> Ожидание оплаты...';
            setupPaymentTimeout(orderData, phoneNumber, payButton, originalText);
        }, 1000);
    }
}

// Функция для установки таймаута оплаты
function setupPaymentTimeout(orderData, phoneNumber, payButton, originalText) {
    let paymentTimeout = setTimeout(() => {
        showNotification('Оплата не получена. Попробуйте еще раз или выберите другой способ оплаты', 'error');
        payButton.disabled = false;
        payButton.textContent = originalText;
    }, 30000); // 30 секунд на оплату
    
    // Колбэк для успешной оплаты
    window.mbankPaymentCallback = function() {
        clearTimeout(paymentTimeout);
        
        payButton.innerHTML = '<i class="fas fa-check"></i> Оплата получена!';
        
        setTimeout(() => {
            const bookingType = document.getElementById('bookingType').value;
            if (bookingType === 'permanent') {
                savePermanentBooking();
            } else {
                saveSingleBooking();
            }
            
            closePaymentModal();
            showSuccessModal();
            
            document.getElementById('bookingForm').reset();
            document.querySelectorAll('.time-slot').forEach(slot => {
                slot.classList.remove('selected');
            });
            selectedTimeSlot = null;
            
            payButton.disabled = false;
            payButton.textContent = originalText;
            
            showNotification(`Оплата ${orderData.price} на номер ${phoneNumber} успешно получена! Поле забронировано.`, 'success');
        }, 1000);
    };
}

// Форма оплаты
function initPaymentForm() {
    const form = document.getElementById('paymentForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validatePaymentForm()) {
                processPayment();
            }
        });
    }
}

// Валидация формы оплаты
function validatePaymentForm() {
    // Проверяем, какой способ оплаты выбран
    const activeMethod = document.querySelector('.payment-method.active');
    const paymentMethod = activeMethod ? activeMethod.dataset.method : 'card';
    
    // Если выбран Мбанк, валидация не нужна для полей карты
    if (paymentMethod === 'mbank') {
        return true;
    }
    
    // Для оплаты картой проводим полную валидацию
    const cardNumber = document.getElementById('cardNumber').value;
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCVV = document.getElementById('cardCVV').value;
    const cardName = document.getElementById('cardName').value;
    
    if (!cardNumber.replace(/\s/g, '') || cardNumber.replace(/\s/g, '').length < 16) {
        showNotification('Пожалуйста, введите корректный номер карты', 'error');
        return false;
    }
    
    if (!cardExpiry || !validateExpiry(cardExpiry)) {
        showNotification('Пожалуйста, введите корректный срок действия', 'error');
        return false;
    }
    
    if (!cardCVV || cardCVV.length < 3) {
        showNotification('Пожалуйста, введите корректный CVV код', 'error');
        return false;
    }
    
    if (!cardName.trim()) {
        showNotification('Пожалуйста, введите имя владельца карты', 'error');
        return false;
    }
    
    return true;
}

// Валидация срока действия карты
function validateExpiry(expiry) {
    const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!regex.test(expiry)) return false;
    
    const [month, year] = expiry.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    const expYear = parseInt(year);
    const expMonth = parseInt(month);
    
    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;
    
    return true;
}

// Обработка оплаты
function processPayment() {
    // Проверяем, какой способ оплаты выбран
    const activeMethod = document.querySelector('.payment-method.active');
    const paymentMethod = activeMethod ? activeMethod.dataset.method : 'card';
    
    // Если выбран Мбанк, вызываем соответствующую функцию
    if (paymentMethod === 'mbank') {
        processMbankPayment();
        return;
    }
    
    // Для оплаты картой продолжаем стандартную обработку
    // Показываем индикатор загрузки
    const payBtn = document.querySelector('.pay-btn');
    const originalText = payBtn.textContent;
    payBtn.innerHTML = '<span class="loading"></span> Обработка...';
    payBtn.disabled = true;
    
    // Имитация обработки оплаты
    setTimeout(() => {
        const bookingType = document.getElementById('bookingType').value;
        
        if (bookingType === 'permanent') {
            // Сохраняем постоянное бронирование
            savePermanentBooking();
        } else {
            // Сохраняем разовое бронирование
            saveSingleBooking();
        }
        
        closePaymentModal();
        showSuccessModal();
        
        // Сброс формы
        document.getElementById('bookingForm').reset();
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        selectedTimeSlot = null;
        selectedPrice = 0;
        updateSummary();
        
        // Восстановление кнопки
        payBtn.textContent = originalText;
        payBtn.disabled = false;
        
        // Обновляем расписание
        refreshSchedule();
        updatePermanentBookingsList();
    }, 2000);
}

function savePermanentBooking() {
    const selectedDays = Array.from(document.querySelectorAll('input[name="days"]:checked'))
        .map(cb => cb.value);
    const duration = parseInt(document.getElementById('duration').value);
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    
    console.log('Saving permanent booking:', {
        selectedDays,
        duration,
        name,
        phone,
        selectedField,
        selectedTimeSlot
    });
    
    if (selectedDays.length === 0) {
        showNotification('Выберите хотя бы один день недели', 'error');
        return;
    }
    
    if (!selectedField || !selectedTimeSlot) {
        showNotification('Выберите поле и время', 'error');
        return;
    }
    
    const newBooking = {
        id: permanentBookings.length + 1,
        field: selectedField,
        days: selectedDays,
        time: selectedTimeSlot,
        duration: duration,
        startDate: new Date().toISOString().split('T')[0],
        customerName: name,
        customerPhone: phone
    };
    
    permanentBookings.push(newBooking);
    saveBookingsToStorage(); // Сохраняем в localStorage
    console.log('Permanent bookings after save:', permanentBookings);
    showNotification('Постоянное бронирование успешно сохранено!', 'success');
}

function saveSingleBooking() {
    const date = document.getElementById('date').value;
    const field = document.getElementById('field').value;
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    
    if (!bookedSlots[date]) {
        bookedSlots[date] = [];
    }
    
    if (!bookedSlots[date].includes(selectedTimeSlot)) {
        bookedSlots[date].push(selectedTimeSlot);
        
        // Сохраняем полную информацию о разовом бронировании
        const key = `${date}_${selectedTimeSlot}_${Math.random().toString(36).substr(2, 9)}`;
        singleBookingsData[key] = {
            date: date,
            time: selectedTimeSlot,
            field: field,
            customerName: name,
            customerPhone: phone,
            price: selectedPrice,
            type: 'single',
            createdAt: new Date().toISOString()
        };
        
        saveBookingsToStorage(); // Сохраняем в localStorage
        showNotification('Разовое бронирование успешно сохранено!', 'success');
    }
}

// Модальное окно успеха
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Форматирование данных карты
function initCardFormatting() {
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCVV = document.getElementById('cardCVV');
    
    // Форматирование номера карты
    if (cardNumber) {
        cardNumber.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    // Форматирование срока действия
    if (cardExpiry) {
        cardExpiry.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // Только цифры для CVV
    if (cardCVV) {
        cardCVV.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
}

// Установка минимальной даты (сегодня)
function setMinDate() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const minDate = tomorrow.toISOString().split('T')[0];
        dateInput.setAttribute('min', minDate);
        
        // Устанавливаем значение по умолчанию
        dateInput.value = minDate;
        selectedDate = minDate;
        updateBookedSlots();
        updateSummary();
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#e74c3c' : '#2ecc71'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ---- My Bookings modal functionality ----
function initMyBookings() {
    const searchBtn = document.getElementById('mbSearchBtn');
    const exportBtn = document.getElementById('mbExportBtn');
    const queryInput = document.getElementById('mbQuery');

    if (searchBtn) searchBtn.addEventListener('click', searchMyBookings);
    if (exportBtn) exportBtn.addEventListener('click', exportMyBookings);
    if (queryInput) {
        queryInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') searchMyBookings();
        });
    }
}

function openMyBookingsModal() {
    const modal = document.getElementById('myBookingsModal');
    if (!modal) return;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    // clear previous results
    document.getElementById('mbResultsBody').innerHTML = '';
    document.getElementById('mbQuery').value = '';
}

function closeMyBookingsModal() {
    const modal = document.getElementById('myBookingsModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function searchMyBookings() {
    const q = (document.getElementById('mbQuery').value || '').trim().toLowerCase();
    const tbody = document.getElementById('mbResultsBody');
    tbody.innerHTML = '';

    // get bookings from localStorage or build via getAllBookings
    let all = [];
    try {
        all = JSON.parse(localStorage.getItem('allBookings') || 'null') || getAllBookings();
    } catch (e) {
        all = getAllBookings();
    }

    const results = all.filter(b => {
        if (!q) return true;
        const phone = (b.customerPhone || '').toLowerCase();
        const name = (b.customerName || '').toLowerCase();
        const date = (b.date || b.startDate || '').toLowerCase();
        return phone.includes(q) || name.includes(q) || date.includes(q);
    });

    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Бронирований не найдено</td></tr>';
        return;
    }

    results.forEach(b => {
        const tr = document.createElement('tr');
        const date = b.date || b.startDate || '';
        tr.innerHTML = `
            <td>${date}</td>
            <td>${b.field || ''}</td>
            <td>${b.time || ''}</td>
            <td>${b.customerName || ''}</td>
            <td>${b.customerPhone || ''}</td>
            <td>${b.price ? b.price + 'с' : ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportMyBookings() {
    // export currently visible results (or all if none searched)
    let all = [];
    try {
        all = JSON.parse(localStorage.getItem('allBookings') || 'null') || getAllBookings();
    } catch (e) {
        all = getAllBookings();
    }
    const q = (document.getElementById('mbQuery').value || '').trim().toLowerCase();
    const items = q ? all.filter(b => ((b.customerPhone||'') + (b.customerName||'')).toLowerCase().includes(q)) : all;

    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_bookings_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// close modal when clicking outside
window.addEventListener('click', function(event) {
    const myModal = document.getElementById('myBookingsModal');
    if (myModal && event.target === myModal) closeMyBookingsModal();
});


// Прокрутка к форме бронирования
function scrollToBooking(smooth = true) {
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
        try {
            bookingSection.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        } catch (e) {
            // some older browsers may not support options
            bookingSection.scrollIntoView();
        }

        if (!smooth) {
            // immediate highlight for instant scroll
            triggerBookingHighlight();
            return;
        }

        // For smooth scroll, observe when the section is in view and trigger highlight then.
        let fired = false;
        const obs = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !fired) {
                    fired = true;
                    triggerBookingHighlight();
                    observer.disconnect();
                }
            });
        }, { threshold: 0.55 });

        try {
            obs.observe(bookingSection);
        } catch (e) {
            // fallback to timeout if observe unsupported
            setTimeout(() => triggerBookingHighlight(), 350);
        }

        // safety fallback in case observer never fires
        setTimeout(() => { if (!fired) triggerBookingHighlight(); }, 900);
    }
}

// Закрытие модальных окон при клике вне их
window.onclick = function(event) {
    const paymentModal = document.getElementById('paymentModal');
    const successModal = document.getElementById('successModal');
    
    if (event.target === paymentModal) {
        closePaymentModal();
    }
    
    if (event.target === successModal) {
        closeSuccessModal();
    }
}

// Инициализация Google Maps
function initMap() {
    const mapElement = document.getElementById('map');
    const fallbackMap = document.getElementById('fallbackMap');
    
    if (!mapElement) return;
    
    // Если Google Maps API не загрузился, показываем Яндекс Карты
    if (typeof google === 'undefined' || !google.maps) {
        console.log('Google Maps not loaded, showing Yandex map');
        if (mapElement) mapElement.style.display = 'none';
        if (fallbackMap) fallbackMap.style.display = 'block';
        return;
    }
    
    // Координаты Оша, Кыргызстан
    const location = { lat: 40.5244, lng: 72.7983 };
    
    const map = new google.maps.Map(mapElement, {
        zoom: 15,
        center: location,
        styles: [
            {
                "featureType": "all",
                "elementType": "geometry.fill",
                "stylers": [{"weight": "2.00"}]
            },
            {
                "featureType": "all",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#9c9c9c"}]
            },
            {
                "featureType": "all",
                "elementType": "labels.text",
                "stylers": [{"visibility": "on"}]
            },
            {
                "featureType": "landscape",
                "elementType": "all",
                "stylers": [{"color": "#f2f2f2"}]
            },
            {
                "featureType": "poi",
                "elementType": "all",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road",
                "elementType": "all",
                "stylers": [{"saturation": -100}, {"lightness": 45}]
            },
            {
                "featureType": "road",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#eeeeee"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#7b7b7b"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "all",
                "stylers": [{"visibility": "simplified"}]
            }
        ]
    });
    
    const marker = new google.maps.Marker({
        position: location,
        map: map,
        title: 'Football Arena',
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#2ecc71" stroke="white" stroke-width="2"/>
                    <text x="20" y="25" text-anchor="middle" fill="white" font-size="20" font-family="Arial">⚽</text>
                </svg>
            `),
            scaledSize: new google.maps.Size(40, 40)
        }
    });
    
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="padding: 10px;">
                <h3 style="margin: 0 0 10px 0; color: #2ecc71;">Football Arena</h3>
                <p style="margin: 5px 0;">Кыргызстан, г. Ош, ул. Ахмаджан-Ата, 3/2</p>
                <p style="margin: 5px 0;">📞 +996 (3222) 12-34-56</p>
                <p style="margin: 5px 0;">🕐 Ежедневно 8:00 - 23:00</p>
            </div>
        `
    });
    
    marker.addListener('click', function() {
        infoWindow.open(map, marker);
    });
}

// Проверка загрузки Google Maps через 3 секунды
setTimeout(function() {
    const mapElement = document.getElementById('map');
    const fallbackMap = document.getElementById('fallbackMap');
    
    if (typeof google === 'undefined' || !google.maps) {
        console.log('Google Maps failed to load, showing Yandex map');
        if (mapElement) mapElement.style.display = 'none';
        if (fallbackMap) fallbackMap.style.display = 'block';
    }
}, 3000);

// Добавление CSS анимаций для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
