/* Camada mínima que substitui o runtime do painel: carrega CSV/JSON locais e expõe a mesma API (dash.data, dash.calc, dash.onData, dash.setLink, dash.colors). */
(function () {
  const BASE = 'data/';
  const store = {};          // id -> {status, data}
  const calcs = {};          // id -> {inputs, fn}
  const subs = [];
  const loading = {};
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const PAL = {
    light: ['#2a78d6', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#6250d6', '#e34948'],
    dark:  ['#3987e5', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#9085e9', '#e66767']
  };
  let timer = null;
  function notify() { clearTimeout(timer); timer = setTimeout(() => subs.forEach(f => { try { f(); } catch (e) { console.error(e); } }), 0); }
  function load(id) {
    if (loading[id]) return; loading[id] = true;
    store[id] = {status: 'loading', data: []};
    const csv = !id.startsWith('galeria_');
    fetch(BASE + id + (csv ? '.csv' : '.json') + '?v=' + Date.now(), {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(r.status); return csv ? r.text() : r.json(); })
      .then(x => { store[id] = {status: 'ok', data: csv ? d3.csvParse(x) : x}; notify(); })
      .catch(e => { console.error(id, e); store[id] = {status: 'error', data: [], error: String(e)}; notify(); });
  }
  function data(id) {
    if (calcs[id]) {
      const c = calcs[id], ins = c.inputs.map(data);
      if (ins.some(i => i.status === 'error')) return {status: 'error', data: []};
      if (ins.some(i => i.status !== 'ok')) return {status: 'loading', data: []};
      if (!c.cache || c.cache.src.some((s, k) => s !== ins[k].data)) c.cache = {src: ins.map(i => i.data), out: c.fn(...ins.map(i => i.data))};
      return {status: 'ok', data: c.cache.out};
    }
    if (!store[id]) load(id);
    return store[id];
  }
  window.dash = {
    get colors() { return PAL[dark.matches ? 'dark' : 'light']; },
    data,
    calc(id, def) { calcs[id] = def; },
    onData(fn) { subs.push(fn); notify(); },
    setLink(h) { try { history.replaceState(null, '', '#' + h); } catch (e) {} }
  };
  ['projetos', 'produtos', 'indicadores'].forEach(load);
})();
