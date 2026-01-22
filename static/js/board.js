// =====================================================
// board.js 完全版（＋ボタンが絶対に消えない最終安定版）
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    // =========================
    // 設定・定数
    // =========================
    const GROUPS = [
      { label: "赤タイプ", types: ["cfew","cmhw","cmew","cfhw"] },
      { label: "青タイプ", types: ["cfhx","cmex","cfex","cmhx"] },
      { label: "灰タイプ", types: ["sfew","smew","sfhw","smhw"] },
      { label: "紫タイプ", types: ["sfex","smex","sfhx","smhx"] }
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
  
    // =========================
    // データ
    // =========================
    const posts = {};
    GROUPS.forEach(g => g.types.forEach(t => posts[t] = []));
  
    // =========================
    // DOM（★ここで必ず取得できる）
    // =========================
    const typeList   = document.getElementById("type-list");
    const postList   = document.getElementById("post-list");
    const readonly   = document.getElementById("readonly");
    const fab        = document.getElementById("fab");
    const modal      = document.getElementById("modal");
    const cancelBtn  = document.getElementById("cancel-btn");
    const submitBtn  = document.getElementById("submit-btn");
    const postText   = document.getElementById("post-text");
  
    // =========================
    // 初期化
    // =========================
    initTypeList();
    initMyType();
    if (myType) {
      switchType(myType);
    } else {
      // 未診断時の初期表示（何もしない or デフォルト）
      document.getElementById("board-title").textContent =
        "タイプを選択してください";
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
      
      // 🔴 HTML が返ってきたらログイン画面
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("JSONではないレスポンス:", await res.text());
        alert("ログインが必要です");
        location.href = "/accounts/login/";
        throw new Error("Not JSON response");
      }
    
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
    
      return res;
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
        updateFabVisibility(); // 失敗しても必ず呼ばれる
        renderPosts();
      }
    }
  
    async function createPost(text) {
      const res = await apiFetch(`${API_BASE}/posts/`, {
        method: "POST",
        body: JSON.stringify({ text, type: currentType })
      });
      if (!res.ok) return alert("投稿失敗");
      await loadPosts();
    }
  
    async function updatePost(post) {
      await apiFetch(`${API_BASE}/posts/${post.id}/`, {
        method: "PUT",
        body: JSON.stringify({ text: post.text })
      });
      await loadPosts();
    }
  
    async function deletePost(id) {
      await apiFetch(`${API_BASE}/posts/${id}/`, { method: "DELETE" });
      await loadPosts(); // ← これを追加
    }
    
  
    async function toggleLikePost(post) {
      const res = await apiFetch(`${API_BASE}/posts/${post.id}/like/`, { method: "POST" });
      const data = await res.json();
      post.likes = data.likes;
      post.is_liked = data.liked;
      renderPosts();
    }
  
    // =========================
    // UI 初期化
    // =========================
    function initTypeList() {
      GROUPS.forEach(group => {
        const label = document.createElement("div");
        label.className = "type-group";
        label.textContent = group.label;
        typeList.appendChild(label);
  
        group.types.forEach(type => {
          const btn = document.createElement("button");
          btn.className = "type-btn";
          btn.dataset.type = type;
          btn.innerHTML = `
            <img src="/static/img/types/${type}.png">
            <strong>${type.toUpperCase()}</strong>
          `;
          btn.onclick = () => switchType(type);
          typeList.appendChild(btn);
        });
      });
    }
  
    function initMyType() {
     // =========================
  // DOM が存在しないページでは何もしない
  // =========================
  const img = document.getElementById("my-type-img");
  const name = document.getElementById("my-type-name");
  const myTypeSection = document.querySelector(".my-type");

  if (!img || !name || !myTypeSection) {
    return;
  }

  // =========================
  // 診断結果取得（未診断は null）
  // =========================
  const myType = localStorage.getItem("myType");

  // =========================
  // 未診断・未ログイン時の表示
  // =========================
  if (!myType) {
    myTypeSection.classList.add("empty");
    img.style.display = "none";
    name.textContent = "未診断";
    return;
  }

  const typeCode = myType.toLowerCase();

  // =========================
  // タイプ情報取得
  // =========================
  if (!window.TYPE_DATA || !TYPE_DATA[typeCode]) {
    console.warn("タイプデータが見つかりません:", typeCode);
    myTypeSection.classList.add("empty");
    img.style.display = "none";
    name.textContent = "未診断";
    return;
  }

  const info = TYPE_DATA[typeCode];

  // =========================
  // 表示反映
  // =========================
  myTypeSection.classList.remove("empty");

  img.style.display = "block";
  img.src = `/static/${info.image}`;
  img.alt = info.name;

  name.textContent = info.name;

    }
  
    // =========================
    // タイプ切替（唯一の入口）
    // =========================  
    function switchType(type) {
      if (!type) return; // ← これ重要
      currentType = type.toLowerCase();
  
      document.querySelectorAll(".type-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.type === type);
      });
  
      document.getElementById("board-title").textContent =
        `${type.toUpperCase()}タイプの掲示板`;  
  
      loadPosts();
    }
  
    // =========================
    // ＋ボタン制御（完全安定）
    // =========================
    function updateFabVisibility() {
      const isMyBoard = currentType === myType;
      fab.classList.toggle("hidden", !isMyBoard);
      readonly.classList.toggle("hidden", isMyBoard);
      fab.style.display = isMyBoard ? "block" : "none";
    }
  
    // =========================
    // 投稿描画
    // =========================
    function renderPosts() {
      postList.innerHTML = "";
      const list = posts[currentType] || [];
  
      if (list.length === 0) {
        postList.innerHTML =
          `<div class="post" style="text-align:center;color:#888;">
            まだ投稿がありません 🚀
          </div>`;
        return;
      }
  
      list.forEach(post => {
        const div = document.createElement("div");
        div.className = "post";
        if (post.is_mine) div.classList.add("my-post");
        div.innerHTML = `
          <div class="post-meta">
            <span class="nickname">${post.user.nickname}</span>
            <span class="time">${post.time}</span>
          </div>
          <div class="post-text">${post.text}</div>
          <div class="post-actions">
            <button class="like-btn">❤️ ${post.likes || 0}</button>
            ${post.is_mine ? `<button class="edit-btn">✏</button><button class="delete-btn">🗑</button>` : ""}
          </div>
        `;
  
        if (post.is_mine) {
          // 編集ボタン
          div.querySelector(".edit-btn").onclick = async () => {
            const t = prompt("編集", post.text);
            if (t === null) return; // キャンセル時は return
            post.text = t;
            try {
              const res = await fetch(`${API_BASE}/posts/${post.id}/`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "X-CSRFToken": csrftoken
                },
                body: JSON.stringify({ text: post.text })
              });
              if (!res.ok) throw new Error("更新失敗");
              await loadPosts();
            } catch (e) {
              alert("編集できませんでした");
              console.error(e);
            }
          };
        
          // 削除ボタン
          div.querySelector(".delete-btn").onclick = async () => {
            if (confirm("削除しますか？")) await deletePost(post.id);
          };
        }
        
  
        const likeBtn = div.querySelector(".like-btn");
        if (post.is_liked) likeBtn.classList.add("liked");
        likeBtn.onclick = () => toggleLikePost(post);
  
        postList.appendChild(div);
      });
    }
  
    // =========================
    // 投稿モーダル
    // =========================
    fab.onclick = () => {
      if (currentType !== myType) {
        alert("自分のタイプの掲示板でのみ投稿できます");
        return;
      }
      modal.classList.remove("hidden");
    };

    cancelBtn.onclick = () => modal.classList.add("hidden");
  
    submitBtn.onclick = async () => {
      const text = postText.value.trim();
      if (!text) return;
      await createPost(text);
      postText.value = "";
      modal.classList.add("hidden");
    };
  
    modal.onclick = e => {
      if (e.target === modal) modal.classList.add("hidden");
    };
  
  });
  
  // =========================
// ＋ボタンを最前面に固定（CSSを変えない最終手段）
// =========================
//document.body.appendChild(fab);

//テスト用のコメント