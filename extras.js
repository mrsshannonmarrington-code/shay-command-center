// Sections for the newer sheet tabs: capacity, readiness, drops, metrics, marketing, data health.
(() => {
const D = window.SHEETS, C = D.command;
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const raw = n => (C[n] || []).map(r => r.map(c => (c || '').trim()));
const blank = r => !r || !r.some(Boolean);
const objs = (v, from = 1, to = v.length) => { const h = v[0] || []; const out = [];
  for (let i = from; i < to; i++) { if (blank(v[i])) continue; out.push(Object.fromEntries(h.map((k, j) => [k, v[i][j] || '']))); } return out; };
function parseDate(s){
  if(!s) return null; s = s.trim(); let m;
  if((m = s.match(/^([A-Z][a-z]{2}) (\d{1,2}),? (\d{4})/))) return new Date(+m[3], MON.indexOf(m[1]), +m[2]);
  if((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))){ let y=+m[3]; if(y<100) y+=2000; return new Date(y, +m[1]-1, +m[2]); }
  if((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], +m[2]-1, +m[3]);
  return null;
}
const nowET = new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
const TODAY = new Date(nowET.getFullYear(), nowET.getMonth(), nowET.getDate());
const dd = d => Math.round((d - TODAY) / 864e5);
const fmt = (d, y) => `${MON[d.getMonth()]} ${d.getDate()}${y || d.getFullYear() !== TODAY.getFullYear() ? ', ' + d.getFullYear() : ''}`;
const fd = s => { const d = parseDate(s); return d ? fmt(d) : esc(s || '—'); };
const until = d => { const n = dd(d); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 0 ? `in ${n} days` : `${-n} day${n===-1?'':'s'} ago`; };
const host = u => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return u; } };

const projects = objs(raw('Projects'));
const pName = Object.fromEntries(projects.map(p => [p.ID, p.Project]));
const tasks = objs(raw('Task Register'));
const tName = Object.fromEntries(tasks.map(t => [t['Task ID'], t['Small Objective']]));

// portfolio subtitle
const ps = $('#portSub');
if (ps && projects.length) ps.textContent = `${projects.length} projects across ${new Set(projects.map(p => p.Area)).size} life areas`;

// ---------- EXECUTION & CAPACITY
(() => {
  const v = raw('Execution & Capacity'); if (!v.length) return;
  let end = v.findIndex((r, i) => i > 0 && blank(r)); if (end < 0) end = v.length;
  const items = objs(v, 1, end);
  const ri = v.findIndex(r => r[0] === 'Capacity rules');
  const rules = ri >= 0 ? v.slice(ri + 1).filter(r => !blank(r)) : [];
  const over = items.filter(x => /over/i.test(x.Capacity)).length;
  $('#capSummary').textContent = `${items.length} blocks · ${over} over capacity`;
  $('#capList').innerHTML = items.map(x => {
    const need = +x['Minutes needed'] || 0, have = +x['Minutes available'] || 0, ov = /over/i.test(x.Capacity);
    const pct = need ? Math.min(100, Math.round(have / need * 100)) : 100;
    return `<div class="cap ${ov ? 'over' : ''}">
      <div class="cap-when"><b>${esc(x.Day)}</b><small>Wk of ${esc(x.Week)}</small></div>
      <div class="cap-main"><p>${esc(x.Action)}</p><small class="muted">${esc(x['Focus block'])} · ${esc(x.Task)} · ${esc(pName[x.Project] || x.Project)}${x.Dependency ? ' · needs ' + esc(x.Dependency) : ''}</small>
        <div class="cap-bar" aria-label="${have} of ${need} minutes available"><i style="width:${pct}%"></i></div></div>
      <div class="cap-num"><b>${have}/${need}</b><small>min</small><span class="tag ${ov ? 'hot' : 'low'}">${esc(x.Capacity)}</span></div>
    </div>`;
  }).join('');
  $('#capRules').innerHTML = rules.length ? `<h4>Capacity rules</h4><dl>${rules.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1] || '')}</dd></div>`).join('')}</dl>` : '';
})();

// ---------- PUBLISHING READINESS
(() => {
  const v = raw('Publishing Readiness'); if (!v.length) return;
  const h = v[0], body = v.slice(1).filter(r => !blank(r));
  const steps = h.slice(2, h.indexOf('Readiness') > 0 ? h.indexOf('Readiness') : h.length - 2);
  const cls = s => /^(verified|started|done|complete|approved|yes)/i.test(s) || /reported published/i.test(s) ? 'ok'
    : /n\/a/i.test(s) ? 'na' : /not verified|unverified|missing/i.test(s) ? 'warn' : 'wait';
  const rCls = s => /risk/i.test(s) ? 'hot' : /verify/i.test(s) ? 'high' : /planning/i.test(s) ? 'medium' : 'neutral';
  $('#readyTable').innerHTML = `<thead><tr><th>Book</th><th>Target</th>${steps.map(s => `<th>${esc(s)}</th>`).join('')}<th>Readiness</th><th>Notes</th></tr></thead><tbody>` +
    body.map(r => { const o = Object.fromEntries(h.map((k, i) => [k, r[i] || ''])); return `<tr><td><b>${esc(o.Book)}</b></td><td class="nowrap">${esc(o.Target)}</td>${steps.map(s => `<td><span class="st ${cls(o[s])}" title="${esc(o[s])}">${esc(o[s] || '—')}</span></td>`).join('')}<td><span class="tag ${rCls(o.Readiness)}">${esc(o.Readiness)}</span></td><td class="muted small">${esc(o.Notes)}</td></tr>`; }).join('') + '</tbody>';
})();

// ---------- SNEAKER & TEE DROPS
(() => {
  const items = objs(raw('Sneaker & Tee Drops')).map(x => ({...x, sr: parseDate(x['Shoe release']), td: parseDate(x['Shirt latest drop']), aa: parseDate(x['Artwork approval'])}))
    .sort((a, b) => (a.sr || 9e15) - (b.sr || 9e15));
  if (!items.length) { $('#dropGrid').innerHTML = '<p class="muted">No drops planned yet.</p>'; return; }
  $('#dropGrid').innerHTML = items.map((x, i) => {
    const official = /nike|snkrs|official/i.test(x.Verification);
    const next = x.aa && dd(x.aa) >= 0 ? {l: 'Artwork approval', d: x.aa} : x.td && dd(x.td) >= 0 ? {l: 'Shirt drop', d: x.td} : x.sr ? {l: 'Shoe release', d: x.sr} : null;
    const n = next ? dd(next.d) : null;
    return `<div class="drop ${i === 0 ? 'first' : ''}">
      <div class="drop-top"><span class="tag ${official ? 'low' : 'medium'}">${official ? 'Confirmed' : 'Forecast'}</span><span class="muted small">${esc(x.Status)}</span></div>
      <h4>${esc(x.Shoe)}</h4>
      ${next ? `<div class="drop-cd"><b>${n === 0 ? 'Today' : n < 0 ? '—' : n}</b><span>${n > 0 ? (n===1?'day':'days')+' to ' : ''}${esc(next.l.toLowerCase())}${n === 0 ? '' : ''}</span></div>` : ''}
      <ol class="drop-steps">
        <li class="${x.aa && dd(x.aa) < 0 ? 'past' : ''}"><span>Artwork approved</span><b>${fd(x['Artwork approval'])}</b></li>
        <li class="${x.td && dd(x.td) < 0 ? 'past' : ''}"><span>Shirt drop + campaign</span><b>${fd(x['Shirt latest drop'])}</b></li>
        <li class="${x.sr && dd(x.sr) < 0 ? 'past' : ''}"><span>Shoe release</span><b>${fd(x['Shoe release'])}</b></li>
      </ol>
      <p class="muted small">${esc(x.Verification)}${x.Source ? ` · <a href="${esc(x.Source)}" target="_blank" rel="noopener">${esc(host(x.Source))}</a>` : ''}</p>
    </div>`;
  }).join('');
})();

// ---------- COMMERCIAL METRICS
(() => {
  const v = raw('Commercial Metrics'); if (!v.length) return;
  const h = v[0], body = v.slice(1).filter(r => !blank(r));
  const nums = ['Visits','Leads','Orders','Revenue','Cost','Contribution','Conversion'];
  const reporting = body.filter(r => nums.some(k => r[h.indexOf(k)])).length;
  $('#metricSummary').textContent = `${reporting} of ${body.length} channels reporting`;
  const cols = ['Project','Period','Channel', ...nums.filter(k => h.includes(k)), 'Source'];
  $('#metricTable').innerHTML = `<thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>` + body.map(r => `<tr>${cols.map(c => {
    const val = r[h.indexOf(c)] || '';
    if (nums.includes(c)) return `<td class="num-cell ${val ? '' : 'empty'}">${val ? esc(val) : '—'}</td>`;
    if (c === 'Source') return `<td class="muted small">${esc(val)}</td>`;
    return `<td${c === 'Project' ? ' class="strong"' : ''}>${esc(val)}</td>`;
  }).join('')}</tr>`).join('') + '</tbody>';
})();

// ---------- MARKETING STRATEGY
(() => {
  const items = objs(raw('Marketing Strategy')).map(x => ({...x, d: parseDate(x['First due'])})).sort((a, b) => (a.d || 9e15) - (b.d || 9e15));
  if (!items.length) return;
  const soon = items.filter(x => x.d && dd(x.d) >= 0 && dd(x.d) <= 7).length;
  const measured = items.filter(x => x.Actual).length;
  $('#mkSummary').textContent = `${items.length} campaigns · ${soon} start this week · ${measured} measured so far`;
  $('#mkGrid').innerHTML = items.map(x => {
    const n = x.d ? dd(x.d) : null; const hot = n !== null && n >= 0 && n <= 7;
    return `<div class="mk ${hot ? 'soon' : ''}">
      <div class="mk-top"><span class="series">${esc(x.Project)} · ${esc(pName[x.Project] || x.Campaign)}</span><span class="tag ${hot ? 'hot' : 'neutral'}">${x.d ? (n < 0 ? fmt(x.d) : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + 'd') : '—'}</span></div>
      <h4>${esc(x.Strategy)}</h4>
      <p class="muted small">For ${esc(x.Audience)} · ${esc(x.Cadence)}</p>
      <div class="mk-kpi"><span>KPI</span><b>${esc(x.KPI)}</b><em>${esc(x.Actual || x['Goal / target'] || '')}</em></div>
      <p class="mk-foot"><span>First due ${x.d ? fmt(x.d) : esc(x['First due'])}</span><span>${esc(x.Status)}${x['Review status'] ? ' · ' + esc(x['Review status']) : ''}</span></p>
    </div>`;
  }).join('');
})();

// ---------- DATA HEALTH
(() => {
  const v = raw('Date Coverage Audit');
  if (v.length) {
    const qi = v.findIndex(r => /quality checks/i.test(r[0] || ''));
    const cov = v.slice(1, qi > 0 ? qi : v.length).filter(r => !blank(r));
    const q = qi > 0 ? v.slice(qi + 1).filter(r => !blank(r)) : [];
    const row = r => { const n = +r[1]; const isNum = r[1] !== '' && !isNaN(n);
      return `<div class="exc"><span>${esc(r[0])}<br><small class="muted">${esc(r[2] || '')}</small></span><b class="${isNum ? (n > 0 ? 'warn' : 'zero ok') : 'date'}">${isNum ? (n === 0 ? '✓ 0' : n) : fd(r[1])}</b></div>`; };
    $('#coverage').innerHTML = cov.map(row).join('');
    $('#quality').innerHTML = q.map(row).join('') || '<p class="muted">No checks listed.</p>';
  }
  const ev = objs(raw('Completion Evidence'));
  const withLink = ev.filter(x => x['Evidence link']).length;
  $('#evSummary').textContent = `${ev.length} completions · ${withLink} with evidence attached`;
  $('#evTable').innerHTML = ev.length ? `<thead><tr><th>Task</th><th>Status</th><th>Completed</th><th>Evidence</th><th>Review</th><th>Review by</th><th>Notes</th></tr></thead><tbody>` + ev.map(x => {
    const rb = parseDate(x['Review by']);
    return `<tr><td><span class="id">${esc(x['Task ID'])}</span><br>${esc(tName[x['Task ID']] || '')}</td><td><span class="tag low">${esc(x['Reported status'])}</span></td><td class="nowrap">${x['Completed date'] ? fd(x['Completed date']) : '<span class="muted">Missing</span>'}</td><td>${x['Evidence link'] ? `<a href="${esc(x['Evidence link'])}" target="_blank" rel="noopener">Open</a>` : '<span class="st warn">None yet</span>'}</td><td>${esc(x['Review decision'])}</td><td class="nowrap">${rb ? `${fmt(rb)}<br><small class="muted">${until(rb)}</small>` : esc(x['Review by'])}</td><td class="muted small">${esc(x.Notes)}</td></tr>`;
  }).join('') + '</tbody>' : '<tbody><tr><td class="muted">No completions to review.</td></tr></tbody>';
})();
})();
