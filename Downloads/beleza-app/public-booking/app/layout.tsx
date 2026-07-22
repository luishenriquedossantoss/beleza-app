export const metadata = {
  title: "Agendar horario",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#FFFFFF" }}>{children}</body>
    </html>
  );
}
