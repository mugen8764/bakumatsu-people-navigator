(() => {
'use strict';
const D = window.BM_DATA;
if (!D) throw new Error('data.js could not be loaded');
const {sources,factions,scenes,events,places,people,relations,factionRelations,factionStates} = D;
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const personById = new Map(people.map(p=>[p.id,p]));
const sceneById = new Map(scenes.map((s,i)=>[s.id,{...s,index:i}]));
const eventScene = new Map(scenes.map((s,i)=>[s.event,i]));

const hash = new URLSearchParams(location.hash.replace(/^#/,''));
const savedScene = localStorage.getItem('bm.scene');
const initialSceneId = hash.get('scene') || savedScene;
let initialScene = sceneById.get(initialSceneId)?.index ?? 0;

const state = {
 scene: initialScene,
 view: hash.get('view') || localStorage.getItem('bm.view') || 'people',
 selectedPerson: hash.get('person') || localStorage.getItem('bm.person') || 'abe',
 selectedFaction: hash.get('faction') || localStorage.getItem('bm.faction') || '幕府',
 personFactionFilter: 'すべて',
 relationType: 'all',
 calendar: localStorage.getItem('bm.calendar') || 'both',
 timer: null,
 mapReady: false,
 map: null
};

function scene(){ return scenes[state.scene]; }
function getPerson(id){ return personById.get(id); }
function normalise(v){ return String(v||'').toLowerCase().replace(/[\s・･]/g,''); }
function withinRange(p,index=state.scene){ return index >= p.activeRange[0] && index <= p.activeRange[1]; }
function statusAt(p,index=state.scene){
  if(!p || !withinRange(p,index)) return null;
  for(let i=index;i>=p.activeRange[0];i--){
    const s = p.statuses[scenes[i].id];
    if(s) return {...s, sceneIndex:i, faction:s.faction || p.defaultFaction};
  }
  return null;
}
function factionAt(p,index=state.scene){ return statusAt(p,index)?.faction || p?.defaultFaction; }
function activePeople(index=state.scene){ return people.filter(p=>statusAt(p,index)); }
function activeFactionNames(index=state.scene){ return Object.keys(factionStates[scenes[index].id] || {}); }
function factionColor(name){ return factions[name]?.color || '#777'; }
function factionShort(name){ return factions[name]?.short || name.slice(0,1); }
function dateLabel(s){
  if(state.calendar==='western') return `${s.year}年`;
  if(state.calendar==='japanese') return s.era;
  return `${s.year}年（${s.era}）`;
}
function activeRelations(index=state.scene){
  return relations.filter(r=>r.start<=index && r.end>=index && (state.relationType==='all'||r.type===state.relationType));
}
function relationsFor(id,index=state.scene){
  return activeRelations(index).filter(r=>(r.a===id||r.b===id) && statusAt(getPerson(r.a===id?r.b:r.a),index));
}
function activeFactionRelations(index=state.scene){ return factionRelations.filter(r=>r.start<=index && r.end>=index); }
function sourceLinks(ids){
  return [...new Set(ids||[])].map(id=>sources[id]).filter(Boolean).map(src=>`<a class="source" href="${src.url}" target="_blank" rel="noopener"><strong>${src.title}</strong><span class="muted">${src.note}</span></a>`).join('');
}
function nearestSceneForPerson(p){
  if(withinRange(p,state.scene)) return state.scene;
  if(state.scene < p.activeRange[0]) return p.activeRange[0];
  return p.activeRange[1];
}
function nearestSceneForFaction(name){
  const indices=scenes.map((s,i)=>factionStates[s.id]?.[name]?i:null).filter(i=>i!==null);
  if(!indices.length) return state.scene;
  return indices.reduce((best,i)=>Math.abs(i-state.scene)<Math.abs(best-state.scene)?i:best,indices[0]);
}
function updateHash(){
  const q=new URLSearchParams({scene:scene().id,view:state.view});
  if(state.selectedPerson) q.set('person',state.selectedPerson);
  if(state.selectedFaction) q.set('faction',state.selectedFaction);
  history.replaceState(null,'',`${location.pathname}${location.search}#${q}`);
  localStorage.setItem('bm.scene',scene().id);
  localStorage.setItem('bm.view',state.view);
  localStorage.setItem('bm.person',state.selectedPerson);
  localStorage.setItem('bm.faction',state.selectedFaction);
  localStorage.setItem('bm.calendar',state.calendar);
}
function ensureSelections(){
  let p=getPerson(state.selectedPerson);
  if(!p || !statusAt(p)){
    p=activePeople()[0];
    state.selectedPerson=p?.id || '';
  }
  const currentFactions=activeFactionNames();
  if(!currentFactions.includes(state.selectedFaction)) state.selectedFaction=currentFactions[0] || '幕府';
}
function setScene(index, opts={}){
  state.scene=Math.max(0,Math.min(scenes.length-1,Number(index)));
  ensureSelections();
  renderAll();
  if(opts.scroll) $('.card-button.selected')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function selectPerson(id, goView=null){
  const p=getPerson(id); if(!p) return;
  const target=nearestSceneForPerson(p);
  state.scene=target; state.selectedPerson=id;
  if(goView) state.view=goView;
  renderAll();
}
function selectFaction(name,goView='factions'){
  state.scene=nearestSceneForFaction(name); state.selectedFaction=name; state.view=goView; renderAll();
}
function setView(v){ state.view=v; renderAll(); }

function renderScene(){
  const s=scene();
  $('#sceneSelect').innerHTML=scenes.map((x,i)=>`<option value="${i}">${x.year} ${x.title}</option>`).join('');
  $('#sceneSelect').value=state.scene;
  $('#sceneRange').max=scenes.length-1; $('#sceneRange').value=state.scene;
  $('#calendarMode').value=state.calendar;
  $('#sceneYear').textContent=state.calendar==='japanese'?s.era:s.year;
  $('#sceneEra').textContent=state.calendar==='both'?s.era:'';
  $('#sceneTitle').textContent=s.title;
  $('#sceneSummary').textContent=s.summary;
  $('#sceneProgress').style.width=`${(state.scene+1)/scenes.length*100}%`;
  const ev=events[s.event];
  $('#sceneCounts').innerHTML=`<span class="count">人物 ${activePeople().length}</span><span class="count">勢力 ${activeFactionNames().length}</span><span class="count">関係 ${activeRelations().length}</span><span class="count">${ev.category}</span>`;
  $('#sceneInsights').innerHTML=s.insights.map(x=>`<div class="insight">${x}</div>`).join('');
  $('#prevScene').disabled=state.scene===0; $('#nextScene').disabled=state.scene===scenes.length-1;
  $('#playScenes').textContent=state.timer?'Ⅱ 一時停止':'▶ 再生';
}

function renderTabs(){
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${state.view}`));
}

function renderPersonFilters(){
  const names=['すべて',...activeFactionNames().filter(n=>activePeople().some(p=>factionAt(p)===n))];
  if(!names.includes(state.personFactionFilter)) state.personFactionFilter='すべて';
  $('#personFilters').innerHTML=names.map(n=>`<button type="button" class="chip ${state.personFactionFilter===n?'active':''}" data-person-filter="${n}">${n}</button>`).join('');
  $$('[data-person-filter]').forEach(b=>b.addEventListener('click',()=>{state.personFactionFilter=b.dataset.personFilter;renderPeople();renderPersonFilters();}));
}
function renderPeople(){
  renderPersonFilters();
  let list=activePeople();
  if(state.personFactionFilter!=='すべて') list=list.filter(p=>factionAt(p)===state.personFactionFilter);
  list.sort((a,b)=>factionAt(a).localeCompare(factionAt(b),'ja') || statusAt(a).display.localeCompare(statusAt(b).display,'ja'));
  $('#personCards').innerHTML=list.map(p=>{
    const st=statusAt(p), f=st.faction;
    return `<button type="button" class="card-button ${p.id===state.selectedPerson?'selected':''}" data-person-card="${p.id}"><div class="avatar" style="background:${factionColor(f)}">${factionShort(f)}</div><div class="name">${st.display}</div><div class="later-name">${st.display!==p.name?`後の名：${p.name}`:(p.aliases[0]||'')}</div><div class="role">${st.role}</div><div class="card-foot"><span>${f}</span><span>詳細 →</span></div></button>`;
  }).join('') || '<div class="notice">この条件で表示できる人物はいません。</div>';
  $$('[data-person-card]').forEach(b=>b.addEventListener('click',()=>selectPerson(b.dataset.personCard)));
  renderPersonDetail();
}
function renderPersonDetail(){
  const p=getPerson(state.selectedPerson), st=statusAt(p), box=$('#personDetail');
  if(!p||!st){box.innerHTML='<div class="detail-empty">人物を選択してください。</div>';return;}
  const rs=relationsFor(p.id);
  const history=Object.entries(p.statuses).map(([sceneId,value])=>({scene:sceneById.get(sceneId),value})).filter(x=>x.scene).sort((a,b)=>a.scene.index-b.scene.index);
  box.innerHTML=`<div class="detail-head"><div class="avatar" style="background:${factionColor(st.faction)}">${factionShort(st.faction)}</div><div><div class="detail-title">${st.display}</div>${st.display!==p.name?`<div class="aliases">後の名前：${p.name}</div>`:''}<div class="badges"><span class="badge">${st.faction}</span><span class="badge">${st.role}</span><span class="badge">${p.born}</span></div></div></div>
  <div class="snapshot"><strong>${dateLabel(scene())}の位置づけ</strong>${st.importance}</div>
  <div class="section"><h3>この時点の行動・立場</h3><p>${st.stance}</p></div>
  <div class="section"><h3>一言で</h3><p>${p.oneLine}</p></div>
  <div class="section"><h3>名前・通称</h3><div class="tags">${[p.name,...p.aliases].map(a=>`<span class="tag">${a}</span>`).join('')}</div></div>
  <div class="section"><h3>この時点の主要関係</h3><div class="relations">${rs.length?rs.map(r=>{const other=getPerson(r.a===p.id?r.b:r.a),ost=statusAt(other);return `<div class="rel"><button type="button" data-other-person="${other.id}">${ost.display}</button> — ${r.label}<br><span class="muted">${r.text}</span></div>`}).join(''):'<span class="muted">登録済みの主要関係はありません。</span>'}</div></div>
  <div class="section"><h3>関連事件</h3><div class="tags">${p.events.map(id=>events[id]?`<button type="button" class="tag" data-open-event="${id}">${events[id].title}</button>`:'').join('')}</div></div>
  <div class="section"><h3>人物の変化</h3><div class="history-list">${history.map(h=>`<div class="history-item ${h.scene.index===state.scene?'current':''}"><button type="button" data-history-scene="${h.scene.index}"><b>${h.scene.year}年 ${h.value.display}</b>${h.value.role}</button></div>`).join('')}</div></div>
  <div class="actions"><button type="button" class="button" id="personToGraph">相関図</button><button type="button" class="button" id="personToMap">地図</button></div>
  <div class="section"><h3>参考資料</h3><div class="source-list">${sourceLinks(p.sources)}</div></div>`;
  $$('[data-other-person]',box).forEach(b=>b.addEventListener('click',()=>selectPerson(b.dataset.otherPerson)));
  $$('[data-open-event]',box).forEach(b=>b.addEventListener('click',()=>openEvent(b.dataset.openEvent)));
  $$('[data-history-scene]',box).forEach(b=>b.addEventListener('click',()=>setScene(b.dataset.historyScene)));
  $('#personToGraph').addEventListener('click',()=>setView('relations'));
  $('#personToMap').addEventListener('click',()=>setView('map'));
}

function renderFactions(){
  const states=factionStates[scene().id]||{};
  const names=Object.keys(states);
  $('#factionCards').innerHTML=names.map(name=>{
    const meta=factions[name], memberCount=activePeople().filter(p=>factionAt(p)===name).length;
    return `<button type="button" class="faction-card ${name===state.selectedFaction?'selected':''}" data-faction-card="${name}"><div class="faction-header"><div class="faction-dot" style="background:${meta.color}">${meta.short}</div><div><div class="name">${name}</div><div class="faction-count">表示人物 ${memberCount}名</div></div></div><p>${states[name].position}</p><div class="faction-count">目的：${states[name].goal}</div></button>`;
  }).join('');
  $$('[data-faction-card]').forEach(b=>b.addEventListener('click',()=>{state.selectedFaction=b.dataset.factionCard;renderFactions();}));
  renderFactionDetail();
}
function renderFactionDetail(){
  const name=state.selectedFaction, fs=factionStates[scene().id]?.[name], box=$('#factionDetail');
  if(!fs){box.innerHTML='<div class="detail-empty">勢力を選択してください。</div>';return;}
  const meta=factions[name];
  const members=activePeople().filter(p=>factionAt(p)===name);
  const rels=activeFactionRelations().filter(r=>r.a===name||r.b===name);
  box.innerHTML=`<div class="detail-head"><div class="avatar" style="background:${meta.color}">${meta.short}</div><div><div class="detail-title">${name}</div><div class="aliases">${meta.aliases.join('／')}</div></div></div>
  <div class="snapshot"><strong>${dateLabel(scene())}の位置</strong>${fs.position}</div>
  <div class="section"><h3>この時点の目的</h3><p>${fs.goal}</p></div>
  <div class="section"><h3>勢力の基本像</h3><p>${meta.summary}</p></div>
  <div class="section"><h3>表示中の人物</h3><div class="tags">${members.map(p=>`<button type="button" class="tag" data-faction-member="${p.id}">${statusAt(p).display}</button>`).join('')||'<span class="muted">人物データなし</span>'}</div></div>
  <div class="section"><h3>他勢力との関係</h3><div class="relations">${rels.length?rels.map(r=>{const other=r.a===name?r.b:r.a;return `<div class="rel"><button type="button" data-other-faction="${other}">${other}</button> — ${r.label}<br><span class="muted">${r.text}</span></div>`}).join(''):'<span class="muted">登録済みの主要関係はありません。</span>'}</div></div>`;
  $$('[data-faction-member]',box).forEach(b=>b.addEventListener('click',()=>selectPerson(b.dataset.factionMember,'people')));
  $$('[data-other-faction]',box).forEach(b=>b.addEventListener('click',()=>selectFaction(b.dataset.otherFaction)));
}

function renderGraph(){
  const svg=$('#relationGraph'), p=getPerson(state.selectedPerson), st=statusAt(p);
  if(!p||!st){svg.innerHTML='<text x="410" y="295" text-anchor="middle" class="node-label">人物を選択してください</text>';return;}
  const rs=relationsFor(p.id); const others=rs.map(r=>getPerson(r.a===p.id?r.b:r.a)).filter(Boolean);
  const center={x:410,y:295}, radius=Math.min(225,145+others.length*8);
  const points=others.map((o,i)=>({o,x:center.x+Math.cos((Math.PI*2*i/Math.max(others.length,1))-Math.PI/2)*radius,y:center.y+Math.sin((Math.PI*2*i/Math.max(others.length,1))-Math.PI/2)*radius}));
  let html='';
  rs.forEach((r,i)=>{const pt=points[i];if(!pt)return;html+=`<line x1="${center.x}" y1="${center.y}" x2="${pt.x}" y2="${pt.y}" class="edge focus ${r.type==='対立'?'dash':''}"></line><text x="${(center.x+pt.x)/2}" y="${(center.y+pt.y)/2-6}" text-anchor="middle" class="edge-label">${r.label}</text>`;});
  html+=`<circle cx="${center.x}" cy="${center.y}" r="45" fill="${factionColor(st.faction)}" class="node selected" data-graph-person="${p.id}"></circle><text x="${center.x}" y="${center.y+5}" text-anchor="middle" class="node-label">${st.display}</text>`;
  points.forEach(({o,x,y})=>{const os=statusAt(o);html+=`<circle cx="${x}" cy="${y}" r="36" fill="${factionColor(os.faction)}" class="node" data-graph-person="${o.id}"></circle><text x="${x}" y="${y+5}" text-anchor="middle" class="node-label">${os.display}</text>`;});
  if(!points.length) html+='<text x="410" y="390" text-anchor="middle" class="edge-label">選択条件で表示できる関係がありません</text>';
  svg.innerHTML=html;
  $$('[data-graph-person]',svg).forEach(n=>n.addEventListener('click',()=>selectPerson(n.dataset.graphPerson,'relations')));
  $('#metricPeople').textContent=activePeople().length; $('#metricRelations').textContent=activeRelations().length; $('#metricFactions').textContent=activeFactionNames().length;
  $('#graphExplanation').innerHTML=rs.length?rs.map(r=>{const o=getPerson(r.a===p.id?r.b:r.a);return `<div class="rel"><button type="button" data-graph-other="${o.id}">${statusAt(o).display}</button> — ${r.label}<br><span class="muted">${r.text}</span></div>`}).join(''):'<span class="muted">該当する関係はありません。</span>';
  $$('[data-graph-other]').forEach(b=>b.addEventListener('click',()=>selectPerson(b.dataset.graphOther,'relations')));
  const legendFactions=[...new Set([st.faction,...others.map(o=>factionAt(o))])];
  $('#graphLegend').innerHTML=legendFactions.map(n=>`<span><i class="dot" style="background:${factionColor(n)}"></i>${n}</span>`).join('');
}

function openEvent(id){
  const i=eventScene.get(id); if(i===undefined)return;
  state.scene=i; state.view='events'; ensureSelections(); renderAll();
}
function renderEvents(){
  const ev=events[scene().event];
  $('#causalTimeline').innerHTML=scenes.map((s,i)=>{const e=events[s.event];return `<div class="chain-row"><div class="chain-date">${dateLabel(s)}</div><div class="chain-line"></div><div class="chain-card ${i===state.scene?'active':''}"><button type="button" data-timeline-scene="${i}"><h3>${e.title}</h3><p>${e.results[e.results.length-1]}</p></button></div></div>`}).join('');
  $$('[data-timeline-scene]').forEach(b=>b.addEventListener('click',()=>setScene(b.dataset.timelineScene)));
  const participantButtons=ev.people.map(id=>{const p=getPerson(id);if(!p)return'';const i=eventScene.get(scene().event),st=statusAt(p,i);return st?`<button type="button" class="tag" data-event-person="${id}">${st.display}</button>`:`<button type="button" class="tag" data-event-person="${id}">${p.name}</button>`}).join('');
  $('#eventDetail').innerHTML=`<div class="badges"><span class="badge">${ev.category}</span><span class="badge">${ev.date}</span></div><div class="section"><div class="detail-title">${ev.title}</div><p>${ev.description}</p></div>
  <div class="event-block"><h3>背景・原因</h3><ul>${ev.causes.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div class="event-block"><h3>主要な争点</h3><div class="tags">${ev.issues.map(x=>`<span class="tag">${x}</span>`).join('')}</div></div>
  <div class="event-block"><h3>関係人物</h3><div class="tags">${participantButtons}</div></div>
  <div class="event-block"><h3>関係勢力</h3><div class="tags">${ev.factions.map(x=>`<button type="button" class="tag" data-event-faction="${x}">${x}</button>`).join('')}</div></div>
  <div class="event-block"><h3>結果・次への影響</h3><ul>${ev.results.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div class="actions"><button type="button" class="button" id="eventToMap">地図で見る</button></div>
  <div class="section"><h3>参考資料</h3><div class="source-list">${sourceLinks(ev.sources)}</div></div>`;
  $$('[data-event-person]').forEach(b=>b.addEventListener('click',()=>selectPerson(b.dataset.eventPerson,'people')));
  $$('[data-event-faction]').forEach(b=>b.addEventListener('click',()=>selectFaction(b.dataset.eventFaction)));
  $('#eventToMap').addEventListener('click',()=>setView('map'));
}

function mapPlaceIds(){
  const p=getPerson(state.selectedPerson), ev=events[scene().event];
  return [...new Set([...(p?.places||[]),...ev.places])];
}
function renderMapInfo(){
  const p=getPerson(state.selectedPerson), st=statusAt(p), ev=events[scene().event], ids=mapPlaceIds();
  $('#mapTitle').textContent=st?`${st.display}と「${ev.title}」の関連地`:`「${ev.title}」の関連地`;
  $('#mapDescription').textContent='緑系の丸は人物の主な関連地、菱形は事件の主要地点です。人物の所在地を特定日ごとに断定する表示ではありません。';
  $('#placeList').innerHTML=ids.map(id=>places[id]?`<div class="list-item"><strong>${places[id].name}</strong><br><span class="muted">${places[id].note}</span>${(places[id].coord[0]<125||places[id].coord[0]>146||places[id].coord[1]<24||places[id].coord[1]>46)?'<br><small class="muted">日本地図の範囲外</small>':''}</div>`:'').join('');
  return {p,ev,ids};
}
function projectMapCoord(coord){
  const m=window.BM_MAP.projection,[lon,lat]=coord;
  const my=Math.log(Math.tan(Math.PI/4+(lat*Math.PI/180)/2));
  return [m.margin+(lon-m.lonMin)/(m.lonMax-m.lonMin)*(m.width-2*m.margin),m.margin+(m.myMax-my)/(m.myMax-m.myMin)*(m.height-2*m.margin)];
}
function initMap(){
  if(!window.BM_MAP){$('#mapStatus').textContent='地図データを読み込めませんでした。地点一覧は利用できます。';return;}
  try{
    const svg=$('#historyMap');
    svg.innerHTML=`<g aria-hidden="true">${BM_MAP.paths.map(p=>`<path d="${p.d}" class="${p.id==='JPN'?'map-japan':'map-land'}"></path>`).join('')}</g><g id="mapPersonLayer"></g><g id="mapEventLayer"></g><g id="mapLabelLayer"></g>`;
    state.map={personLayer:$('#mapPersonLayer'),eventLayer:$('#mapEventLayer'),labelLayer:$('#mapLabelLayer')};state.mapReady=true;renderMap();
  }catch(e){$('#mapStatus').textContent='地図を描画できませんでした。地点一覧は利用できます。';console.error(e);}
}
function renderMap(){
  const {p,ev,ids}=renderMapInfo(); if(!state.mapReady)return;
  const {personLayer,eventLayer,labelLayer}=state.map;
  const personIds=new Set((p?.places||[]).filter(id=>ids.includes(id)));
  const eventIds=new Set(ev.places.filter(id=>ids.includes(id)));
  let personHtml='',eventHtml='',labelHtml='';
  ids.forEach((id,index)=>{
    const place=places[id];if(!place)return;const [lon,lat]=place.coord;
    if(lon<BM_MAP.projection.lonMin||lon>BM_MAP.projection.lonMax||lat<BM_MAP.projection.latMin||lat>BM_MAP.projection.latMax)return;
    const xy=projectMapCoord(place.coord),isPerson=personIds.has(id),isEvent=eventIds.has(id);
    if(isPerson){const st=statusAt(p);personHtml+=`<circle cx="${xy[0]-(isEvent?5:0)}" cy="${xy[1]}" r="7" fill="${factionColor(st?.faction||p.defaultFaction)}" class="map-person ${index===0?'map-active':''}"></circle>`;}
    if(isEvent){eventHtml+=`<rect x="${xy[0]+(isPerson?1:-5)}" y="${xy[1]-5}" width="10" height="10" transform="rotate(45 ${xy[0]+(isPerson?6:0)} ${xy[1]})" class="map-event"></rect>`;}
    labelHtml+=`<text x="${xy[0]+11}" y="${xy[1]-9}" class="map-label">${place.name}</text>`;
  });
  personLayer.innerHTML=personHtml;eventLayer.innerHTML=eventHtml;labelLayer.innerHTML=labelHtml;
}

function renderSources(){
  $('#dataStats').innerHTML=`<div class="stat"><b>${people.length}</b><span>人物</span></div><div class="stat"><b>${Object.keys(factions).length}</b><span>勢力</span></div><div class="stat"><b>${scenes.length}</b><span>時点・事件</span></div><div class="stat"><b>${relations.length}</b><span>人物関係</span></div>`;
  $('#sourceCatalog').innerHTML=Object.values(sources).map(src=>`<a class="source" href="${src.url}" target="_blank" rel="noopener"><strong>${src.title}</strong><span class="muted">${src.note}</span></a>`).join('');
}

function searchAll(query){
  const q=normalise(query);if(!q)return[];
  const results=[];
  people.forEach(p=>{const hay=normalise([p.name,p.kana,...p.aliases,p.oneLine,...Object.values(p.statuses).flatMap(s=>[s.display,s.role,s.stance])].join(' '));if(hay.includes(q))results.push({type:'人物',title:p.name,sub:p.aliases.slice(0,3).join('／'),id:p.id});});
  Object.entries(factions).forEach(([name,f])=>{if(normalise([name,...f.aliases,f.summary].join(' ')).includes(q))results.push({type:'勢力',title:name,sub:f.summary,id:name});});
  Object.entries(events).forEach(([id,e])=>{if(normalise([e.title,e.description,...e.issues,...e.causes,...e.results].join(' ')).includes(q))results.push({type:'事件',title:e.title,sub:e.date,id});});
  return results.slice(0,14);
}
function renderSearch(){
  const value=$('#globalSearch').value, box=$('#searchResults'), results=searchAll(value);
  if(!value.trim()){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;box.innerHTML=results.length?results.map((r,i)=>`<button type="button" class="search-result" data-search-index="${i}"><span class="search-type">${r.type}</span><span><strong>${r.title}</strong><small>${r.sub}</small></span></button>`).join(''):'<div class="notice" style="margin:0">該当する項目がありません。</div>';
  $$('[data-search-index]',box).forEach(b=>b.addEventListener('click',()=>{
    const r=results[Number(b.dataset.searchIndex)];box.hidden=true;$('#globalSearch').value='';
    if(r.type==='人物')selectPerson(r.id,'people');else if(r.type==='勢力')selectFaction(r.id);else openEvent(r.id);
  }));
}

function renderAll(){
  ensureSelections();renderScene();renderTabs();renderPeople();renderFactions();renderGraph();renderEvents();renderMap();renderSources();updateHash();
}
function stopPlayback(){if(state.timer){clearInterval(state.timer);state.timer=null;renderScene();}}
function togglePlayback(){
  if(state.timer){stopPlayback();return;}
  state.timer=setInterval(()=>{if(state.scene>=scenes.length-1){stopPlayback();return;}state.scene+=1;ensureSelections();renderAll();},2200);renderScene();
}
async function copyCurrentUrl(){
  const status=$('#copyStatus');
  try{await navigator.clipboard.writeText(location.href);status.textContent='現在の表示URLをコピーしました。';}
  catch(e){status.textContent=`URL: ${location.href}`;}
}

$('#sceneSelect').addEventListener('change',e=>{stopPlayback();setScene(e.target.value);});
$('#sceneRange').addEventListener('input',e=>{stopPlayback();setScene(e.target.value);});
$('#calendarMode').addEventListener('change',e=>{state.calendar=e.target.value;renderAll();});
$('#prevScene').addEventListener('click',()=>{stopPlayback();setScene(state.scene-1);});
$('#nextScene').addEventListener('click',()=>{stopPlayback();setScene(state.scene+1);});
$('#playScenes').addEventListener('click',togglePlayback);
$('#clearPersonFilter').addEventListener('click',()=>{state.personFactionFilter='すべて';renderPeople();});
$('#relationType').addEventListener('change',e=>{state.relationType=e.target.value;renderGraph();});
$$('.tab').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#globalSearch').addEventListener('input',renderSearch);
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Escape'){e.currentTarget.value='';renderSearch();e.currentTarget.blur();}});
document.addEventListener('click',e=>{if(!e.target.closest('.global-search'))$('#searchResults').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==$('#globalSearch')){e.preventDefault();$('#globalSearch').focus();}});
$('#copyLink').addEventListener('click',copyCurrentUrl);
window.addEventListener('hashchange',()=>{});

renderAll();
initMap();
})();