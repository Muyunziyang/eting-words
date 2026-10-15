/* ===== 语音朗读 =====
 * 策略：优先使用「在线音频 TTS」（有道词典发音 / 谷歌翻译发音）。
 *  - 通过 <audio> 直接播放，QQ 浏览器、夸克、Chrome、Safari、Firefox 等任意浏览器都能放；
 *  - 不依赖手机系统自带的 TTS 引擎（荣耀 / 小米 / 华为等国产引擎差异大、容易静音）；
 *  - 有道为国内服务，英文发音稳定可用；中文走谷歌（国内可能偏慢，仅“朗读中文释义”用到）。
 * 兜底：当音频加载失败（如完全断网）且浏览器支持 Web Speech API 时，退回系统 TTS。
 */
(function (global) {
  "use strict";

  var synth = global.speechSynthesis || null;
  var webSpeech = !!synth;            // 系统 TTS 是否可用（仅作离线兜底）
  var currentAudio = null;            // 当前正在播放的 <audio>
  var token = 0;                      // 请求序号，用于打断旧播放

  function isZh(text) {
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 0x4e00 && c <= 0x9fff) return true;
    }
    return false;
  }

  // 构造在线发音音频地址
  function audioUrl(text, lang) {
    var t = encodeURIComponent(text);
    if (lang && lang.indexOf("zh") === 0) {
      // 中文：谷歌翻译 TTS（兜底用途）
      return "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=" + t;
    }
    // 英文：有道词典发音（国内稳定、音质好）
    return "https://dict.youdao.com/dictvoice?audio=" + t + "&type=2";
  }

  // 播放单个音频；结束/出错分别回调
  function playOne(url, onend, onerr) {
    try {
      if (currentAudio) {
        currentAudio.onended = null; currentAudio.onerror = null;
        try { currentAudio.pause(); } catch (e) {}
      }
    } catch (e) {}
    var a = new Audio();
    currentAudio = a;
    a.src = url;
    a.onended = function () { if (onend) onend(); };
    a.onerror = function () { if (onerr) onerr(); };
    var p = a.play();
    if (p && p.catch) { p.catch(function () { if (onerr) onerr(); }); }
  }

  // 用系统 TTS 朗读一句（音频失败时的兜底）
  function speakWeb(text, lang, ondone) {
    if (!webSpeech) { if (ondone) ondone(); return; }
    try {
      if (synth.resume) try { synth.resume(); } catch (e) {}
      if (synth.speaking) try { synth.cancel(); } catch (e) {}
      var u = new SpeechSynthesisUtterance(text);
      u.lang = (lang && lang.indexOf("zh") === 0) ? "zh-CN" : "en-US";
      u.onend = function () { if (ondone) ondone(); };
      u.onerror = function () { if (ondone) ondone(); };
      synth.speak(u);
    } catch (e) { if (ondone) ondone(); }
  }

  // 依次播放一组文本（长句拆句 / 逐字母拼读）
  function playSequence(items, lang, onend) {
    var my = ++token;
    var i = 0;
    function next() {
      if (my !== token) return;               // 已被新的朗读请求打断
      if (i >= items.length) { if (onend) onend(); return; }
      var txt = items[i++];
      playOne(audioUrl(txt, lang), next, function () {
        // 音频失败 → 退回系统 TTS（仅这一句），再继续
        speakWeb(txt, lang, next);
      });
    }
    next();
  }

  // 朗读单词 / 整句
  function speak(text, opts) {
    opts = opts || {};
    if (!text) return false;
    var lang = opts.lang || (isZh(text) ? "zh-CN" : "en-US");
    var base;
    if (text.indexOf(" ") === -1) {
      base = [text];                           // 单词：整体发音
    } else {
      base = text.match(/[^.!?;。！？；]+[.!?;。！？；]*/g) || [text];
      base = base.map(function (s) { return s.trim(); }).filter(Boolean);
      if (!base.length) base = [text];
    }
    // 重复次数（在线音频为固定语速，用“连读几遍”代替调速）
    var rep = opts.repeat != null ? opts.repeat : (Store.settings().repeat_times || 1);
    rep = Math.max(1, Math.min(5, rep | 0));
    var items = [];
    for (var r = 0; r < rep; r++) items = items.concat(base);
    playSequence(items, lang, opts.onend);
    return true;
  }

  // 拼读（逐字母）
  function spell(word, opts) {
    if (!word) return;
    opts = opts || {};
    var letters = word.replace(/[^a-zA-Z]/g, "").toUpperCase().split("");
    if (!letters.length) return;
    // 字母用在线音频逐个播放（跨浏览器一致）
    playSequence(letters, "en-US", opts.onend);
  }

  function stop() {
    token++;                                   // 打断正在进行的序列
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} }
    if (webSpeech) { try { synth.cancel(); } catch (e) {} }
  }

  global.SPEECH = {
    supported: true,        // 只要能联网即可发声（覆盖所有主流手机浏览器）
    webSpeech: webSpeech,   // 是否还具备系统 TTS 兜底能力
    speak: speak,
    spell: spell,
    stop: stop,
    isZh: isZh,
    voices: function () { return []; },
    ready: function () { return true; },
  };
})(window);
