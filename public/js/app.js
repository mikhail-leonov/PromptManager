/* =========================================================================
   Prompt Templates Library — application logic (js/app.js)
   Functions are intentionally global so the inline onclick handlers in
   index.html keep working. Language packs in js/lng/*.js self-register into
   window.AppLang before this file runs.
   ========================================================================= */

const STORAGE_KEY='prompt_templates_v1';
const FOLDER_STORAGE_KEY='prompt_template_folders_v1';
const LANG_KEY='prompt_templates_lang_v1';
const INDENT=18; // px per tree level

let templates=[];          // {id, name, body, folderId}
let folders=[];            // {id, name, parentId, collapsed}
let selectedId=null;
let editingId=null;
let bsModal=null;
let dragItem=null;         // {type:'template'|'folder', id}

/* ---------- localization ---------- */
const FALLBACK_LANG='en';
let curLang=FALLBACK_LANG;
function langRegistry(){return window.AppLang||{dicts:{},order:[]};}
function dictFor(code){const r=langRegistry();return (r.dicts[code]&&r.dicts[code].dict)||{};}
function availableLangs(){const r=langRegistry();return (r.order&&r.order.length)?r.order:Object.keys(r.dicts);}
function t(key,vars){
  const d=dictFor(curLang),en=dictFor(FALLBACK_LANG);
  let s=(d[key]!=null)?d[key]:(en[key]!=null?en[key]:key);
  if(vars&&typeof s==='string'){
    s=s.replace(/\{(\w+)\}/g,(_,k)=>vars[k]!=null?vars[k]:'{'+k+'}');
  }
  return s;
}
function pickInitialLang(){
  let saved=null;try{saved=localStorage.getItem(LANG_KEY);}catch(e){}
  const avail=availableLangs();
  if(saved&&avail.indexOf(saved)!==-1)return saved;
  const nav=(navigator.language||'en').slice(0,2).toLowerCase();
  if(avail.indexOf(nav)!==-1)return nav;
  return (avail.indexOf(FALLBACK_LANG)!==-1)?FALLBACK_LANG:(avail[0]||FALLBACK_LANG);
}
function applyStaticI18n(){
  document.querySelectorAll('[data-i18n]').forEach(n=>{n.textContent=t(n.getAttribute('data-i18n'));});
  document.querySelectorAll('[data-i18n-html]').forEach(n=>{n.innerHTML=t(n.getAttribute('data-i18n-html'));});
  document.querySelectorAll('[data-i18n-ph]').forEach(n=>{n.setAttribute('placeholder',t(n.getAttribute('data-i18n-ph')));});
  document.querySelectorAll('[data-i18n-title]').forEach(n=>{n.setAttribute('title',t(n.getAttribute('data-i18n-title')));});
}
function buildLangSwitcher(){
  const sel=document.getElementById('langSelect');if(!sel)return;
  const r=langRegistry(),codes=availableLangs();
  sel.innerHTML=codes.map(c=>{
    const name=(r.dicts[c]&&r.dicts[c].meta&&r.dicts[c].meta.name)||c;
    return `<option value="${c}"${c===curLang?' selected':''}>${esc(name)}</option>`;
  }).join('');
  sel.value=curLang;
  sel.addEventListener('change',function(){setLang(this.value);});
}
function setLang(code){
  const avail=availableLangs();
  curLang=(avail.indexOf(code)!==-1)?code:(avail.indexOf(FALLBACK_LANG)!==-1?FALLBACK_LANG:(avail[0]||FALLBACK_LANG));
  try{localStorage.setItem(LANG_KEY,curLang);}catch(e){}
  const meta=(langRegistry().dicts[curLang]||{}).meta||{};
  document.documentElement.setAttribute('lang',curLang);
  document.documentElement.setAttribute('dir',meta.dir||'ltr');
  const sel=document.getElementById('langSelect');if(sel)sel.value=curLang;
  applyStaticI18n();      // static DOM
  render();               // tree (row titles, empty message)
  updateOutput();         // output placeholder / result
  // keep an open modal's title in sync with the language
  const mt=document.getElementById('modalTitle');
  if(mt) mt.textContent=t(editingId?'modal_edit':'modal_new');
}

/* ---------- persistence ---------- */
function load(){
 try{templates=JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{templates=[]}
 try{folders=JSON.parse(localStorage.getItem(FOLDER_STORAGE_KEY))||[]}catch{folders=[]}
 migrate();
}

function save(){
 try{
   localStorage.setItem(STORAGE_KEY,JSON.stringify(templates));
   localStorage.setItem(FOLDER_STORAGE_KEY,JSON.stringify(folders));
 }catch(e){/* storage may be unavailable in a sandboxed preview */}
}

// Migrate the old flat model (folders as name strings, templates with .folder name)
// into a nested-tree model (folder objects + template.folderId).
function migrate(){
 const nameToId={};
 folders=(folders||[]).map(f=>{
   if(typeof f==='string'){const o={id:uid(),name:f,parentId:null,collapsed:false};nameToId[f]=o.id;return o;}
   if(!f.id)f.id=uid();
   if(f.parentId===undefined)f.parentId=null;
   if(f.collapsed===undefined)f.collapsed=false;
   nameToId[f.name]=f.id;
   return f;
 });
 templates=(templates||[]).map(t=>{
   if(!t.id)t.id=uid();
   if(t.folderId===undefined){
     t.folderId=(t.folder&&nameToId[t.folder])?nameToId[t.folder]:null;
   }
   delete t.folder;
   return t;
 });
 save();
}

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ---------- tree helpers ---------- */
function childFolders(parentId){return folders.filter(f=>(f.parentId||null)===(parentId||null));}
function childTemplates(folderId){return templates.filter(t=>(t.folderId||null)===(folderId||null));}

// Is `ancestorId` an ancestor of folder `nodeId`?
function isAncestor(ancestorId,nodeId){
 let cur=folders.find(f=>f.id===nodeId);
 while(cur){
   if((cur.parentId||null)===ancestorId)return true;
   cur=folders.find(f=>f.id===cur.parentId);
 }
 return false;
}

/* ---------- rendering ---------- */
function render(){
 const list=document.getElementById('templateList');
 document.getElementById('tplCount').textContent=templates.length?`(${templates.length})`:'';
 const html=renderLevel(null,0);
 list.innerHTML=html.trim()?html:`<p class="text-secondary text-center px-2 py-3 small">${esc(t('no_templates'))}</p>`;
}

function renderLevel(parentId,depth){
 let html='';
 childFolders(parentId).forEach(f=>{
   html+=folderRow(f,depth);
   if(!f.collapsed)html+=renderLevel(f.id,depth+1);
 });
 childTemplates(parentId).forEach(t=>html+=templateRow(t,depth));
 return html;
}

function folderRow(f,depth){
 const open=!f.collapsed;
 const pad=8+depth*INDENT;
 return `
 <div class="tree-row d-flex align-items-center gap-1 py-1 pe-2" draggable="true"
      data-type="folder" data-id="${f.id}"
      style="cursor:pointer;padding-left:${pad}px" onclick="toggleFolder('${f.id}')">
   <i class="bi ${open?'bi-chevron-down':'bi-chevron-right'} text-secondary chev" style="font-size:.7rem"></i>
   <i class="bi ${open?'bi-folder2-open':'bi-folder-fill'} text-warning flex-shrink-0"></i>
   <span class="flex-grow-1 small text-truncate fw-semibold text-secondary">${esc(f.name)}</span>
   <span onclick="event.stopPropagation()" class="d-flex flex-shrink-0 row-actions">
     <button class="btn btn-sm p-0 px-1 text-secondary lh-1" title="${esc(t('title_subfolder'))}" onclick="createFolder('${f.id}')"><i class="bi bi-folder-plus"></i></button>
     <button class="btn btn-sm p-0 px-1 text-secondary lh-1" title="${esc(t('title_rename'))}" onclick="renameFolder('${f.id}')"><i class="bi bi-pencil-square"></i></button>
     <button class="btn btn-sm p-0 px-1 text-danger lh-1" title="${esc(t('title_delete_folder'))}" onclick="deleteFolder('${f.id}')"><i class="bi bi-trash3"></i></button>
   </span>
 </div>`;
}

function templateRow(t_,depth){
 const pad=8+depth*INDENT;
 const sel=t_.id===selectedId;
 return `
 <div class="tree-row d-flex align-items-center gap-1 py-1 pe-2 ${sel?'selected':''}" draggable="true"
      data-type="template" data-id="${t_.id}"
      style="cursor:pointer;padding-left:${pad}px" onclick="selectTemplate('${t_.id}')">
   <span class="chev"></span>
   <i class="bi bi-file-earmark-text flex-shrink-0 ${sel?'text-primary':'text-secondary'}"></i>
   <span class="flex-grow-1 small text-truncate ${sel?'text-primary fw-semibold':'text-body'}">${esc(t_.name)}</span>
   <span onclick="event.stopPropagation()" class="d-flex flex-shrink-0 row-actions">
     <button class="btn btn-sm p-0 px-1 text-secondary lh-1" title="${esc(t('title_edit'))}" onclick="openModal('${t_.id}')"><i class="bi bi-pencil-square"></i></button>
     <button class="btn btn-sm p-0 px-1 text-danger lh-1" title="${esc(t('title_delete'))}" onclick="deleteTemplate('${t_.id}')"><i class="bi bi-trash3"></i></button>
   </span>
 </div>`;
}

/* ---------- folder operations ---------- */
function createFolder(parentId=null){
 const name=prompt(t('prompt_folder_name'));
 if(!name)return;
 const folder=name.trim();
 if(!folder)return;
 if(folders.some(f=>(f.parentId||null)===(parentId||null)&&f.name.toLowerCase()===folder.toLowerCase()))
   return alert(t('alert_folder_exists'));
 folders.push({id:uid(),name:folder,parentId:parentId||null,collapsed:false});
 if(parentId){const p=folders.find(f=>f.id===parentId);if(p)p.collapsed=false;}
 save();render();
}

function renameFolder(id){
 const f=folders.find(x=>x.id===id);
 if(!f)return;
 const name=prompt(t('prompt_rename_folder'),f.name);
 if(!name||!name.trim())return;
 f.name=name.trim();
 save();render();
}

function deleteFolder(id){
 const f=folders.find(x=>x.id===id);
 if(!f)return;
 if(!confirm(t('confirm_delete_folder',{name:f.name})))return;
 folders.forEach(c=>{if(c.parentId===id)c.parentId=f.parentId||null;});
 templates.forEach(t=>{if(t.folderId===id)t.folderId=f.parentId||null;});
 folders=folders.filter(x=>x.id!==id);
 save();render();
}

function toggleFolder(id){
 const f=folders.find(x=>x.id===id);
 if(!f)return;
 f.collapsed=!f.collapsed;
 save();render();
}

/* ---------- drag & drop ---------- */
function clearDropIndicators(){
 document.querySelectorAll('.tree-row.drop-into,.tree-row.drop-before,.tree-row.drop-after')
   .forEach(el=>el.classList.remove('drop-into','drop-before','drop-after'));
 document.getElementById('templateList').classList.remove('drop-root');
}

function invalidFolderTarget(targetId){
 if(!dragItem)return true;
 if(dragItem.type==='folder'){
   if(dragItem.id===targetId)return true;          // into itself
   if(isAncestor(dragItem.id,targetId))return true; // into own descendant
 }
 return false;
}

function moveInto(type,id,targetFolderId){
 targetFolderId=targetFolderId||null;
 if(type==='folder'){
   if(id===targetFolderId||invalidFolderTarget(targetFolderId))return;
   const f=folders.find(x=>x.id===id);if(f)f.parentId=targetFolderId;
 }else{
   const t=templates.find(x=>x.id===id);if(t)t.folderId=targetFolderId;
 }
 save();render();
}

function reorderTemplate(id,targetTemplateId,before){
 const tgt=templates.find(t=>t.id===targetTemplateId);
 const src=templates.find(t=>t.id===id);
 if(!tgt||!src||src===tgt)return;
 src.folderId=tgt.folderId||null;
 templates=templates.filter(t=>t.id!==id);
 let idx=templates.findIndex(t=>t.id===targetTemplateId);
 if(!before)idx+=1;
 templates.splice(idx,0,src);
 save();render();
}

function initDnd(){
 const list=document.getElementById('templateList');

 list.addEventListener('dragstart',e=>{
   const row=e.target.closest('.tree-row');
   if(!row)return;
   dragItem={type:row.dataset.type,id:row.dataset.id};
   e.dataTransfer.effectAllowed='move';
   e.dataTransfer.setData('text/plain',row.dataset.id);
   row.classList.add('dragging');
 });

 list.addEventListener('dragend',e=>{
   clearDropIndicators();
   const row=e.target.closest('.tree-row');
   if(row)row.classList.remove('dragging');
   dragItem=null;
 });

 list.addEventListener('dragover',e=>{
   if(!dragItem)return;
   e.preventDefault();
   e.dataTransfer.dropEffect='move';
   clearDropIndicators();
   const row=e.target.closest('.tree-row');
   if(row&&row.dataset.type==='folder'){
     if(!invalidFolderTarget(row.dataset.id))row.classList.add('drop-into');
   }else if(row&&row.dataset.type==='template'){
     const r=row.getBoundingClientRect();
     row.classList.add((e.clientY-r.top)<r.height/2?'drop-before':'drop-after');
   }else{
     list.classList.add('drop-root');
   }
 });

 list.addEventListener('drop',e=>{
   if(!dragItem)return;
   e.preventDefault();
   const row=e.target.closest('.tree-row');
   const {type,id}=dragItem;
   if(row&&row.dataset.type==='folder'){
     moveInto(type,id,row.dataset.id);
   }else if(row&&row.dataset.type==='template'){
     const tgt=templates.find(t=>t.id===row.dataset.id);
     if(type==='template'){
       const r=row.getBoundingClientRect();
       reorderTemplate(id,row.dataset.id,(e.clientY-r.top)<r.height/2);
     }else{
       moveInto('folder',id,tgt?tgt.folderId:null);
     }
   }else{
     moveInto(type,id,null); // dropped on empty area -> root
   }
   clearDropIndicators();
 });

 list.addEventListener('dragleave',e=>{
   if(e.target===list)list.classList.remove('drop-root');
 });
}

/* ---------- template selection / output ---------- */
function selectTemplate(id){selectedId=id;render();updateOutput();}

function updateOutput(){
 const box=document.getElementById('outputBox');
 const userText=document.getElementById('userText').value;
 const tpl=templates.find(t=>t.id===selectedId);

 if(!tpl){
  box.innerHTML=`<span class="text-secondary fst-italic">${esc(t('output_placeholder'))}</span>`;
  document.getElementById('copyBtn').classList.add('d-none');
  return;
 }

 const result=tpl.body.replace(/\{\{text\}\}/g,userText);
 box.innerHTML=esc(tpl.body).replace(/\{\{text\}\}/g,userText?`<mark class="bg-warning-subtle text-warning-emphasis rounded px-1">${esc(userText)}</mark>`:'<span class="text-secondary">{{text}}</span>');
 box.dataset.raw=result;
 document.getElementById('copyBtn').classList.remove('d-none');
}

function copyOutput(){
 navigator.clipboard.writeText(document.getElementById('outputBox').dataset.raw||'');
 const note=document.getElementById('copyNote');
 note.textContent=t('copied');
 setTimeout(()=>note.textContent='',1200);
}

/* ---------- modal ---------- */
function folderOptions(parentId=null,depth=0,acc=[]){
 childFolders(parentId).forEach(f=>{
   acc.push({id:f.id,label:'\u00A0\u00A0'.repeat(depth)+(depth?'└ ':'')+f.name});
   folderOptions(f.id,depth+1,acc);
 });
 return acc;
}

function populateFolderSelect(selected=''){
 const select=document.getElementById('modalFolder');
 const opts=folderOptions();
 select.innerHTML=`<option value="">${esc(t('root'))}</option>`+opts.map(o=>`<option value="${o.id}">${esc(o.label)}</option>`).join('');
 select.value=selected||'';
}

function openModal(id=null){
 editingId=id;
 document.getElementById('modalTitle').textContent=t(id?'modal_edit':'modal_new');
 if(id){
  const t_=templates.find(x=>x.id===id);
  document.getElementById('modalName').value=t_.name;
  document.getElementById('modalBody').value=t_.body;
  populateFolderSelect(t_.folderId||'');
 }else{
  document.getElementById('modalName').value='';
  document.getElementById('modalBody').value='';
  populateFolderSelect('');
 }
 bsModal.show();
}

function saveTemplate(){
 const name=document.getElementById('modalName').value.trim();
 const body=document.getElementById('modalBody').value.trim();
 const folderId=document.getElementById('modalFolder').value||null;

 if(!name||!body)return alert(t('alert_fill_both'));

 if(editingId){
   const t_=templates.find(x=>x.id===editingId);
   t_.name=name;t_.body=body;t_.folderId=folderId;
 }else{
   templates.push({id:uid(),name,body,folderId});
 }

 save();render();updateOutput();
 bsModal.hide();
}

function deleteTemplate(id){
 if(!confirm(t('confirm_delete_template')))return;
 templates=templates.filter(t=>t.id!==id);
 if(selectedId===id)selectedId=null;
 save();render();updateOutput();
}

/* ---------- import / export ---------- */
function exportTemplates(){
 const blob=new Blob([JSON.stringify({folders,templates},null,2)],{type:'application/json'});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download='prompt-templates.json';
 a.click();
}

function importTemplates(event){
 const file=event.target.files[0];
 if(!file)return;

 const reader=new FileReader();
 reader.onload=e=>{
   try{
     const data=JSON.parse(e.target.result);
     let inFolders=[],inTemplates=[];
     if(Array.isArray(data)){inTemplates=data;}
     else{inFolders=data.folders||[];inTemplates=data.templates||[];}

     // remap incoming folder ids to fresh ones (avoid collisions), support old string folders
     const idMap={},nameMap={};
     const norm=inFolders.map(f=>{
       const nid=uid();
       if(typeof f==='string'){nameMap[f]=nid;return {id:nid,name:f,parentId:null,collapsed:false,_op:null};}
       idMap[f.id]=nid;nameMap[f.name]=nid;
       return {id:nid,name:f.name,parentId:null,collapsed:!!f.collapsed,_op:f.parentId??null};
     });
     norm.forEach(f=>{if(f._op!=null)f.parentId=idMap[f._op]??null;delete f._op;});
     folders=folders.concat(norm);

     inTemplates.forEach(t=>{
       let folderId=null;
       if(t.folderId!=null)folderId=idMap[t.folderId]??null;
       else if(t.folder!=null)folderId=nameMap[t.folder]??null;
       templates.push({id:uid(),name:t.name,body:t.body,folderId});
     });

     save();render();
   }catch(err){alert(t('alert_import_invalid'));}
   event.target.value='';
 };
 reader.readAsText(file);
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded',()=>{
    curLang=pickInitialLang();
    document.documentElement.setAttribute('lang',curLang);
    buildLangSwitcher();
    applyStaticI18n();
    load();
    render();
    initDnd();
    bsModal=new bootstrap.Modal(document.getElementById('tplModal'));
});
