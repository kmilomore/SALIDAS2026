const API_URL = import.meta.env.VITE_API_URL || 'https://script.google.com/macros/s/AKfycbwGDFfKaSu6mcsXtouIrdS-Du7N1MKcsEPE4hDMu7XDRDUX_qMuXQOaE2rA5UDosuxCvQ/exec';

export async function fetchDashboardData() {
  const response = await fetch(`${API_URL}?view=dashboard`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('No fue posible cargar los datos del dashboard');
  }

  const payload = await response.json();

  if (!payload?.success) {
    throw new Error(payload?.message || 'La API respondió con un error');
  }

  return payload.data;
}