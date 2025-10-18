// 🌍 Sistema multilíngue — versão 1.0.27 (corrigida com nome persistente)
document.addEventListener("DOMContentLoaded", async () => {
  const lang = localStorage.getItem("lang") || "pt";

  // 🟡 Exibe banner visual em caso de erro
  function showLangError(msg) {
    const banner = document.createElement("div");
    banner.textContent = `⚠️ ${msg}`;
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ffeb99;
      color: #222;
      font-family: 'Fredoka', sans-serif;
      font-weight: 600;
      text-align: center;
      padding: 10px;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    document.body.prepend(banner);
    setTimeout(() => banner.remove(), 5000);
  }

  // 🔹 Obtém nome do usuário com fallback inteligente
  function getUserName() {
    let name = localStorage.getItem("displayName");
    if (!name || name === "undefined" || name === "null" || name.trim() === "") {
      name = localStorage.getItem("savedEmail")?.split("@")[0] || "Amigo";
    }
    return name.split(" ")[0];
  }

  async function loadLanguage(selectedLang) {
    try {
      const res = await fetch(`/lang/${selectedLang}.json`);
      if (!res.ok) throw new Error(`Idioma "${selectedLang}" não encontrado (${res.status})`);

      const data = await res.json();

      // 🟢 Saudação personalizada (agora com nome garantido)
      const name = getUserName();
      const saudacao = document.querySelector("[data-i18n='menu.greeting']");
      if (saudacao && data.menu?.greeting) {
        saudacao.innerHTML = data.menu.greeting.replace("{name}", name);
      }

      // 🟢 Atualiza todos os elementos com data-i18n
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n").split(".");
        let value = data;
        key.forEach(k => value = value?.[k]);
        if (value && !Array.isArray(value)) el.innerHTML = value;
      });

      // 🟡 Modal da história
      const storyTitle = document.getElementById("storyTitle");
      const storyContent = document.getElementById("storyContent");
      if (storyTitle && storyContent && data.menu?.storyTitle && data.story?.content) {
        storyTitle.innerHTML = data.menu.storyTitle;
        storyContent.innerHTML = data.story.content.map(p => `<p>${p}</p>`).join("");
      }

      console.log(`🌍 Idioma carregado: ${selectedLang} — Usuário: ${getUserName()}`);
    } catch (err) {
      console.warn("⚠️ Falha ao carregar idioma:", err);
      showLangError(`Idioma "${selectedLang}" não disponível — usando português padrão 💛`);
      if (selectedLang !== "pt") await loadLanguage("pt");
    }
  }

  await loadLanguage(lang);
});
