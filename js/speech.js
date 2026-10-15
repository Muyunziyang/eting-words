/* ===== 语音朗读（Web Speech API，兼容国产 TTS 引擎） ===== */
(function (global) {
  "use strict";
  var synth = global.speechSynthesis || null;
  var voices = [];
  var ready = false;
  var supported = !!synth;
  var currentU = null;   // 保留当前 utterance 引用，防止被 GC 导致安卓端无声
  var spellU = [];       // 保留拼读各字母的 utterance 引用
  var speakToken = 0;    // 用于识别"最新一次朗读"，避免重试误伤新请求

  function loadVoices() {
    if (!synth) return;
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
    ready = voices.length > 0;
  }
  if (supported) {
    loadVoices();
    // 部分国产引擎会延迟加载嗓音，监听变化持续刷新
    try { synth.onvoiceschanged = loadVoices; } catch (e) {}
  }

  // 选择最匹配的嗓音：精确语言 → 语言前缀 → 包含 → 兜底第一个
  function pickVoice(lang) {
    if (!voices.length) return null;
    var target = (lang || "en-US").toLowerCase().replace("_", "-");
    var pref = target.slice(0, 2);
    var byExact = voices.filter(function (v) { return (v.lang || "").toLowerCase().replace("_", "-") === target; });
    if (byExact.length) return byExact[0];
    var byPref = voices.filter(function (v) { return (v.lang || "").toLowerCase().indexOf(pref) === 0; });
    if (byPref.length) return byPref[0];
    var byContain = voices.filter(function (v) { return (v.lang || "").toLowerCase().indexOf(pref) >= 0; });
    if (byContain.length) return byContain[0];
    return voices[0];
  }

  function isZh(text) {
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 0x4e00 && c <= 0x9fff) return true;
    }
    return false;
  }

  function doSpeak(text, opts) {
    try { if (synth.speaking) synth.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(text);
    var lang = opts.lang || (isZh(text) ? "zh-CN" : "en-US");
    u.lang = lang;
    var v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = opts.rate != null ? opts.rate : (Store.settings().speech_rate || 1);
    u.volume = (Store.settings().speech_volume != null ? Store.settings().speech_volume : 100) / 100;
    currentU = u; // 关键：保留引用，避免被垃圾回收造成安卓端无声
    var token = ++speakToken;
    var started = false;
    u.onstart = function () { started = true; };
    if (opts.onend) u.onend = opts.onend;
    try { synth.speak(u); } catch (e) {}
    // 国产部分 TTS 引擎首次 speak 可能无声：400ms 内若无任何响应则重试一次
    setTimeout(function () {
      if (token !== speakToken) return;            // 已有更新的朗读请求
      if (!started && !synth.speaking) {
        try { synth.speak(u); } catch (e) {}
      }
    }, 400);
    return true;
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!supported || !text) return false;
    loadVoices(); // 每次朗读前刷新嗓音列表（应对引擎延迟加载）
    return doSpeak(text, opts);
  }

  function spell(word, opts) {
    if (!supported || !word) return;
    spellU = [];
    var letters = word.replace(/[^a-zA-Z]/g, "").toUpperCase().split("");
    if (!letters.length) return;
    opts = opts || {};
    var rate = opts.rate != null ? opts.rate : (Store.settings().speech_rate || 1) * 0.8;
    letters.forEach(function (ch, i) {
      setTimeout(function () {
        if (!supported) return;
        try { if (synth.speaking) synth.cancel(); } catch (e) {}
        var u = new SpeechSynthesisUtterance(ch);
        var v = pickVoice("en"); if (v) u.voice = v;
        u.lang = "en-US"; u.rate = rate;
        spellU.push(u); // 保留引用，防止被 GC
        try { synth.speak(u); } catch (e) {}
      }, i * 420);
    });
  }

  function stop() { if (supported) { try { synth.cancel(); } catch (e) {} } }

  global.SPEECH = {
    supported: supported,
    speak: speak,
    spell: spell,
    stop: stop,
    isZh: isZh,
    voices: function () { return voices; },
    ready: function () { return ready; },
  };
})(window);
