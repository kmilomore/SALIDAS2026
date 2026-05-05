# Dashboard PME

Dashboard React + Tailwind para visualizar establecimientos, cruces con la hoja ANALISIS y detalles por RBD desde Google Sheets.

## Stack

- React con Vite
- Tailwind CSS
- Recharts para visualizaciones
- Google Apps Script como API
- Despliegue recomendado en Vercel

## Estructura esperada en Google Sheets

- Hoja `ANALISIS`: columna A con `RBD` y columnas con estado de salida pedagógica, dimensión, número de acciones, observaciones y otras variables.
- Hoja `ESTABLECIMIENTOS`: columna 1 con `RBD` y columnas de detalle del establecimiento como nombre, dependencia, comuna, nivel, etc.

La API cruza ambos tabs usando el RBD normalizado.

## Desarrollo local

```bash
npm install
npm run dev
```

## Variables de entorno

Crear un archivo `.env` con:

```bash
VITE_API_URL=https://script.google.com/macros/s/AKfycbwGDFfKaSu6mcsXtouIrdS-Du7N1MKcsEPE4hDMu7XDRDUX_qMuXQOaE2rA5UDosuxCvQ/exec
```

## Deploy en Vercel

1. Importar la carpeta `dashboard-pme` en Vercel.
2. Framework preset: `Vite`.
3. Configurar `VITE_API_URL` en variables de entorno.
4. Build command: `npm run build`.
5. Output directory: `dist`.

## Google Apps Script

El archivo [google-app-script/Code.gs](google-app-script/Code.gs) contiene una API lista para usar sobre el Spreadsheet ID entregado.# SALIDAS2026
# SALIDAS2026
