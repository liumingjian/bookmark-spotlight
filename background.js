// Service worker：负责快捷键、读取书签、打开新标签页。
// Content script 拿不到 chrome.bookmarks / chrome.tabs，全部经此中转。

// 快捷键触发：通知当前标签页的 content script 切换浮层。
// 受限页面（chrome://、商店、PDF 等）没有 content script，sendMessage 会报
// "no receiving end"，这里吞掉错误即可——即设计上的静默失败。
chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-search") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || tab.id == null) return;
    chrome.tabs.sendMessage(tab.id, { type: "toggle" }, () => {
      void chrome.runtime.lastError; // 静默失败
    });
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "getBookmarks") {
    // 每次打开浮层时实时读取全量，无缓存。
    chrome.bookmarks.getTree((tree) => {
      sendResponse({ bookmarks: flatten(tree) });
    });
    return true; // 异步响应
  }
  if (msg.type === "open" && msg.url) {
    chrome.tabs.create({ url: msg.url }); // 新标签页前台打开
  }
});

// 把书签树扁平化为 { title, url } 列表，保留树的原始顺序。
function flatten(nodes, out = []) {
  for (const n of nodes) {
    if (n.url) out.push({ title: n.title || n.url, url: n.url });
    if (n.children) flatten(n.children, out);
  }
  return out;
}
