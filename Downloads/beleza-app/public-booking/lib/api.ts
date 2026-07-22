const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function getProfessional(slug: string) {
  const res = await fetch(`${API_URL}/public/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function getSlots(slug: string, serviceId: string, date: string) {
  const res = await fetch(`${API_URL}/public/${slug}/slots?serviceId=${serviceId}&date=${date}`, {
    cache: "no-store",
  });
  return res.json();
}

export async function createBooking(
  slug: string,
  data: { serviceId: string; startAt: string; clientName: string; clientPhone: string; clientEmail: string }
) {
  const res = await fetch(`${API_URL}/public/${slug}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Nao foi possivel agendar.");
  return res.json();
}
