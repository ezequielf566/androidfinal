// 🌍 Sistema multilíngue — versão 1.0.28 (corrigida: saudação com nome)
document.addEventListener("DOMContentLoaded", async () => {
  const lang = localStorage.getItem("lang") || "pt";

  // 🟡 Banner visual em caso de erro
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

  // 🔹 Garante nome do usuário
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
      const name = getUserName();

      // 🟢 Atualiza todos os elementos com data-i18n
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const path = el.getAttribute("data-i18n").split(".");
        let value = data;
        for (const p of path) value = value?.[p];
        if (typeof value === "string") {
          el.innerHTML = value.includes("{name}") ? value.replace("{name}", name) : value;
        }
      });

      // 🟡 Modal da história
      const storyTitle = document.getElementById("storyTitle");
      const storyContent = document.getElementById("storyContent");
      if (storyTitle && storyContent && data.menu?.storyTitle && Array.isArray(data.story?.content)) {
        storyTitle.innerHTML = data.menu.storyTitle;
        storyContent.innerHTML = data.story.content.map(p => `<p>${p}</p>`).join("");
      }

      console.log(`🌍 Idioma carregado: ${selectedLang} — Usuário: ${name}`);
    } catch (err) {
      console.warn("⚠️ Falha ao carregar idioma:", err);
      showLangError(`Idioma "${selectedLang}" não disponível — usando português padrão 💛`);
      if (selectedLang !== "pt") await loadLanguage("pt");
    }
  }

  await loadLanguage(lang);
});
