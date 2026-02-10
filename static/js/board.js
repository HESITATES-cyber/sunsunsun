// =====================================================
// board.js  (FULL / 上書き用 完全版・クリック死亡対策版)
// - 投稿カードは CSS(grid) 前提：div.post の直下に
//   [icon, header, text, actions] を入れる
// - 時刻は 24時間以内：xx分前/xx時間前, 以降：YYYY/MM/DD
// - 1分ごとに相対時間を更新（.post-time）
// - モーダルは全て class="modal hidden" で統一（投稿/編集/確認）
// - ✅ click が発火しない環境でも、編集/削除/いいねが必ず動く（pointerup採用）
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 設定・定数
  // =========================
  const GROUPS = [
    { label: "赤タイプ", types: ["cfew", "cmhw", "cmew", "cfhw"] },
    { label: "青タイプ", types: ["cfhx", "cmex", "cfex", "cmhx"] },
    { label: "灰タイプ", types: ["sfew", "smew", "sfhw", "smhw"] },
    { label: "紫タイプ", types: ["sfex", "smex", "sfhx", "smhx"] }
  ];
  const API_BASE = "/api";

  // =========================
  // CSRF
  // =========================
  function getCSRFToken() {
    return document.cookie
      .split("; ")
      .find(row => row.startsWith("csrftoken="))
      ?.split("=")[1];
  }
  const csrftoken = getCSRFToken();

  // =========================
  // ユーザー状態
  // =========================
  const myTypeRaw = localStorage.getItem("myType");
  const myType = myTypeRaw ? myTypeRaw.toLowerCase() : null;

  let currentType = null;
  window.currentType = null;

  // posts
  const posts = {};
  window.posts = posts;
  GROUPS.forEach(g => g.types.forEach(t => (posts[t] = [])));

  // =========================
  // DOM
  // =========================
  const typeList = document.getElementById("type-list");
  const postList = document.getElementById("post-list");
  const readonly = document.getElementById("readonly");
  const fab = document.getElementById("fab");

  // 投稿モーダル
  const postModal = document.getElementById("modal");
  const cancelBtn = document.getElementById("cancel-btn");
  const submitBtn = document.getElementById("submit-btn");
  const postText = document.getElementById("post-text");

  // 編集モーダル
  const editModal = document.getElementById("edit-modal");
  const editText = document.getElementById("edit-text");
  const editOk = document.getElementById("edit-ok");
  const editCancel = document.getElementById("edit-cancel");

  // 確認モーダル
  const confirmModal = document.getElementById("confirm-modal");
  const confirmYes = document.getElementById("confirm-yes");
  const confirmNo = document.getElementById("confirm-no");

  // =========================
  // 自分のタイプ表示
  // =========================
  const myTypeCode = document.getElementById("my-type-code");
  if (myTypeCode && myType) myTypeCode.textContent = myType.toUpperCase();

  // =========================
  // Modal helpers
  // =========================
  function openModal(m) {
    if (!m) return;
    m.classList.remove("hidden");
  }
  function closeModal(m) {
    if (!m) return;
    m.classList.add("hidden");
  }

  // 起動時：hidden付け忘れ保険
  closeModal(postModal);
  closeModal(editModal);
  closeModal(confirmModal);

  // 背景クリックで閉じる（投稿）
  if (postModal) {
    postModal.addEventListener("click", (e) => {
      if (e.target === postModal) closeModal(postModal);
    });
  }

  // Escで全部閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(postModal);
      closeModal(editModal);
      closeModal(confirmModal);
    }
  });

  // =========================
  // ✅ click死亡対策：安全なボタンバインド
  // pointerup + click(保険) を貼る / 二重実行ガード付き
  // =========================
  function bindPress(el, handler, opts = {}) {
    if (!el) return;

    const {
      capture = true,
      prevent = true,
      stop = true
    } = opts;

    let last = 0;
    const run = (e) => {
      // 二重実行防止（pointerup→click の連続など）
      const now = Date.now();
      if (now - last < 350) return;
      last = now;

      if (prevent) e.preventDefault();
      if (stop) e.stopPropagation();

      handler(e);
    };

    // まず pointerup（clickが死んでても確実に来る）
    el.addEventListener("pointerup", run, { capture });

    // 念のため click も（環境によっては pointerup が来ないこともある）
    el.addEventListener("click", run, { capture });
  }

  // =========================
  // API helper
  // =========================
  async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
        ...(options.headers || {})
      },
      ...options
    });

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("JSONではないレスポンス:", await res.text());
      alert("ログインが必要です");
      location.href = "/accounts/login/";
      throw new Error("Not JSON response");
    }

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res;
  }

  // =========================
  // Twitter風 時刻表示
  // =========================
  function formatTwitterTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 0) return "たった今";

    if (diffHour < 24) {
      if (diffMin < 1) return "たった今";
      if (diffMin < 60) return `${diffMin}分前`;
      return `${diffHour}時間前`;
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  }

  function getPostCreatedAt(post) {
    return post?.created_at || post?.createdAt || post?.created || post?.time || "";
  }

  // =========================
  // API
  // =========================
  async function loadPosts() {
    try {
      const res = await apiFetch(`${API_BASE}/posts/${currentType}/`);
      posts[currentType] = await res.json();
    } catch (e) {
      console.error("loadPosts error:", e);
      posts[currentType] = [];
    } finally {
      updateFabVisibility();
      renderPosts();
    }
  }

  async function createPost(text) {
    await apiFetch(`${API_BASE}/posts/`, {
      method: "POST",
      body: JSON.stringify({ text, type: currentType })
    });
    await loadPosts();
  }

  async function deletePost(id) {
    const res = await fetch(`${API_BASE}/posts/${id}/`, {
      method: "DELETE",
      headers: { "X-CSRFToken": csrftoken },
      credentials: "include"
    });
    if (!res.ok) throw new Error("削除失敗");
  }

  async function toggleLikePost(post) {
    const res = await apiFetch(`${API_BASE}/posts/${post.id}/like/`, { method: "POST" });
    const data = await res.json();
    post.likes = data.likes;
    post.is_liked = data.liked;
    renderPosts();
  }

  // =========================
  // 編集・確認（投稿モーダルと同デザインで）
  // =========================
  function editAsync(initialText) {
    return new Promise(resolve => {
      if (!editModal || !editText || !editOk || !editCancel) return resolve(null);

      editText.value = initialText;
      openModal(editModal);
      editText.focus();

      const close = (val) => {
        closeModal(editModal);
        resolve(val);
      };

      // 以前のonclickを消してから貼る（積み重なり事故防止）
      editOk.onclick = null;
      editCancel.onclick = null;

      editOk.onclick = () => close(editText.value);
      editCancel.onclick = () => close(null);

      editModal.onclick = (e) => {
        if (e.target === editModal) close(null);
      };
    });
  }

  function confirmAsync() {
    return new Promise(resolve => {
      if (!confirmModal || !confirmYes || !confirmNo) return resolve(false);

      openModal(confirmModal);

      const close = (val) => {
        closeModal(confirmModal);
        resolve(val);
      };

      confirmYes.onclick = null;
      confirmNo.onclick = null;

      confirmYes.onclick = () => close(true);
      confirmNo.onclick = () => close(false);

      confirmModal.onclick = (e) => {
        if (e.target === confirmModal) close(false);
      };
    });
  }

  // =========================
  // UI 初期化
  // =========================
  function initTypeList() {
    if (!typeList) return;

    typeList.innerHTML = "";

    GROUPS.forEach(group => {
      const label = document.createElement("div");
      label.className = "type-group";
      label.textContent = group.label;
      typeList.appendChild(label);

      group.types.forEach(type => {
        const btn = document.createElement("button");
        btn.className = "type-btn";
        btn.dataset.type = type;
        btn.type = "button";
        btn.innerHTML = `
          <img src="/static/img/types/${type}.png" alt="${type}">
          <strong>${type.toUpperCase()}</strong>
        `;
        // タイプボタンも pointerup で安全に
        bindPress(btn, () => switchType(type), { capture: true, prevent: true, stop: true });
        typeList.appendChild(btn);
      });
    });
  }

  function initMyType() {
    const img = document.getElementById("my-type-img");
    const name = document.getElementById("my-type-name");
    const myTypeSection = document.querySelector(".my-type");
    if (!img || !name || !myTypeSection) return;

    const mt = localStorage.getItem("myType");
    if (!mt) {
      myTypeSection.classList.add("empty");
      img.style.display = "none";
      name.textContent = "未診断";
      return;
    }

    const typeCode = mt.toLowerCase();
    if (!window.TYPE_DATA || !TYPE_DATA[typeCode]) {
      myTypeSection.classList.add("empty");
      img.style.display = "none";
      name.textContent = "未診断";
      return;
    }

    const info = TYPE_DATA[typeCode];
    myTypeSection.classList.remove("empty");
    img.style.display = "block";
    img.src = `/static/${info.image}`;
    img.alt = info.name;
    name.textContent = info.name;
  }

  // =========================
  // タイプ切替
  // =========================
  function switchType(type) {
    if (!type) return;

    currentType = type.toLowerCase();
    window.currentType = currentType;

    document.querySelectorAll(".type-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });

    const title = document.getElementById("board-title");
    if (title) title.textContent = `${type.toUpperCase()}タイプの掲示板`;

    // 画面切替時はモーダル類閉じる
    closeModal(postModal);
    closeModal(editModal);
    closeModal(confirmModal);

    loadPosts();
  }

  // =========================
  // ＋ボタン制御
  // =========================
  function updateFabVisibility() {
    if (!fab || !readonly) return;
    const isMyBoard = currentType === myType;
    fab.classList.toggle("hidden", !isMyBoard);
    readonly.classList.toggle("hidden", isMyBoard);
  }

  // =========================
  // 投稿描画
  // =========================
  function renderPosts() {
    if (!postList) return;

    postList.innerHTML = "";
    const list = posts[currentType] || [];

    if (list.length === 0) {
      postList.innerHTML = `
        <div style="text-align:center;color:#888;">
          まだ投稿がありません 🚀
        </div>`;
      return;
    }

    list.forEach(post => {
      const div = document.createElement("div");
      div.className = "post";
      if (post.is_mine) div.classList.add("my-post");

      const icon = document.createElement("img");
      icon.className = "post-icon";
      icon.src = post.user?.icon || "/static/img/default.png";
      icon.alt = "icon";

      const header = document.createElement("div");
      header.className = "post-header";

      const name = document.createElement("span");
      name.className = "post-name";
      name.textContent =
        post.user?.nickname ||
        post.user?.first_name ||
        post.user?.username ||
        "名無し";

      const createdAt = getPostCreatedAt(post);

      const time = document.createElement("span");
      time.className = "post-time";
      time.dataset.createdAt = createdAt;
      time.textContent = formatTwitterTime(createdAt);

      header.append(name, time);

      const text = document.createElement("div");
      text.className = "post-text";
      text.textContent = post.text;

      const actions = document.createElement("div");
      actions.className = "post-actions";
      actions.innerHTML = `
        <button class="like-btn" type="button">❤️ ${post.likes || 0}</button>
        ${
          post.is_mine
            ? `<button class="edit-btn" type="button">✏</button>
               <button class="delete-btn" type="button">🗑</button>`
            : ""
        }
      `;

      div.append(icon, header, text, actions);

      // いいね（✅ pointerupで確実に）
      const likeBtn = div.querySelector(".like-btn");
      if (likeBtn) {
        if (post.is_liked) likeBtn.classList.add("liked");
        bindPress(likeBtn, () => toggleLikePost(post));
      }

      // 編集・削除（✅ pointerupで確実に）
      if (post.is_mine) {
        const editBtn = div.querySelector(".edit-btn");
        const deleteBtn = div.querySelector(".delete-btn");

        bindPress(editBtn, async () => {
          const newText = await editAsync(post.text);
          if (newText === null) return;

          try {
            const res = await apiFetch(`${API_BASE}/posts/${post.id}/`, {
              method: "PUT",
              body: JSON.stringify({ text: newText })
            });
            const data = await res.json();
            post.text = data.text;
            renderPosts();
          } catch (e) {
            alert("編集に失敗しました");
            console.error(e);
          }
        });

        bindPress(deleteBtn, async () => {
          const ok = await confirmAsync();
          if (!ok) return;

          try {
            await deletePost(post.id);
            posts[currentType] = posts[currentType].filter(p => p.id !== post.id);
            renderPosts();
          } catch (e) {
            alert("削除に失敗しました");
            console.error(e);
          }
        });
      }

      postList.appendChild(div);
    });
  }

  // 1分ごとに相対時間更新
  setInterval(() => {
    document.querySelectorAll(".post-time[data-created-at]").forEach(el => {
      el.textContent = formatTwitterTime(el.dataset.createdAt);
    });
  }, 60 * 1000);

  // =========================
  // 投稿モーダル
  // =========================
  if (fab) {
    // ✅ fab も pointerup で安全に
    bindPress(fab, () => {
      if (currentType !== myType) {
        alert("自分のタイプの掲示板でのみ投稿できます");
        return;
      }
      openModal(postModal);
      if (postText) postText.focus();
    });
  }

  if (cancelBtn) {
    bindPress(cancelBtn, () => closeModal(postModal));
  }

  // 入力が空なら投稿ボタンを無効化（UX）
  const syncSubmitState = () => {
    if (!submitBtn || !postText) return;
    submitBtn.disabled = !postText.value.trim();
  };
  if (postText) {
    postText.addEventListener("input", syncSubmitState);
    syncSubmitState();
  }

  if (submitBtn) {
    bindPress(submitBtn, async () => {
      const text = (postText?.value || "").trim();
      if (!text) return;

      try {
        submitBtn.disabled = true;
        await createPost(text);
        if (postText) postText.value = "";
        closeModal(postModal);
      } catch (e) {
        console.error(e);
        alert("投稿に失敗しました");
      } finally {
        syncSubmitState();
      }
    });
  }

  // =========================
  // 初期化
  // =========================
  initTypeList();
  initMyType();
  if (myType) switchType(myType);
  else switchType("cfex");
});
