export function formatAmount(value, currency = "MZN") {
  const number = Number(value);
  if (Number.isNaN(number)) return `${value} ${currency}`;
  return `${number.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" });
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-MZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}
