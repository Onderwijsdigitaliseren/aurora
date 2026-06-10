/* ============================================================
   STORAGE LAYER (host side) — real browser storage.
   Implements get/set/delete/list with the same shape as the
   original API, so the worlds keep working unchanged.

   Want login + cloud sync later? Replace ONLY the
   window.storage object below with an implementation that
   talks to your backend (e.g. Supabase, Firebase or your own
   API), with localStorage as an offline buffer. Nothing else
   in the app needs to change.
   ============================================================ */
(function () {
  if (window.storage && typeof window.storage.list === 'function') return; // host already provides it
  var NS = 'maanlicht::'; // internal namespace, kept stable so existing user data survives
  function full(k) { return NS + k; }
  function later(fn) { return new Promise(function (res) { res(fn()); }); }
  window.storage = {
    get: function (key) {
      return later(function () {
        var v = localStorage.getItem(full(key));
        return v === null ? null : { key: key, value: v };
      });
    },
    set: function (key, value) {
      return later(function () {
        localStorage.setItem(full(key), String(value));
        return { key: key, value: String(value) };
      });
    },
    delete: function (key) {
      return later(function () {
        localStorage.removeItem(full(key));
        return { key: key, deleted: true };
      });
    },
    list: function (prefix) {
      return later(function () {
        var pre = full(prefix || ''), keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var kk = localStorage.key(i);
          if (kk && kk.indexOf(pre) === 0) keys.push(kk.slice(NS.length));
        }
        return { keys: keys };
      });
    }
  };
})();

/* ============================================================
   BRIDGE HOST — answers storage requests coming from the
   world iframes (see js/bridge.js). Each world gets its own
   key prefix, so worlds can never touch each other's data.
   ============================================================ */
function wkey(w, k) { return w + ':' + k; }

async function handleBridge(world, op, key, value) {
  try {
    if (op === 'get')    return await window.storage.get(wkey(world, key));
    if (op === 'set')    return await window.storage.set(wkey(world, key), value);
    if (op === 'delete') return await window.storage.delete(wkey(world, key));
    if (op === 'list') {
      const r = await window.storage.list(wkey(world, key));
      if (r && r.keys) { const p = world + ':'; r.keys = r.keys.map(k => k.startsWith(p) ? k.slice(p.length) : k); }
      return r;
    }
    if (op === 'lset')   return await window.storage.set(wkey(world, 'ls:' + key), value);
    if (op === 'ldel')   return await window.storage.delete(wkey(world, 'ls:' + key));
    if (op === 'lclear') {
      const r = await window.storage.list(world + ':ls:');
      if (r && r.keys) for (const k of r.keys) { try { await window.storage.delete(k); } catch (e) {} }
      return true;
    }
  } catch (e) { return null; }
}

/* Collect all "localStorage" data of a world, used to prime the
   synchronous cache inside the iframe before it loads. */
async function primeData(world) {
  const out = {};
  try {
    const r = await window.storage.list(world + ':ls:');
    if (r && r.keys) for (const k of r.keys) {
      try { const v = await window.storage.get(k); if (v) out[k.slice((world + ':ls:').length)] = v.value; } catch (e) {}
    }
  } catch (e) {}
  return out;
}

window.addEventListener('message', async (e) => {
  const d = e.data; if (!d || !d.__storageBridge) return;
  if (d.op === 'ready') { if (e.source) e.source.postMessage({ __cachePrimed: true }, '*'); return; }
  const result = await handleBridge(d.world, d.op, d.key, d.value);
  if (e.source) e.source.postMessage({ __storageBridgeReply: true, id: d.id, result }, '*');
});
