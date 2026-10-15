/* ===== 词库数据加载（懒加载 + 缓存） ===== */
(function (global) {
  "use strict";
  var cache = {};
  var indexCache = null;

  function loadIndex(cb) {
    if (indexCache) { cb(indexCache); return; }
    fetch("data/index.json").then(function (r) { return r.json(); }).then(function (j) {
      indexCache = j; cb(j);
    }).catch(function (e) { console.error("loadIndex", e); cb([]); });
  }
  function getLib(id, cb) {
    if (cache[id]) { cb(cache[id]); return; }
    fetch("data/libs/" + id + ".json").then(function (r) { return r.json(); }).then(function (j) {
      cache[id] = j; cb(j);
    }).catch(function (e) { console.error("getLib", id, e); cb(null); });
  }
  // 取某库部分单元的单词，附带 lib/unit 信息
  function flatten(lib, unitIdxs) {
    var out = [];
    lib.units.forEach(function (u, i) {
      if (unitIdxs && unitIdxs.indexOf(i) < 0) return;
      u.words.forEach(function (w) {
        out.push({
          w: w.w, phon: w.phon, mean: w.mean, ex: w.ex, excn: w.excn,
          lib: lib.id, libName: lib.name, unit: u.title, unitIdx: i,
        });
      });
    });
    return out;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  window.DATA = {
    loadIndex: loadIndex,
    getLib: getLib,
    flatten: flatten,
    shuffle: shuffle,
    _cache: cache,
  };
})(window);
