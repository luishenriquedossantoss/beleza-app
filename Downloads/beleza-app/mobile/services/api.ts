import AsyncStorage from "@react-native-async-storage/async-storage";

// Provide a minimal process.env type for environments (like React Native) where
// the Node 'process' type definitions are not available.
declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.2.135:3333";

async function request(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Nao foi possivel completar essa acao.");
  }
  if (res.status === 204) return null;
  return res.json();
}

export type Booking = {
  id: string;
  startAt: string;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELED" | "DONE";
  depositCents: number;
  depositPaid: boolean;
  client: { name: string; phone: string };
  service: { name: string; durationMin: number; priceCents: number };
};

export const api = {
  login: (phone: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ phone, password }) }),

  register: (name: string, phone: string, password: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ name, phone, password }) }),

  getBookings: (from: string, to: string): Promise<Booking[]> =>
    request(`/bookings?from=${from}&to=${to}`),

  getBooking: (id: string): Promise<Booking> => request(`/bookings/${id}`),

  cancelBooking: (id: string) => request(`/bookings/${id}/cancel`, { method: "POST" }),

  resendCharge: (id: string) => request(`/bookings/${id}/resend-charge`, { method: "POST" }),

  getServices: () => request("/services"),

  createService: (data: { name: string; durationMin: number; priceCents: number; depositPercent?: number }) =>
    request("/services", { method: "POST", body: JSON.stringify(data) }),

  getWorkHours: (): Promise<{ weekday: number; startMinutes: number; endMinutes: number }[]> =>
    request("/work-hours"),

  setWorkHours: (hours: { weekday: number; startMinutes: number; endMinutes: number }[]) =>
    request("/work-hours", { method: "PUT", body: JSON.stringify({ hours }) }),
};
