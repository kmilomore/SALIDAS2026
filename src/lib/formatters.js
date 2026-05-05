export function formatNumber(value) {
  return new Intl.NumberFormat('es-CL').format(Number(value) || 0);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) {
    return 'Sin actualización';
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function compactText(value, fallback = 'Sin dato') {
  return String(value || '').trim() || fallback;
}