# Contexto del Portal Dashboard PME

## 1. Propósito del portal

Este proyecto implementa un dashboard web para analizar establecimientos educacionales en el contexto PME, con foco en salidas pedagógicas, cobertura operativa y priorización territorial. El portal toma información desde Google Sheets por medio de una API expuesta con Google Apps Script, normaliza el cruce entre hojas mediante el RBD y presenta una vista ejecutiva con métricas, gráficos, tablas operativas y una ficha detallada por establecimiento.

El objetivo funcional no es solo visualizar datos crudos, sino convertirlos en una base accionable para responder preguntas como:

- Qué establecimientos tienen recursos PME asociados.
- Cuáles registran o no salidas pedagógicas.
- Qué parte de la cobertura 2025 ya fue abordada y qué parte quedó pendiente.
- Dónde conviene priorizar gestión 2026 según cobertura, ruralidad, acciones y presupuesto estimado.

## 2. Stack y piezas principales

### Frontend

- React 18 con Vite.
- Tailwind CSS para layout y estilo.
- Recharts para gráficos.
- Lucide React para iconografía.

### Backend de datos

- Google Apps Script en `google-app-script/Code.gs`.
- Fuente primaria: un Spreadsheet de Google con tres hojas relevantes.

### Hojas esperadas

- `ANALISIS`: base analítica principal por RBD, donde se leen estado de salida, dimensión, acciones, observaciones y año.
- `ESTABLECIMIENTOS`: catálogo descriptivo de cada establecimiento.
- `2025`: hoja de cobertura real 2025, usada para determinar si el establecimiento fue efectivamente cubierto y cuántas veces aparece.

## 3. Flujo de datos end to end

1. La aplicación React arranca en `src/main.jsx` y monta `App`.
2. `App` ejecuta `fetchDashboardData()` al montar.
3. `fetchDashboardData()` consulta `VITE_API_URL?view=dashboard`.
4. `Code.gs` abre el Spreadsheet por ID y lee las hojas requeridas.
5. La API normaliza encabezados, normaliza RBD, cruza ANALISIS con ESTABLECIMIENTOS y con la hoja 2025.
6. La API devuelve un payload con:
   - `updatedAt`
   - `catalogs.dimensions`
   - `catalogs.years`
   - `summary`
   - `yearSummary`
   - `establishments`
7. `App` construye métricas derivadas y perfiles estratégicos para priorización.
8. La UI muestra tarjetas, gráficos, listados y una tabla con detalle operativo.
9. Al abrir una fila, `EstablishmentModal` muestra la ficha expandida del establecimiento.

## 4. Estructura funcional del frontend

### `src/App.jsx`

Es el orquestador principal. Cumple cuatro responsabilidades:

- Cargar datos desde la API.
- Mantener filtros globales de la vista ejecutiva: búsqueda, estado, año y dimensión.
- Construir métricas derivadas y el modelo estratégico.
- Renderizar todas las secciones visuales del dashboard y abrir/cerrar el modal.

### Componentes relevantes

- `MetricCard`: tarjeta visual para KPIs.
- `SectionCard`: contenedor reusable para secciones del dashboard.
- `EstablishmentTable`: tabla operativa con filtros propios, ordenamiento, copia de correos y apertura de detalle.
- `EstablishmentModal`: ficha detallada de un establecimiento.

### Utilidades de soporte

- `src/lib/api.js`: cliente HTTP mínimo para recuperar el payload del dashboard.
- `src/lib/formatters.js`: formateadores de número, moneda, fecha y texto compacto.
- `src/lib/strategic.js`: lógica de priorización estratégica, cobertura territorial y scoring.

## 5. Modelo de datos que consume la UI

Cada elemento de `data.establishments` representa un registro analítico enriquecido con datos del catálogo de establecimientos. La estructura esperada es aproximadamente:

```js
{
  rbd: '12345-6',
  name: 'Nombre establecimiento',
  commune: 'Comuna',
  dependency: 'Dependencia',
  level: 'Nivel',
  area: 'Área',
  rurality: 'Rural/Urbano',
  year: '2025',
  wasCovered2025: true,
  covered2025Count: 2,
  hasPedagogicalOuting: true,
  actionCount: 3,
  dimensions: ['Gestión Pedagógica'],
  observation: 'Texto original',
  estimatedBudget: 250000,
  analysisRaw: { ...fila original normalizada... },
  establishmentRaw: { ...fila original normalizada... }
}
```

Esto es importante porque la UI mezcla campos ya procesados con acceso a los objetos crudos para mostrar información adicional sin tener que volver a consultar la fuente.

## 6. Lógica de negocio visible en el portal

### 6.1 Filtros globales

En `App.jsx` hay filtros globales por:

- Texto libre: nombre, RBD o comuna.
- Estado: con salida, sin salida o todos.
- Año.
- Dimensión.

Estos filtros afectan el conjunto principal de establecimientos visibles y, por lo tanto, impactan varias métricas y gráficos.

### 6.2 Priorización estratégica

La lógica estratégica vive en `src/lib/strategic.js`. A partir del conjunto filtrado se agrupan registros por RBD y se calculan perfiles con:

- disponibilidad de recursos PME,
- cobertura o no cobertura 2025,
- condición rural/urbana,
- intensidad de acciones,
- cobertura relativa de la comuna,
- score final y etiqueta de prioridad.

El dashboard usa principalmente la estrategia `coverage`, con un criterio explícito de priorizar establecimientos no cubiertos en 2025.

### 6.3 Métricas derivadas

El frontend calcula, entre otras, las siguientes métricas:

- total de establecimientos únicos,
- total de registros visibles,
- establecimientos con salida,
- total de acciones,
- presupuesto estimado,
- distribución por dimensión,
- comparativo anual,
- solicitado vs concretado en 2025,
- cobertura por comuna y ruralidad,
- ranking de escuelas con más salidas registradas en 2025.

### 6.4 Presupuesto estimado

El presupuesto no viene como columna tipada desde la fuente. Se extrae desde texto libre de observaciones usando expresiones regulares en Apps Script. Si una observación incluye varios montos, se suman. Esto hace que el dato sea útil para gestión, pero también sensible a variaciones en cómo están escritas las observaciones.

## 7. Secciones de la interfaz

La experiencia del portal puede leerse como cinco capas:

### Encabezado

- Presenta branding, fecha de actualización, fuente y método de cruce.
- Explica que el sistema cruza ANALISIS y ESTABLECIMIENTOS por RBD.

### Tarjetas de contexto estratégico

- Escuelas con recursos PME.
- Escuelas sin recursos PME.
- Priorizables del año efectivo.
- No cubiertas 2025.
- Criterio 2026.

### Bloques de lectura estratégica

- Escuelas no cubiertas en 2025.
- Seguimiento de salidas 2025.
- Brechas territoriales.

### Bloques analíticos generales

- Panel de métricas por dimensión, estado y año.
- Resumen ejecutivo presupuestario y por año.

### Operación por establecimiento

- Tabla con filtros detallados.
- Apertura de modal por fila para revisar información consolidada.

## 8. Contrato de la API

La API de Apps Script expone al menos dos vistas:

- `?view=dashboard`: devuelve el payload completo.
- `?view=summary`: devuelve solo el resumen y la fecha de actualización.

La respuesta está envuelta en un objeto con `success`, y cuando corresponde `data` o `message`.

Ejemplo conceptual:

```json
{
  "success": true,
  "data": {
    "spreadsheetId": "...",
    "updatedAt": "2026-05-11T12:00:00.000Z",
    "catalogs": {
      "dimensions": ["Gestión Pedagógica"],
      "years": ["2025", "2026"]
    },
    "summary": {
      "totalEstablishments": 0,
      "withOutings": 0,
      "withoutOutings": 0,
      "totalActions": 0,
      "estimatedBudget": 0
    },
    "yearSummary": [],
    "establishments": []
  }
}
```

## 9. Decisiones técnicas importantes

### Normalización de encabezados

Apps Script convierte encabezados a una forma slugificada, sin tildes y con `_`. Eso permite tolerar hojas con variaciones menores en los nombres de columna.

### Normalización de RBD

El cruce no depende solo de un formato exacto. La API genera múltiples llaves de búsqueda por RBD para soportar variaciones con o sin guion y casos terminados en `K`.

### Tolerancia a nombres de columnas heterogéneos

La función `pickFirst` busca el primer valor presente dentro de listas de nombres candidatos. Esto reduce acoplamiento a una sola nomenclatura de columnas.

### Derivación híbrida frontend/backend

- Backend: lectura, cruce, limpieza, normalización y payload base.
- Frontend: agregaciones de visualización, ranking, tablas derivadas y priorización estratégica.

## 10. Riesgos y puntos sensibles

### Calidad del origen

- Si faltan hojas requeridas, la API falla.
- Si el primer campo de una fila no corresponde al RBD esperado, el cruce puede degradarse.
- Si los montos no siguen formatos reconocibles, `estimatedBudget` subestima.

### Duplicidad semántica

El dashboard opera con registros por fila de ANALISIS, no necesariamente una fila única por establecimiento. Varias métricas agregan por RBD, pero otras cuentan filas visibles. Esa diferencia debe conservarse en futuras modificaciones.

### Sensibilidad del año de planificación

La lógica estratégica puede usar un año de referencia alternativo si el año seleccionado no existe para un establecimiento. Eso mejora cobertura analítica, pero implica que el concepto de "año actual" no siempre es estrictamente literal a nivel de registro.

### Correos extraídos desde datos crudos

La tabla recopila correos buscando claves específicas dentro de `establishmentRaw`. Si la nomenclatura cambia en la hoja, el botón de copia puede dejar de capturar algunos correos.

## 11. Estado actual del diseño técnico

El proyecto está orientado a una experiencia de consulta ejecutiva y operativa, no a edición. No hay autenticación, persistencia propia ni backend dedicado fuera de Apps Script. La app depende de que el Spreadsheet siga siendo la fuente maestra y de que la URL de Apps Script esté disponible vía `VITE_API_URL` o el fallback embebido.

## 12. Archivos especialmente importantes para mantenimiento

- `src/App.jsx`: centro de orquestación y composición visual.
- `src/lib/strategic.js`: núcleo de priorización y cobertura.
- `src/components/EstablishmentTable.jsx`: operación diaria sobre establecimientos.
- `src/components/EstablishmentModal.jsx`: lectura detallada de ficha.
- `google-app-script/Code.gs`: contrato real de datos y tolerancia a inconsistencias del origen.

## 13. Observación útil para evolución futura

Existe `src/components/FilterBar.jsx` en el repositorio, pero la experiencia principal actual usa filtros integrados en `App.jsx` y en `EstablishmentTable.jsx`. Eso sugiere que `FilterBar` hoy no participa del flujo principal y podría ser un remanente o una pieza preparada para refactor futuro.