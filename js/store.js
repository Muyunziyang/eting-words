/* ===== 本地存储：设置 / 错题本 / 收藏 / 统计 / 我的词库 ===== */
(function (global) {
  "use strict";
  var K = {
    settings: "eting_settings",
    wrong: "eting_wrong",
    fav: "eting_fav",
    stats: "eting_stats",
    mylibs: "eting_mylibs",
  };
  function read(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v == null ? def : JSON.parse(v);
    } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  var DEFAULT_SETTINGS = {
    theme: "晴空蓝",
    speech_rate: 0.9,
    speech_volume: 100,
    repeat_times: 1,
    countdown_enabled: true,
    countdown_secs: 20,
    shuffle_default: true,
    fill_ratio: 0.5,
    auto_next: true,
    auto_play: true,
    show_phonetic: true,
    show_example: true,
    speak_meaning: false,
    font_size: 16,
  };
  function norm(w) { return (w || "").trim().toLowerCase(); }
  function keyOf(w) { return norm(w); }

  var Store = {
    settings: function () {
      var s = read(K.settings, {});
      for (var k in DEFAULT_SETTINGS) if (!(k in s)) s[k] = DEFAULT_SETTINGS[k];
      return s;
    },
    saveSettings: function (s) { write(K.settings, s); },
    setSetting: function (k, v) { var s = this.settings(); s[k] = v; this.saveSettings(s); return s; },

    /* 错题本 */
    wrong: function () { return read(K.wrong, {}); },
    addWrong: function (item) {
      var w = this.wrong(); var key = keyOf(item.w);
      if (!key) return;
      if (!w[key]) w[key] = { added: Date.now() };
      var o = w[key];
      o.w = item.w; o.phon = item.phon || ""; o.mean = item.mean || "";
      o.ex = item.ex || ""; o.excn = item.excn || "";
      o.lib = item.lib || o.lib || ""; o.unit = item.unit || o.unit || "";
      write(K.wrong, w); this._stats("wrong", 1);
    },
    removeWrong: function (w0) { var w = this.wrong(); delete w[keyOf(w0)]; write(K.wrong, w); },
    clearWrong: function () { write(K.wrong, {}); },

    /* 收藏 */
    fav: function () { return read(K.fav, {}); },
    isFav: function (w0) { return !!this.fav()[keyOf(w0)]; },
    toggleFav: function (item) {
      var f = this.fav(); var key = keyOf(item.w);
      if (f[key]) { delete f[key]; write(K.fav, f); return false; }
      f[key] = { w: item.w, phon: item.phon || "", mean: item.mean || "",
        ex: item.ex || "", excn: item.excn || "", lib: item.lib || "", unit: item.unit || "",
        added: Date.now() };
      write(K.fav, f); return true;
    },
    removeFav: function (w0) { var f = this.fav(); delete f[keyOf(w0)]; write(K.fav, f); },
    clearFav: function () { write(K.fav, {}); },

    /* 统计 */
    stats: function () {
      var s = read(K.stats, null);
      if (!s) s = { learned: 0, correct: 0, wrong: 0, days: {}, byLib: {} };
      return s;
    },
    _stats: function (field, delta) {
      var s = this.stats();
      if (field === "wrong") s.wrong += delta;
      write(K.stats, s);
    },
    bumpLearned: function (libId, n) {
      var s = this.stats();
      s.learned += (n || 1);
      var d = new Date().toISOString().slice(0, 10);
      s.days[d] = (s.days[d] || 0) + (n || 1);
      if (libId) s.byLib[libId] = (s.byLib[libId] || 0) + (n || 1);
      write(K.stats, s);
    },
    bumpCorrect: function (n) { var s = this.stats(); s.correct += (n || 1); write(K.stats, s); },
    bumpWrong: function (n) { var s = this.stats(); s.wrong += (n || 1); write(K.stats, s); },
    resetStats: function () { write(K.stats, { learned: 0, correct: 0, wrong: 0, days: {}, byLib: {} }); },

    /* 我的词库（用户导入） */
    myLibs: function () { return read(K.mylibs, []); },
    addMyLib: function (lib) { var a = this.myLibs(); a.push(lib); write(K.mylibs, a); },
    removeMyLib: function (id) {
      var a = this.myLibs().filter(function (l) { return l.id !== id; }); write(K.mylibs, a);
    },
  };
  window.Store = Store;
})(window);
