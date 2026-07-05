let allRows = [];
let currentResults = [];
let currentView = 'cards';
const favKey = 'jelet_favourites_v2';
const el = id => document.getElementById(id);

function parseCSV(text){
  const rows=[]; let row=[], field='', quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(quoted){ if(c==='"'&&n==='"'){field+='"';i++;} else if(c==='"'){quoted=false;} else field+=c; }
    else { if(c==='"') quoted=true; else if(c===','){row.push(field);field='';} else if(c==='\n'){row.push(field); rows.push(row); row=[]; field='';} else if(c!=='\r') field+=c; }
  }
  row.push(field); rows.push(row);
  return rows.filter(r=>r.some(x=>String(x).trim()!==''));
}
function headerKey(h){return String(h||'').replace(/[▲▼]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
function rowsFromCSV(text){
  const parsed=parseCSV(text); if(!parsed.length) return [];
  const headers=parsed.shift();
  return parsed.map(r=>{const o={}; headers.forEach((h,i)=>o[headerKey(h)]=String(r[i]??'').trim()); return o;});
}
function toNum(v){return Number(String(v||'').replace(/[^0-9]/g,'')) || 0;}
function cleanCat(v){return String(v||'').replace(/Tuition Fee Waiver/ig,'TFW').replace(/\s+/g,' ').trim();}
function norm(v){return String(v||'').toLowerCase().replace(/\s+/g,' ').trim();}
function normalize(row){
  return {
    round: row['round'] || '',
    institute: row['institute'] || '',
    program: row['program'] || '',
    stream: row['stream'] || '',
    seatType: row['seat type'] || '',
    quota: row['quota'] || '',
    category: cleanCat(row['category'] || ''),
    opening: toNum(row['opening rank']),
    closing: toNum(row['closing rank'])
  };
}
async function loadData(){
  try{
    let text = window.CUTOFF_CSV_TEXT || '';
    if(!text){ const res = await fetch('cutoffs.csv'); text = await res.text(); }
    allRows = rowsFromCSV(text).map(normalize).filter(r=>r.institute && r.program && r.category && r.round && r.closing);
    populateFilters(); el('totalData').textContent = allRows.length;
    el('loadStatus').textContent = `Loaded ${allRows.length} cutoff rows. Now enter rank and category.`;
  }catch(e){
    el('loadStatus').textContent = 'Data loading failed. Make sure data.js or cutoffs.csv is uploaded.';
    console.error(e);
  }
}
function unique(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));}
function setOptions(id, values, first){el(id).innerHTML = `<option value="">${first}</option>` + values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');}
function populateFilters(){
  setOptions('categorySelect', unique(allRows.map(r=>r.category)), 'Select category');
  setOptions('branchSelect', unique(allRows.map(r=>r.program)), 'All branches');
  setOptions('roundSelect', unique(allRows.map(r=>r.round)), 'All rounds');
}
function chance(row, rank){
  const cr=row.closing;
  if(rank <= cr) return {level:'Safe', cls:'safe'};
  const gap = rank - cr, pct = gap / Math.max(cr,1);
  if(pct <= 0.10) return {level:'Moderate', cls:'moderate'};
  if(pct <= 0.25) return {level:'Risky', cls:'risky'};
  return null;
}
function runSearch(){
  const rank = toNum(el('rankInput').value);
  const cat = el('categorySelect').value;
  const branch = el('branchSelect').value;
  const round = el('roundSelect').value;
  const q = norm(el('searchInput').value);
  if(!rank || !cat){toast('Please enter GMR rank and select category.'); return;}
  currentResults = allRows.map(r=>({...r, chance: chance(r,rank)}))
    .filter(r=>r.chance)
    .filter(r=>r.category === cat)
    .filter(r=>!branch || r.program === branch)
    .filter(r=>!round || r.round === round)
    .filter(r=>!q || norm(`${r.institute} ${r.program} ${r.round} ${r.category} ${r.quota}`).includes(q));
  const order={safe:0,moderate:1,risky:2};
  currentResults.sort((a,b)=>order[a.chance.cls]-order[b.chance.cls] || b.closing-a.closing || a.institute.localeCompare(b.institute));
  renderResults();
}
function updateSummary(){
  el('matchCount').textContent=currentResults.length;
  el('safeCount').textContent=currentResults.filter(r=>r.chance.cls==='safe').length;
  el('moderateCount').textContent=currentResults.filter(r=>r.chance.cls==='moderate').length;
  el('riskyCount').textContent=currentResults.filter(r=>r.chance.cls==='risky').length;
}
function renderEmpty(title='Enter your rank and category to start'){
  updateSummary(); el('emptyState').classList.remove('hidden'); el('emptyState').innerHTML=`<h3>${esc(title)}</h3><p>Your result will show college, branch, round, category, opening rank, closing rank and chance level.</p>`;
  el('cardsContainer').innerHTML=''; el('tableBody').innerHTML=''; el('tableContainer').classList.add('hidden');
}
function renderResults(){
  updateSummary();
  if(!currentResults.length){renderEmpty('No matching colleges found'); return;}
  el('emptyState').classList.add('hidden'); renderCards(); renderTable();
  el('cardsContainer').classList.toggle('hidden', currentView !== 'cards');
  el('tableContainer').classList.toggle('hidden', currentView !== 'table');
}
function renderCards(){
  el('cardsContainer').innerHTML = currentResults.map((r,i)=>`<article class="card college-card ${r.chance.cls}"><button class="fav" onclick="toggleFav(${i})">${isFav(r)?'❤️':'🤍'}</button><div class="badge-row"><span class="badge ${r.chance.cls}">${r.chance.level}</span><span class="badge">${esc(r.round)}</span><span class="badge">${esc(r.category)}</span></div><h4>${esc(r.institute)}</h4><p><b>Branch:</b> ${esc(r.program)}</p><p><b>Quota:</b> ${esc(r.quota || 'N/A')} • <b>Seat:</b> ${esc(r.seatType || 'N/A')}</p><div class="ranks"><div><span>Opening Rank</span><strong>${r.opening}</strong></div><div><span>Closing Rank</span><strong>${r.closing}</strong></div></div></article>`).join('');
}
function renderTable(){
  el('tableBody').innerHTML = currentResults.map((r,i)=>`<tr><td><span class="badge ${r.chance.cls}">${r.chance.level}</span></td><td>${esc(r.round)}</td><td>${esc(r.institute)}</td><td>${esc(r.program)}</td><td>${esc(r.category)}</td><td>${r.opening}</td><td>${r.closing}</td><td>${esc(r.quota)}</td><td><button class="small" onclick="toggleFav(${i})">${isFav(r)?'❤️':'🤍'}</button></td></tr>`).join('');
}
function keyOf(r){return `${r.round}|${r.institute}|${r.program}|${r.category}|${r.closing}`;}
function favs(){try{return JSON.parse(localStorage.getItem(favKey)||'[]');}catch{return [];}}
function isFav(r){return favs().includes(keyOf(r));}
function toggleFav(i){const r=currentResults[i], k=keyOf(r); let f=favs(); f=f.includes(k)?f.filter(x=>x!==k):[...f,k]; localStorage.setItem(favKey,JSON.stringify(f)); renderResults();}
function exportCSV(){
  if(!currentResults.length){toast('No results to export.'); return;}
  const header=['Chance','Round','College','Branch','Category','Opening Rank','Closing Rank','Quota','Seat Type'];
  const rows=currentResults.map(r=>[r.chance.level,r.round,r.institute,r.program,r.category,r.opening,r.closing,r.quota,r.seatType]);
  const csv=[header,...rows].map(row=>row.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='jelet_prediction_results.csv'; a.click(); URL.revokeObjectURL(a.href);
}
function resetAll(){['rankInput','searchInput'].forEach(id=>el(id).value=''); ['categorySelect','branchSelect','roundSelect'].forEach(id=>el(id).value=''); currentResults=[]; renderEmpty();}
function esc(s){return String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));}
function toast(msg){const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200);}
function bind(){
  el('checkBtn').onclick=runSearch; el('resetBtn').onclick=resetAll; el('pdfBtn').onclick=()=>window.print(); el('csvBtn').onclick=exportCSV;
  ['rankInput','categorySelect','branchSelect','roundSelect','searchInput'].forEach(id=>el(id).addEventListener('input',()=>{if(el('rankInput').value && el('categorySelect').value) runSearch();}));
  el('cardViewBtn').onclick=()=>{currentView='cards'; el('cardViewBtn').classList.add('active'); el('tableViewBtn').classList.remove('active'); renderResults();};
  el('tableViewBtn').onclick=()=>{currentView='table'; el('tableViewBtn').classList.add('active'); el('cardViewBtn').classList.remove('active'); renderResults();};
  el('themeToggle').onclick=()=>{document.body.classList.toggle('dark'); const dark=document.body.classList.contains('dark'); localStorage.setItem('jelet_theme',dark?'dark':'light'); el('themeToggle').textContent=dark?'☀️ Light':'🌙 Dark';};
  if(localStorage.getItem('jelet_theme')==='dark') el('themeToggle').click();
}
document.addEventListener('DOMContentLoaded',()=>{bind();loadData();});
