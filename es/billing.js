// billing.js — integração oficial com Google Play Billing (somente Android)
const PRODUCT_ID = "remove_ads_premium";

// Inicializa o BillingClient assim que o app abre
export async function initBilling() {
  try {
    if (!window.BillingClient) {
      console.warn("⚠️ BillingClient não disponível. Este app precisa ser instalado pela Play Store.");
      return false;
    }

    console.log("🛒 Iniciando conexão com Google Play Billing...");
    await window.BillingClient.startConnection();
    console.log("✅ BillingClient conectado com sucesso!");
    return true;
  } catch (err) {
    console.error("❌ Erro ao iniciar BillingClient:", err);
    return false;
  }
}

// Função para iniciar o fluxo de compra
export async function comprarRemoveAds() {
  try {
    if (!window.BillingClient) {
      alert("💛 Este recurso está disponível apenas na versão Play Store.");
      return false;
    }

    // Confirma que o cliente está conectado
    const isReady = await initBilling();
    if (!isReady) return false;

    console.log("🧾 Abrindo fluxo de compra...");
    const result = await window.BillingClient.launchBillingFlow({
      sku: PRODUCT_ID,
      type: "inapp", // ou "subs" se fosse assinatura
    });

    console.log("🎟️ Resultado da compra:", result);

    if (result?.responseCode === 0) {
      console.log("✅ Compra concluída com sucesso!");
      // Aqui você pode salvar no Firebase, por exemplo:
      localStorage.setItem("remove_ads_premium", "true");
      return true;
    } else {
      console.warn("❌ Compra cancelada ou não concluída:", result);
      return false;
    }
  } catch (err) {
    console.error("⚠️ Erro ao processar compra:", err);
    return false;
  }
}
