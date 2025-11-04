import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// 🔑 Pega o JSON da variável do Vercel
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// 🔥 Inicializa Firebase Admin (só uma vez)
if (!global._firebaseApp) {
  initializeApp({
    credential: cert(serviceAccount),
  });
  global._firebaseApp = true;
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // 🔎 Garante que body é JSON
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // ✅ Valida chave secreta
    const secret = req.headers["x-yampi-signature"];
    if (secret !== process.env.YAMPI_SECRET) {
      return res.status(401).json({ error: "Chave secreta inválida" });
    }

    console.log("📩 Evento recebido:", body.event);

    // ⚡ Processa só quando o pagamento é aprovado
    if (body.event === "pedido_aprovado" || body.event === "order.approved") {
      const cliente = body?.data?.cliente;

      if (cliente?.email) {
        const email = cliente.email.toLowerCase();
        const nome = cliente.nome || "";
        const telefone = cliente.telefone || "";

        const ref = db.collection("usuarios").doc(email);
        await ref.set(
          {
            ativo: true,
            nome,
            telefone,
            atualizadoEm: new Date().toISOString(),
          },
          { merge: true }
        );

        console.log("✅ Usuário salvo:", { email, nome, telefone });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
