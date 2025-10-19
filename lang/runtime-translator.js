/* 🌍 Pintando a Palavra — runtime-translator.js (v1.0.3)
   Tradução automática dinâmica baseada no idioma salvo no login/menu
   - Detecta idioma salvo no localStorage
   - Carrega JSON correspondente (pt, es, en)
   - Substitui textos automaticamente sem quebrar o app
   - Fallback seguro: mantém português se algo falhar
*/

(async () => {
  const userLang = localStorage.getItem("lang") || "pt";
  const supported = ["pt", "es", "en"];
  const lang = supported.includes(userLang) ? userLang : "pt";

  console.log(`🌐 Aplicando idioma: ${lang}`);

  // 🔹 Traduz texto simples
  function translateTextNode(node, dict) {
    const text = node.textContent?.trim();
    if (!text) return;

    for (const [key, val] of Object.entries(dict)) {
      if (text === key || text.toLowerCase() === key.toLowerCase()) {
        node.textContent = val;
        return;
      }
    }
  }

  // 🔹 Aplica tradução no DOM
  function applyTranslations(dict) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentNode && !["SCRIPT", "STYLE"].includes(node.parentNode.tagName)) {
        translateTextNode(node, dict);
      }
    }
  }

  // 🔹 Carrega o dicionário de idioma
  async function loadDictionary(lang) {
    try {
      const res = await fetch(`/lang/${lang}.json`, { cache: "force-cache" });
      if (!res.ok) throw new Error(`Falha ao carregar /lang/${lang}.json`);
      const data = await res.json();

      // Achata o JSON (pega todos os textos possíveis)
      const flat = {};
      function flatten(obj) {
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === "object") flatten(v);
          else flat[v] = v;
        }
      }
      flatten(data);
      return flat;
    } catch (err) {
      console.warn("⚠️ Erro ao carregar idioma:", err);
      return null;
    }
  }

  const dict = await loadDictionary(lang);
  if (!dict) {
    console.warn("⚠️ Dicionário não encontrado, mantendo idioma padrão (pt).");
    return;
  }

  // 🔹 Aplica quando pronto
  const applyWhenReady = () => {
    try {
      applyTranslations(dict);
      console.log(`✅ Tradução aplicada (${lang})`);
    } catch (err) {
      console.warn("⚠️ Falha ao aplicar tradução:", err);
    }
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    applyWhenReady();
  } else {
    document.addEventListener("DOMContentLoaded", applyWhenReady);
  }

  // 🔹 Observa mudanças no DOM (ex: SVGs, botões dinâmicos)
  const observer = new MutationObserver(() => {
    applyTranslations(dict);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();