// 注入页面的搜索浮层。状态只有三样：query、results、selectedIndex。
// 样式用 Shadow DOM 隔离，避免和宿主页面互相污染。
(() => {
  const MAX_RESULTS = 50;
  let host = null; // 浮层宿主元素
  let shadow = null;
  let inputEl = null;
  let listEl = null;
  let bookmarks = []; // 当前会话的全量书签
  let results = [];
  let selected = 0;

  function isOpen() {
    return host !== null;
  }

  function toggle() {
    if (isOpen()) {
      close();
    } else {
      open();
    }
  }

  function open() {
    chrome.runtime.sendMessage({ type: "getBookmarks" }, (resp) => {
      if (chrome.runtime.lastError || !resp) return;
      bookmarks = resp.bookmarks || [];
      mount();
    });
  }

  function mount() {
    host = document.createElement("div");
    host.style.cssText =
      "all:initial;position:fixed;inset:0;z-index:2147483647;";
    shadow = host.attachShadow({ mode: "open" });
    // Spotlight 经典风：浅色毛玻璃、大输入框、整行结果、URL 右对齐灰字。
    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box;}
        .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.28);
          display:flex;justify-content:center;align-items:flex-start;
          font:14px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",
          "Segoe UI",sans-serif;}
        .panel{margin-top:14vh;width:660px;max-width:92vw;border-radius:16px;
          overflow:hidden;background:rgba(245,245,247,.82);
          -webkit-backdrop-filter:blur(40px) saturate(180%);
          backdrop-filter:blur(40px) saturate(180%);
          box-shadow:0 24px 60px rgba(0,0,0,.35),
            inset 0 0 0 .5px rgba(255,255,255,.6);}
        .search{display:flex;align-items:center;gap:12px;padding:18px 22px;
          border-bottom:.5px solid rgba(0,0,0,.1);}
        .search svg{width:22px;height:22px;fill:#8a8a8e;flex:0 0 auto;}
        input{flex:1;border:0;background:transparent;outline:0;
          font-size:22px;color:#1d1d1f;}
        ul{list-style:none;margin:0;padding:6px;max-height:50vh;
          overflow-y:auto;}
        li{display:flex;align-items:baseline;gap:12px;padding:9px 16px;
          border-radius:9px;cursor:pointer;}
        li.sel{background:#0a84ff;}
        li.sel .title,li.sel .url{color:#fff;}
        .title{color:#1d1d1f;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;}
        .url{margin-left:auto;color:#8a8a8e;font-size:12px;max-width:45%;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      </style>
      <div class="backdrop">
        <div class="panel">
          <div class="search">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>
            <input type="text" placeholder="搜索书签…" />
          </div>
          <ul></ul>
        </div>
      </div>`;
    document.documentElement.appendChild(host);

    inputEl = shadow.querySelector("input");
    listEl = shadow.querySelector("ul");

    inputEl.addEventListener("input", () => {
      search(inputEl.value);
    });
    // 在浮层内拦截按键，避免宿主页面快捷键干扰。
    shadow.addEventListener("keydown", onKeydown, true);
    shadow.querySelector(".backdrop").addEventListener("mousedown", (e) => {
      if (e.target === e.currentTarget) close(); // 点击浮层外部关闭
    });

    search("");
    inputEl.focus();
  }

  function close() {
    if (host) host.remove();
    host = shadow = inputEl = listEl = null;
    results = [];
    selected = 0;
  }

  // 子串匹配 + 排序：标题命中 > URL-only 命中；同组按命中位置升序；
  // 并列由 filter 保留的书签原始顺序兜底（稳定排序）。
  function search(query) {
    const q = query.trim().toLowerCase();
    if (q === "") {
      results = []; // 空输入：浮层空白
      selected = 0;
      render();
      return;
    }
    const scored = [];
    for (const b of bookmarks) {
      const ti = b.title.toLowerCase().indexOf(q);
      if (ti !== -1) {
        scored.push({ b, group: 0, pos: ti });
        continue;
      }
      const ui = b.url.toLowerCase().indexOf(q);
      if (ui !== -1) {
        scored.push({ b, group: 1, pos: ui });
      }
    }
    scored.sort((a, c) => a.group - c.group || a.pos - c.pos);
    results = scored.slice(0, MAX_RESULTS).map((s) => s.b);
    selected = 0;
    render();
  }

  function render() {
    listEl.innerHTML = "";
    results.forEach((b, i) => {
      const li = document.createElement("li");
      if (i === selected) li.className = "sel";
      const t = document.createElement("div");
      t.className = "title";
      t.textContent = b.title;
      const u = document.createElement("div");
      u.className = "url";
      u.textContent = b.url;
      li.append(t, u);
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        openUrl(b.url);
      });
      listEl.appendChild(li);
    });
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selected]) openUrl(results[selected].url);
    }
  }

  function move(delta) {
    if (results.length === 0) return;
    selected = (selected + delta + results.length) % results.length;
    render();
    const el = listEl.children[selected];
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function openUrl(url) {
    chrome.runtime.sendMessage({ type: "open", url });
    close(); // 打开后自动关闭
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "toggle") toggle();
  });
})();
