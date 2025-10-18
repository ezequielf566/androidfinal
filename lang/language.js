// 🌍 Pintando a Palavra — Sistema Global de Tradução
document.addEventListener("DOMContentLoaded", async () => {
  const lang = localStorage.getItem("lang") || navigator.language.slice(0,2) || "pt";
  try {
    const response = await fetch(`/lang/${lang}.json`);
    const data = await response.json();
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const keys = el.dataset.i18n.split(".");
      let value = data;
      keys.forEach(k => value = value ? value[k] : null);
      if (value) {
        if (Array.isArray(value)) {
          el.innerHTML = value.map(p => `<p>${p}</p>`).join("");
        } else {
          el.innerHTML = value;
        }
      }
    });
  } catch (err) {
    console.warn("⚠️ Falha ao carregar idioma:", err);
  }
});