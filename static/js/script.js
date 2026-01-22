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
  
  let questions = [];
  let results = {};
  let currentPage = 0;
  const PAGE_SIZE = 6;
  
  /* =========================
     データ読み込み
  ========================= */
  fetch("/static/data/questions.json")
    .then(res => res.json())
    .then(data => { questions = data; });
  
  fetch("/static/data/results.json")
    .then(res => res.json())
    .then(data => { results = data; });
  
  /* =========================
     軸判定（中立救済あり）
  ========================= */
  function judgeAxis(score, axisData) {
    if (score >= 4) return axisData.positive.code;
    if (score <= -4) return axisData.negative.code;
    return Math.random() < 0.5 ? axisData.positive.code : axisData.negative.code;
  }
  
  /* =========================
     スタート
  ========================= */
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('top-only-image').style.display = 'none';
    document.querySelector('.questions-container').style.display = 'block';
    document.querySelector('.progress-container').style.display = 'block';
    renderPage();
    updateProgress();
  });
  
  /* =========================
     質問描画
  ========================= */
  function renderPage() {
    const container = document.querySelector('.questions-container');
    container.innerHTML = '';
  
    const start = currentPage * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, questions.length);
    const pageQuestions = questions.slice(start, end);
  
    pageQuestions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'question-card';
      card.id = 'q' + q.id;
  
      const questionHTML = document.createElement('h5');
      questionHTML.textContent = q.question;
      card.appendChild(questionHTML);
  
      const scaleWrapper = document.createElement('div');
      scaleWrapper.className = 'scale-wrapper';
  
      const leftLabel = document.createElement('div');
      leftLabel.className = 'scale-label-left';
      leftLabel.textContent = 'そう思わない';
  
      const rightLabel = document.createElement('div');
      rightLabel.className = 'scale-label-right';
      rightLabel.textContent = 'そう思う';
  
      scaleWrapper.appendChild(leftLabel);
      scaleWrapper.appendChild(rightLabel);
  
      for (let j = 1; j <= 7; j++) {
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'scale-' + q.id;
        input.id = 'q' + q.id + '-s' + j;
        input.value = j - 4;
  
        const label = document.createElement('label');
        label.className = 'scale-circle';
        label.setAttribute('for', input.id);
        label.dataset.pos = j;
  
        if (j <= 3) label.classList.add('left');
        else if (j === 4) label.classList.add('middle');
        else label.classList.add('right');
  
        input.addEventListener('change', () => {
          q.selected = parseInt(input.value);
          nextQuestion(idx);
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
  
  function showActiveQuestion(idx) {
    const cards = document.querySelectorAll('.question-card');
    cards.forEach(c => c.classList.remove('active'));
    if (cards[idx]) {
      cards[idx].classList.add('active');
      cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  function nextQuestion(idx) {
    const pageEnd = Math.min((currentPage + 1) * PAGE_SIZE, questions.length) - 1;
  
    if (idx < pageEnd % PAGE_SIZE) {
      showActiveQuestion(idx + 1);
    } else if ((currentPage + 1) * PAGE_SIZE < questions.length) {
      currentPage++;
      renderPage();
    } else {
      document.getElementById('diagnose-btn').style.display = 'block';
    }
  }
  
  function updateProgress() {
    const answered = questions.filter(q => q.selected !== undefined).length;
    const percent = (answered / questions.length) * 100;
    document.querySelector('.progress-bar').style.width = percent + '%';
  }
  
  /* =========================
     診断実行
  ========================= */
  document.getElementById('diagnose-btn').addEventListener('click', () => {
    // ✅ 全問回答チェック
    const unanswered = questions.filter(q => q.selected === undefined);
    if (unanswered.length > 0) {
      alert("すべての質問に答えてください");
      return;
  }
    let axisScores = {};
    for (let axis in results.axes) axisScores[axis] = 0;
  
    questions.forEach(q => {
      if (q.selected !== undefined) axisScores[q.axis] += q.selected;
    });
  
    let typeCode = '';
    for (let axis in axisScores) typeCode += judgeAxis(axisScores[axis], results.axes[axis]);
  
    document.querySelector('.questions-container').style.display = 'none';
    document.getElementById('diagnose-btn').style.display = 'none';
    document.querySelector('.progress-container').style.display = 'none';
  
    const detail = results.detail_types[typeCode];
    const group = results.groups[detail.group];
  
    let themeColor = group.color;
    let themeBg = group.bg;
  
    document.documentElement.style.setProperty('--theme-color', themeColor);
    document.documentElement.style.setProperty('--theme-bg', themeBg);
  
    const traitContainer = document.getElementById("trait-bars");
    traitContainer.innerHTML = "";
  
    // 性格特性バー描画
    for (let axis in axisScores) {
      const percent = scoreToPercent(axisScores[axis]);
      const meta = traitMeta[axis];
      const isRight = percent >= 50;
      const label = isRight ? meta.right : meta.left;
  
      traitContainer.innerHTML += `
        <div class="trait-bar">
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
  
    // 向いている食事シーン
    const sceneList = document.getElementById("scene-list");
    sceneList.innerHTML = "";
    if (detail.scenes) detail.scenes.forEach(s => {
      const li = document.createElement("li");
      li.textContent = s;
      sceneList.appendChild(li);
    });
  
    // ストレス
    const stressList = document.getElementById("stress-list");
    stressList.innerHTML = "";
    if (detail.stress) detail.stress.forEach(s => {
      const li = document.createElement("li");
      li.textContent = s;
      stressList.appendChild(li);
    });
  
    // あるある表示
    if (detail.aruaru) {
      const section = document.querySelector(".personality-section");
      const aruaruHTML = document.createElement("div");
      aruaruHTML.className = "aruaru-section";
      aruaruHTML.innerHTML = `
        <h3 class="aruaru-title">このタイプのあるある</h3>
        <ul class="aruaru-list">${detail.aruaru.map(i => `<li>${i}</li>`).join("")}</ul>
      `;
      section.appendChild(aruaruHTML);
    }
  
    // 診断結果表示
    const rc = document.getElementById('result-content');
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
            <span class="group-label">${group.label}</span>
          </div>
        </div>
      </div>
    `;
  
    document.getElementById('result-area').style.display = 'block';
  
    // myType 保存
    localStorage.setItem("myType", typeCode);
  
    // ボタン
    document.getElementById("retry-btn").onclick = () => window.location.reload();
    document.getElementById("go-board-btn").onclick = () => window.location.href = "/";
  });
  