
import Link from "next/link";

export default function ManutencaoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 40,
          background: "#fff",
          borderRadius: 20,
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 20 }}>
          🛠️
        </div>

        <h1 style={{ fontSize: 28, marginBottom: 16, color: "#111827" }}>
          Estamos em manutenção!
        </h1>

        <p style={{ color: "#64748b", lineHeight: 1.7 }}>
          O MenuFlow está passando por melhorias para oferecer
          uma experiência ainda melhor.
        </p>

        <p style={{ color: "#64748b", lineHeight: 1.7 }}>
          Voltaremos em breve. Agradecemos pela compreensão!
        </p>

        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: 20,
            padding: "12px 24px",
            background: "#111827",
            color: "#fff",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
