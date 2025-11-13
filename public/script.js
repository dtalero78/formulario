document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Aplicación inicializada');

    const form = document.getElementById('formularioMedico');
    const slides = document.querySelectorAll('.question-slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progressBar = document.getElementById('progressBar');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    const successMessage = document.getElementById('successMessage');

    console.log('✅ Elementos encontrados:', {
        form: !!form,
        slides: slides.length,
        submitBtn: !!submitBtn
    });

    // Objeto para guardar datos de Wix
    let wixData = {};

    // Obtener parámetro _id de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const wixId = urlParams.get('_id');

    if (wixId) {
        console.log('📝 ID de Wix detectado:', wixId);
        try {
            const response = await fetch(`/api/wix/${wixId}`);
            const result = await response.json();

            if (result.success && result.data) {
                wixData = result.data;
                console.log('✅ Datos de Wix cargados:', wixData);

                // Pre-llenar campos si existen
                if (wixData.primerNombre) {
                    document.querySelector('input[name="primerNombre"]')?.setAttribute('readonly', 'true');
                }
            }
        } catch (error) {
            console.error('❌ Error al cargar datos de Wix:', error);
        }
    }

    // Signature canvas
    const signatureCanvas = document.getElementById('signatureCanvas');
    const clearSignatureBtn = document.getElementById('clearSignature');
    const firmaData = document.getElementById('firmaData');
    let isDrawing = false;
    let ctx = null;

    if (signatureCanvas) {
        ctx = signatureCanvas.getContext('2d');
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        signatureCanvas.addEventListener('mousedown', startDrawing);
        signatureCanvas.addEventListener('mousemove', draw);
        signatureCanvas.addEventListener('mouseup', stopDrawing);
        signatureCanvas.addEventListener('mouseout', stopDrawing);

        signatureCanvas.addEventListener('touchstart', handleTouchStart);
        signatureCanvas.addEventListener('touchmove', handleTouchMove);
        signatureCanvas.addEventListener('touchend', stopDrawing);

        clearSignatureBtn.addEventListener('click', clearSignature);
    }

    function startDrawing(e) {
        isDrawing = true;
        const rect = signatureCanvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }

    function draw(e) {
        if (!isDrawing) return;
        const rect = signatureCanvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        firmaData.value = signatureCanvas.toDataURL();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = signatureCanvas.getBoundingClientRect();
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (!isDrawing) return;
        const touch = e.touches[0];
        const rect = signatureCanvas.getBoundingClientRect();
        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        ctx.stroke();
        firmaData.value = signatureCanvas.toDataURL();
    }

    function clearSignature() {
        ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        firmaData.value = '';
    }

    // Función para comprimir imagen
    function compressImage(file, maxWidth = 600, quality = 0.6) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Redimensionar si es muy grande
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convertir a base64 con compresión
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Image upload preview
    const fotoInput = document.getElementById('fotoInput');
    const imagePreview = document.getElementById('imagePreview');
    let compressedImageData = null;

    if (fotoInput) {
        fotoInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try {
                    // Mostrar loading
                    imagePreview.innerHTML = '<p style="color: #00B8E6;">Procesando imagen...</p>';

                    // Comprimir imagen con balance calidad/velocidad
                    compressedImageData = await compressImage(file, 600, 0.6);

                    // Mostrar preview
                    imagePreview.innerHTML = `<img src="${compressedImageData}" alt="Preview">`;

                    console.log('📷 Imagen comprimida lista, tamaño:', Math.round(compressedImageData.length / 1024), 'KB');

                    // Mostrar mensaje de que puede enviar
                    setTimeout(() => {
                        if (submitBtn.style.display === 'flex') {
                            submitBtn.textContent = '¡Listo! Enviar formulario';
                            submitBtn.style.animation = 'pulse 1s infinite';
                        }
                    }, 500);
                } catch (error) {
                    console.error('Error al procesar imagen:', error);
                    imagePreview.innerHTML = '<p style="color: red;">Error al procesar la imagen</p>';
                }
            }
        });
    }

    let currentSlide = 0;
    const totalSlides = slides.length;

    // Actualizar total de preguntas
    totalQuestionsSpan.textContent = totalSlides;

    // Mostrar slide actual
    function showSlide(index) {
        // Ocultar todos los slides
        slides.forEach(slide => slide.classList.remove('active'));

        // Mostrar slide actual
        if (slides[index]) {
            slides[index].classList.add('active');
            currentSlide = index;

            // Actualizar contador
            currentQuestionSpan.textContent = index + 1;

            // Actualizar barra de progreso
            const progress = ((index + 1) / totalSlides) * 100;
            progressBar.style.width = progress + '%';

            // Mostrar/ocultar botones
            prevBtn.style.display = index === 0 ? 'none' : 'flex';

            if (index === totalSlides - 1) {
                nextBtn.style.display = 'none';
                submitBtn.style.display = 'flex';
            } else {
                nextBtn.style.display = 'flex';
                submitBtn.style.display = 'none';
            }

            // Focus en el primer input
            const firstInput = slides[index].querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput && firstInput.type !== 'file' && firstInput.type !== 'radio') {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    // Validar slide actual
    function validateCurrentSlide() {
        const currentSlideElement = slides[currentSlide];
        const inputs = currentSlideElement.querySelectorAll('input[required], textarea[required], select[required]');

        for (let input of inputs) {
            // Skip hidden inputs
            if (input.type === 'hidden') {
                if (input.id === 'firmaData' && !input.value) {
                    alert('Por favor firma antes de continuar.');
                    return false;
                }
                continue;
            }

            if (input.type === 'radio') {
                const name = input.name;
                const checked = currentSlideElement.querySelector(`[name="${name}"]:checked`);
                if (!checked) {
                    alert('Por favor selecciona una opción antes de continuar.');
                    return false;
                }
            } else if (input.type === 'file') {
                if (!input.files || input.files.length === 0) {
                    alert('Por favor sube una foto antes de continuar.');
                    return false;
                }
            } else {
                if (!input.value || input.value.trim() === '' || input.value === '-') {
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
            if (currentSlide < totalSlides - 1) {
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

    // Enter para avanzar (excepto en textareas)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (currentSlide < totalSlides - 1) {
                nextBtn.click();
            }
        }
    });

    // Auto-avance en radio buttons y selects
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            setTimeout(() => {
                if (validateCurrentSlide()) {
                    if (currentSlide < totalSlides - 1) {
                        showSlide(currentSlide + 1);
                    }
                }
            }, 300);
        });
    });

    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', function() {
            if (this.value && this.value !== '-') {
                setTimeout(() => {
                    if (validateCurrentSlide()) {
                        if (currentSlide < totalSlides - 1) {
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
        console.log('📝 Formulario submit iniciado');

        if (!validateCurrentSlide()) {
            console.log('❌ Validación falló');
            return;
        }

        console.log('✅ Validación pasó');

        // Deshabilitar botón de envío
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        // Recopilar datos del formulario
        const formData = new FormData(form);
        const datos = {};

        // Agregar datos de Wix si existen
        if (wixId) {
            datos.wixId = wixId;
            datos.primerNombre = wixData.primerNombre || '';
            datos.primerApellido = wixData.primerApellido || '';
            datos.numeroId = wixData.numeroId || '';
            datos.celular = wixData.celular || '';
            datos.empresa = wixData.empresa || '';
            datos.codEmpresa = wixData.codEmpresa || '';
            datos.fechaAtencion = wixData.fechaAtencion || '';
        }

        // Convertir todos los campos
        for (let [key, value] of formData.entries()) {
            // Saltar el campo de foto (file) por ahora
            if (key !== 'foto') {
                datos[key] = value;
            }
        }

        console.log('📦 Datos recopilados (sin foto):', datos);
        if (wixId) {
            console.log('📝 Datos de Wix incluidos:', {
                wixId: datos.wixId,
                primerNombre: datos.primerNombre,
                primerApellido: datos.primerApellido
            });
        }

        // Agregar la foto como base64 si existe (ya comprimida)
        console.log('📷 Verificando foto...');

        if (compressedImageData) {
            console.log('✅ Usando foto comprimida, tamaño:', Math.round(compressedImageData.length / 1024), 'KB');
            datos.foto = compressedImageData;

            try {
                console.log('📡 Enviando al servidor...');
                // Enviar datos al servidor
                const response = await fetch('/api/formulario', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(datos)
                });

                console.log('📨 Respuesta recibida, status:', response.status);
                const result = await response.json();
                console.log('📋 Resultado:', result);

                if (result.success) {
                    // Mostrar mensaje de éxito
                    successMessage.classList.add('show');

                    // Limpiar formulario
                    form.reset();
                    clearSignature();
                    imagePreview.innerHTML = '';
                    compressedImageData = null;

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
                console.error('❌ Error en fetch:', error);
                alert('Error al enviar el formulario. Por favor intenta nuevamente.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar';
            }
        } else {
            console.log('❌ No hay foto seleccionada');
            alert('Por favor sube una foto antes de enviar.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar';
        }
    });

    // Validaciones específicas
    const edadInput = form.querySelector('[name="edad"]');
    if (edadInput) {
        edadInput.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
            if (this.value > 120) this.value = 120;
        });
    }

    const hijosInput = form.querySelector('[name="hijos"]');
    if (hijosInput) {
        hijosInput.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
        });
    }

    const pesoInput = form.querySelector('[name="peso"]');
    if (pesoInput) {
        pesoInput.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
            if (this.value > 300) this.value = 300;
        });
    }

    // Validación de fecha DD/MM/AAAA
    const fechaInput = form.querySelector('[name="fechaNacimiento"]');
    if (fechaInput) {
        fechaInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
            if (value.length >= 5) {
                value = value.slice(0, 5) + '/' + value.slice(5, 9);
            }
            this.value = value;
        });
    }

    // Inicializar
    showSlide(0);
});
