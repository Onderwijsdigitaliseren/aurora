/* ============================================================
   STORAGE BRIDGE — loaded by every world iframe.
   Replaces localStorage and window.storage with a proxy that
   talks to the main app via postMessage (the main app owns the
   real window.storage). Keys are prefixed per world.

   Worlds are loaded through the shell (index.html), which
   injects window.__INITIAL_CACHE__ before this script runs,
   so the synchronous localStorage shim has its data ready.
   ============================================================ */
(function () {
  const WORLD = window.__WORLD_PREFIX__ || 'x';
  const parent = window.parent;
  let reqId = 0;
  const pending = {};

  function call(op, key, value) {
    return new Promise((resolve) => {
      const id = ++reqId;
      pending[id] = resolve;
      parent.postMessage({ __storageBridge: true, id, op, world: WORLD, key, value }, '*');
    });
  }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (d && d.__storageBridgeReply && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; }
  });

  /* --- async window.storage proxy --- */
  window.storage = {
    get:    (key)        => call('get', key),
    set:    (key, value) => call('set', key, value),
    delete: (key)        => call('delete', key),
    list:   (prefix)     => call('list', prefix || ''),
  };

  /* --- synchronous localStorage shim ---
     Keeps an in-memory cache (filled by the shell before this
     iframe loaded), reads synchronously, writes async to the
     parent. --- */
  const cache = {};
  try { if (window.__INITIAL_CACHE__) Object.assign(cache, window.__INITIAL_CACHE__); } catch (e) {}
  window.__primeCache = function (obj) { Object.assign(cache, obj || {}); };
  try {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem(k) { return (k in cache) ? cache[k] : null; },
        setItem(k, v) { cache[k] = String(v); call('lset', k, String(v)); },
        removeItem(k) { delete cache[k]; call('ldel', k); },
        clear() { for (const k in cache) delete cache[k]; call('lclear'); },
        key(i) { return Object.keys(cache)[i] || null; },
        get length() { return Object.keys(cache).length; }
      }
    });
  } catch (e) { /* localStorage already defined; ignore */ }

  /* signal the parent that this iframe is ready */
  parent.postMessage({ __storageBridge: true, op: 'ready', world: WORLD }, '*');
})();
