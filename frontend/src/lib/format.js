export function displayName(email) {
  if (!email) return "Unknown";
  const local = String(email).split("@")[0] || String(email);
  const token = local.split(/[._-]/).find(Boolean) || local;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function formatCurrency(value) {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function roleLabel(role) {
  return role === "MANAGER" ? "Sales Manager" : "Sales Rep";
}

export const stageLabels = {
  NEW: "New",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export function stageClass(stage) {
  switch (stage) {
    case "NEW":
      return "badge badge-slate";
    case "QUALIFIED":
      return "badge badge-blue";
    case "PROPOSAL":
      return "badge badge-indigo";
    case "NEGOTIATION":
      return "badge badge-amber";
    case "WON":
      return "badge badge-green";
    case "LOST":
      return "badge badge-red";
    default:
      return "badge badge-slate";
  }
}
