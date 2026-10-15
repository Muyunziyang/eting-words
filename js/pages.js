/* ===== 页面与学习会话（全功能平替） ===== */
(function (global) {
  "use strict";
  var view = function () { return document.getElementById("view"); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- 通用 UI ---------- */
  var UI = {
    _timers: [],
    setTitle: function (t) { var e = document.getElementById("topTitle"); if (e) e.textContent = t; },
    clearTimers: function () {
      this._timers.forEach(function (t) { try { clearInterval(t); clearTimeout(t); } catch (e) {} });
      this._timers = [];
      try { SPEECH.stop(); } catch (e) {}
    },
    setTimer: function (t) { this._timers.push(t); return t; },
    toast: function (msg) {
      var t = document.getElementById("toast");
      t.textContent = msg; t.classList.add("show");
      clearTimeout(this._toastT);
      this._toastT = setTimeout(function () { t.classList.remove("show"); }, 1800);
    },
    confirm: function (o) {
      var sc = document.getElementById("modal-scrim"), m = document.getElementById("modal");
      m.innerHTML = "";
      var h = document.createElement("h3"); h.textContent = o.title || "请确认";
      m.appendChild(h);
      if (o.body) { var p = document.createElement("div"); p.className = "small"; p.innerHTML = o.body; m.appendChild(p); }
      var bw = document.createElement("div"); bw.className = "mbtns";
      var cancel = document.createElement("button"); cancel.className = "btn ghost"; cancel.textContent = o.cancel || "取消";
      var ok = document.createElement("button"); ok.className = "btn " + (o.okClass || "danger"); ok.textContent = o.ok || "确定";
      bw.appendChild(cancel); bw.appendChild(ok); m.appendChild(bw);
      sc.style.display = "flex";
      function close() { sc.style.display = "none"; }
      cancel.onclick = function () { close(); o.onCancel && o.onCancel(); };
      ok.onclick = function () { close(); o.onOk && o.onOk(); };
    },
    promptText: function (o) {
      var sc = document.getElementById("modal-scrim"), m = document.getElementById("modal");
      m.innerHTML = "";
      var h = document.createElement("h3"); h.textContent = o.title || "输入";
      m.appendChild(h);
      if (o.body) { var p = document.createElement("div"); p.className = "small muted"; p.textContent = o.body; m.appendChild(p); }
      var inp = document.createElement("input"); inp.type = "text"; inp.className = "field"; inp.value = o.value || ""; inp.style.marginTop = "10px";
      m.appendChild(inp);
      var bw = document.createElement("div"); bw.className = "mbtns";
      var cancel = document.createElement("button"); cancel.className = "btn ghost"; cancel.textContent = "取消";
      var ok = document.createElement("button"); ok.className = "btn primary"; ok.textContent = o.ok || "确定";
      bw.appendChild(cancel); bw.appendChild(ok); m.appendChild(bw);
      sc.style.display = "flex"; inp.focus();
      function close() { sc.style.display = "none"; }
      cancel.onclick = function () { close(); o.onCancel && o.onCancel(); };
      ok.onclick = function () { close(); o.onOk && o.onOk(inp.value); };
    },
    navigate: function (p) { if (window.App) window.App.navigate(p); },
  };
  window.UI = UI;

  /* ---------- 词库解析（用于“我的词库”/导入） ---------- */
  function parseTxtLib(text, fallbackName) {
    var name = fallbackName || "我的词库";
    var units = []; var cur = null; var total = 0;
    text.split(/\r?\n/).forEach(function (line) {
      line = line.replace(/\r$/, "");
      if (!line.trim()) return;
      if (line.indexOf("#name:") === 0) { name = line.slice(6).trim(); return; }
      if (line.indexOf("#unit:") === 0) { cur = { title: line.slice(6).trim(), words: [] }; units.push(cur); return; }
      if (line[0] === "#") return;
      var p = line.split("|");
      var w = (p[0] || "").trim(); if (!w) return;
      if (!cur) { cur = { title: "未分组", words: [] }; units.push(cur); }
      cur.words.push({ w: w, phon: (p[1] || "").trim(), mean: (p[2] || "").trim(), ex: (p[3] || "").trim(), excn: (p[4] || "").trim() });
      total++;
    });
    return { id: "my:" + Date.now(), name: name, units: units, count: total };
  }

  function resolveLib(libId, cb) {
    if (libId.indexOf("my:") === 0) {
      var id = libId.slice(3);
      var f = Store.myLibs().filter(function (l) { return l.id === id; })[0];
      cb(f || null);
    } else {
      DATA.getLib(libId, cb);
    }
  }

  /* ---------- 来源选择（学习/听写/填空共用） ---------- */
  function pickSource(mode, startFn) {
    UI.clearTimers();
    UI.setTitle(mode === "study" ? "选择学习词库" : mode === "dictation" ? "选择听写词库" : "选择填空词库");
    var v = view(); v.innerHTML = "";
    var st = { libId: null, units: null, shuffle: Store.settings().shuffle_default, fillType: "hide", listen: false };

    DATA.loadIndex(function (index) {
      var mylibs = Store.myLibs();
      var grid = document.createElement("div"); grid.className = "lib-grid";
      function libCard(id, name, count, units, tag, isMy) {
        var c = document.createElement("div"); c.className = "lib-card";
        c.innerHTML = '<div class="nm">' + esc(name) + "</div><div class='meta'>" + count + " 词 · " + units + " 单元</div>";
        if (tag) c.querySelector(".meta").textContent += " · " + tag;
        c.onclick = function () { st.libId = id; showUnits(id, name); };
        return c;
      }
      index.forEach(function (l) { grid.appendChild(libCard(l.id, l.name, l.count, l.units, l.tag, false)); });
      mylibs.forEach(function (l) { grid.appendChild(libCard("my:" + l.id, l.name + "（我的）", l.count || 0, l.units.length, "", true)); });
      if (!index.length && !mylibs.length) grid.innerHTML = "<div class='empty'>暂无词库</div>";
      v.appendChild(wrapCard("词库", grid));
      v.appendChild(wrapCard("提示", "<div class='small muted'>选择上方词库后，再选择要练习的单元。</div>"));
    });

    function showUnits(libId, name) {
      resolveLib(libId, function (lib) {
        if (!lib) { UI.toast("词库加载失败"); return; }
        var card = wrapCard("单元 · " + esc(name), "");
        var ul = document.createElement("div"); ul.className = "unit-list";
        lib.units.forEach(function (u, i) {
          var it = document.createElement("label"); it.className = "unit-item";
          var ck = document.createElement("input"); ck.type = "checkbox"; ck.className = "ck"; ck.checked = true; ck.dataset.i = i;
          var ut = document.createElement("span"); ut.className = "ut"; ut.textContent = u.title + "（" + u.words.length + "）";
          it.appendChild(ck); it.appendChild(ut); ul.appendChild(it);
        });
        card.appendChild(ul);
        var bar = document.createElement("div"); bar.className = "row mt";
        var all = document.createElement("button"); all.className = "btn"; all.textContent = "全选/反选";
        all.onclick = function () { $all(".ck", ul).forEach(function (c) { c.checked = !c.checked; }); };
        var shuffle = switchEl("打乱顺序", st.shuffle, function (v) { st.shuffle = v; });
        bar.appendChild(all); bar.appendChild(shuffle); card.appendChild(bar);

        if (mode === "study") {
          var lis = switchEl("听读模式（先听音，再显单词）", st.listen, function (v) { st.listen = v; });
          card.appendChild(lis);
        }
        if (mode === "fill") {
          var seg = document.createElement("div"); seg.className = "seg mt";
          [["full", "全默写"], ["hide", "隐藏字母"], ["shuffle", "乱序"]].forEach(function (p) {
            var b = document.createElement("button"); b.textContent = p[1]; if (p[0] === st.fillType) b.className = "on";
            b.onclick = function () { st.fillType = p[0]; $all("button", seg).forEach(function (x) { x.className = ""; }); b.className = "on"; };
            seg.appendChild(b);
          });
          card.appendChild(wrapCard("填空方式", seg));
        }
        var start = document.createElement("button"); start.className = "btn primary block lg mt"; start.textContent = "开始";
        start.onclick = function () {
          var idxs = $all(".ck", ul).filter(function (c) { return c.checked; }).map(function (c) { return +c.dataset.i; });
          if (!idxs.length) { UI.toast("请至少选择一个单元"); return; }
          var words = DATA.flatten(lib, idxs);
          words.forEach(function (w) { w.lib = lib.id; w.libName = lib.name; });
          if (st.shuffle) words = DATA.shuffle(words);
          if (!words.length) { UI.toast("该单元没有单词"); return; }
          startFn(words, { listen: st.listen, fillType: st.fillType });
        };
        card.appendChild(start);
        v.innerHTML = ""; v.appendChild(card);
        UI.setTitle((mode === "study" ? "学习" : mode === "dictation" ? "听写" : "填空") + " · 选单元");
      });
    }
  }

  function wrapCard(title, inner) {
    var c = document.createElement("div"); c.className = "card";
    if (title) { var h = document.createElement("h3"); h.textContent = title; c.appendChild(h); }
    if (typeof inner === "string") c.insertAdjacentHTML("beforeend", inner);
    else if (inner) c.appendChild(inner);
    return c;
  }
  function switchEl(label, val, cb) {
    var w = document.createElement("label"); w.className = "row spread"; w.style.marginTop = "10px";
    var sp = document.createElement("span"); sp.textContent = label; sp.style.fontSize = "14px";
    var sw = document.createElement("span"); sw.className = "switch";
    sw.innerHTML = '<input type="checkbox"' + (val ? " checked" : "") + '><span class="sl"></span>';
    var inp = sw.querySelector("input"); inp.onchange = function () { cb(inp.checked); };
    w.appendChild(sp); w.appendChild(sw); return w;
  }

  /* ---------- 学习会话 ---------- */
  function studySession(words, opts) {
    UI.clearTimers(); UI.setTitle("学习");
    var st = { i: 0, listen: !!opts.listen };
    var v = view();
    function render() {
      var w = words[st.i]; if (!w) { UI.toast("已完成"); UI.navigate("library"); return; }
      var s = Store.settings();
      var pct = Math.round((st.i) / words.length * 100);
      var phonHtml = (s.show_phonetic && w.phon) ? '<div class="word-phon">/' + esc(w.phon) + "/</div>" : "";
      var meanHtml = (st.listen) ? "" : '<div class="word-mean">' + esc(w.mean) + "</div>";
      var exHtml = "";
      if (s.show_example && w.ex) {
        exHtml = '<div class="word-ex">' + esc(w.ex) + (w.excn ? '<div class="cn">' + esc(w.excn) + "</div>" : "") + "</div>";
      }
      var hidden = st.listen;
      v.innerHTML =
        '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        '<div class="counter center mb">' + (st.i + 1) + " / " + words.length + " · " + esc(w.unit || "") + "</div>" +
        '<div class="card word-card">' +
          '<div class="word-main"' + (hidden ? ' style="filter:blur(8px);user-select:none;"' : "") + ">" + esc(w.w) + "</div>" +
          phonHtml + meanHtml + exHtml +
          '<div class="row" style="justify-content:center;gap:14px;margin-top:16px;">' +
            '<button class="speak-btn" data-act="spell" title="拼读">🔤</button>' +
            '<button class="speak-btn" data-act="speak" title="朗读">🔊</button>' +
            (hidden ? '<button class="speak-btn" data-act="reveal" title="显示单词">👁</button>' : "") +
          "</div>" +
        "</div>" +
        '<div class="btn-row mt">' +
          '<button class="btn" data-act="prev">上一个</button>' +
          '<button class="btn" data-act="wrong">标错</button>' +
          '<button class="btn" data-act="fav">收藏</button>' +
          '<button class="btn primary" data-act="next">下一个</button>' +
        "</div>" +
        '<div class="center muted small mt">' + esc(w.libName || "") + "</div>";
      function speakWord() { SPEECH.speak(w.w); }
      function bind() {
        $("[data-act=speak]", v).onclick = speakWord;
        $("[data-act=spell]", v).onclick = function () { SPEECH.spell(w.w); };
        var rv = $("[data-act=reveal]", v); if (rv) rv.onclick = function () { st.listen = false; render(); };
        $("[data-act=prev]", v).onclick = function () { if (st.i > 0) { st.i--; render(); } else UI.toast("已经是第一个"); };
        $("[data-act=next]", v).onclick = function () { st.i++; render(); };
        $("[data-act=wrong]", v).onclick = function () { Store.addWrong(w); UI.toast("已加入错题本"); };
        $("[data-act=fav]", v).onclick = function () {
          var on = Store.toggleFav(w); UI.toast(on ? "已收藏" : "已取消收藏");
          $("[data-act=fav]", v).textContent = on ? "取消收藏" : "收藏";
        };
      }
      bind();
      Store.bumpLearned(w.lib, 1);
      if (st.listen && s.auto_play) { UI.setTimer(setTimeout(speakWord, 250)); }
    }
    render();
  }

  /* ---------- 听写会话 ---------- */
  function dictSession(words, opts) {
    UI.clearTimers(); UI.setTitle("听写");
    var st = { i: 0, correct: 0, wrong: 0 };
    var s = Store.settings();
    var v = view();
    function render() {
      var w = words[st.i];
      if (!w) { finish(); return; }
      var pct = Math.round(st.i / words.length * 100);
      v.innerHTML =
        '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        '<div class="counter center mb">' + (st.i + 1) + " / " + words.length +
          '　✅<span id="cok">' + st.correct + '</span>　❌<span id="cno">' + st.wrong + "</span>" +
          (s.countdown_enabled ? '　⏱<span class="countdown" id="cd"></span>' : "") + "</div>" +
        '<div class="card center">' +
          '<button class="speak-btn" data-act="replay" style="width:70px;height:70px;font-size:30px;">🔊</button>' +
          '<div class="muted small mt">点击朗读，听音拼写（也可看释义提示）</div>' +
          '<div class="hint-blank mt" id="hint"></div>' +
        "</div>" +
        '<div class="field"><input type="text" class="answer-input" id="ans" placeholder="输入你听到的单词" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
        '<div class="feedback" id="fb"></div>' +
        '<div class="reveal" id="rv" style="display:none;"></div>' +
        '<div class="btn-row mt">' +
          '<button class="btn" data-act="show">显示答案</button>' +
          '<button class="btn primary" data-act="submit">提交</button>' +
          '<button class="btn" data-act="skip">下一个 ▶</button>' +
        "</div>" +
        '<div class="center muted small mt">释义提示：<span id="mn"></span></div>';
      var ans = $("#ans", v);
      function replay() { SPEECH.speak(w.w); }
      function showHint() { var mn = $("#mn", v); if (mn) mn.textContent = w.mean; }
      function showAnswer() {
        var rv = $("#rv", v); rv.style.display = "block"; rv.textContent = w.w + (w.phon ? "  /" + w.phon + "/" : "");
        stopCd();
      }
      function submit() {
        var val = (ans.value || "").trim().toLowerCase().replace(/\s+/g, "");
        var key = (w.w || "").trim().toLowerCase().replace(/\s+/g, "");
        var fb = $("#fb", v);
        if (!val) { UI.toast("请输入"); return; }
        if (val === key) {
          fb.className = "feedback ok"; fb.textContent = "✅ 正确！";
          st.correct++; Store.bumpCorrect(1);
          showAnswer(); stopCd();
          if (s.auto_next) UI.setTimer(setTimeout(function () { st.i++; render(); }, 700));
        } else {
          fb.className = "feedback err"; fb.textContent = "❌ 错误";
          st.wrong++; Store.addWrong(w);
          showAnswer(); stopCd();
        }
        var cok = $("#cok", v), cno = $("#cno", v); if (cok) cok.textContent = st.correct; if (cno) cno.textContent = st.wrong;
      }
      function skip() { st.i++; render(); }
      $("[data-act=replay]", v).onclick = replay;
      $("[data-act=show]", v).onclick = function () { showHint(); showAnswer(); };
      $("[data-act=submit]", v).onclick = submit;
      $("[data-act=skip]", v).onclick = skip;
      ans.onkeydown = function (e) { if (e.key === "Enter") submit(); };
      replay();
      if (s.auto_play === false) { /* 已手动播放 */ }
      // 倒计时
      if (s.countdown_enabled) startCd(function () { showHint(); showAnswer(); st.wrong++; Store.addWrong(w); var cno = $("#cno", v); if (cno) cno.textContent = st.wrong; });
      Store.bumpLearned(w.lib, 1);
    }
    var cdTimer = null;
    function startCd(onTimeout) {
      var left = Store.settings().countdown_secs || 20;
      var elc = $("#cd", v);
      if (elc) elc.textContent = left + "s";
      cdTimer = UI.setTimer(setInterval(function () {
        left--; if (elc) elc.textContent = left + "s";
        if (left <= 0) { stopCd(); onTimeout(); }
      }, 1000));
    }
    function stopCd() { if (cdTimer) { clearInterval(cdTimer); cdTimer = null; } }
    function finish() {
      UI.clearTimers();
      v.innerHTML = '<div class="card center"><div style="font-size:40px;">🎉</div><h3>听写完成</h3>' +
        '<p>正确 <b style="color:var(--ok)">' + st.correct + '</b>　错误 <b style="color:var(--err)">' + st.wrong + "</b></p>" +
        '<button class="btn primary block lg mt" data-act="back">返回首页</button></div>';
      $("[data-act=back]", v).onclick = function () { UI.navigate("library"); };
    }
    render();
  }

  /* ---------- 填空会话 ---------- */
  function fillSession(words, opts) {
    UI.clearTimers(); UI.setTitle("填空");
    var type = opts.fillType || "hide";
    var st = { i: 0, correct: 0, wrong: 0 };
    var s = Store.settings();
    var v = view();
    function promptText(w) {
      if (type === "full") return w.mean || "（无释义）";
      if (type === "hide") {
        var ratio = s.fill_ratio || 0.5;
        var letters = w.w.split("");
        var keep = Math.max(1, Math.round(letters.length * (1 - ratio)));
        var idxs = letters.map(function (_, i) { return i; });
        // 至少保留首字母
        var keepSet = {}; keepSet[0] = true;
        while (Object.keys(keepSet).length < keep) {
          var r = Math.floor(Math.random() * letters.length); keepSet[r] = true;
        }
        return letters.map(function (c, i) { return keepSet[i] ? c : (c === " " ? " " : "_"); }).join("");
      }
      if (type === "shuffle") {
        var a = w.w.split("");
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a.join(" ");
      }
      return w.w;
    }
    function render() {
      var w = words[st.i];
      if (!w) { finish(); return; }
      var pct = Math.round(st.i / words.length * 100);
      var prompt = promptText(w);
      var sub = type === "full" ? "根据释义写单词" : type === "hide" ? "补全被遮挡的字母" : "字母已打乱，还原单词";
      v.innerHTML =
        '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        '<div class="counter center mb">' + (st.i + 1) + " / " + words.length +
          '　✅<span id="cok">' + st.correct + '</span>　❌<span id="cno">' + st.wrong + "</span>" +
          (s.countdown_enabled ? '　⏱<span class="countdown" id="cd"></span>' : "") + "</div>" +
        '<div class="card center">' +
          '<div class="muted small">' + sub + "</div>" +
          '<div class="hint-blank mt" style="font-size:26px;">' + esc(prompt) + "</div>" +
          (s.show_phonetic && w.phon && type !== "full" ? '<div class="word-phon">/' + esc(w.phon) + "/</div>" : "") +
          '<button class="speak-btn mt" data-act="speak" style="width:50px;height:50px;">🔊</button>' +
        "</div>" +
        '<div class="field"><input type="text" class="answer-input" id="ans" placeholder="输入完整单词" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
        '<div class="feedback" id="fb"></div>' +
        '<div class="reveal" id="rv" style="display:none;"></div>' +
        '<div class="btn-row mt">' +
          '<button class="btn" data-act="show">显示答案</button>' +
          '<button class="btn primary" data-act="submit">提交</button>' +
          '<button class="btn" data-act="skip">下一个 ▶</button>' +
        "</div>";
      var ans = $("#ans", v);
      function showAnswer() { var rv = $("#rv", v); rv.style.display = "block"; rv.textContent = w.w; stopCd(); }
      function submit() {
        var val = (ans.value || "").trim().toLowerCase().replace(/\s+/g, "");
        var key = (w.w || "").trim().toLowerCase().replace(/\s+/g, "");
        var fb = $("#fb", v);
        if (!val) { UI.toast("请输入"); return; }
        if (val === key) { fb.className = "feedback ok"; fb.textContent = "✅ 正确！"; st.correct++; Store.bumpCorrect(1); showAnswer(); stopCd(); if (s.auto_next) UI.setTimer(setTimeout(function () { st.i++; render(); }, 700)); }
        else { fb.className = "feedback err"; fb.textContent = "❌ 错误：" + w.mean; st.wrong++; Store.addWrong(w); showAnswer(); stopCd(); }
        var cok = $("#cok", v), cno = $("#cno", v); if (cok) cok.textContent = st.correct; if (cno) cno.textContent = st.wrong;
      }
      $("[data-act=speak]", v).onclick = function () { SPEECH.speak(w.w); };
      $("[data-act=show]", v).onclick = showAnswer;
      $("[data-act=submit]", v).onclick = submit;
      $("[data-act=skip]", v).onclick = function () { st.i++; render(); };
      ans.onkeydown = function (e) { if (e.key === "Enter") submit(); };
      if (s.countdown_enabled) startCd(function () { st.wrong++; Store.addWrong(w); showAnswer(); var cno = $("#cno", v); if (cno) cno.textContent = st.wrong; });
      Store.bumpLearned(w.lib, 1);
    }
    var cdTimer = null;
    function startCd(onTimeout) {
      var left = Store.settings().countdown_secs || 20; var elc = $("#cd", v);
      if (elc) elc.textContent = left + "s";
      cdTimer = UI.setTimer(setInterval(function () { left--; if (elc) elc.textContent = left + "s"; if (left <= 0) { stopCd(); onTimeout(); } }, 1000));
    }
    function stopCd() { if (cdTimer) { clearInterval(cdTimer); cdTimer = null; } }
    function finish() {
      UI.clearTimers();
      v.innerHTML = '<div class="card center"><div style="font-size:40px;">🎉</div><h3>填空完成</h3>' +
        '<p>正确 <b style="color:var(--ok)">' + st.correct + '</b>　错误 <b style="color:var(--err)">' + st.wrong + "</b></p>" +
        '<button class="btn primary block lg mt" data-act="back">返回首页</button></div>';
      $("[data-act=back]", v).onclick = function () { UI.navigate("library"); };
    }
    render();
  }

  /* ---------- 词库浏览 ---------- */
  function library() {
    UI.clearTimers(); UI.setTitle("词库");
    var v = view(); v.innerHTML = "";
    DATA.loadIndex(function (index) {
      var mylibs = Store.myLibs();
      var total = index.reduce(function (a, b) { return a + b.count; }, 0);
      v.appendChild(wrapCard("词库总览", '<div class="muted small">共 ' + index.length + " 个内置词库，" + total + " 词" +
        (mylibs.length ? "；我的词库 " + mylibs.length + " 个" : "") + '。</div>'));
      var grid = document.createElement("div"); grid.className = "lib-grid";
      index.concat(mylibs.map(function (l) { return { id: "my:" + l.id, name: l.name + "（我的）", count: l.count || 0, units: l.units.length, tag: "我的", desc: "" }; }))
        .forEach(function (l) {
          var c = document.createElement("div"); c.className = "lib-card";
          c.innerHTML = '<div class="nm">' + esc(l.name) + '</div><div class="meta">' + l.count + " 词 · " + l.units + " 单元</div>";
          c.onclick = function () { browseLib(l.id); };
          grid.appendChild(c);
        });
      v.appendChild(wrapCard("选择词库查看", grid));
    });
  }
  function browseLib(libId) {
    UI.clearTimers();
    resolveLib(libId, function (lib) {
      if (!lib) { UI.toast("加载失败"); return; }
      UI.setTitle(lib.name.slice(0, 12));
      var v = view(); v.innerHTML = "";
      var bar = document.createElement("div"); bar.className = "btn-row";
      var back = document.createElement("button"); back.className = "btn"; back.textContent = "← 返回";
      back.onclick = library; bar.appendChild(back);
      var study = mkBtn("学习", "primary", function () { pickSource("study", studySession); });
      var dic = mkBtn("听写", "", function () { pickSource("dictation", dictSession); });
      var fill = mkBtn("填空", "", function () { pickSource("fill", fillSession); });
      [study, dic, fill].forEach(function (b) { bar.appendChild(b); });
      v.appendChild(bar);
      var list = document.createElement("div"); list.className = "list mt";
      lib.units.forEach(function (u, i) {
        var it = document.createElement("div"); it.className = "list-item";
        it.innerHTML = '<div class="grow"><div class="t">' + esc(u.title) + '</div><div class="s">' + u.words.length + " 词</div></div>";
        it.onclick = function () { browseUnit(lib, i); };
        list.appendChild(it);
      });
      var c = wrapCard(lib.name, list); v.appendChild(c);
    });
  }
  function browseUnit(lib, ui) {
    UI.clearTimers();
    var u = lib.units[ui]; UI.setTitle(u.title.slice(0, 14));
    var v = view(); v.innerHTML = "";
    var bar = document.createElement("div"); bar.className = "btn-row";
    var back = document.createElement("button"); back.className = "btn"; back.textContent = "← 单元";
    back.onclick = function () { browseLib(lib.id); }; bar.appendChild(back);
    v.appendChild(bar);
    var words = DATA.shuffle(u.words.slice());
    var s = Store.settings();
    var list = document.createElement("div"); list.className = "list mt";
    words.forEach(function (w) {
      var it = document.createElement("div"); it.className = "list-item";
      it.innerHTML = '<div class="grow"><div class="t">' + esc(w.w) + (w.phon ? ' <span class="muted">/' + esc(w.phon) + "/</span>" : "") +
        '</div><div class="s">' + esc(w.mean) + "</div></div>" +
        '<button class="btn" style="padding:6px 10px;">🔊</button>';
      it.querySelector("button").onclick = function (e) { e.stopPropagation(); SPEECH.speak(w.w); };
      it.onclick = function () { SPEECH.speak(w.w); };
      list.appendChild(it);
    });
    v.appendChild(wrapCard(u.title + "（" + u.words.length + " 词，已打乱）", list));
  }
  function mkBtn(t, cls, fn) { var b = document.createElement("button"); b.className = "btn " + cls; b.textContent = t; b.onclick = fn; return b; }

  /* ---------- 错题本 ---------- */
  function wrong() {
    UI.clearTimers(); UI.setTitle("错题本");
    var v = view(); v.innerHTML = "";
    var items = Object.keys(Store.wrong()).map(function (k) { return Store.wrong()[k]; });
    if (!items.length) { v.appendChild(emptyState("🗒️", "错题本还是空的", "在学习或听写中答错的单词会自动收集到这里。")); return; }
    items.sort(function (a, b) { return (b.added || 0) - (a.added || 0); });
    var bar = document.createElement("div"); bar.className = "btn-row";
    bar.appendChild(mkBtn("听写重练", "primary", function () { dictSession(items.slice(), {}); }));
    bar.appendChild(mkBtn("学习复习", "", function () { studySession(items.slice(), {}); }));
    var sel = mkBtn("选择", "", function () { toggleSelect(); });
    bar.appendChild(sel);
    var clr = mkBtn("清空", "danger", function () {
      UI.confirm({ title: "清空错题本？", body: "将删除全部 <b>" + items.length + "</b> 条错题，此操作不可恢复。", ok: "确认清空", okClass: "danger",
        onOk: function () { Store.clearWrong(); UI.toast("已清空"); wrong(); } });
    });
    bar.appendChild(clr);
    v.appendChild(wrapCard("错题本（" + items.length + "）", bar));
    var selectMode = false; var checked = {};
    var list = document.createElement("div"); list.className = "list mt";
    function renderList() {
      list.innerHTML = "";
      items.forEach(function (it, idx) {
        var row = document.createElement("div"); row.className = "list-item";
        var cb = selectMode ? '<input type="checkbox" class="ck" data-k="' + esc(it.w) + '"' + (checked[it.w] ? " checked" : "") + ">" : "";
        row.innerHTML = cb + '<div class="grow"><div class="t">' + esc(it.w) + (it.phon ? ' <span class="muted">/' + esc(it.phon) + "/</span>" : "") +
          '</div><div class="s">' + esc(it.mean) + "</div></div>" +
          '<button class="btn" style="padding:6px 10px;" data-act="sp">🔊</button>' +
          (selectMode ? "" : '<button class="btn" style="padding:6px 10px;" data-act="rm">✕</button>');
        list.appendChild(row);
        var sp = row.querySelector("[data-act=sp]"); if (sp) sp.onclick = function (e) { e.stopPropagation(); SPEECH.speak(it.w); };
        var rm = row.querySelector("[data-act=rm]"); if (rm) rm.onclick = function (e) { e.stopPropagation(); Store.removeWrong(it.w); wrong(); };
        var c = row.querySelector(".ck"); if (c) c.onchange = function () { checked[it.w] = c.checked; };
      });
    }
    function toggleSelect() {
      selectMode = !selectMode; v.innerHTML = ""; wrong(); renderSelBar();
    }
    function renderSelBar() {
      if (!selectMode) return;
      var sb = document.createElement("div"); sb.className = "btn-row mt";
      sb.appendChild(mkBtn("删除选中（" + Object.keys(checked).filter(function (k) { return checked[k]; }).length + "）", "danger", function () {
        Object.keys(checked).forEach(function (k) { if (checked[k]) Store.removeWrong(k); });
        selectMode = false; wrong();
      }));
      sb.appendChild(mkBtn("取消", "ghost", function () { selectMode = false; wrong(); }));
      v.appendChild(sb);
    }
    renderList();
    v.appendChild(list);
  }

  /* ---------- 收藏 ---------- */
  function fav() {
    UI.clearTimers(); UI.setTitle("收藏");
    var v = view(); v.innerHTML = "";
    var items = Object.keys(Store.fav()).map(function (k) { return Store.fav()[k]; });
    if (!items.length) { v.appendChild(emptyState("⭐", "还没有收藏", "在单词卡片上点“收藏”即可加入这里。")); return; }
    var bar = document.createElement("div"); bar.className = "btn-row";
    bar.appendChild(mkBtn("学习复习", "primary", function () { studySession(items.slice(), {}); }));
    bar.appendChild(mkBtn("清空", "danger", function () {
      UI.confirm({ title: "清空收藏？", body: "将移除全部 <b>" + items.length + "</b> 条收藏。", ok: "确认清空", okClass: "danger",
        onOk: function () { Store.clearFav(); UI.toast("已清空"); fav(); } });
    }));
    v.appendChild(wrapCard("收藏（" + items.length + "）", bar));
    var list = document.createElement("div"); list.className = "list mt";
    items.forEach(function (it) {
      var row = document.createElement("div"); row.className = "list-item";
      row.innerHTML = '<div class="grow"><div class="t">' + esc(it.w) + (it.phon ? ' <span class="muted">/' + esc(it.phon) + "/</span>" : "") +
        '</div><div class="s">' + esc(it.mean) + "</div></div>" +
        '<button class="btn" style="padding:6px 10px;" data-act="sp">🔊</button>' +
        '<button class="btn" style="padding:6px 10px;" data-act="rm">✕</button>';
      list.appendChild(row);
      row.querySelector("[data-act=sp]").onclick = function (e) { e.stopPropagation(); SPEECH.speak(it.w); };
      row.querySelector("[data-act=rm]").onclick = function (e) { e.stopPropagation(); Store.removeFav(it.w); fav(); };
    });
    v.appendChild(list);
  }

  /* ---------- 统计 ---------- */
  function stats() {
    UI.clearTimers(); UI.setTitle("统计");
    var v = view(); v.innerHTML = "";
    var s = Store.stats();
    var correctRate = (s.correct + s.wrong) ? Math.round(s.correct / (s.correct + s.wrong) * 100) : 0;
    var days = Object.keys(s.days).sort().slice(-7);
    var byLib = Object.keys(s.byLib).map(function (k) { return [k, s.byLib[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    var html = '<div class="row spread"><div><div class="big" style="font-size:30px;font-weight:800;">' + s.learned + '</div><div class="muted small">累计学习词次</div></div>' +
      '<div><div class="big" style="font-size:30px;font-weight:800;color:var(--ok)">' + correctRate + '%</div><div class="muted small">正确率</div></div></div>';
    html += '<div class="row spread mt"><div class="muted small">正确 ' + s.correct + '</div><div class="muted small">错误 ' + s.wrong + "</div></div>";
    var c = wrapCard("学习统计", html); v.appendChild(c);
    if (days.length) {
      var dd = '<div class="muted small mb">最近 ' + days.length + " 天</div>";
      days.forEach(function (d) { dd += '<div class="row spread"><span class="small">' + d + '</span><span class="small">' + s.days[d] + " 词次</span></div>"; });
      v.appendChild(wrapCard("学习日历", dd));
    }
    if (byLib.length) {
      var bl = "";
      byLib.forEach(function (p) { bl += '<div class="row spread"><span class="small">' + esc(p[0]) + '</span><span class="small">' + p[1] + " 词次</span></div>"; });
      v.appendChild(wrapCard("词库分布", bl));
    }
    var btn = mkBtn("重置统计", "danger block lg mt", function () {
      UI.confirm({ title: "重置统计数据？", body: "将清空累计学习、正确率、日历与词库分布，错题和收藏不受影响。", ok: "确认重置", okClass: "danger",
        onOk: function () { Store.resetStats(); UI.toast("已重置"); stats(); } });
    });
    v.appendChild(btn);
  }

  /* ---------- 设置 ---------- */
  function settings() {
    UI.clearTimers(); UI.setTitle("设置");
    var v = view(); v.innerHTML = "";
    var s = Store.settings();
    // 主题
    var tg = document.createElement("div"); tg.className = "theme-grid";
    THEME.list().forEach(function (nm) {
      var t = THEME.get(nm);
      var chip = document.createElement("div"); chip.className = "theme-chip" + (nm === s.theme ? " active" : "");
      chip.innerHTML = '<span class="sw" style="background:' + t.accent + '"></span><span class="nm">' + nm + "</span>";
      chip.onclick = function () { s.theme = nm; Store.saveSettings(s); THEME.apply(nm); settings(); };
      tg.appendChild(chip);
    });
    v.appendChild(wrapCard("主题配色", tg));
    // 朗读
    v.appendChild(wrapCard("语音朗读",
      slider("语速", "speech_rate", 0.5, 2, 0.1, function (val) { s.speech_rate = val; Store.saveSettings(s); }) +
      slider("音量", "speech_volume", 0, 100, 5, function (val) { s.speech_volume = val; Store.saveSettings(s); }) +
      slider("重复次数", "repeat_times", 1, 5, 1, function (val) { s.repeat_times = val; Store.saveSettings(s); }) +
      switchRow("朗读中文释义", "speak_meaning", s.speak_meaning, function (val) { s.speak_meaning = val; Store.saveSettings(s); })));
    // 答题
    v.appendChild(wrapCard("答题与练习",
      switchRow("开启答题倒计时", "countdown_enabled", s.countdown_enabled, function (val) { s.countdown_enabled = val; Store.saveSettings(s); settings(); }) +
      (s.countdown_enabled ? slider("倒计时秒数", "countdown_secs", 5, 60, 5, function (val) { s.countdown_secs = val; Store.saveSettings(s); }) : "") +
      switchRow("默认打乱顺序", "shuffle_default", s.shuffle_default, function (val) { s.shuffle_default = val; Store.saveSettings(s); }) +
      slider("填空隐藏比例", "fill_ratio", 0.2, 0.9, 0.1, function (val) { s.fill_ratio = val; Store.saveSettings(s); }) +
      switchRow("答对自动下一题", "auto_next", s.auto_next, function (val) { s.auto_next = val; Store.saveSettings(s); }) +
      switchRow("进入题目自动朗读", "auto_play", s.auto_play, function (val) { s.auto_play = val; Store.saveSettings(s); }) +
      switchRow("显示音标", "show_phonetic", s.show_phonetic, function (val) { s.show_phonetic = val; Store.saveSettings(s); }) +
      switchRow("显示例句", "show_example", s.show_example, function (val) { s.show_example = val; Store.saveSettings(s); })));
    v.appendChild(wrapCard("界面", slider("正文字号", "font_size", 13, 22, 1, function (val) { s.font_size = val; Store.saveSettings(s); document.documentElement.style.setProperty("--fs", val + "px"); })));
    if (!SPEECH.supported) {
      v.appendChild(wrapCard("⚠️ 朗读提示", "<div class='small muted'>当前浏览器不支持语音合成（Web Speech API）。请使用安卓 Chrome / Edge，或在系统设置中开启“无障碍→文字转语音输出”。</div>"));
    }
    // 滑块每次渲染后自绑定
    ["speech_rate", "speech_volume", "repeat_times", "countdown_secs", "fill_ratio", "font_size"].forEach(function (key) {
      var r = document.getElementById("r_" + key); if (!r) return;
      r.oninput = function () {
        var val = parseFloat(r.value); var lab = document.getElementById("v_" + key);
        if (lab) lab.textContent = val; var ss = Store.settings(); ss[key] = val; Store.saveSettings(ss);
        if (key === "font_size") document.documentElement.style.setProperty("--fs", val + "px");
      };
      r.onchange = r.oninput;
    });
  }
  function slider(label, key, min, max, step, cb) {
    var s = Store.settings(); var val = s[key];
    return '<div class="field" style="margin-bottom:4px;"><div class="row spread"><label style="margin:0;">' + label +
      '</label><span class="muted small" id="v_' + key + '">' + val + "</span></div>" +
      '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" id="r_' + key + '"></div>';
  }
  function switchRow(label, key, val) {
    return '<label class="row spread" style="margin-top:6px;"><span style="font-size:14px;">' + esc(label) +
      '</span><span class="switch"><input type="checkbox" data-key="' + key + '"' + (val ? " checked" : "") + '><span class="sl"></span></span></label>';
  }

  /* ---------- 导入 / 导出 ---------- */
  function io() {
    UI.clearTimers(); UI.setTitle("导入 / 导出");
    var v = view(); v.innerHTML = "";
    // 导入
    var imp = wrapCard("导入词库（.txt）",
      '<div class="small muted mb">格式：<code>单词|音标|释义|例句|例句翻译</code>，用 <code>#name:</code> 和 <code>#unit:</code> 标注名称与单元。</div>' +
      '<input type="file" id="file" accept=".txt,text/plain">' +
      '<div class="btn-row mt"><button class="btn" id="tpl">下载导入模板</button><button class="btn primary" id="doimp">导入选中文件</button></div>');
    v.appendChild(imp);
    $("#tpl", imp).onclick = function () { download("导入模板.txt", "#name: 我的词库\n#unit: Unit 1 示例\napple|ˈæpl|苹果|I like apples.|我喜欢苹果。\nbook|bʊk|书|This is a book.|这是一本书。\n"); };
    $("#doimp", imp).onclick = function () {
      var f = $("#file", imp).files[0]; if (!f) { UI.toast("请先选择 txt 文件"); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var lib = parseTxtLib(rd.result, f.name.replace(/\.txt$/i, ""));
        if (!lib.count) { UI.toast("未解析到单词"); return; }
        Store.addMyLib(lib); UI.toast("已导入：" + lib.name + "（" + lib.count + " 词）"); io();
      };
      rd.readAsText(f, "utf-8");
    };
    // 我的词库
    var mylibs = Store.myLibs();
    if (mylibs.length) {
      var ml = document.createElement("div"); ml.className = "list mt";
      mylibs.forEach(function (l) {
        var it = document.createElement("div"); it.className = "list-item";
        it.innerHTML = '<div class="grow"><div class="t">' + esc(l.name) + '</div><div class="s">' + (l.count || 0) + " 词 · " + l.units.length + " 单元</div></div>";
        var ex = mkBtn("导出", "", function () { exportLib(l); });
        var rm = mkBtn("删除", "danger", function () { UI.confirm({ title: "删除该词库？", body: esc(l.name), ok: "删除", okClass: "danger", onOk: function () { Store.removeMyLib(l.id); io(); } }); });
        it.appendChild(ex); it.appendChild(rm); ml.appendChild(it);
      });
      v.appendChild(wrapCard("我的词库", ml));
    }
    // 默写单 / 词表导出
    v.appendChild(wrapCard("导出内置词库",
      '<div class="btn-row"><button class="btn primary" id="sheet">生成默写单</button><button class="btn" id="wlist">导出词表</button></div>'));
    $("#sheet", v).onclick = function () { pickExport("sheet"); };
    $("#wlist", v).onclick = function () { pickExport("wlist"); };
  }
  function pickExport(kind) {
    DATA.loadIndex(function (index) {
      var v = view(); v.innerHTML = "";
      v.appendChild(mkBack());
      var grid = document.createElement("div"); grid.className = "lib-grid";
      index.forEach(function (l) {
        var c = document.createElement("div"); c.className = "lib-card";
        c.innerHTML = '<div class="nm">' + esc(l.name) + '</div><div class="meta">' + l.count + " 词</div>";
        c.onclick = function () { pickUnitsExport(kind, l); };
        grid.appendChild(c);
      });
      v.appendChild(wrapCard(kind === "sheet" ? "选择词库生成默写单" : "选择词库导出词表", grid));
    });
  }
  function pickUnitsExport(kind, libMeta) {
    resolveLib(libMeta.id, function (lib) {
      if (!lib) { UI.toast("加载失败"); return; }
      var v = view(); v.innerHTML = "";
      var card = wrapCard("选择单元 · " + esc(lib.name), "");
      var ul = document.createElement("div"); ul.className = "unit-list";
      lib.units.forEach(function (u, i) {
        var it = document.createElement("label"); it.className = "unit-item";
        it.innerHTML = '<input type="checkbox" class="ck" data-i="' + i + '" checked><span class="ut">' + esc(u.title) + "（" + u.words.length + "）</span>";
        ul.appendChild(it);
      });
      card.appendChild(ul);
      var bar = document.createElement("div"); bar.className = "row mt";
      bar.appendChild(mkBtn("全选/反选", "", function () { $all(".ck", ul).forEach(function (c) { c.checked = !c.checked; }); }));
      card.appendChild(bar);
      if (kind === "wlist") {
        card.appendChild(switchEl("包含音标", true, function () {}));
        card.appendChild(switchEl("包含例句", true, function () {}));
      }
      var go = mkBtn(kind === "sheet" ? "生成默写单" : "导出词表", "primary block lg mt", function () {
        var idxs = $all(".ck", ul).filter(function (c) { return c.checked; }).map(function (c) { return +c.dataset.i; });
        if (!idxs.length) { UI.toast("请选择单元"); return; }
        var words = DATA.flatten(lib, idxs);
        if (kind === "sheet") openSheet(lib.name, words);
        else exportWordList(lib.name, words);
      });
      card.appendChild(go);
      v.appendChild(card);
    });
  }
  function openSheet(libName, words) {
    var w = window.open("", "_blank");
    if (!w) { UI.toast("请允许弹出窗口以预览默写单"); return; }
    var rows = words.map(function (x) {
      return "<tr><td>" + esc(x.w) + "</td><td class='ph'>____ /" + esc(x.phon) + "/</td><td class='mn'>" + esc(x.mean) + "</td><td class='ans'>____</td></tr>";
    }).join("");
    w.document.write("<!doctype html><html lang='zh'><head><meta charset='utf-8'><title>默写单 " + esc(libName) + "</title>" +
      "<style>body{font-family:'Microsoft YaHei',sans-serif;padding:24px;}h2{text-align:center;}table{width:100%;border-collapse:collapse;margin-top:12px;}td{border:1px solid #ccc;padding:8px 10px;height:34px;vertical-align:middle;}.ph,.mn{color:#888;font-size:13px;width:28%;}.ans{width:24%;}@media print{body{padding:0;}}</style></head><body>" +
      "<h2>默写单 · " + esc(libName) + "（共 " + words.length + " 词）</h2>" +
      "<table><thead><tr><th>单词</th><th>音标</th><th>释义</th><th>默写</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      "<script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script></body></html>");
    w.document.close();
  }
  function exportWordList(libName, words) {
    var lines = ["#name: " + libName, "# 共 " + words.length + " 词", ""];
    words.forEach(function (x) { lines.push([x.w, x.phon, x.mean, x.ex, x.excn].join("|")); });
    download(libName + "_词表.txt", lines.join("\n"));
  }
  function exportLib(lib) {
    var lines = ["#name: " + lib.name, ""];
    lib.units.forEach(function (u) { lines.push("#unit: " + u.title); u.words.forEach(function (x) { lines.push([x.w, x.phon, x.mean, x.ex, x.excn].join("|")); }); });
    download(lib.name + ".txt", lines.join("\n"));
  }
  function download(name, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function mkBack() { var b = mkBtn("← 返回", "", io); var w = document.createElement("div"); w.className = "btn-row mb"; w.appendChild(b); return w; }
  function emptyState(icon, title, sub) {
    var d = document.createElement("div"); d.className = "empty";
    d.innerHTML = '<div class="big">' + icon + "</div><div style='font-weight:700;'>" + title + "</div><div class='muted small mt'>" + sub + "</div>";
    return d;
  }

  /* ---------- 帮助 ---------- */
  function help() {
    UI.clearTimers(); UI.setTitle("帮助");
    var v = view(); v.innerHTML = "";
    v.innerHTML =
      '<div class="card"><h3>功能说明</h3>' +
      '<p class="small">本应用为「E听说单词通」的网页/安卓版，数据与桌面版一致（18 个词库，含小学/初中/高中译林版、中考、高考、新概念、四六级、考研、雅思、托福、PETS 等）。</p>' +
      '<ul class="small" style="padding-left:18px;line-height:1.9;">' +
      "<li><b>词库</b>：按课本单元浏览，可整库或单单元查看、朗读。</li>" +
      "<li><b>学习</b>：看单词/音标/释义/例句，支持听读模式（先听音再显单词）、拼读、收藏、标错。</li>" +
      "<li><b>听写</b>：听音拼写，自动判分并记录错题，可设倒计时。</li>" +
      "<li><b>填空</b>：全默写 / 隐藏字母 / 乱序 三种方式，根据释义或残缺拼写。</li>" +
      "<li><b>错题本</b>：自动收集答错单词，支持单删、批量删、一键清空（二次确认），可重练。</li>" +
      "<li><b>收藏</b>：收藏生词，集中复习。</li>" +
      "<li><b>统计</b>：累计学习、正确率、学习日历、词库分布，可重置。</li>" +
      "<li><b>导入/导出</b>：导入自定义 txt 词库；导出词表、生成可打印默写单。</li>" +
      "</ul></div>" +
      '<div class="card"><h3>朗读说明</h3><p class="small muted">朗读使用浏览器内置语音合成（Web Speech API）。安卓请在 <b>Chrome</b> 中打开本应用；若听不到英文/中文发音，请在系统「设置 → 无障碍 → 文字转语音输出」中安装相应语音包（如 English US、中文）。</p></div>' +
      '<div class="card"><h3>在安卓上使用</h3><p class="small muted">用 Chrome 打开本页面 → 点右上角 ⋮ →「添加到主屏幕」。之后即可像 App 一样从桌面启动，并支持离线使用。</p></div>' +
      '<div class="card"><div class="muted small">版本 v1.3.0-web · 数据同步自桌面版 v1.3.0</div></div>';
  }

  // 全局委托：设置页开关（data-key）变化时写入 Store
  document.addEventListener("change", function (e) {
    var inp = e.target;
    if (!inp || !inp.dataset || !inp.dataset.key) return;
    var key = inp.dataset.key;
    var s = Store.settings();
    var val = inp.type === "checkbox" ? inp.checked : parseFloat(inp.value);
    s[key] = val; Store.saveSettings(s);
    if (key === "countdown_enabled") settings();
    if (key === "font_size") document.documentElement.style.setProperty("--fs", val + "px");
  });

  window.Pages = {
    library: library, study: function () { pickSource("study", studySession); },
    dictation: function () { pickSource("dictation", dictSession); },
    fill: function () { pickSource("fill", fillSession); },
    wrong: wrong, fav: fav, stats: stats, settings: settings, io: io, help: help,
    after: function () {},
  };
})(window);
