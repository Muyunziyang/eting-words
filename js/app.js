/* ===== 应用入口：路由 / 导航 / 初始化 ===== */
(function () {
  "use strict";
  var NAV = [
    { id: "library", ic: "📚", label: "词库" },
    { id: "study", ic: "📖", label: "学习" },
    { id: "dictation", ic: "🎧", label: "听写" },
    { id: "fill", ic: "✏️", label: "填空" },
    { id: "more", ic: "☰", label: "更多" },
  ];
  var DRAWER = [
    { id: "wrong", ic: "🗒️", label: "错题本" },
    { id: "fav", ic: "⭐", label: "收藏" },
    { id: "stats", ic: "📊", label: "统计" },
    { id: "settings", ic: "⚙️", label: "设置" },
    { id: "io", ic: "🔄", label: "导入 / 导出" },
    { id: "help", ic: "❓", label: "帮助" },
  ];
  var current = "library";

  function buildNav() {
    var nav = document.getElementById("nav");
    NAV.forEach(function (n) {
      var b = document.createElement("button"); b.className = "nav-btn"; b.dataset.id = n.id;
      b.innerHTML = '<span class="ic">' + n.ic + "</span><span>" + n.label + "</span>";
      b.onclick = function () { if (n.id === "more") openDrawer(); else navigate(n.id); };
      nav.appendChild(b);
    });
  }
  function buildDrawer() {
    var menu = document.getElementById("drawerMenu");
    DRAWER.forEach(function (d) {
      var m = document.createElement("div"); m.className = "mi"; m.dataset.id = d.id;
      m.innerHTML = '<span class="ic">' + d.ic + "</span><span>" + d.label + "</span>";
      m.onclick = function () { closeDrawer(); setTimeout(function () { navigate(d.id); }, 180); };
      menu.appendChild(m);
    });
  }
  function openDrawer() { document.getElementById("drawer").classList.add("open"); document.getElementById("scrim").style.display = "block"; }
  function closeDrawer() { document.getElementById("drawer").classList.remove("open"); document.getElementById("scrim").style.display = "none"; }

  function navigate(page) {
    if (!Pages[page]) return;
    try { UI.clearTimers(); } catch (e) {}
    current = page;
    // 更新底部导航高亮（more 不单独高亮）
    Array.prototype.forEach.call(document.querySelectorAll("#nav .nav-btn"), function (b) {
      b.classList.toggle("active", b.dataset.id === page);
    });
    try { Pages[page](); Pages.after(page); } catch (e) { console.error(e); }
    try { document.getElementById("view").scrollTop = 0; } catch (e) {}
  }

  function init() {
    buildNav(); buildDrawer();
    document.getElementById("scrim").onclick = closeDrawer;
    document.getElementById("drawerClose").onclick = closeDrawer;
    document.getElementById("navMore2") && (document.getElementById("navMore2").onclick = openDrawer);
    // 应用主题
    var nm = THEME.current(); THEME.apply(nm);
    document.documentElement.style.setProperty("--fs", (Store.settings().font_size || 16) + "px");
    navigate("library");
    // 注册 Service Worker（仅 https 或 localhost 生效；file:// 下静默失败不影响使用）
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function (e) { console.warn("SW 注册失败：", e); });
      });
    }
  }
  window.App = { navigate: navigate };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
