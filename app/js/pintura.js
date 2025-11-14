/* =====================================================
   🔵 PINTURA.JS — Sistema de IDs + Salvamento Local
   Compatível com Pintando a Palavra (sem alterar script.js)
   ===================================================== */

console.log("%c[PINTURA] pintura.js carregado", "color:#00A8FF; font-weight:bold;");

/* =====================================================
   0. FUNÇÕES SEGURAS DE STORAGE (NÃO CONFLITAM)
   ===================================================== */
function PP_loadJSON(key, fallback) {
    try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch (e) {
        console.warn("[PINTURA] Erro ao carregar JSON:", key, e);
        return fallback;
    }
}

function PP_saveJSON(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn("[PINTURA] Erro ao salvar JSON:", key, e);
    }
}

/* =====================================================
   1. BANCO DE CORES E MAPA DE IDs
   ===================================================== */
let PAGE_COLORS = PP_loadJSON("pp_pageColors", {});
let SVG_ID_MAP  = PP_loadJSON("pp_svgIdMap", {});

/* =====================================================
   2. GERAR IDs ÚNICOS POR ELEMENTO DO SVG
   ===================================================== */
function generateIdsForSvg(svgRoot, pageNumber) {
    console.log("%c[ID] Gerando IDs para SVG da página " + pageNumber, "color:#8E44AD; font-weight:bold;");

    if (!SVG_ID_MAP[pageNumber]) SVG_ID_MAP[pageNumber] = [];

    let index = 0;

    svgRoot.querySelectorAll("path, rect, circle, polygon, ellipse, polyline").forEach(el => {
        if (SVG_ID_MAP[pageNumber][index]) {
            el.id = SVG_ID_MAP[pageNumber][index]; // reaplica ID salvo
        } else {
            if (!el.id) {
                el.id = "pp_" + index; // gera ID novo
            }
            SVG_ID_MAP[pageNumber][index] = el.id;
        }
        index++;
    });

    PP_saveJSON("pp_svgIdMap", SVG_ID_MAP);
    console.log("[ID] Total de IDs gerados:", index);
}

/* =====================================================
   3. SALVAR COR DE UM ELEMENTO PINTADO
   ===================================================== */
function saveElementColor(pageNumber, elementId, color) {
    if (!PAGE_COLORS[pageNumber]) PAGE_COLORS[pageNumber] = {};
    PAGE_COLORS[pageNumber][elementId] = color;

    PP_saveJSON("pp_pageColors", PAGE_COLORS);

    console.log("%c[PAINT] Salvo", "color:#27AE60;",
        "Página:", pageNumber,
        "| Elemento:", elementId,
        "| Cor:", color
    );
}

/* =====================================================
   4. REMOVER COR SALVA (BORRACHA)
   ===================================================== */
function removeElementColor(pageNumber, elementId) {
    if (!PAGE_COLORS[pageNumber]) return;

    delete PAGE_COLORS[pageNumber][elementId];
    PP_saveJSON("pp_pageColors", PAGE_COLORS);

    console.log("%c[PAINT] Removido registro:", "color:#E67E22;", elementId);
}

/* =====================================================
   5. RESTAURAR PINTURA AO CARREGAR A PÁGINA
   ===================================================== */
function applySavedColors(svgRoot, pageNumber) {
    console.log("%c[RESTORE] Aplicando pintura salva (página " + pageNumber + ")",
        "color:#2980B9; font-weight:bold;");

    const saved = PAGE_COLORS[pageNumber];
    if (!saved) {
        console.log("[RESTORE] Nenhuma cor salva para esta página.");
        return;
    }

    let restored = 0;

    for (let elementId in saved) {
        const el = svgRoot.querySelector("#" + elementId);
        if (el) {
            el.setAttribute("fill", saved[elementId]);
            restored++;
        }
    }

    console.log("[RESTORE] Total restaurado:", restored);
}

/* =====================================================
   6. DEBUG MANUAL
   ===================================================== */
function debugPaintData(pageNumber) {
    console.log("----- DEBUG PÁGINA " + pageNumber + " -----");
    console.log("IDs:", SVG_ID_MAP[pageNumber]);
    console.log("Cores:", PAGE_COLORS[pageNumber]);
}

/* =====================================================
   7. EVENTO DISPARADO PELO script.js
   ===================================================== */
document.addEventListener("svgLoaded", function(e) {
    console.log("%c[PINTURA] svgLoaded recebido", "color:#16A085; font-weight:bold;");

    const svgRoot = e.detail.svgRoot;
    const page = e.detail.pageNumber;

    generateIdsForSvg(svgRoot, page);
    applySavedColors(svgRoot, page);

    console.log("%c[PINTURA] Página " + page + " processada com sucesso.",
        "color:#2ECC71; font-weight:bold;");
});