/* ===== 语音朗读（Web Speech API） ===== */
(function (global) {
  "use strict";
  var synth = global.speechSynthesis || null;
  var voices = [];
  var ready = false;
  var supported = !!synth;
  var currentU = null; // 保留当前 utterance 引用，防止被 GC 导致安卓端无声
  var spellU = [];     // 保留拼读各字母的 utterance 引用

  function loadVoices() {
    if (!synth) return;
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
    ready = voices.length > 0;
  }
  if (supported) {
    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }
  function pickVoice(lang) {
    if (!voices.length) return null;
    var pref = lang || "en";
    var cand = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(pref) === 0; });
    if (cand.length) return cand[0];
    // 退而求其次：包含该语言片段
    cand = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(pref) >= 0; });
    return cand.length ? cand[0] : voices[0];
  }
  function isZh(text) {
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 0x4e00 && c <= 0x9fff) return true;
    }
    return false;
  }
  function speak(text, opts) {
    opts = opts || {};
    if (!supported || !text) return false;
    try { if (synth.speaking) synth.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(text);
    var lang = opts.lang || (isZh(text) ? "zh-CN" : "en-US");
    var v = pickVoice(lang.slice(0, 2));
    if (v) u.voice = v;
    u.lang = lang;
    u.rate = opts.rate != null ? opts.rate : (Store.settings().speech_rate || 1);
    u.volume = (Store.settings().speech_volume != null ? Store.settings().speech_volume : 100) / 100;
    if (opts.onend) u.onend = opts.onend;
    currentU = u; // 关键：保留引用，避免被垃圾回收造成安卓端无声
    try { synth.speak(u); } catch (e) { return false; }
    return true;
  }
  function spell(word, opts) {
    if (!supported || !word) return;
    var letters = word.replace(/[^a-zA-Z]/g, "").toUpperCase().split("");
    if (!letters.length) return;
    opts = opts || {};
    spellU = [];
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
