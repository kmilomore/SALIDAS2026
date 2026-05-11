# Contexto de `src/components/EstablishmentModal.jsx`

## 1. Rol del componente

`EstablishmentModal` es la ficha de detalle por establecimiento. Su función es tomar un registro ya enriquecido por la API y por la capa de análisis del frontend, y presentarlo en una vista expandida, legible y enfocada en consulta. No transforma datos estructuralmente; su responsabilidad principal es composición visual y exposición contextual.

Se abre desde la tabla operativa cuando el usuario presiona `Abrir` sobre una fila.

## 2. Props que recibe

El componente acepta las siguientes props:

- `item`: registro del establecimiento que se mostrará. Si es `null`, el modal no renderiza nada.
- `strategicProfile`: perfil estratégico asociado al RBD, usado principalmente para mostrar la prioridad.
- `planningYear`: año de planificación vigente.
- `strategyLabel`: texto descriptivo de la estrategia de priorización.
- `onClose`: callback para cerrar el modal.

### Observación importante

En el estado actual del archivo, `planningYear` y `strategyLabel` se reciben pero no se usan en el render. Eso indica una intención de extensión futura o una API de componente más amplia que su implementación efectiva.

## 3. Subcomponentes internos

El archivo declara dos helpers locales:

### `DetailRow`

- Renderiza una etiqueta y un valor en formato tarjeta compacta.
- Usa `compactText` para evitar valores vacíos.
- Se usa tanto en el resumen superior como en la sección de datos base.

### `KeyValueTable`

- Renderiza una tabla genérica `Campo / Valor`.
- Se usa para mostrar todos los campos adicionales provenientes de `establishmentRaw`.
- Si no hay filas, muestra un estado vacío amigable.

## 4. Flujo interno del componente

1. Si `item` es falsy, retorna `null`.
2. Calcula `extraFields` a partir de `item.establishmentRaw`.
3. Filtra campos vacíos y excluye algunas claves redundantes como `rbd`, `nombre` y `nombre_establecimiento`.
4. Renderiza un overlay fijo con fondo semitransparente.
5. Muestra encabezado, badges de estado, resumen de métricas, observaciones y datos base.
6. A la derecha expone la tabla de campos complementarios.

## 5. Información que expone

### Encabezado

- Nombre del establecimiento.
- RBD.
- Comuna.
- Estado de salidas pedagógicas.
- Cantidad de acciones.
- Prioridad estratégica.

### Resumen principal

- Estado.
- Número de acciones.
- Monto estimado.
- Dimensiones.

### Observaciones PME

Se muestra `item.observation` en un bloque destacado con `whitespace-pre-line`, lo que preserva saltos de línea y mejora legibilidad del texto largo.

### Resumen del establecimiento

Se presentan campos base provenientes del cruce con `ESTABLECIMIENTOS`:

- nombre,
- dependencia,
- comuna,
- nivel,
- área,
- ruralidad.

### Campos complementarios

Expone el resto de los atributos disponibles en `establishmentRaw`, útil cuando el spreadsheet contiene columnas adicionales no modeladas explícitamente en la UI.

## 6. Dependencias del archivo

- `lucide-react`: íconos `ExternalLink` y `X`.
- `../lib/formatters`: `compactText`, `formatCurrency`, `formatNumber`.

## 7. Decisiones de implementación relevantes

### Tolerancia a datos incompletos

La mayoría de los textos pasan por `compactText`, por lo que un valor faltante no rompe la UI y se reemplaza por `Sin dato` o por el fallback definido.

### Badges por prioridad

La prioridad estratégica depende de `strategicProfile?.priority` y usa tres estados visuales principales:

- `Alta`
- `Media`
- fallback gris para cualquier otro caso

### Reutilización de datos crudos

El componente no requiere una segunda consulta para mostrar el detalle ampliado. Se apoya en `establishmentRaw`, que ya viaja en el payload de la API.

## 8. Supuestos implícitos

- `item.dimensions` es un arreglo; el componente hace `join(', ')` sin validaciones defensivas adicionales.
- `item.establishmentRaw` es un objeto plano de pares clave-valor.
- `onClose` está siempre disponible cuando el modal se abre.

## 9. Riesgos o mejoras posibles

- `planningYear` y `strategyLabel` hoy no aportan nada visual ni funcional.
- No hay cierre por tecla `Escape` ni click fuera del panel, solo mediante el botón de cierre.
- El listado de campos excluidos de `extraFields` es fijo; si aparecen otros campos redundantes, también se mostrarán.
- El modal mezcla datos operativos con datos base, pero no muestra trazabilidad explícita de qué campos vienen de ANALISIS y cuáles de ESTABLECIMIENTOS.

## 10. Cuándo tocar este archivo

Conviene modificar este componente cuando se necesite:

- enriquecer la ficha del establecimiento,
- agregar más lectura estratégica en el detalle,
- cambiar la forma en que se exponen campos crudos,
- incorporar accesibilidad adicional o nuevos mecanismos de cierre.