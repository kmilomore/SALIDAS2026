# Contexto de `src/components/EstablishmentTable.jsx`

## 1. Rol del componente

`EstablishmentTable` es la capa operativa del dashboard. Mientras `App.jsx` concentra la vista ejecutiva y los gráficos, este componente concentra el trabajo fino sobre establecimientos individuales: filtrar, ordenar, copiar correos y abrir el detalle.

Es el componente con más comportamiento de interacción dentro del frontend actual.

## 2. Props y contrato de entrada

- `items`: arreglo de registros enriquecidos provenientes del dashboard.
- `onOpen`: callback que recibe el `item` seleccionado y normalmente actualiza `selectedItem` en `App`.
- `strategicMap`: mapa por RBD hacia su perfil estratégico. Se usa para inyectar prioridad y metadatos de priorización en cada fila.

## 3. Estado interno

El componente administra varios estados locales:

- `schoolFilter`: búsqueda por nombre o RBD.
- `statusFilter`: con salida, sin salida o todos.
- `yearFilter`: filtro por año.
- `actionsFilter`: filtro exacto por cantidad de acciones.
- `coverage2025Filter`: permite aislar establecimientos no cubiertos en 2025.
- `sortBy`: criterio de ordenamiento.
- `copyState`: estado transitorio del botón de copiar correos.

Esto refleja una decisión importante: la tabla tiene su propio sistema de refinamiento independiente de los filtros globales del dashboard.

## 4. Funciones auxiliares locales

### `normalizeText`

Normaliza texto para comparaciones flexibles sin acentos y en minúscula.

### `extractEmailsFromText`

Usa regex para extraer correos desde texto libre.

### `extractItemEmails`

Busca correos dentro de `item.establishmentRaw`, pero solo en claves que, una vez normalizadas, coinciden con algunas llaves esperadas de dirección o subrogancia.

Llaves consideradas:

- `correo_electronico`
- `correo_director`
- `correo_directora`
- `correo_subrogante`
- `correo_subrogancia`

## 5. Derivaciones con `useMemo`

El archivo usa `useMemo` de forma intensiva para evitar recalcular listas en cada render.

### `yearOptions`

Extrae y ordena años únicos disponibles en `items`.

### `actionOptions`

Extrae cantidades de acciones únicas para poblar el filtro correspondiente.

### `itemsWithProfiles`

Enriquece cada `item` con `strategicProfile` buscando por `item.rbd` dentro de `strategicMap`.

### `filteredItems`

Aplica todos los filtros locales:

- texto,
- estado,
- año,
- acciones,
- cobertura 2025.

### `sortedItems`

Ordena el resultado filtrado según el criterio seleccionado. Soporta:

- prioridad,
- monto,
- acciones,
- comuna,
- estado.

El modo por defecto es `priority`, que usa un orden fijo `Alta > Media > Baja` y desempata por acciones y luego por nombre.

### `visibleEmails`

Agrupa correos únicos de todos los registros visibles y los ordena alfabéticamente.

## 6. Funcionalidad de copia de correos

El método `copyVisibleEmails` intenta copiar al portapapeles todos los correos detectados en el subconjunto visible. Características:

- usa `navigator.clipboard.writeText`,
- separa correos con `; `,
- reporta `success`, `error` o `idle`,
- resetea el estado visual tras 2400 ms.

Esta pieza convierte la tabla en una herramienta de operación directa, no solo de consulta.

## 7. Renderizado principal

### Estado vacío general

Si `items.length` es cero, el componente no muestra tabla sino una tarjeta de estado vacío global.

### Cabecera de tabla

Incluye:

- título de la sección,
- cantidad de registros visibles,
- cantidad con salida,
- botón de copia de correos visibles.

### Panel de filtros internos

La tabla incorpora seis controles en una grilla:

- escuela o RBD,
- estado,
- año,
- acciones,
- cobertura 2025,
- ordenar por.

### Cuerpo tabular

Cada fila muestra:

- establecimiento y dependencia,
- RBD y comuna,
- dimensiones,
- estado de salida,
- prioridad,
- año,
- acciones,
- monto,
- observación resumida,
- acción `Abrir`.

El botón `Abrir` delega en `onOpen(item)`.

## 8. Relación con el resto del sistema

`EstablishmentTable` se apoya en datos procesados por dos capas previas:

- La API, que entrega los registros enriquecidos.
- `buildStrategicProfiles`, que produce el `strategicMap` usado para prioridad y contexto estratégico.

Sin estas capas, la tabla perdería varios comportamientos clave: prioridad, cobertura 2025 y datos crudos para correos.

## 9. Supuestos implícitos

- `item.dimensions` existe y es un arreglo.
- `item.establishmentRaw` puede contener correos embebidos en una o más columnas.
- El navegador soporta `clipboard.writeText` para que la copia funcione.
- `strategicMap[item.rbd]` es estable y consistente con el conjunto `items`.

## 10. Riesgos y puntos sensibles

### Doble sistema de filtros

La tabla trabaja sobre `items` ya filtrados por `App`, y además aplica filtros propios. Eso es correcto para la UX actual, pero hace más difícil razonar sobre por qué una fila desapareció si no se conoce ambas capas.

### Correos dependientes del nombre de columnas

Si la hoja de establecimientos cambia el nombre de las columnas de correo, la extracción dejará de encontrarlos aunque sigan existiendo en la data.

### Orden por prioridad

El ordenamiento prioriza la etiqueta textual, no el score numérico completo. Si en el futuro se quiere más granularidad estratégica, este punto probablemente sea insuficiente.

### Estado vacío interno

Hay dos estados vacíos distintos:

- uno cuando `items` llega vacío desde el padre,
- otro cuando la tabla recibe items pero el filtrado local deja `sortedItems` en cero.

Esto está bien, pero es importante entenderlo al depurar.

## 11. Cuándo tocar este archivo

Debe modificarse cuando se necesite:

- agregar o quitar filtros operativos,
- cambiar la lógica de extracción de correos,
- alterar el criterio de ordenamiento,
- cambiar columnas visibles,
- incorporar acciones masivas sobre establecimientos.