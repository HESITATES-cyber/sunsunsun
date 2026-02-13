document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function applyTheme() {
    const saved = localStorage.getItem("theme") || "light";
    const isDark = saved === "dark";
    document.body.classList.toggle("dark", isDark);
    btn.textContent = isDark ? "☀️" : "🌙";
  }

  // 初期反映
  applyTheme();

  // ✅ 競合対策：既存の click が何か邪魔してても最後に勝つ
  btn.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation(); // ← Array(2) 対策

      const isDarkNow = document.body.classList.contains("dark");
      localStorage.setItem("theme", isDarkNow ? "light" : "dark");
      applyTheme();
    },
    true // capture で先に拾う
  );
});
