(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dayNames = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
  const fullDays = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
  const templates = {
    easy: ['Reels','Carrossel','','Carrossel','Estático','',''],
    medium: ['Reels','Reels','Carrossel','Carrossel','Reels','',''],
    hard: ['Reels','Carrossel','Reels','Carrossel','Reels','Carrossel','Estático']
  };
  let level = 'easy', selectedDay = 0, weekOffset = 0;
  let posts = loadPosts();
  let toastTimer;

  function loadPosts() {
    try { return JSON.parse(localStorage.getItem('draphos-post-planner-v1') || '[]'); }
    catch { return []; }
  }
  function savePosts() {
    localStorage.setItem('draphos-post-planner-v1', JSON.stringify(posts));
  }
  function mondayOf(date) {
    const d = new Date(date); d.setHours(12,0,0,0);
    const shift = (d.getDay() + 6) % 7; d.setDate(d.getDate() - shift);
    return d;
  }
  function currentMonday() {
    const d = mondayOf(new Date()); d.setDate(d.getDate() + weekOffset * 7); return d;
  }
  function dateKey(date) {
    const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function dateForDay(index) {
    const d=currentMonday(); d.setDate(d.getDate()+index); return d;
  }
  function fmtShort(d) { return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); }
  function showToast(message) {
    $('toast').textContent=message; $('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2300);
  }
  function weekPosts() {
    const start=dateKey(currentMonday()), endDate=currentMonday(); endDate.setDate(endDate.getDate()+6);
    const end=dateKey(endDate);
    return posts.filter(p=>p.date>=start && p.date<=end);
  }
  function renderWeek() {
    const monday=currentMonday(), sunday=new Date(monday); sunday.setDate(sunday.getDate()+6);
    $('weekLabel').textContent=`${fmtShort(monday)} – ${fmtShort(sunday)}`;
    const grid=$('weekGrid'); grid.innerHTML='';
    dayNames.forEach((name,i)=>{
      const date=dateForDay(i), key=dateKey(date), items=posts.filter(p=>p.date===key);
      const format=items[0]?.format || templates[level][i] || 'Dia livre';
      const card=document.createElement('button');
      card.className='day-card'+(i===selectedDay?' selected':'')+(!templates[level][i]&&!items.length?' off':'');
      card.type='button'; card.setAttribute('aria-label',`${fullDays[i]}, ${fmtShort(date)}`);
      card.innerHTML=`<span class="day-name">${name}</span><div class="day-date">${date.getDate()}</div><span class="day-format">${escapeHTML(format)}</span>${items.length?'<i class="day-dot"></i>':''}`;
      card.addEventListener('click',()=>{selectedDay=i; $('date').value=key; resetEditor(false); renderWeek();});
      grid.appendChild(card);
    });
    $('selectedDayPill').textContent=fullDays[selectedDay].toUpperCase();
    document.querySelectorAll('.level').forEach(b=>b.classList.toggle('active',b.dataset.level===level));
  }
  function renderPosts() {
    const list=$('postList'), q=$('searchPosts').value.trim().toLowerCase(), filter=$('filterStatus').value;
    const items=weekPosts().filter(p=>(filter==='all'||p.status===filter)&&(`${p.topic} ${p.caption} ${p.format}`).toLowerCase().includes(q)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    list.innerHTML='';
    const week=weekPosts();
    $('statPlanned').textContent=week.filter(p=>p.status==='Planejado'||p.status==='Ideia').length;
    $('statReady').textContent=week.filter(p=>p.status==='Pronto').length;
    $('statPublished').textContent=week.filter(p=>p.status==='Publicado').length;
    $('emptyState').style.display=items.length?'none':'block';
    items.forEach(p=>{
      const card=document.createElement('article');card.className='post-item';
      const head=document.createElement('div');head.className='post-head';
      const titleBox=document.createElement('div');
      const title=document.createElement('div');title.className='post-title';title.textContent=p.topic||'Publicação sem título';
      const meta=document.createElement('div');meta.className='post-meta';meta.textContent=`${new Date(p.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})} • ${p.time||'Sem horário'} • ${p.format}`;
      titleBox.append(title,meta);
      const chip=document.createElement('span');chip.className='status-chip '+p.status;chip.textContent=p.status;
      head.append(titleBox,chip);card.append(head);
      if(p.caption){const preview=document.createElement('p');preview.className='post-preview';preview.textContent=p.caption.length>190?p.caption.slice(0,190)+'…':p.caption;card.append(preview);}
      if(p.notes){const note=document.createElement('p');note.className='post-meta';note.textContent='Nota: '+p.notes;card.append(note);}
      const actions=document.createElement('div');actions.className='post-actions';
      [['Editar',()=>editPost(p.id)],['Copiar texto',()=>copyCaption(p)],['Excluir',()=>deletePost(p.id)]].forEach(([label,fn])=>{const b=document.createElement('button');b.className='mini-btn';b.type='button';b.textContent=label;b.addEventListener('click',fn);actions.append(b);});
      const status=document.createElement('select');status.className='mini-btn';status.setAttribute('aria-label','Alterar status');['Ideia','Planejado','Pronto','Publicado'].forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;o.selected=p.status===s;status.append(o);});
      status.addEventListener('change',()=>{p.status=status.value;savePosts();renderAll();showToast('Status atualizado.');});actions.append(status);card.append(actions);list.append(card);
    });
  }
  function resetEditor(setDate=true) {
    $('postForm').reset(); $('postId').value=''; $('status').value='Planejado'; $('time').value='18:00';
    $('editorTitle').textContent='Criar publicação'; $('savePost').innerHTML='Salvar publicação <span>↗</span>';
    if(setDate)$('date').value=dateKey(dateForDay(selectedDay));
    else if(!$('date').value)$('date').value=dateKey(dateForDay(selectedDay));
    $('format').value=templates[level][selectedDay]||'Reels';
  }
  function editPost(id) {
    const p=posts.find(x=>x.id===id);if(!p)return;
    const d=new Date(p.date+'T12:00:00'), monday=mondayOf(d);
    const thisWeek=currentMonday();
    weekOffset=Math.round((monday-thisWeek)/(7*86400000));
    selectedDay=(d.getDay()+6)%7;
    renderWeek();
    $('postId').value=p.id;$('topic').value=p.topic;$('caption').value=p.caption;$('notes').value=p.notes||'';
    $('format').value=p.format;$('status').value=p.status;$('date').value=p.date;$('time').value=p.time||'18:00';
    $('editorTitle').textContent='Editar publicação';$('savePost').innerHTML='Atualizar publicação <span>↗</span>';
    window.scrollTo({top:$('postForm').getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'});
  }
  function deletePost(id) {
    if(!confirm('Deseja excluir esta publicação?'))return;
    posts=posts.filter(p=>p.id!==id);savePosts();renderAll();showToast('Publicação excluída.');
  }
  async function copyCaption(p) {
    const text=[p.topic,p.caption].filter(Boolean).join('\n\n');
    try{await navigator.clipboard.writeText(text);showToast('Texto copiado!');}
    catch{const t=document.createElement('textarea');t.value=text;document.body.append(t);t.select();document.execCommand('copy');t.remove();showToast('Texto copiado!');}
  }
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function renderAll(){renderWeek();renderPosts();}
  $('levelButtons');
  document.querySelectorAll('.level').forEach(b=>b.addEventListener('click',()=>{level=b.dataset.level;renderWeek();}));
  $('postForm').addEventListener('submit',e=>{
    e.preventDefault();
    const id=$('postId').value, date=$('date').value;
    if(!date){showToast('Escolha a data da publicação.');return;}
    const data={id:id||`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,topic:$('topic').value.trim(),caption:$('caption').value.trim(),notes:$('notes').value.trim(),format:$('format').value,status:$('status').value,date,time:$('time').value||'18:00'};
    if(id){posts=posts.map(p=>p.id===id?data:p);}else posts.push(data);
    const d=new Date(date+'T12:00:00');selectedDay=(d.getDay()+6)%7;
    const targetMonday=mondayOf(d), baseMonday=mondayOf(new Date());
    weekOffset=Math.round((targetMonday-baseMonday)/(7*86400000));
    savePosts();renderAll();resetEditor();showToast(id?'Publicação atualizada!':'Publicação salva!');
  });
  $('clearForm').addEventListener('click',()=>resetEditor());
  $('prevWeek').addEventListener('click',()=>{weekOffset--;renderAll();resetEditor();});
  $('nextWeek').addEventListener('click',()=>{weekOffset++;renderAll();resetEditor();});
  $('thisWeek').addEventListener('click',()=>{weekOffset=0;selectedDay=(new Date().getDay()+6)%7;renderAll();resetEditor();});
  $('searchPosts').addEventListener('input',renderPosts);
  $('filterStatus').addEventListener('change',renderPosts);
  $('clearWeek').addEventListener('click',()=>{
    const ids=new Set(weekPosts().map(p=>p.id));if(!ids.size){showToast('Não há posts nesta semana.');return;}
    if(!confirm('Excluir todas as publicações desta semana?'))return;
    posts=posts.filter(p=>!ids.has(p.id));savePosts();renderAll();resetEditor();showToast('Semana limpa.');
  });
  $('exportBtn').addEventListener('click',exportPlan);
  function exportPlan(){
    const data=[...posts].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const text='DRAPHOS POST PLANNER\nPLANEJAMENTO DE CONTEÚDO\n\n'+data.map(p=>`${p.date} ${p.time} | ${p.format} | ${p.status}\nTEMA: ${p.topic}\n\n${p.caption}\n${p.notes?'OBSERVAÇÕES: '+p.notes+'\n':''}\n--------------------------------\n`).join('\n');
    const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='planejamento-draphos.txt';a.click();URL.revokeObjectURL(url);showToast('Planejamento exportado.');
  }
  $('date').value=dateKey(dateForDay(selectedDay));
  renderAll();
})();