
// 🌍 Sistema multilíngue - versão 1.0.20
document.addEventListener("DOMContentLoaded", async () => {
  const lang = localStorage.getItem("lang") || "pt";
  try {
    const res = await fetch(`/lang/${lang}.json`);
    const data = await res.json();

    // 🟢 Saudação personalizada
    const name = localStorage.getItem("displayName")?.split(" ")[0] || "Amigo";
    const saudacao = document.querySelector("[data-i18n='menu.greeting']");
    if (saudacao) saudacao.innerHTML = data.menu.greeting.replace("{name}", name);

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
    if (storyTitle && storyContent && data.story) {
      storyTitle.innerHTML = data.menu.storyTitle;
      storyContent.innerHTML = data.story.content.map(p => `<p>${p}</p>`).join("");
    }

  } catch (err) {
    console.warn("⚠️ Falha ao carregar idioma:", err);
  }
});
