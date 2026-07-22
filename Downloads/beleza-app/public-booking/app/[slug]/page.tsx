"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProfessional, getSlots, createBooking } from "../../lib/api";

const colors = {
  brand: "#D4537E",
  brandTint: "#FBEAF0",
  brandTextStrong: "#4B1528",
  surface: "#F7F5F2",
  border: "#E7E4DE",
  textPrimary: "#2C2C2A",
  textSecondary: "#5F5E5A",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [professional, setProfessional] = useState<any>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"service" | "details" | "paying">("service");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [pixCopiaECola, setPixCopiaECola] = useState<string | null>(null);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    getProfessional(slug).then(setProfessional);
  }, [slug]);

  useEffect(() => {
    if (serviceId) getSlots(slug, serviceId, date).then((d) => setSlots(d.slots));
  }, [serviceId, date, slug]);

  const service = professional?.services.find((s: any) => s.id === serviceId);

  const confirmBooking = async () => {
    if (!service || !selectedSlot) return;
    setBookingError(null);
    try {
      const result = await createBooking(slug, {
        serviceId: service.id,
        startAt: selectedSlot,
        clientName,
        clientPhone,
        clientEmail,
      });
      setPixCopiaECola(result.pixCopiaECola);
      setPixQrCodeBase64(result.pixQrCodeBase64);
      setStep("paying");
    } catch (err: any) {
      setBookingError(err.message ?? "Nao foi possivel gerar o pagamento. Tente novamente.");
    }
  };

  if (!professional) return null;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            background: colors.brandTint,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 500,
            fontSize: 19,
            color: colors.brandTextStrong,
            margin: "0 auto 10px",
          }}
        >
          {professional.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("")}
        </div>
        <p style={{ fontSize: 17, fontWeight: 500, margin: 0 }}>{professional.name}</p>
        <p style={{ fontSize: 12, color: colors.textSecondary, margin: "3px 0 0" }}>Escolha o servico e o horario</p>
      </div>

      {step === "service" && (
        <>
          <p style={{ fontSize: 12, fontWeight: 500, color: colors.textSecondary, marginBottom: 8 }}>Servico</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {professional.services.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                style={{
                  textAlign: "left",
                  border: serviceId === s.id ? `1.5px solid ${colors.brand}` : `0.5px solid ${colors.border}`,
                  background: serviceId === s.id ? colors.brandTint : "transparent",
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <span>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: colors.textSecondary, margin: 0 }}>{s.durationMin} min</p>
                </span>
                <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{formatCents(s.priceCents)}</p>
              </button>
            ))}
          </div>

          {serviceId && (
            <>
              <p style={{ fontSize: 12, fontWeight: 500, color: colors.textSecondary, marginBottom: 8 }}>
                Horarios disponiveis
              </p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ marginBottom: 12, padding: 8, borderRadius: 8, border: `0.5px solid ${colors.border}` }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
                {slots.length === 0 && <p style={{ fontSize: 13, color: colors.textSecondary }}>Sem horarios livres nesse dia.</p>}
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      border: selectedSlot === slot ? `1.5px solid ${colors.brand}` : `0.5px solid ${colors.border}`,
                      background: selectedSlot === slot ? colors.brandTint : "transparent",
                      borderRadius: 12,
                      padding: "9px 0",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {new Date(slot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            disabled={!serviceId || !selectedSlot}
            onClick={() => setStep("details")}
            style={{
              width: "100%",
              background: colors.brand,
              color: colors.brandTint,
              border: "none",
              borderRadius: 14,
              padding: 13,
              fontWeight: 500,
              opacity: !serviceId || !selectedSlot ? 0.5 : 1,
              cursor: "pointer",
            }}
          >
            Continuar
          </button>
        </>
      )}

      {step === "details" && service && (
        <>
          <input
            placeholder="Seu nome"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: `0.5px solid ${colors.border}`, marginBottom: 10 }}
          />
          <input
            placeholder="Seu telefone (WhatsApp)"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: `0.5px solid ${colors.border}`, marginBottom: 10 }}
          />
          <input
            placeholder="Seu e-mail"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: `0.5px solid ${colors.border}`, marginBottom: 16 }}
          />

          {bookingError && <p style={{ color: "#A32D2D", fontSize: 13, marginBottom: 12 }}>{bookingError}</p>}

          <div style={{ background: colors.surface, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: colors.textSecondary }}>Valor total</span>
              <span>{formatCents(service.priceCents)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500 }}>
              <span>Sinal para confirmar · {service.depositPercent}%</span>
              <span>{formatCents(Math.round((service.priceCents * service.depositPercent) / 100))}</span>
            </div>
          </div>

          <button
            disabled={!clientName || !clientPhone || !clientEmail}
            onClick={confirmBooking}
            style={{
              width: "100%",
              background: colors.brand,
              color: colors.brandTint,
              border: "none",
              borderRadius: 14,
              padding: 13,
              fontWeight: 500,
              opacity: !clientName || !clientPhone || !clientEmail ? 0.5 : 1,
              cursor: "pointer",
            }}
          >
            Gerar QR code do PIX
          </button>
        </>
      )}

      {step === "paying" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, marginBottom: 12 }}>Escaneie o QR code com o app do seu banco:</p>
          {pixQrCodeBase64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${pixQrCodeBase64}`}
              alt="QR code do PIX"
              style={{ width: 220, height: 220, margin: "0 auto 16px" }}
            />
          )}
          <p style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Ou copie o codigo:</p>
          <textarea
            readOnly
            value={pixCopiaECola ?? ""}
            style={{ width: "100%", height: 70, fontSize: 11, padding: 10, borderRadius: 10, border: `0.5px solid ${colors.border}` }}
          />
          <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 12 }}>
            Assim que o pagamento cair, seu horario e confirmado automaticamente.
          </p>
        </div>
      )}
    </main>
  );
}
