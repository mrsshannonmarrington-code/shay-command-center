(() => {
const D = window.SHEETS, C = D.command, S = D.shay;
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rows = (sheet, hdr = 0) => {
  const v = sheet || []; const h = (v[hdr] || []).map(x => x.trim());
  return v.slice(hdr + 1).filter(r => r.some(c => c && c.trim())).map(r => Object.fromEntries(h.map((k, i) => [k, (r[i] || '').trim()])));
};
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function parseDate(s){
  if(!s) return null; s = s.trim();
  let m = s.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);
  if(m) return new Date(+m[3], MON.indexOf(m[1]), +m[2]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if(m){ let y=+m[3]; if(y<100) y+=2000; return new Date(y, +m[1]-1, +m[2]); }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return new Date(+m[1], +m[2]-1, +m[3]);
  if(/^\d{5}$/.test(s)){ const d = new Date(Date.UTC(1899,11,30) + (+s)*864e5); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
  return null;
}
// "today" in Eastern Time
const nowET = new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
const TODAY = new Date(nowET.getFullYear(), nowET.getMonth(), nowET.getDate());
const dayDiff = d => Math.round((d - TODAY) / 864e5);
const fmt = d => `${MON[d.getMonth()]} ${d.getDate()}`;
const prTag = p => `<span class="tag ${(p||'').toLowerCase()||'neutral'}">${esc(p||'—')}</span>`;
const money = n => '$' + n.toLocaleString('en-US');

// data
const projects = rows(C['Projects']);
const tasks = rows(C['Task Register']);
const focus = rows(C['Weekly Focus Blocks']);
const briefs = rows(C['Daily Briefs']);
const links = rows(C['Links & Setup']);
const exec2 = rows(C['Two-Week Execution']);
const miles = rows(C['Project Milestones']);
const exceptions = rows(C['Exception Monitor']);
const books = rows(C['Book Publishing Tracker']);
const check = rows(S['90-Day Checklist']);
const agencies = rows(S['Agency Applications']);
const casting = rows(S['Casting Tracker']).filter(r => r['Project / casting']);
const budget = rows(S['Budget']);
const email = rows(S['Agency Email']);
const projById = Object.fromEntries(projects.map(p => [p.ID, p]));

const openTasks = tasks.filter(t => !/complete/i.test(t.Status));
const doneTasks = tasks.length - openTasks.length;
const hours = tasks.filter(t => !/complete/i.test(t.Status)).reduce((a, t) => a + (+t.Minutes || 0), 0) / 60;

document.querySelectorAll('#stamp,#stamp2').forEach(el => el.innerHTML = `<i></i>Synced from Google Sheets · ${esc(D.updated)}` + (D.quick && el.id==='stamp' ? ` · <a class="qlink" href="${esc(D.quick)}" target="_blank" rel="noopener">Quick update →</a>` : ''));

// ---------- HERO KPIs
const unit = tasks.filter(t => t['Due Date'] && t.Status !== 'Completed').map(t => ({t, d: parseDate(t['Due Date'])})).filter(x => x.d && dayDiff(x.d) >= 0).sort((a,b)=>a.d-b.d)[0];
const kp = [
  {l:'Projects', v:projects.length, s:Object.entries(projects.reduce((a,p)=>(a[p.Phase||'Other']=(a[p.Phase||'Other']||0)+1,a),{})).map(([k,v])=>`${v} ${k.toLowerCase()}`).join(' · ')},
  {l:'Open tasks', v:openTasks.length, s:`${doneTasks} completed · ${hours.toFixed(1)} hrs planned`},
  {l:'Casting submissions', v:casting.length, s:`${new Set(casting.map(c=>c.Platform)).size} platforms · 0 bookings yet`},
  unit ? {l:'Next deadline', v: dayDiff(unit.d)===0 ? 'Today' : `${dayDiff(unit.d)}d`, s: unit.t['Small Objective'].replace('Complete and submit ',''), a:true}
       : {l:'Milestones', v:miles.length, s:'tracked'}
];
$('#heroKpis').innerHTML = kp.map(k => `<div class="kpi ${k.a?'accent':''}"><span>${esc(k.l)}</span><b data-count="${typeof k.v==='number'?k.v:''}">${esc(k.v)}</b><small>${esc(k.s)}</small></div>`).join('');

// ---------- TODAY
$('#todayLabel').textContent = `${DAYS[TODAY.getDay()]}, ${MON[TODAY.getMonth()]} ${TODAY.getDate()}, ${TODAY.getFullYear()}`;
const upcoming = [];
tasks.forEach(t => { const d = parseDate(t['Due Date']); if(d && t.Status!=='Completed') upcoming.push({d, title:t['Small Objective'], sub:`Task ${t['Task ID']} · ${t['Definition of Done']}`, kind:'Due'}); });
casting.forEach(c => { const d = parseDate(c['Audition date']); if(d) upcoming.push({d, title:`Audition: ${c['Project / casting']}`, sub:[c.Platform,c.Location].filter(Boolean).join(' · '), kind:'Audition'}); });
miles.forEach(m => { const d = parseDate(m['Target date']); if(d && m.Status!=='Completed' && dayDiff(d)>=0 && dayDiff(d)<=3) upcoming.push({d, title:m['Actionable milestone'], sub:`Milestone ${m['Milestone ID']} · ${projById[m['Project ID']]?.Project||''}`, kind:'Milestone'}); });
const up = upcoming.filter(u => dayDiff(u.d) >= 0).sort((a,b)=>a.d-b.d).slice(0,5);
$('#deadlines').innerHTML = `<h3>Coming up</h3>` + (up.length ? up.map(u => {
  const dd = dayDiff(u.d);
  return `<div class="dl ${dd<=1?'urgent':''}"><div class="dl-date"><small>${MON[u.d.getMonth()]}</small><b>${u.d.getDate()}</b></div><div><p>${esc(u.title)}</p><em>${esc(u.sub)}</em></div><span class="tag ${dd===0?'hot':'neutral'}" style="margin-left:auto">${dd===0?'Today':dd===1?'Tomorrow':'In '+dd+'d'}</span></div>`;
}).join('') : '<p>No dated items ahead.</p>');

const b = briefs.find(x => x.Day === DAYS[TODAY.getDay()]) || briefs[0];
$('#dayTheme').innerHTML = `<div class="theme-day"><span class="tag low">${esc(b.Day)} theme</span><h4 style="margin-top:12px">${esc(b.Theme)}</h4><p class="muted small">Review: ${esc(b.Review)}</p>
<ul class="prompt-list">${b['Three Action Prompts'].split(';').map(p=>`<li>${esc(p.trim().replace(/^./,c=>c.toUpperCase()))}</li>`).join('')}</ul><p class="muted small" style="margin-top:14px">Reference: ${esc(b.Reference)}</p></div>`;

$('#exceptions').innerHTML = `<h3>Exception monitor</h3>` + exceptions.map(e => {
  const v = e['Live count']; const n = +v; const cls = isNaN(n) ? '' : n>0 ? 'warn' : 'zero';
  return `<div class="exc"><span>${esc(e['EXCEPTION MONITOR'])}<br><small class="muted">${esc(e.Interpretation)}</small></span><b class="${cls}">${esc(v)}</b></div>`;
}).join('');

// task table
const areas = ['All', ...new Set(tasks.map(t => t.Area))];
let taskArea = 'All';
function renderTasks(){
  const list = tasks.filter(t => taskArea==='All' || t.Area===taskArea).sort((a,b)=>(a.Priority==='High'?0:1)-(b.Priority==='High'?0:1));
  $('#taskTable').innerHTML = `<thead><tr><th>ID</th><th>Objective</th><th>Area</th><th>Priority</th><th>Day</th><th>Min</th><th>Due</th><th>Status</th><th>Plan</th></tr></thead><tbody>` +
  list.map(t => `<tr><td class="id">${esc(t['Task ID'])}</td><td><b style="font-weight:600">${esc(t['Small Objective'])}</b><br><small class="muted">${esc(t['Definition of Done'])}</small></td><td>${esc(t.Area)}</td><td>${prTag(t.Priority)}</td><td>${esc(t['Target Day'])}</td><td class="n">${esc(t.Minutes)}</td><td style="white-space:nowrap">${t['Due Date']?`<span class="tag ${dayDiff(parseDate(t['Due Date']))<=0?'hot':'high'}">${esc(t['Due Date'])}</span>`:'<span class="muted">—</span>'}</td><td><span class="tag neutral">${esc(t.Status)}</span></td><td>${t['File / Doc URL']?`<a href="${esc(t['File / Doc URL'])}" target="_blank" rel="noopener">Open</a>`:''}</td></tr>`).join('') + '</tbody>';
}
$('#taskFilter').innerHTML = areas.map(a => `<button class="chip ${a==='All'?'on':''}" data-a="${esc(a)}">${esc(a)}</button>`).join('');
$('#taskFilter').addEventListener('click', e => { const a = e.target.dataset.a; if(!a) return; taskArea = a; $('#taskFilter').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on', c.dataset.a===a)); renderTasks(); });
renderTasks();

// ---------- PORTFOLIO
const areaColor = {WORK:'--teal',CAREER:'--accent',FINANCE:'--gold',EDUCATION:'--plum',PUBLISHING:'--teal',DIGITAL:'--gold',CREATIVE:'--accent',ENTERTAINMENT:'--plum',HOME:'--gold',FAMILY:'--teal',SUPPORT:'--accent'};
$('#projGrid').innerHTML = projects.map(p => {
  const ms = +p.Milestones||0, dn = +p.Completed||0, pct = ms ? Math.round(dn/ms*100) : 0;
  return `<a class="proj" href="${esc(p['Drive folder URL'])}" target="_blank" rel="noopener" style="--c:var(${areaColor[p.Area]||'--teal'})">
  <div class="proj-top"><span class="area" style="color:var(${areaColor[p.Area]||'--teal'})">${esc(p.ID)} · ${esc(p.Area)}</span>${prTag(p.Priority)}</div>
  <h4>${esc(p.Project)}</h4><p>${esc(p['Outcome / Scope'])}</p>
  <div class="bar" title="${pct}% of milestones complete"><i style="width:${Math.max(pct,2)}%"></i></div>
  <div class="proj-foot"><span>${dn}/${ms} milestones</span><span>${esc(p['Open tasks'])} open tasks · ${esc(p.Phase)}</span></div></a>`;
}).join('');

// ---------- MILESTONES TIMELINE
const mDates = miles.map(m => parseDate(m['Target date'])).filter(Boolean);
const start = new Date(Math.min(...mDates, TODAY) - 864e5), end = new Date(Math.max(...mDates) + 864e5);
const span = Math.round((end - start)/864e5) + 1;
const overdue = miles.filter(m => { const d=parseDate(m['Target date']); return d && dayDiff(d)<0 && !/complete/i.test(m.Status); });
$('#msSummary').textContent = `${miles.length} milestones · ${miles.filter(m=>/complete/i.test(m.Status)).length} complete · ${overdue.length} past target`;
const pos = d => ((d - start)/864e5) / span * 100;
let tl = `<div class="tl-inner"><div class="tl-row" style="padding:0"><div></div><div class="tl-scale" style="grid-template-columns:repeat(${span},1fr)">`;
for(let i=0;i<span;i++){ const d=new Date(start.getTime()+i*864e5); tl += `<span class="${+d===+TODAY?'today':''}">${i%2===0||+d===+TODAY?d.getDate():''}</span>`; }
tl += `</div></div>`;
miles.sort((a,b)=>parseDate(a['Target date'])-parseDate(b['Target date'])).forEach(m => {
  const d = parseDate(m['Target date']); const od = dayDiff(d)<0 && !/complete/i.test(m.Status);
  tl += `<div class="tl-row"><div class="lbl" title="${esc(m['Actionable milestone'])}"><small>${esc(m['Milestone ID'])}</small>${esc(m['Actionable milestone'])}</div><div class="tl-track"><div class="tl-today" style="left:${pos(TODAY)}%"></div><div class="tl-dot ${esc(m.Priority)} ${od?'overdue':''}" style="left:${pos(d)}%;width:${100/span}%" title="${esc(m['Target date'])} · ${esc(m['Definition of done'])} · ${esc(m.Status)}${od?' · past target':''}"></div></div></div>`;
});
tl += `</div><div class="legend" style="margin-top:14px"><span><i style="background:var(--accent)"></i>High</span><span><i style="background:var(--plum)"></i>Medium</span><span><i style="background:var(--teal)"></i>Low</span><span><i style="background:transparent;outline:2px solid var(--bad)"></i>Past target, not complete</span><span style="color:var(--accent)">${MON[start.getMonth()]} ${start.getDate()} – ${fmt(end)} · line marks today</span></div>`;
$('#timeline').innerHTML = tl;

// ---------- WEEK
const fColor = a => /Education/.test(a)?'--plum':/Finance/.test(a)?'--gold':/Career|Work/.test(a)?'--accent':'--teal';
const monday = new Date(TODAY); monday.setDate(TODAY.getDate() - ((TODAY.getDay()+6)%7));
const order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
$('#weekGrid').innerHTML = order.map((d,i) => {
  const dt = new Date(monday); dt.setDate(monday.getDate()+i);
  const bl = focus.filter(f => f.Day===d);
  return `<div class="day ${+dt===+TODAY?'today':''}"><h4>${d.slice(0,3)}${+dt===+TODAY?' <span class="tag hot" style="font-size:10px;padding:1px 7px">Today</span>':''}</h4><div class="dt">${fmt(dt)}</div>${bl.map(f=>`<div class="block" style="--c:var(${fColor(f.Area)})"><small>${esc(f['Time (ET)'])}</small><b>${esc(f['Focus Block'])}</b><span>${esc(f['Expected Output'])}</span></div>`).join('') || '<span class="muted small">Rest</span>'}</div>`;
}).join('');
const weeks = [...new Set(exec2.map(e=>e.Week))];
const curWeek = weeks.find(w => { const m = w.match(/([A-Z][a-z]{2}) (\d+)–(\d+)/); if(!m) return false; const s=new Date(TODAY.getFullYear(),MON.indexOf(m[1]),+m[2]), e=new Date(TODAY.getFullYear(),MON.indexOf(m[1]),+m[3]); return TODAY>=s&&TODAY<=e; }) || weeks[0];
let wk = curWeek;
function renderExec(){
  $('#execList').innerHTML = exec2.filter(e=>e.Week===wk).map(e => `<div class="exec ${/deadline/i.test(e['Actionable deliverable'])?'deadline':''}"><div class="when"><b>${esc(e.Day)}</b>${esc(e['Time (ET)'])}</div><div><p>${esc(e['Actionable deliverable'])}</p><em>${esc(e.Focus)} · ${esc(e['Task IDs'])} · ${esc(e.Status)}</em></div></div>`).join('');
}
$('#weekToggle').innerHTML = weeks.map(w=>`<button class="chip ${w===wk?'on':''}" data-w="${esc(w)}">${esc(w)}</button>`).join('');
$('#weekToggle').addEventListener('click', e => { const w=e.target.dataset.w; if(!w) return; wk=w; $('#weekToggle').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c.dataset.w===w)); renderExec(); });
renderExec();

// ---------- BOOKS
const sCol = ['--accent','--plum','--teal','--gold','--accent','--plum'];
const seriesList = [...new Set(books.map(x=>x['Series / Project']))];
const until = d => { const n = dayDiff(d); return n === 0 ? 'today' : n > 0 ? `in ${n} day${n===1?'':'s'}` : `${-n} day${n===-1?'':'s'} overdue`; };
const bk = books.map(x => ({...x, nd: parseDate(x['Next step target date']), ld: parseDate(x['Launch target date'])}));
const launches = bk.filter(x => x.ld && dayDiff(x.ld) >= 0).sort((a,b) => a.ld - b.ld);
const dated = bk.filter(x => x.nd || x.ld).length;
const overdueSteps = bk.filter(x => x.nd && dayDiff(x.nd) < 0).length;
const nextSteps = bk.filter(x => x.nd && dayDiff(x.nd) >= 0).sort((a,b) => a.nd - b.nd);
const quick = D.quick ? `<a class="qbtn" href="${esc(D.quick)}" target="_blank" rel="noopener">Set dates in Quick Update →</a>` : '';
let cd = '';
if (launches.length) {
  const L = launches[0], n = dayDiff(L.ld);
  cd = `<div class="cd-hero"><span class="series">Next launch · ${esc(L['Series / Project'])}</span><h3>${esc(L['Book / Volume'])}</h3><div class="cd-num"><b>${n}</b><span>day${n===1?'':'s'} to launch · ${fmt(L.ld)}, ${L.ld.getFullYear()}</span></div>${L.nd ? `<p>Next: ${esc(L['Next action'])} · ${until(L.nd)}</p>` : `<p>Next: ${esc(L['Next action'])}</p>`}</div>`;
} else {
  cd = `<div class="cd-hero empty"><span class="series">Launch countdown</span><h3>No launch dates yet</h3><p>Add a launch target and a next-step date for each book. The countdown starts as soon as one is set.</p>${quick}</div>`;
}
const stats = `<div class="cd-stats"><div><b>${dated}</b><span>of ${bk.length} books dated</span></div><div><b>${launches.length}</b><span>launches scheduled</span></div><div><b class="${overdueSteps?'bad':''}">${overdueSteps}</b><span>next steps overdue</span></div><div><b>${nextSteps[0] ? fmt(nextSteps[0].nd) : '—'}</b><span>${nextSteps[0] ? 'next step due · ' + esc(nextSteps[0]['Book / Volume']) : 'no next-step dates'}</span></div></div>`;
$('#bookCountdown').innerHTML = cd + stats;
$('#bookGrid').innerHTML = bk.slice().sort((a,b) => (a.nd||a.ld||9e15) - (b.nd||b.ld||9e15)).map(x => {
  const od = x.nd && dayDiff(x.nd) < 0;
  const due = x.nd ? `<span class="due ${od?'od':dayDiff(x.nd)<=7?'soon':''}">By ${fmt(x.nd)} · ${until(x.nd)}</span>` : `<span class="due none">No date set</span>`;
  const launch = x.ld ? `<span class="launch">Launch ${fmt(x.ld)}, ${x.ld.getFullYear()}${dayDiff(x.ld)>=0?' · '+dayDiff(x.ld)+'d':''}</span>` : (x['Launch target date']||'').trim() ? `<span class="launch">Launch: ${esc(x['Launch target date'].trim())}</span>` : '';
  return `<div class="book" style="--c:var(${sCol[seriesList.indexOf(x['Series / Project'])%sCol.length]})"><span class="series">${esc(x['Series / Project'])}</span><h4>${esc(x['Book / Volume'])}</h4><span class="stage">${esc(x.Stage)} · Manuscript ${esc(x['Manuscript verified?']).toLowerCase()}</span>${prTag(x.Priority)}<div class="next"><small>Next step</small>${esc(x['Next action'])}${due}</div>${launch}</div>`;
}).join('');
if (D.quick) { const q = document.getElementById('quickNav'); if (q) { q.href = D.quick; q.hidden = false; } }

// ---------- CAREER
const paid = casting.map(c => ({...c, pay: +(c['Pay offered ($)']||'').replace(/[$,]/g,'') || 0})).filter(c => c.pay > 0).sort((a,b)=>b.pay-a.pay);
const platforms = {}; casting.forEach(c => platforms[c.Platform] = (platforms[c.Platform]||0)+1);
const byDay = {}; casting.forEach(c => { const d = parseDate(c.Date); if(d){ const k = +d; byDay[k]=(byDay[k]||0)+1; } });
const auditions = casting.filter(c => c['Audition date']).length;
const booked = casting.filter(c => /yes|booked/i.test(c['Booked?']) || /booked/i.test(c.Status)).length;
const ckDone = check.filter(c => c['Completed (1/0)']==='1' || /complete/i.test(c.Status)).length;
const ck = [
  {l:'Submissions', v:casting.length, s:'casting applications'},
  {l:'Paid w/ rate', v:paid.length, s:`up to ${money(paid[0]?.pay||0)}`},
  {l:'Auditions', v:auditions, s:auditions?'scheduled':'none yet'},
  {l:'Bookings', v:booked, s:'net income $0'},
  {l:'Agencies', v:agencies.length, s:`${agencies.filter(a=>/submitted/i.test(a.Status)).length} applied`},
  {l:'90-day plan', v:Math.round(ckDone/check.length*100)+'%', s:`${ckDone} of ${check.length} done`},
];
$('#castKpis').innerHTML = ck.map(k=>`<div class="kpi"><span>${esc(k.l)}</span><b data-count="${typeof k.v==='number'?k.v:''}">${esc(k.v)}</b><small class="muted">${esc(k.s)}</small></div>`).join('');

const unitOf = n => /per filming day|\/day|per day|day plus/i.test(n)?'per day':/week/i.test(n)?'per week':/flat|for two hours|for about/i.test(n)?'flat':'';
const maxPay = paid[0]?.pay || 1;
$('#payBars').innerHTML = paid.map(c => `<div class="pb"><div class="nm" title="${esc(c['Project / casting'])}">${esc(c['Project / casting'])}<small>${esc(c.Location)}</small></div><div class="tr"><i style="width:${c.pay/maxPay*100}%"></i></div><div class="v">${money(c.pay)}<span class="unit">${unitOf(c.Notes)}</span></div></div>`).join('');

let castPlat = 'All', castQ = '';
$('#castFilter').innerHTML = ['All', ...Object.keys(platforms)].map(p=>`<button class="chip ${p==='All'?'on':''}" data-p="${esc(p)}">${esc(p)}${p!=='All'?` · ${platforms[p]}`:''}</button>`).join('');
function renderCast(){
  const list = casting.filter(c => (castPlat==='All'||c.Platform===castPlat) && (!castQ || (c['Project / casting']+' '+c.Location+' '+c.Type).toLowerCase().includes(castQ)));
  $('#castTable').innerHTML = `<thead><tr><th>Date</th><th>Project / role</th><th>Type</th><th>Platform</th><th>Pay</th><th>Location</th><th>Status</th><th>Deadline</th></tr></thead><tbody>` +
  list.map(c => `<tr><td class="id">${esc(c.Date.split(' ')[0])}</td><td>${c['Listing or history URL']?`<a href="${esc(c['Listing or history URL'])}" target="_blank" rel="noopener">${esc(c['Project / casting'])}</a>`:esc(c['Project / casting'])}${c['Opportunity label']?`<br><small class="muted">${esc(c['Opportunity label'])}</small>`:''}</td><td>${esc(c.Type)||'<span class="muted">—</span>'}</td><td>${esc(c.Platform)}</td><td class="n">${esc(c['Pay offered ($)'])||'<span class="muted">—</span>'}</td><td>${esc(c.Location)||'<span class="muted">—</span>'}</td><td><span class="tag neutral">${esc(c.Status)}</span></td><td class="id">${esc(c['Listing deadline'])}</td></tr>`).join('') + (list.length?'':'<tr><td colspan="8" class="muted">No matches.</td></tr>') + '</tbody>';
}
$('#castFilter').addEventListener('click', e => { const p=e.target.dataset.p; if(!p) return; castPlat=p; $('#castFilter').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c.dataset.p===p)); renderCast(); });
$('#castSearch').addEventListener('input', e => { castQ = e.target.value.toLowerCase().trim(); renderCast(); });
renderCast();

// ---------- 90 DAY + AGENCIES
$('#ninetySummary').textContent = `${ckDone} of ${check.length} checklist items complete`;
const phases = [...new Set(check.map(c=>c.Phase))];
const phaseName = ['Build materials','Start applying','Expand reach','Review & refine'];
$('#phases').innerHTML = phases.map((p,i)=>`<div class="phase"><span class="pn">${esc(p)}</span><h4>${phaseName[i]||''}</h4><ul>${check.filter(c=>c.Phase===p).map(c=>`<li class="${c['Completed (1/0)']==='1'?'done':''}"><i class="${esc(c.Priority)}" title="${esc(c.Priority)} priority"></i>${esc(c['Action item'])}</li>`).join('')}</ul></div>`).join('');
$('#agencyGrid').innerHTML = agencies.map(a=>`<div class="agency"><div style="display:flex;justify-content:space-between;gap:8px"><h4>${esc(a.Agency)}</h4><span class="tag neutral">${esc(a.Status)}</span></div><span class="mk">${esc(a.Market)} · ${esc(a.Specialty)}</span><p><b>Next:</b> ${esc(a['Next step'])}</p><p class="muted">${esc(a['Eligibility / submission'])}</p><span class="meta">${esc(a.Notes)}</span>${a['Official URL']?`<a class="go" href="${esc(a['Official URL'])}" target="_blank" rel="noopener">Official site →</a>`:'<span class="go muted">No official route yet</span>'}</div>`).join('');

const num = s => +(s||'').replace(/[$,]/g,'') || 0;
const bMax = Math.max(...budget.map(x=>num(x['High estimate ($)'])).filter((_,i)=>budget[i].Item!=='TOTAL'));
$('#budget').innerHTML = budget.map(x => {
  const lo=num(x['Low estimate ($)']), hi=num(x['High estimate ($)']); const tot = x.Item==='TOTAL';
  return `<div class="bud ${tot?'total':''}"><span>${esc(x.Item)}${x.Notes&&!tot?`<br><small class="muted" style="font-weight:400">${esc(x.Notes)}</small>`:''}</span>${tot?'<span></span>':`<div class="rng"><i style="left:${lo/bMax*100}%;width:${Math.max((hi-lo)/bMax*100,1)}%"></i></div>`}<span class="v">${money(lo)}–${money(hi)}</span></div>`;
}).join('') + `<p class="muted small" style="margin-top:10px">Actual spend so far: ${esc(budget.find(x=>x.Item==='TOTAL')?.['Actual ($)']||'$0')}</p>`;

const E = Object.fromEntries(email.map(e=>[e.Field,e.Text]));
$('#email').innerHTML = `<div class="subj"><b>Subject:</b> ${esc(E.Subject)}</div><p>${esc(E.Greeting)}</p>${[1,2,3,4,5].map(i=>E['Paragraph '+i]?`<p>${esc(E['Paragraph '+i])}</p>`:'').join('')}<p>${esc(E.Closing)}<br><b>${esc(E.Signature)}</b></p>${E.Profile?`<p><a href="${esc(E.Profile)}" target="_blank" rel="noopener" style="color:var(--accent)">Backstage profile →</a></p>`:''}`;

// ---------- LINKS
const lType = u => /spreadsheets/.test(u)?['SHT','#7fd6cb']:/document/.test(u)?['DOC','#93bdf7']:/drive\.google/.test(u)?['DRV','#bba1f5']:/calendar/.test(u)?['CAL','#f49cc8']:/chatgpt/.test(u)?['LIB','#d8b4f0']:['—','#857a90'];
const lk = links.map(l => ({...l, url:l['Google URL (paste once connected)']}));
$('#linkList').innerHTML = lk.sort((a,b)=>(!a.url)-(!b.url)).map(l => { const [t,c]=lType(l.url||'');
  return l.url ? `<a class="lnk" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="ic" style="background:${c}">${t}</span><span><b>${esc(l.Resource)}</b><small>${esc(l.Purpose)}</small></span></a>`
  : `<div class="lnk missing"><span class="ic" style="background:${c}">${t}</span><span><b>${esc(l.Resource)}</b><small>Not linked yet · ${esc(l['Owner / Notes'])}</small></span></div>`; }).join('');

// ---------- CHARTS
let charts = [];
function drawCharts(){
  charts.forEach(c=>c.destroy()); charts = [];
  const ink = cssv('--muted'), line = cssv('--line');
  const pal = [cssv('--accent'), cssv('--teal'), cssv('--gold'), cssv('--plum'), cssv('--faint')];
  Chart.defaults.color = cssv('--muted');
  Chart.defaults.font.family = "'General Sans', system-ui, sans-serif"; Chart.defaults.font.size = 12;
  // area hours
  const aH = {}; tasks.forEach(t => aH[t.Area] = (aH[t.Area]||0) + (+t.Minutes||0)/60);
  const aK = Object.keys(aH).sort((a,b)=>aH[b]-aH[a]);
  charts.push(new Chart($('#areaChart'), {type:'bar', data:{labels:aK, datasets:[{label:'Planned hours', data:aK.map(k=>+aH[k].toFixed(2)), backgroundColor:aK.map((_,i)=>[pal[0],pal[3],pal[2],pal[1]][i%4]), borderRadius:6, barThickness:16}]},
    options:{indexAxis:'y', maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${c.raw} hrs · ${tasks.filter(t=>t.Area===c.label).length} tasks`}}}, scales:{x:{grid:{color:line}, ticks:{color:ink}, title:{display:true,text:'Planned hours',color:ink}}, y:{grid:{display:false}, ticks:{color:ink}}}}}));
  // priority donut (projects)
  const pr = ['High','Medium','Low'].map(p=>projects.filter(x=>x.Priority===p).length);
  const pc = [pal[0], pal[3], pal[1]];
  charts.push(new Chart($('#prioChart'), {type:'doughnut', data:{labels:['High','Medium','Low'], datasets:[{data:pr, backgroundColor:pc, borderWidth:0}]}, options:{maintainAspectRatio:false, cutout:'68%', plugins:{legend:{display:false}}}}));
  $('#prioLegend').innerHTML = ['High','Medium','Low'].map((l,i)=>`<span><i style="background:${pc[i]}"></i>${l} · ${pr[i]} projects</span>`).join('');
  // career charts (dark band)
  const dInk = cssv('--dark-muted'), dLine = cssv('--dark-line');
  const dk = Object.keys(byDay).map(Number).sort();
  charts.push(new Chart($('#dayChart'), {type:'bar', data:{labels:dk.map(k=>fmt(new Date(k))), datasets:[{label:'Submissions', data:dk.map(k=>byDay[k]), backgroundColor:pal[3], hoverBackgroundColor:pal[0], borderRadius:10, barThickness:40}]},
    options:{maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}, ticks:{color:dInk}}, y:{grid:{color:dLine}, ticks:{color:dInk, precision:0}}}}}));
  const pk = Object.keys(platforms).sort((a,b)=>platforms[b]-platforms[a]);
  charts.push(new Chart($('#platChart'), {type:'doughnut', data:{labels:pk, datasets:[{data:pk.map(k=>platforms[k]), backgroundColor:pal, borderWidth:0}]}, options:{maintainAspectRatio:false, cutout:'68%', plugins:{legend:{display:false}}}}));
  $('#platLegend').innerHTML = pk.map((k,i)=>`<span><i style="background:${pal[i]}"></i>${esc(k)} · ${platforms[k]}</span>`).join('');
}

// ---------- theme + count-up
const root = document.documentElement;
root.dataset.theme = 'grey';
const tb = $('#themeBtn');
const setLbl = () => { const b = root.dataset.theme==='black'; tb.setAttribute('aria-label', b?'Switch to night grey':'Switch to true black'); tb.title = b?'Night grey':'True black'; };
setLbl();
tb.addEventListener('click', () => { root.dataset.theme = root.dataset.theme==='black'?'grey':'black'; setLbl(); drawCharts(); });
drawCharts();
document.querySelectorAll('[data-count]').forEach(el => {
  const t = +el.dataset.count; if(!el.dataset.count || isNaN(t) || t===0) return;
  const t0 = performance.now(); const step = n => { const p = Math.min((n-t0)/700,1); el.textContent = Math.round(t*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
});
})();
