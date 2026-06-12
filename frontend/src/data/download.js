// Trigger a browser download from an Axios blob response.
// Usage: downloadBlob(await exportAPI.contracts(), 'contracts.csv')
export function downloadBlob(res, filename) {
  const blob = new Blob([res.data], { type: res.data.type || 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
