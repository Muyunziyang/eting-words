/* ===== 主题（与桌面版 8 套配色一致） ===== */
(function (global) {
  "use strict";
  var THEMES = {
    "晴空蓝": { bg:"#F2F6FC", bg2:"#FFFFFF", bg3:"#EAF1FA", fg:"#16233A", fg2:"#5A6B85", fg3:"#93A2B8",
      accent:"#2E7CF6", accent_fg:"#FFFFFF", border:"#D7E2F0", hover:"#E1EBF9", sel:"#2E7CF6", sel_fg:"#FFFFFF",
      ok:"#1E9E62", warn:"#D98A00", err:"#DC3B3B", side_bg:"#FFFFFF", side_fg:"#3C4C66", side_act:"#E8F0FE", side_act_fg:"#2E7CF6", title_bg:"#2E7CF6" },
    "森林绿": { bg:"#F3F8F3", bg2:"#FFFFFF", bg3:"#E9F3E9", fg:"#1C2B1E", fg2:"#5B7060", fg3:"#93A697",
      accent:"#2E9450", accent_fg:"#FFFFFF", border:"#D5E5D7", hover:"#E2F0E4", sel:"#2E9450", sel_fg:"#FFFFFF",
      ok:"#2E9450", warn:"#C98A16", err:"#C8443C", side_bg:"#FFFFFF", side_fg:"#3D5342", side_act:"#E4F2E6", side_act_fg:"#237A3E", title_bg:"#2E9450" },
    "暖阳橙": { bg:"#FFF8F1", bg2:"#FFFFFF", bg3:"#FDEEDF", fg:"#3A2A18", fg2:"#7A6449", fg3:"#B09B80",
      accent:"#E8792B", accent_fg:"#FFFFFF", border:"#F3DFC9", hover:"#FBEAD9", sel:"#E8792B", sel_fg:"#FFFFFF",
      ok:"#2E9450", warn:"#D98A00", err:"#D0402F", side_bg:"#FFFFFF", side_fg:"#5A4630", side_act:"#FCEEE1", side_act_fg:"#C4631C", title_bg:"#E8792B" },
    "樱花粉": { bg:"#FFF5F8", bg2:"#FFFFFF", bg3:"#FCE9F0", fg:"#3A2230", fg2:"#7D5C6C", fg3:"#B396A3",
      accent:"#E0559A", accent_fg:"#FFFFFF", border:"#F5D9E5", hover:"#FBE4EE", sel:"#E0559A", sel_fg:"#FFFFFF",
      ok:"#2E9450", warn:"#D98A00", err:"#D0402F", side_bg:"#FFFFFF", side_fg:"#5C3E4E", side_act:"#FCE7F0", side_act_fg:"#C33F82", title_bg:"#E0559A" },
    "护眼豆沙": { bg:"#F4F1E8", bg2:"#FBF9F2", bg3:"#EDE7D8", fg:"#2C2A22", fg2:"#66604E", fg3:"#9C947E",
      accent:"#6E8B5A", accent_fg:"#FFFFFF", border:"#DED7C4", hover:"#E9E3D2", sel:"#6E8B5A", sel_fg:"#FFFFFF",
      ok:"#4F7A3F", warn:"#B8860B", err:"#B5483A", side_bg:"#FBF9F2", side_fg:"#4A4536", side_act:"#E7E0CC", side_act_fg:"#4F7A3F", title_bg:"#6E8B5A" },
    "极简灰": { bg:"#F6F7F9", bg2:"#FFFFFF", bg3:"#EDEFF3", fg:"#1F2328", fg2:"#5C6672", fg3:"#949DA8",
      accent:"#3D4451", accent_fg:"#FFFFFF", border:"#E1E4E9", hover:"#E8EAEF", sel:"#3D4451", sel_fg:"#FFFFFF",
      ok:"#2E8B57", warn:"#C08A18", err:"#C0392B", side_bg:"#FFFFFF", side_fg:"#3E4652", side_act:"#E9EBF0", side_act_fg:"#232830", title_bg:"#3D4451" },
    "暗夜黑": { bg:"#161A20", bg2:"#1F242C", bg3:"#272D37", fg:"#E9EEF5", fg2:"#A2AEBD", fg3:"#6D7886",
      accent:"#4F9CFF", accent_fg:"#0C1016", border:"#333B46", hover:"#2C333E", sel:"#2A4A78", sel_fg:"#EAF2FF",
      ok:"#4ED08B", warn:"#F0B429", err:"#FF6B6B", side_bg:"#1A1F26", side_fg:"#B6C1CF", side_act:"#262E3A", side_act_fg:"#6FB2FF", title_bg:"#1F242C" },
    "深海蓝": { bg:"#0E1B2A", bg2:"#152838", bg3:"#1D3446", fg:"#E3EFFA", fg2:"#9DB6CC", fg3:"#6A88A3",
      accent:"#37B6E9", accent_fg:"#04202F", border:"#26465D", hover:"#1C3A54", sel:"#1D5C7D", sel_fg:"#E6F7FF",
      ok:"#4DD39A", warn:"#EFB84A", err:"#FF7A7A", side_bg:"#122234", side_fg:"#A9C3D8", side_act:"#1B3549", side_act_fg:"#5CCBF0", title_bg:"#122234" },
  };
  var ORDER = ["晴空蓝","森林绿","暖阳橙","樱花粉","护眼豆沙","极简灰","暗夜黑","深海蓝"];

  function apply(name) {
    var t = THEMES[name] || THEMES["晴空蓝"];
    var root = document.documentElement;
    for (var k in t) root.style.setProperty("--" + k.replace(/_/g, "-"), t[k]);
    try { localStorage.setItem("eting_theme_name", name); } catch (e) {}
  }
  window.THEME = {
    list: function () { return ORDER.slice(); },
    get: function (n) { return THEMES[n]; },
    apply: apply,
    current: function () {
      try { return localStorage.getItem("eting_theme_name") || "晴空蓝"; } catch (e) { return "晴空蓝"; }
    },
  };
})(window);
