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
   （トップページが変になるのを防止）
========================= */
function resetThemeState() {
  // CSS分岐用属性を消す
  delete document.body.dataset.group;
  delete document.body.dataset.type;

  // 結果専用モードも消す（CSSで result-mode の時だけ装飾する想定）
  document.body.classList.remove("result-mode");

  // もしCSSが --theme-color/--theme-bg を使ってても崩れないように一旦消す
  document.documentElement.style.removeProperty("--theme-color");
  document.documentElement.style.removeProperty("--theme-bg");
}

/* =========================
   （保険）groupObj が取れない場合のフォールバックテーマ
   ※あなたの実データに合わせて自由に調整OK
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
      fetch("/static/data/questions.json"),
      fetch("/static/data/results.json")
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

  questionNumber.textContent = `質問 ${Math.min(answered + 1, total)} / ${total}`;
  headerProgress.style.width = `${(answered / total) * 100}%`;
}

/* =========================
   自作進捗バー更新
========================= */
function updateProgress() {
  // 自作の進捗バー（.progress-container 内）
  const bar = $(".progress-container .progress-bar");
  if (bar) {
    const answered = questions.filter(q => q.selected !== undefined).length;
    const percent = (answered / questions.length) * 100;
    bar.style.width = percent + "%";
  }

  // 上固定ヘッダーの進捗
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

      // すでに回答済みなら復元（戻った時）
      if (q.selected !== undefined && q.selected === parseInt(input.value, 10)) {
        input.checked = true;
      }

      input.addEventListener("change", () => {
        q.selected = parseInt(input.value, 10);

        // クリック回答した時は「次へ」と同じ挙動
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
    Math.min((currentPage + 1) * PAGE_SIZE, questions.length) - 1; // global index
  const pageEndIdxOnPage = pageEndIndexGlobal - pageStart;

  if (idxOnPage < pageEndIdxOnPage) {
    showActiveQuestion(idxOnPage + 1);
  } else if ((currentPage + 1) * PAGE_SIZE < questions.length) {
    currentPage++;
    renderPage();
  } else {
    // 最後まで来た
    const diagnoseBtn = byId("diagnose-btn");
    if (diagnoseBtn) diagnoseBtn.style.display = "block";

    // 最後のページでは次へボタンを隠す（表示したいならこの2行削除でOK）
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

    // 未回答の時は止める
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
  // ✅ 結果表示時だけゴージャスCSSを効かせるため
  document.body.classList.add("result-mode");

  // CSS分岐用（ここが最重要）
  document.body.dataset.type = typeCode || "";
  if (groupKey) document.body.dataset.group = groupKey;

  // groupObj が無い/欠けてる時はフォールバック（壊れないため）
  const fallback = GROUP_THEME_FALLBACK[groupKey] || null;
  const finalColor = groupObj?.color || fallback?.color;
  const finalBg = groupObj?.bg || fallback?.bg;

  if (finalColor) document.documentElement.style.setProperty("--theme-color", finalColor);
  if (finalBg) document.documentElement.style.setProperty("--theme-bg", finalBg);
}

/* =========================
   診断実行
========================= */
function setupDiagnose() {
  const diagnoseBtn = byId("diagnose-btn");
  if (!diagnoseBtn) return;

  diagnoseBtn.addEventListener("click", async () => {
    if (!questionsLoaded || !resultsLoaded) {
      await loadData();
      if (!questionsLoaded || !resultsLoaded) return;
    }

    // 全問回答チェック
    const unanswered = questions.filter(q => q.selected === undefined);
    if (unanswered.length > 0) {
      alert("すべての質問に答えてください");
      return;
    }

    // 集計
    let axisScores = {};
    for (let axis in results.axes) axisScores[axis] = 0;

    questions.forEach(q => {
      axisScores[q.axis] += q.selected;
    });

    // タイプ決定
    let typeCode = "";
    for (let axis in axisScores) {
      typeCode += judgeAxis(axisScores[axis], results.axes[axis]);
    }

    // 画面切替（質問→結果）
    const qContainer = $(".questions-container");
    const pContainer = $(".progress-container");
    if (qContainer) qContainer.style.display = "none";
    if (pContainer) pContainer.style.display = "none";
    diagnoseBtn.style.display = "none";
    hideHeaderFooter();

    // detail / group
    const detail = results?.detail_types?.[typeCode];
    if (!detail) {
      console.error("detail_types に typeCode が見つからない:", typeCode);
      alert("結果データが見つかりませんでした。results.json を確認してください。");
      return;
    }

    // groupKey は「detail.group」に入っているキーをそのまま使う
    // 例: "flexible_eater" / "strict_eater" など
    const groupKey = detail.group || "";
    const groupObj = results?.groups?.[groupKey] || null;

    // テーマ適用（ここで result-mode & dataset が付く）
    applyGroupTheme({ typeCode, groupKey, groupObj });

    // 性格特性バー描画
    const traitContainer = byId("trait-bars");
    if (traitContainer) {
      traitContainer.innerHTML = "";
      for (let axis in axisScores) {
        const percent = scoreToPercent(axisScores[axis]);
        const meta = traitMeta[axis];
        const isRight = percent >= 50;
        const label = isRight ? meta.right : meta.left;

        // ✅ 既存の inline style は維持しつつ、CSS強化用に --p も渡す
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

    // 診断結果表示（メインカード）
    const rc = byId("result-content");
    if (rc) {
      const label = groupObj?.label ?? groupKey ?? "";

      // ✅ board URL をテンプレから受け取れない場合の保険（/board/ で固定してOKならそのまま）
      const boardUrl = "/board/"; // ←必要なら自分のURLに合わせて変えてOK

      rc.innerHTML = `
    <div class="result-wrapper">
      <h2 class="result-title">あなたの食事タイプ</h2>
      <div class="result-code">${typeCode}</div>

      <div class="result-main-card">
        <div class="main-card-image">
          <img src="${detail.image}" alt="${detail.name}">
        </div>
        <div>
          <h3>${detail.name}</h3>
          <p>${detail.description}</p>
          ${label ? `<span class="group-label">${label}</span>` : ""}
        </div>
      </div>
    </div>
  `;
    }

    const resultArea = byId("result-area");
    if (resultArea) resultArea.style.display = "block";

    // myType 保存
    localStorage.setItem("myType", typeCode);

    // ボタン
    // ✅ result-area 最下部にアクションボタンを配置（あるあるの下に来る）
    if (resultArea) {
      // 二重生成防止
      const old = resultArea.querySelector(".result-actions-wrap");
      if (old) old.remove();

      const wrap = document.createElement("div");
      wrap.className = "result-actions-wrap d-grid gap-2 mt-4";

      // 掲示板URLはあなたの実URLに合わせて（/board/でOKならそのまま）
      const boardUrl = "/board/";

      wrap.innerHTML = `
    <button class="btn btn-outline-secondary" id="retry-btn">もう一度診断する</button>
    <a href="${boardUrl}" class="btn btn-success" id="go-board-btn">掲示板で自分のタイプを見る</a>
  `;
      resultArea.appendChild(wrap);

      // retry はここで必ず取れる（生成後）
      const retryBtn = wrap.querySelector("#retry-btn");
      if (retryBtn) retryBtn.onclick = () => window.location.reload();
    }
    // go-board-btn は <a> のhrefを使う（onclick上書きしない）
  });
}

/* =========================
   スタート
========================= */
function setupStart() {
  const startBtn = byId("start-btn");
  if (!startBtn) return;

  startBtn.addEventListener("click", async () => {
    // ✅ 診断開始時は必ず result-mode と data-group を消す
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

    // 上ヘッダー/下フッター表示
    showHeaderFooter();

    currentPage = 0;
    renderPage();
    updateProgress();
  });
}

/* =========================
   初期化
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  // ✅ まずテーマ汚染を消す（トップが変になるのを防止）
  resetThemeState();

  // 先にロードしておく（スタート後が速い）
  await loadData();

  setupStart();
  setupDiagnose();

  // 初期状態ではヘッダー/フッターは隠す
  hideHeaderFooter();
});
