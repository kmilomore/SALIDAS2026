# Contexto de `src/components/MetricCard.jsx`

## 1. Rol del componente

`MetricCard` es un componente visual simple y reusable para mostrar indicadores clave en formato tarjeta. Su responsabilidad es presentar un título, un valor principal y un texto auxiliar con una identidad visual consistente con el dashboard.

No contiene lógica de negocio ni estado interno.

## 2. Props

- `title`: nombre del indicador.
- `value`: valor principal que se mostrará en tamaño destacado.
- `helper`: texto breve de apoyo que explica el indicador.
- `tone`: variante visual. Por defecto usa `sky`.

## 3. Variantes visuales

El componente define un mapa local `tones` con cuatro variantes:

- `sky`
- `amber`
- `emerald`
- `coral`

Cada tono cambia el degradado, borde y color dominante del texto.

## 4. Responsabilidad exacta

Su alcance está deliberadamente acotado:

- no formatea números,
- no valida tipos,
- no decide el significado del KPI,
- no gestiona eventos.

Eso significa que `MetricCard` depende de que el componente padre le entregue valores ya listos para mostrar, por ejemplo usando `formatNumber` o `formatCurrency` antes de invocarlo.

## 5. Uso dentro del portal

En `App.jsx` se utiliza repetidamente para renderizar:

- escuelas con recursos PME,
- escuelas sin recursos PME,
- priorizables del año,
- no cubiertas 2025,
- criterio 2026,
- establecimientos,
- con salidas,
- acciones,
- monto estimado.

En la práctica es el ladrillo base del resumen ejecutivo del dashboard.

## 6. Decisiones de diseño

### Componente presentacional puro

Al no tener hooks ni estado, su comportamiento es totalmente determinista y fácil de reutilizar.

### Estilo centralizado por tono

La decisión de encapsular las clases por `tone` evita repetir combinaciones de gradientes en `App.jsx`.

### Tipografía y jerarquía clara

El título se muestra como texto pequeño en mayúsculas con tracking alto, mientras que el valor ocupa el foco visual con un tamaño grande.

## 7. Riesgos y límites

- Si se pasa un `tone` no definido, el componente cae al estilo `sky`.
- El componente no limita longitud de `title` o `helper`, por lo que textos muy largos pueden romper el equilibrio visual.
- No resuelve accesibilidad semántica avanzada más allá de su contenido textual.

## 8. Cuándo tocar este archivo

Conviene modificarlo si se quiere:

- cambiar la apariencia global de los KPIs,
- agregar nuevas variantes visuales,
- introducir íconos o tendencias,
- transformar las tarjetas en componentes interactivos.

Si el cambio es sobre cómo se calcula el dato, no corresponde tocar este archivo sino el componente padre o la capa de utilidades.