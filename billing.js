
// billing.js — integração automática com Google Play (modo teste + real)
const PRODUCT_ID = "remove_ads_premium";

export async function comprarRemoveAds() {
  try {
    if (!window.BillingClient) {
      console.log("💛 BillingClient não disponível — modo PWA/teste");
      return false;
    }

    const result = await window.BillingClient.launchBillingFlow({
      sku: PRODUCT_ID,
      type: "inapp"
    });

    console.log("🧾 Resultado da compra:", result);
    return result?.responseCode === 0;
  } catch (err) {
    console.error("⚠️ Erro na compra:", err);
    return false;
  }
}
