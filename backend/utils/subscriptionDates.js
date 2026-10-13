function invalid(message) {
  throw Object.assign(new Error(message), { statusCode: 400 });
}

export function subscriptionDateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) invalid("Fecha de suscripcion invalida.");
  return date.toISOString().slice(0, 10);
}

export function addSubscriptionDays(value, days) {
  const date = new Date(`${subscriptionDateOnly(value)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return subscriptionDateOnly(date);
}

// Los dos limites son inclusivos. Solo se utiliza para periodos nuevos.
export function calculateInclusiveSubscriptionPeriod({
  durationDays, requestedStartAt = null, existingEndsAt = null, today = new Date(),
}) {
  const duration = Number(durationDays);
  if (!Number.isSafeInteger(duration) || duration <= 0) invalid("durationDays debe ser un entero positivo.");
  const candidates = [subscriptionDateOnly(today)];
  if (requestedStartAt) candidates.push(subscriptionDateOnly(requestedStartAt));
  if (existingEndsAt) candidates.push(addSubscriptionDays(existingEndsAt, 1));
  const startsAt = candidates.sort().at(-1);
  return { startsAt, endsAt: addSubscriptionDays(startsAt, duration - 1) };
}
