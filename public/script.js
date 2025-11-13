document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formularioMedico');
    const slides = document.querySelectorAll('.question-slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progressBar = document.getElementById('progressBar');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    const successMessage = document.getElementById('successMessage');

    let currentSlide = 0;
    let visibleSlides = [];

    // Inicializar slides visibles
    function updateVisibleSlides() {
        visibleSlides = Array.from(slides).filter(slide => {
            const conditional = slide.getAttribute('data-conditional');
            if (!conditional) return true;

            const conditionalValue = slide.getAttribute('data-conditional-value');
            const input = form.querySelector(`[name="${conditional}"]`);

            if (input) {
                if (input.type === 'radio') {
                    const checked = form.querySelector(`[name="${conditional}"]:checked`);
                    return checked && checked.value === conditionalValue;
                }
            }
            return false;
        });

        totalQuestionsSpan.textContent = visibleSlides.length;
        return visibleSlides;
    }

    // Mostrar slide actual
    function showSlide(index) {
        updateVisibleSlides();

        // Ocultar todos los slides
        slides.forEach(slide => slide.classList.remove('active'));

        // Mostrar slide actual
        if (visibleSlides[index]) {
            visibleSlides[index].classList.add('active');
            currentSlide = index;

            // Actualizar contador
            currentQuestionSpan.textContent = index + 1;

            // Actualizar barra de progreso
            const progress = ((index + 1) / visibleSlides.length) * 100;
            progressBar.style.width = progress + '%';

            // Mostrar/ocultar botones
            prevBtn.style.display = index === 0 ? 'none' : 'flex';

            if (index === visibleSlides.length - 1) {
                nextBtn.style.display = 'none';
                submitBtn.style.display = 'flex';
            } else {
                nextBtn.style.display = 'flex';
                submitBtn.style.display = 'none';
            }

            // Focus en el primer input
            const firstInput = visibleSlides[index].querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    // Validar slide actual
    function validateCurrentSlide() {
        const currentSlideElement = visibleSlides[currentSlide];
        const inputs = currentSlideElement.querySelectorAll('input[required], textarea[required], select[required]');

        for (let input of inputs) {
            if (input.type === 'radio' || input.type === 'checkbox') {
                const name = input.name;
                const checked = currentSlideElement.querySelector(`[name="${name}"]:checked`);
                if (!checked) {
                    alert('Por favor completa este campo antes de continuar.');
                    return false;
                }
            } else {
                if (!input.value.trim()) {
                    alert('Por favor completa este campo antes de continuar.');
                    input.focus();
                    return false;
                }
            }
        }
        return true;
    }

    // Navegación - Siguiente
    nextBtn.addEventListener('click', function() {
        if (validateCurrentSlide()) {
            if (currentSlide < visibleSlides.length - 1) {
                showSlide(currentSlide + 1);
            }
        }
    });

    // Navegación - Anterior
    prevBtn.addEventListener('click', function() {
        if (currentSlide > 0) {
            showSlide(currentSlide - 1);
        }
    });

    // Enter para avanzar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (currentSlide < visibleSlides.length - 1) {
                nextBtn.click();
            } else {
                submitBtn.click();
            }
        }
    });

    // Detectar cambios en campos condicionales
    const conditionalInputs = ['medicamentos', 'cirugias', 'alergias'];
    conditionalInputs.forEach(name => {
        const radios = form.querySelectorAll(`[name="${name}"]`);
        radios.forEach(radio => {
            radio.addEventListener('change', function() {
                updateVisibleSlides();
            });
        });
    });

    // Auto-avance en radio buttons (excepto condicionales)
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const name = this.name;
            if (!conditionalInputs.includes(name)) {
                setTimeout(() => {
                    if (validateCurrentSlide()) {
                        if (currentSlide < visibleSlides.length - 1) {
                            showSlide(currentSlide + 1);
                        }
                    }
                }, 300);
            }
        });
    });

    // Enviar formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateCurrentSlide()) {
            return;
        }

        // Deshabilitar botón de envío
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        // Recopilar datos del formulario
        const formData = new FormData(form);
        const datos = {};

        // Campos simples
        for (let [key, value] of formData.entries()) {
            if (key !== 'enfermedades' && key !== 'antecedentesFamiliares') {
                datos[key] = value;
            }
        }

        // Campos de checkboxes múltiples
        datos.enfermedades = [];
        formData.getAll('enfermedades').forEach(enfermedad => {
            datos.enfermedades.push(enfermedad);
        });

        datos.antecedentesFamiliares = [];
        formData.getAll('antecedentesFamiliares').forEach(antecedente => {
            datos.antecedentesFamiliares.push(antecedente);
        });

        try {
            // Enviar datos al servidor
            const response = await fetch('/api/formulario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(datos)
            });

            const result = await response.json();

            if (result.success) {
                // Mostrar mensaje de éxito
                successMessage.classList.add('show');

                // Limpiar formulario
                form.reset();

                // Reiniciar después de 3 segundos
                setTimeout(() => {
                    successMessage.classList.remove('show');
                    currentSlide = 0;
                    showSlide(0);
                }, 3000);

                console.log('Datos guardados:', result.data);
            } else {
                alert('Error: ' + result.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar';
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Error al enviar el formulario. Por favor intenta nuevamente.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar';
        }
    });

    // Validación en tiempo real para el número de documento
    const numeroIdInput = form.querySelector('[name="numeroId"]');
    if (numeroIdInput) {
        numeroIdInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    // Validación para el celular
    const celularInput = form.querySelector('[name="celular"]');
    if (celularInput) {
        celularInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9+]/g, '');
        });
    }

    // Validación para campos numéricos
    const pesoInput = form.querySelector('[name="peso"]');
    const alturaInput = form.querySelector('[name="altura"]');

    if (pesoInput) {
        pesoInput.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
            if (this.value > 300) this.value = 300;
        });
    }

    if (alturaInput) {
        alturaInput.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
            if (this.value > 250) this.value = 250;
        });
    }

    // Inicializar
    updateVisibleSlides();
    showSlide(0);
});
