# Contexto de `google-app-script/Code.gs`

## 1. Rol del archivo

`Code.gs` implementa la API del proyecto sobre Google Apps Script. Es la capa que transforma Google Sheets en un payload JSON consumible por el frontend React. Aquí vive el contrato real de datos del portal.

Su función no es solo exponer hojas: también limpia encabezados, normaliza RBD, cruza fuentes, interpreta columnas heterogéneas y deriva información como presupuesto estimado, dimensiones, cobertura 2025 y resumen anual.

## 2. Constantes principales

El archivo define cuatro constantes globales:

- `SPREADSHEET_ID`: identificador del Spreadsheet fuente.
- `ANALYSIS_SHEET`: nombre de la hoja `ANALISIS`.
- `ESTABLISHMENTS_SHEET`: nombre de la hoja `ESTABLECIMIENTOS`.
- `COVERED_2025_SHEET`: nombre de la hoja `2025`.

Estas constantes fijan el contrato físico del backend con la planilla.

## 3. Punto de entrada HTTP

### `doGet(e)`

Es la función pública invocada por Apps Script cuando se hace una petición GET.

Comportamiento:

1. Lee el parámetro `view` desde la request.
2. Construye el payload base mediante `buildDashboardPayload()`.
3. Si `view === 'summary'`, devuelve solo `summary` y `updatedAt`.
4. En cualquier otro caso devuelve el payload completo.
5. Si ocurre una excepción, responde `{ success: false, message: ... }`.

## 4. Núcleo del procesamiento

### `buildDashboardPayload()`

Es la función más importante del archivo. Hace lo siguiente:

1. Abre el Spreadsheet por ID.
2. Lee tres hojas como arreglos de objetos normalizados.
3. Construye mapas de establecimientos y cobertura 2025 indexados por variantes de RBD.
4. Recorre la hoja `ANALISIS` y convierte cada fila en un registro enriquecido.
5. Genera catálogos de dimensiones y años.
6. Calcula resumen general y resumen por año.
7. Devuelve el payload final.

## 5. Cómo se construye cada registro

Cada fila de `ANALISIS` se transforma en un objeto con datos provenientes de varias fuentes:

### Datos base del análisis

- RBD normalizado.
- indicador de salida pedagógica.
- observaciones.
- dimensiones.
- año.
- número de acciones.
- presupuesto estimado derivado desde la observación.

### Datos del establecimiento

Se cruzan desde la hoja `ESTABLECIMIENTOS` usando RBD, por ejemplo:

- nombre,
- comuna,
- dependencia,
- nivel,
- área,
- ruralidad.

### Datos de cobertura 2025

Se cruzan desde la hoja `2025`:

- `wasCovered2025`: si el RBD aparece al menos una vez.
- `covered2025Count`: cuántas repeticiones existen para ese RBD.

### Trazabilidad incluida

El registro conserva además:

- `analysisRaw`: fila normalizada original de ANALISIS.
- `establishmentRaw`: fila normalizada original de ESTABLECIMIENTOS.

Esto permite que el frontend muestre campos adicionales sin reconsultar la hoja.

## 6. Funciones auxiliares clave

### `readSheetAsObjects(sheet)`

Convierte una hoja completa en un arreglo de objetos:

- toma la primera fila como encabezados,
- normaliza cada encabezado con `slugifyHeader`,
- usa nombres `column_N` cuando el encabezado queda vacío,
- devuelve solo filas que tienen al menos un valor no vacío.

### `slugifyHeader(value)`

Normaliza encabezados a un formato consistente:

- minúsculas,
- sin tildes,
- separadas por `_`.

Esto desacopla la API de pequeñas diferencias ortográficas en la planilla.

### `normalizeRbd(value)`

Estandariza el RBD eliminando espacios y caracteres extraños, preservando dígitos, `K` y guion.

### `getRbdLookupKeys(value)`

Genera múltiples variantes de búsqueda del mismo RBD para tolerar formatos diferentes. Esta función es esencial para que el cruce entre hojas sea robusto.

### `findByRbdLookup(source, value)`

Busca en un mapa usando todas las variantes de RBD posibles.

### `hasRbdLookupMatch(source, value)`

Devuelve si existe o no coincidencia por RBD.

### `getRbdLookupCount(source, value)`

Devuelve el conteo asociado al RBD si existe coincidencia.

## 7. Funciones de lectura flexible de columnas

### `firstFilledValue(row)`

Usa el primer valor de la fila cuando se requiere una estrategia tolerante para identificar RBD en hojas con encabezados poco confiables.

### `pickFirst(source, keys)`

Recorre una lista de nombres alternativos y devuelve el primero con contenido. Esta función reduce el acoplamiento a nombres exactos de columnas.

Es usada, por ejemplo, para identificar:

- campos de salida pedagógica,
- observaciones,
- dimensiones,
- año,
- acciones,
- nombre del establecimiento,
- comuna,
- dependencia,
- ruralidad.

## 8. Parseo y normalización semántica

### `parseBooleanFlag(value)`

Reconoce variantes como `si`, `s`, `yes`, `true` y `1`.

### `parseNumber(value)`

Intenta convertir texto con formatos mixtos de punto/coma a número.

### `normalizeYear(value)`

Extrae un año con patrón `20xx`. Si no encuentra uno, devuelve `Sin año`.

### `extractDimensions(value)`

Separa el texto de dimensiones usando guiones, slash, punto y coma o comas, normaliza cada etiqueta y las devuelve como lista única ordenada.

### `normalizeDimensionLabel(value)`

Convierte etiquetas parecidas hacia una forma canónica. Ejemplos tratados explícitamente:

- `liderazgo` → `Liderazgo`
- `convivencia escolar` → `Convivencia Escolar`
- `gestion pedagogica` → `Gestión Pedagógica`
- `gestion de recursos` → `Gestión de Recursos`

### `extractMoney(text)`

Busca montos escritos con `$` dentro de texto libre. Luego:

- elimina puntos y comas como separadores,
- convierte cada monto a número,
- suma todos los montos encontrados.

Esto permite obtener `estimatedBudget` aunque el origen no tenga una columna presupuestaria formal.

## 9. Agregaciones de salida

### Catálogos

La API expone:

- `catalogs.dimensions`
- `catalogs.years`

Ambos se construyen con `uniqueFlat`.

### Resumen anual

`yearSummary` contiene, para cada año detectado:

- establecimientos únicos,
- registros con salida,
- registros sin salida,
- acciones totales,
- presupuesto estimado.

### Resumen general

`summary` entrega una versión compacta del total general del dataset.

## 10. Respuesta JSON

### `jsonOutput(payload)`

Envuelve el objeto en `ContentService.createTextOutput` y fija `MimeType.JSON`.

## 11. Fortalezas del diseño actual

- Tolera variaciones de encabezados y nomenclaturas.
- Tolera formatos heterogéneos de RBD.
- Entrega datos crudos y datos procesados en un mismo payload.
- Separa una vista compacta (`summary`) de una vista completa (`dashboard`).
- Empuja al frontend una estructura ya lista para visualización.

## 12. Riesgos y puntos sensibles

### Dependencia fuerte del Spreadsheet

Si cambia el nombre de una hoja o si la hoja desaparece, `readSheetAsObjects` lanzará error por hoja faltante.

### RBD inferido por primer valor de fila

En varios puntos el sistema cae al primer valor disponible de la fila. Eso es útil para tolerancia, pero puede ser riesgoso si el primer campo deja de ser el RBD en alguna hoja.

### Presupuesto derivado desde observaciones

`extractMoney` funciona bien para formatos simples con `$`, pero puede capturar o ignorar montos de forma imperfecta si el texto cambia demasiado.

### Resúmenes basados en registros vs establecimientos únicos

No todos los conteos son por establecimiento único; algunos son por cantidad de registros. Esta distinción es central al interpretar `withOutings` y `withoutOutings`.

## 13. Cuándo tocar este archivo

Debe editarse cuando se requiera:

- cambiar la fuente del Spreadsheet,
- soportar nuevas columnas o alias de columnas,
- modificar la forma de cruce por RBD,
- agregar nuevos campos al payload,
- cambiar las reglas de parseo de dimensiones, año o presupuesto,
- exponer nuevas vistas de API.

Si el frontend empieza a mostrar datos incorrectos o incompletos, este archivo es uno de los primeros lugares que conviene revisar.