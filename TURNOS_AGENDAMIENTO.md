# Sistema de Turnos y Agendamiento de Médicos

## Arquitectura General

El sistema de agendamiento está implementado en tres capas:
- **Backend**: Node.js/Express en `server.js`
- **Frontend**: HTML/JavaScript en `public/`
- **Integración WIX**: Código en `WIX/`

---

## Tablas de Base de Datos

### Tabla `medicos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| primer_nombre | VARCHAR | Nombre del médico |
| primer_apellido | VARCHAR | Apellido del médico |
| especialidad | VARCHAR | Especialidad médica |
| numero_licencia | VARCHAR | Número de licencia profesional |
| tipo_licencia | VARCHAR | Tipo de licencia |
| fecha_vencimiento_licencia | DATE | Vencimiento de licencia |
| firma | TEXT | Firma digital en base64 |
| tiempo_consulta | INT | Duración de consulta en minutos (default: 10) |
| activo | BOOLEAN | Estado del médico |

### Tabla `medicos_disponibilidad`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Identificador único |
| medico_id | INT FK | Referencia a tabla médicos |
| dia_semana | INT | 0-6 (Domingo a Sábado) |
| hora_inicio | TIME | Hora de inicio del rango |
| hora_fin | TIME | Hora de fin del rango |
| modalidad | VARCHAR(20) | 'presencial' o 'virtual' |
| activo | BOOLEAN | Si está activo ese día |

**Nota**: Soporta múltiples rangos por día/modalidad (ej: 8:00-12:00 y 14:00-18:00 para manejar almuerzo).

### Tabla `HistoriaClinica` (Citas/Órdenes)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| _id | UUID | Identificador único de la cita |
| numeroId | VARCHAR | Cédula del paciente |
| medico | VARCHAR | Nombre del médico asignado |
| fechaAtencion | TIMESTAMP | Fecha de la cita |
| horaAtencion | VARCHAR | Hora específica (HH:MM) |
| atendido | VARCHAR | Estado: PENDIENTE, ATENDIDO |
| modalidad | VARCHAR | Presencial o Virtual |

---

## Endpoints API

### Gestión de Disponibilidad

#### GET `/api/medicos/:id/disponibilidad`
Obtiene la disponibilidad configurada de un médico.

**Query params:**
- `modalidad` (opcional): 'presencial' o 'virtual'
- `agrupado` (opcional): 'true' para agrupar rangos por día

**Respuesta (agrupado=true):**
```json
{
  "success": true,
  "data": [
    {
      "dia_semana": 1,
      "modalidad": "presencial",
      "activo": true,
      "rangos": [
        {"id": 1, "hora_inicio": "08:00", "hora_fin": "12:00"},
        {"id": 2, "hora_inicio": "14:00", "hora_fin": "18:00"}
      ]
    }
  ]
}
```

#### POST `/api/medicos/:id/disponibilidad`
Guarda la disponibilidad para una modalidad específica.

**Body (nuevo formato con múltiples rangos):**
```json
{
  "disponibilidad": [
    {
      "dia_semana": 1,
      "activo": true,
      "rangos": [
        {"hora_inicio": "08:00", "hora_fin": "12:00"},
        {"hora_inicio": "14:00", "hora_fin": "18:00"}
      ]
    }
  ],
  "modalidad": "presencial"
}
```

**Body (formato anterior, compatible):**
```json
{
  "disponibilidad": [
    {"dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "17:00", "activo": true}
  ],
  "modalidad": "presencial"
}
```

#### PUT `/api/medicos/:id/tiempo-consulta`
Actualiza la duración de consulta (5-120 minutos).

### Obtención de Horarios Disponibles

#### GET `/api/horarios-disponibles`
Obtiene horarios libres para un médico en una fecha y modalidad.

**Query params:**
- `fecha`: YYYY-MM-DD
- `medico`: nombre del médico
- `modalidad`: 'presencial' o 'virtual' (default: presencial)

**Lógica:**
1. Determina el día de la semana
2. Busca TODOS los rangos de disponibilidad del médico para ese día
3. Si no existe configuración para la modalidad, usa rango por defecto (6:00-23:00)
4. Obtiene citas ocupadas
5. Genera slots basados en `tiempo_consulta` para cada rango
6. Retorna horarios con disponibilidad

**Respuesta:**
```json
{
  "success": true,
  "fecha": "2024-01-15",
  "medico": "SIXTA GARCIA",
  "modalidad": "presencial",
  "tiempoConsulta": 10,
  "disponible": true,
  "rangos": [
    {"horaInicio": 8, "horaFin": 12},
    {"horaInicio": 14, "horaFin": 17}
  ],
  "horarios": [
    {"hora": "08:00", "disponible": true},
    {"hora": "08:10", "disponible": false},
    ...
  ]
}
```

#### GET `/api/turnos-disponibles`
Obtiene turnos consolidados de TODOS los médicos (excepto NUBIA).

**Query params:**
- `fecha`: YYYY-MM-DD
- `modalidad`: 'presencial' o 'virtual'

**Lógica:**
1. Agrupa rangos horarios por médico
2. Para cada médico disponible ese día genera slots en todos sus rangos
3. Consolida por hora (múltiples médicos misma hora)
4. Filtra horas pasadas si es hoy
5. Retorna cantidad de médicos disponibles por hora

#### GET `/api/medicos-por-modalidad`
Obtiene médicos que atienden una modalidad específica.

### Endpoints del Calendario

#### GET `/api/calendario/mes`
Conteo de citas por día del mes.

#### GET `/api/calendario/mes-detalle`
Citas agrupadas por médico y estado (ATENDIDO, PENDIENTE, VENCIDO).

#### GET `/api/calendario/dia`
Todas las citas de un día específico.

---

## Flujo de Creación de Cita

### POST `/api/ordenes`

### Asignación Automática de Médico

Si se envía `asignarMedicoAuto: true`:
1. Agrupa los rangos horarios por médico
2. Busca médicos activos disponibles para ese día y modalidad
3. **Excluye a NUBIA**
4. Verifica que la hora esté dentro de ALGUNO de los rangos del médico
5. Verifica que no tengan cita a esa hora
6. Asigna el primer médico disponible

---

## Modalidades y Estados

| Modalidad | Descripción |
|-----------|-------------|
| Presencial | Atención en sitio |
| Virtual | Atención remota (Telemedicina) |

| Estado | Descripción |
|--------|-------------|
| PENDIENTE | Cita programada |
| ATENDIDO | Cita completada |
| VENCIDA | Fecha pasada sin atender |

---

## Múltiples Rangos Horarios

El sistema soporta configurar múltiples rangos de disponibilidad por día para manejar:
- **Hora de almuerzo**: ej. 8:00-12:00 y 14:00-18:00
- **Turnos partidos**: ej. mañana y tarde con diferentes horarios
- **Disponibilidad flexible**: diferentes bloques según necesidad

### Ejemplo de configuración

Un médico puede tener esta disponibilidad para el lunes en modalidad presencial:
- Rango 1: 08:00 - 12:00 (mañana)
- Rango 2: 14:00 - 17:00 (tarde)

Esto significa que NO estará disponible de 12:00 a 14:00 (almuerzo).

---

## Generación de Slots

Se genera basándose en:
1. **Todos los rangos de disponibilidad** del médico para ese día
2. **Tiempo de consulta** por médico (default: 10 min)
3. **Citas existentes** para evitar conflictos

---

## Consideraciones Especiales

- **NUBIA**: Excluida de asignaciones automáticas, se gestiona en `nuevaorden1.html`
- **Timezone**: Colombia (UTC-5)
- **Rango por defecto**: 6:00-23:00 si no hay configuración para la modalidad
- **Sin overbooking**: Previene dos citas a la misma hora
- **Múltiples rangos**: Soporta tiempos muertos como almuerzo

---

## Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| `server.js` | Backend con endpoints |
| `public/calendario.html` | Gestión de disponibilidad con múltiples rangos |
| `public/medicos.html` | CRUD de médicos |
| `public/nueva-orden.html` | Creación de citas |
| `public/nuevaorden1.html` | Citas virtuales con NUBIA |
| `public/nuevaorden2.html` | Citas virtuales con médicos disponibles (excluye NUBIA) |
| `public/ordenes.html` | Visualización de órdenes |
