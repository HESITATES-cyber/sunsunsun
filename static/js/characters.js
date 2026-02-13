/* =========================
   キャラクター一覧描画（整理版）
   - innerHTMLを使わず安全に描画
   - ソートして順序を安定化
========================= */

(async () => {
  const container = document.getElementById("character-list");
  if (!container) return;

  try {
    const res = await fetch("/static/data/results.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const types = data?.detail_types || {};

    // CW/CX/SW/SX の行箱
    const rows = { CW: [], CX: [], SW: [], SX: [] };

    // タイプ振り分け（C/S + W/X）
    for (const [codeRaw, info] of Object.entries(types)) {
      const code = String(codeRaw || "");
      if (code.length < 4) continue;

      const key = (code.charAt(0) + code.charAt(3)).toUpperCase();
      if (!rows[key]) continue;

      rows[key].push({
        code,
        name: info?.name ?? "",
        description: info?.description ?? "",
        image: info?.image ?? ""
      });
    }

    // 行ごとに描画
    const frag = document.createDocumentFragment();

    for (const [key, items] of Object.entries(rows)) {
      if (!items.length) continue;

      // 並び順安定化
      items.sort((a, b) => a.code.localeCompare(b.code));

      const section = document.createElement("section");
      section.className = `type-row ${key.toLowerCase()} mb-5`;

      const row = document.createElement("div");
      row.className = "row g-4 justify-content-center";

      for (const item of items) {
        const col = document.createElement("div");
        col.className = "col-6 col-md-3";

        const card = document.createElement("div");
        card.className = `character-card type-${key.toLowerCase()}`;

        const typeCode = document.createElement("div");
        typeCode.className = "type-code";
        typeCode.textContent = item.code;

        const img = document.createElement("img");
        img.src = item.image;
        img.alt = item.name;
        img.loading = "lazy";
        img.decoding = "async";

        const h3 = document.createElement("h3");
        h3.textContent = item.name;

        const p = document.createElement("p");
        p.textContent = item.description;

        card.append(typeCode, img, h3, p);
        col.appendChild(card);
        row.appendChild(col);
      }

      section.appendChild(row);
      frag.appendChild(section);
    }

    container.innerHTML = "";
    container.appendChild(frag);

  } catch (err) {
    console.error("キャラクター読み込みエラー:", err);
  }
})();
