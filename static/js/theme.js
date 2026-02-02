document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
  
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.body.classList.add("dark");
      btn.textContent = "☀️";
    }
  
    btn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
  
      const isDark = document.body.classList.contains("dark");
      btn.textContent = isDark ? "☀️" : "🌙";
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  });
  