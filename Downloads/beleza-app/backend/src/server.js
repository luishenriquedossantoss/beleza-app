import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import serviceRoutes from "./routes/services.js";
import bookingRoutes from "./routes/bookings.js";
import publicRoutes from "./routes/public.js";
import workHourRoutes from "./routes/workHours.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/services", serviceRoutes);
app.use("/bookings", bookingRoutes);
app.use("/work-hours", workHourRoutes);
// rotas usadas pela pagina publica de agendamento (sem login)
app.use("/public", publicRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3333;
app.listen(port, () => console.log(`api rodando na porta ${port}`));
