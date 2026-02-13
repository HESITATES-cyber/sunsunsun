document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function updateTopHeroImage(isDark) {
    // トップページにしか無いので、無ければ何もしない
    const img = document.getElementById("top-hero-img");
    if (!img) return;

    img.src = isDark
      ? "/static/img/night.png"
      : "/static/img/picnic.png";
  }

  function applyTheme() {
    const saved = localStorage.getItem("theme") || "light";
    const isDark = saved === "dark";

    document.body.classList.toggle("dark", isDark);
    btn.textContent = isDark ? "☀️" : "🌙";

    // ✅ 追加：トップ画像も切替
    updateTopHeroImage(isDark);
  }

  // 初期反映
  applyTheme();

  // ✅ 競合対策：既存の click が何か邪魔してても最後に勝つ
  btn.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const next = document.body.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme();
    },
    true
  );
});
