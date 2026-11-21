const SECRET_FIELD = /(?:secret|token|password|private.?key|credential)/i;

function redact(value, key = "") {
  if (SECRET_FIELD.test(key)) {
    return value == null || value === "" ? value : "***configured***";
  }
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redact(childValue, childKey),
      ])
    );
  }
  return value;
}

export function sanitizePaymentAuditSnapshot(snapshot) {
  return redact(snapshot);
}
