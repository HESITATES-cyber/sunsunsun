/* =========================
   キャラクター一覧描画
========================= */
fetch("/static/data/results.json")
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("character-list");
    const types = data.detail_types;

    const rows = {
      CW: [],
      CX: [],
      SW: [],
      SX: []
    };

    // タイプ振り分け（コードの1文字目 + 4文字目で行判定）
    Object.entries(types).forEach(([code, info]) => {
      const key = code.charAt(0) + code.charAt(3); // C/S + W/X
      if (rows[key]) {
        rows[key].push({ code, ...info });
      }
    });

    // 行ごとに描画
    Object.entries(rows).forEach(([key, items]) => {
      if (items.length === 0) return; // 空行はスキップ

      const section = document.createElement("section");
      section.className = `type-row ${key.toLowerCase()} mb-5`;

      section.innerHTML = `
        <div class="row g-4 justify-content-center">
        ${items.map(item => `
          <div class="col-6 col-md-3">
            <div class="character-card type-${key.toLowerCase()}">
              <div class="type-code">${item.code}</div>
              <img src="${item.image}" alt="${item.name}">
              <h3>${item.name}</h3>
              <p>${item.description}</p>
            </div>
          </div>
        `).join("")}
        </div>  
      `;

      container.appendChild(section);
    });
  })
  .catch(err => {
    console.error("キャラクター読み込みエラー:", err);
  });
