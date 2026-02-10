/* =====================================================
   script.js（置き換え用・完全版）
   ✅ index.html（診断画面）と result.html（結果画面）を分離
   - 診断完了 → sessionStorage に保存 → /result/ へ遷移
   - result.html → sessionStorage を読み込んで結果を描画
   ===================================================== */

/* =========================
   ルーティング/保存キー
========================= */
const ROUTES = {
  index: "/",
  result: "/result/",
  board: "/board/",
};

const STORAGE_KEYS = {
  result: "diagnosisResult",
  myType: "myType",
};

/* =========================
   性格特性バー定義
========================= */
const traitMeta = {
  CS: { left: "安定", right: "挑戦", color: "blue" },
  MF: { left: "自由", right: "マナー", color: "gold" },
  HE: { left: "経済", right: "健康", color: "green" },
  WX: { left: "作業", right: "体験", color: "purple" }
};

function scoreToPercent(score) {
  const max = 30;
  return Math.round(((score + max) / (max * 2)) * 100);
}

/* =========================
   状態
========================= */
let questions = [];
let results = {};
let currentPage = 0;
const PAGE_SIZE = 6;

let questionsLoaded = false;
let resultsLoaded = false;

/* =========================
   DOM取得
========================= */
function $(sel) {
  return document.querySelector(sel);
}
function byId(id) {
  return document.getElementById(id);
}

/* =========================
   重要：テーマ汚染を防ぐ初期化
========================= */
function resetThemeState() {
  if (document.body?.dataset) {
    delete document.body.dataset.group;
    delete document.body.dataset.type;
    delete document.body.dataset.page; // 影響しないけど念のため
  }

  document.body.classList.remove("result-mode");

  document.documentElement.style.removeProperty("--theme-color");
  document.documentElement.style.removeProperty("--theme-bg");
}

/* =========================
   groupObj が取れない場合のフォールバックテーマ
========================= */
const GROUP_THEME_FALLBACK = {
  flexible_eater: { color: "#FF9800", bg: "#2a1a08" },
  strict_eater: { color: "#ef4444", bg: "#2a0a0a" },
  adventurous_eater: { color: "#8b5cf6", bg: "#120a2a" },
  health_conscious: { color: "#22c55e", bg: "#071f14" }
};

/* =========================
   データ読み込み
========================= */
async function loadData() {
  try {
    const [qRes, rRes] = await Promise.all([
      fetch("/static/data/questions.json", { cache: "no-store" }),
      fetch("/static/data/results.json", { cache: "no-store" })
    ]);

    questions = await qRes.json();
    results = await rRes.json();

    questionsLoaded = true;
    resultsLoaded = true;
  } catch (e) {
    console.error("データ読み込み失敗:", e);
    alert("データの読み込みに失敗しました。ページを再読み込みしてください。");
  }
}

/* =========================
   軸判定（中立救済あり）
========================= */
function judgeAxis(score, axisData) {
  if (score >= 4) return axisData.positive.code;
  if (score <= -4) return axisData.negative.code;
  return Math.random() < 0.5 ? axisData.positive.code : axisData.negative.code;
}

/* =========================
   UI: ヘッダー/フッター制御
========================= */
function showHeaderFooter() {
  const header = byId("diagnosis-header");
  const footer = byId("diagnosis-footer");
  if (header) header.style.display = "block";
  if (footer) footer.style.display = "block";
}

function hideHeaderFooter() {
  const header = byId("diagnosis-header");
  const footer = byId("diagnosis-footer");
  if (header) header.style.display = "none";
  if (footer) footer.style.display = "none";
}

function updateHeaderProgress() {
  const questionNumber = byId("question-number");
  const headerProgress = byId("header-progress");
  if (!questionNumber || !headerProgress) return;

  const answered = questions.filter(q => q.selected !== undefined).length;
  const total = questions.length || 1;

  questionNumber.textContent = `質問 ${answered} / ${total}`;
  headerProgress.style.width = `${(answered / total) * 100}%`;
}

/* =========================
   自作進捗バー更新 
========================= */
function updateProgress() {
  const bar = $(".progress-container .progress-bar");
  if (bar) {
    const answered = questions.filter(q => q.selected !== undefined).length;
    const percent = (answered / questions.length) * 100;
    bar.style.width = percent + "%";
  }
  updateHeaderProgress();
}

/* =========================
   質問描画
========================= */
function renderPage() {
  const container = $(".questions-container");
  if (!container) return;
  container.innerHTML = "";

  const start = currentPage * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, questions.length);
  const pageQuestions = questions.slice(start, end);

  pageQuestions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.id = "q" + q.id;

    const questionHTML = document.createElement("h5");
    questionHTML.textContent = q.question;
    card.appendChild(questionHTML);

    const scaleWrapper = document.createElement("div");
    scaleWrapper.className = "scale-wrapper";

    const leftLabel = document.createElement("div");
    leftLabel.className = "scale-label-left";
    leftLabel.textContent = "そう思わない";

    const rightLabel = document.createElement("div");
    rightLabel.className = "scale-label-right";
    rightLabel.textContent = "そう思う";

    scaleWrapper.appendChild(leftLabel);
    scaleWrapper.appendChild(rightLabel);

    for (let j = 1; j <= 7; j++) {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "scale-" + q.id;
      input.id = "q" + q.id + "-s" + j;
      input.value = j - 4;

      const label = document.createElement("label");
      label.className = "scale-circle";
      label.setAttribute("for", input.id);
      label.dataset.pos = j;

      if (j <= 3) label.classList.add("left");
      else if (j === 4) label.classList.add("middle");
      else label.classList.add("right");

      if (q.selected !== undefined && q.selected === parseInt(input.value, 10)) {
        input.checked = true;
      }

      input.addEventListener("change", () => {
        q.selected = parseInt(input.value, 10);
        moveNextFromCurrent(idx);
        updateProgress();
      });

      scaleWrapper.appendChild(input);
      scaleWrapper.appendChild(label);
    }

    card.appendChild(scaleWrapper);
    container.appendChild(card);
  });

  showActiveQuestion(0);
}

/* =========================
   アクティブ質問（ページ内）制御
========================= */
function showActiveQuestion(idx) {
  const cards = document.querySelectorAll(".question-card");
  cards.forEach(c => c.classList.remove("active"));
  if (cards[idx]) {
    cards[idx].classList.add("active");
    cards[idx].scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function getActiveIndexOnPage() {
  const cards = document.querySelectorAll(".question-card");
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].classList.contains("active")) return i;
  }
  return 0;
}

/* =========================
   次へロジック
========================= */
function moveNextFromCurrent(idxOnPage) {
  const pageStart = currentPage * PAGE_SIZE;
  const pageEndIndexGlobal =
    Math.min((currentPage + 1) * PAGE_SIZE, questions.length) - 1;
  const pageEndIdxOnPage = pageEndIndexGlobal - pageStart;

  if (idxOnPage < pageEndIdxOnPage) {
    showActiveQuestion(idxOnPage + 1);
  } else if ((currentPage + 1) * PAGE_SIZE < questions.length) {
    currentPage++;
    renderPage();
  } else {
    const diagnoseBtn = byId("diagnose-btn");
    if (diagnoseBtn) diagnoseBtn.style.display = "block";

    const footer = byId("diagnosis-footer");
    if (footer) footer.style.display = "none";
  }
}

function setupNextButton() {
  const nextBtn = byId("next-btn");
  if (!nextBtn) return;

  nextBtn.addEventListener("click", () => {
    const idx = getActiveIndexOnPage();
    const pageStart = currentPage * PAGE_SIZE;
    const q = questions[pageStart + idx];

    if (!q || q.selected === undefined) {
      alert("この質問に回答してください");
      return;
    }

    moveNextFromCurrent(idx);
    updateProgress();
  });
}

/* =========================
   テーマ反映（グループ分岐）
========================= */
function applyGroupTheme({ typeCode, groupKey, groupObj }) {
  document.body.classList.add("result-mode");

  document.body.dataset.type = typeCode || "";
  if (groupKey) document.body.dataset.group = groupKey;

  const fallback = GROUP_THEME_FALLBACK[groupKey] || null;

  const main = (groupObj?.color || fallback?.color || "#8b5cf6");
  const bg   = (groupObj?.bg    || fallback?.bg    || "#f8fafc");

  // ✅ result.css は --tc を経由してこの色を見る
  document.documentElement.style.setProperty("--theme-color", main);
  document.documentElement.style.setProperty("--theme-bg", bg);
}

/* =========================
   診断集計 → typeCode
========================= */
function computeAxisScores() {
  let axisScores = {};
  for (let axis in results.axes) axisScores[axis] = 0;

  questions.forEach(q => {
    axisScores[q.axis] += q.selected;
  });

  return axisScores;
}

function computeTypeCode(axisScores) {
  let typeCode = "";
  for (let axis in axisScores) {
    typeCode += judgeAxis(axisScores[axis], results.axes[axis]);
  }
  return typeCode;
}

/* =========================
   ✅ index.html：診断実行 → 保存 → resultへ遷移
========================= */
function setupDiagnose() {
  const diagnoseBtn = byId("diagnose-btn");
  if (!diagnoseBtn) return;

  diagnoseBtn.addEventListener("click", async () => {
    if (!questionsLoaded || !resultsLoaded) {
      await loadData();
      if (!questionsLoaded || !resultsLoaded) return;
    }

    const unanswered = questions.filter(q => q.selected === undefined);
    if (unanswered.length > 0) {
      alert("すべての質問に答えてください");
      return;
    }

    const axisScores = computeAxisScores();
    const typeCode = computeTypeCode(axisScores);
    const detail = results?.detail_types?.[typeCode];
    if (!detail) {
      console.error("detail_types に typeCode が見つからない:", typeCode);
      alert("結果データが見つかりませんでした。results.json を確認してください。");
      return;
    }

    sessionStorage.setItem(
      STORAGE_KEYS.result,
      JSON.stringify({
        typeCode,
        axisScores,
        createdAt: Date.now(),
      })
    );

    localStorage.setItem(STORAGE_KEYS.myType, typeCode);

    window.location.href = ROUTES.result;
  });
}

/* =========================
   ✅ result.html：結果描画
========================= */
function renderResultFromStorage() {
  if (!resultsLoaded) return;

  const raw = sessionStorage.getItem(STORAGE_KEYS.result);
  if (!raw) {
    window.location.href = ROUTES.index;
    return;
  }

  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    window.location.href = ROUTES.index;
    return;
  }

  const typeCode = payload?.typeCode;
  const axisScores = payload?.axisScores;

  if (!typeCode || !axisScores) {
    window.location.href = ROUTES.index;
    return;
  }

  const detail = results?.detail_types?.[typeCode];
  if (!detail) {
    console.error("detail_types に typeCode が見つからない:", typeCode);
    alert("結果データが見つかりませんでした。results.json を確認してください。");
    window.location.href = ROUTES.index;
    return;
  }

  const groupKey = detail.group || "";
  const groupObj = results?.groups?.[groupKey] || null;

  // テーマ適用
  resetThemeState();
  applyGroupTheme({ typeCode, groupKey, groupObj });

  // ✅ 透かしを確実に出す
  const wm = byId("result-watermark");
  if (wm) wm.textContent = typeCode;

  // 性格特性バー描画
  const traitContainer = byId("trait-bars");
  if (traitContainer) {
    traitContainer.innerHTML = "";
    for (let axis in axisScores) {
      const percent = scoreToPercent(axisScores[axis]);
      const meta = traitMeta[axis];
      const isRight = percent >= 50;
      const label = isRight ? meta.right : meta.left;

      traitContainer.innerHTML += `
        <div class="trait-bar" style="--p:${percent}">
          <div class="trait-label left">${meta.left}</div>
          <div class="bar-wrapper">
            <div class="bar ${meta.color}">
              <div class="bar-fill" style="width:${percent}%"></div>
              <div class="bar-dot" style="left:${percent}%"></div>
            </div>
            <div class="bar-percent ${meta.color}">${percent}% ${label}</div>
          </div>
          <div class="trait-label right">${meta.right}</div>
        </div>
      `;
    }
  }

  // 向いている食事シーン
  const sceneList = byId("scene-list");
  if (sceneList) {
    sceneList.innerHTML = "";
    (detail.scenes || []).forEach(s => {
      const li = document.createElement("li");
      li.textContent = s;
      sceneList.appendChild(li);
    });
  }

  // ストレス
  const stressList = byId("stress-list");
  if (stressList) {
    stressList.innerHTML = "";
    (detail.stress || []).forEach(s => {
      const li = document.createElement("li");
      li.textContent = s;
      stressList.appendChild(li);
    });
  }

  // あるある（増殖防止）
  const section = $(".personality-section");
  if (section) {
    const oldAruaru = section.querySelector(".aruaru-section");
    if (oldAruaru) oldAruaru.remove();

    if (detail.aruaru && detail.aruaru.length) {
      const aruaruHTML = document.createElement("div");
      aruaruHTML.className = "aruaru-section";
      aruaruHTML.innerHTML = `
        <h3 class="aruaru-title">このタイプのあるある</h3>
        <ul class="aruaru-list">${detail.aruaru.map(i => `<li>${i}</li>`).join("")}</ul>
      `;
      section.appendChild(aruaruHTML);
    }
  }

  // メインカード（ヒーローだけに注入）
  const rc = byId("result-content");
  if (rc) {
    const label = groupObj?.label ?? groupKey ?? "";
    const tags = (detail.aruaru || []).slice(0, 3);

    rc.innerHTML = `
      <div class="result-main-card">
        <div class="main-card-image">
          <img src="${detail.image}" alt="${detail.name}">
        </div>

        <div class="hero-text">
          <h3>${detail.name}</h3>
          <p>${detail.description}</p>

          <div class="hero-badges">
            ${label ? `<span class="group-label">${label}</span>` : ""}
            ${tags.map(t => `<span class="tag-pill">${t}</span>`).join("")}
          </div>
        </div>
      </div>
    `;
  }

  // result-area 表示
  const resultArea = byId("result-area");
  if (resultArea) resultArea.style.display = "block";

  // ✅ CTA：既存があれば使い、なければ作る（重複防止）
  let wrap = resultArea ? resultArea.querySelector(".result-actions-wrap") : null;
  if (!wrap && resultArea) {
    wrap = document.createElement("div");
    wrap.className = "result-actions-wrap d-grid gap-2 mt-4";
    resultArea.appendChild(wrap);
  }
  if (wrap) {
    wrap.classList.add("d-grid", "gap-2", "mt-4");
    wrap.innerHTML = `
      <a class="btn btn-outline-secondary" href="${ROUTES.index}">もう一度診断する</a>
      <a href="${ROUTES.board}" class="btn btn-success">掲示板で自分のタイプを見る</a>
    `;
  }
}

/* =========================
   ✅ index.html：スタート
========================= */
function setupStart() {
  const startBtn = byId("start-btn");
  if (!startBtn) return;

  startBtn.addEventListener("click", async () => {
    resetThemeState();

    if (!questionsLoaded || !resultsLoaded) {
      await loadData();
      if (!questionsLoaded || !resultsLoaded) return;
    }

    const home = byId("home-screen");
    const topImg = byId("top-only-image");
    const qContainer = $(".questions-container");
    const pContainer = $(".progress-container");

    if (home) home.style.display = "none";
    if (topImg) topImg.style.display = "none";
    if (qContainer) qContainer.style.display = "block";
    if (pContainer) pContainer.style.display = "block";

    showHeaderFooter();

    currentPage = 0;
    renderPage();
    updateProgress();
  });
}

/* =========================
   ページ判定
========================= */
function isResultPage() {
  if (document.body?.dataset?.page === "result") return true;

  const hasResultDom = !!byId("result-area") || !!byId("result-content");
  const hasQuestionDom = !!$(".questions-container") || !!byId("start-btn") || !!byId("diagnose-btn");
  return hasResultDom && !hasQuestionDom;
}

/* =========================
   初期化
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  resetThemeState();
  await loadData();

  if (isResultPage()) {
    hideHeaderFooter();
    renderResultFromStorage();
    return;
  }

  setupStart();
  setupNextButton();
  setupDiagnose();
  hideHeaderFooter();
});
