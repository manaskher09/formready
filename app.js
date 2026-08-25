/* ===== shared chrome: theme + mobile nav ===== */
(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem('fr-theme');
  if(saved) root.setAttribute('data-theme',saved);
  else if(window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme','dark');

  document.addEventListener('DOMContentLoaded',()=>{
    const themeBtn=document.getElementById('themeToggle');
    if(themeBtn){
      themeBtn.textContent=root.getAttribute('data-theme')==='dark'?'☀️':'🌙';
      themeBtn.addEventListener('click',()=>{
        const now=root.getAttribute('data-theme')==='dark'?'light':'dark';
        root.setAttribute('data-theme',now);
        localStorage.setItem('fr-theme',now);
        themeBtn.textContent=now==='dark'?'☀️':'🌙';
      });
    }
    const navToggle=document.getElementById('navToggle');
    const mainNav=document.getElementById('mainNav');
    if(navToggle&&mainNav){
      navToggle.addEventListener('click',()=>mainNav.classList.toggle('open'));
    }
  });
})();

/* ===== tool modal logic (shared by index.html + tools.html) ===== */
let currentTool='image', sourceFile=null;

function $(id){return document.getElementById(id)}

function openTool(type){
  const modal=$('modal');
  if(!modal) return;
  currentTool=type;
  const result=$('toolResult');
  if(result){result.style.display='none';result.innerHTML=''}
  const title={image:'Image to Exact KB',signature:'Signature to Exact KB',pdf:'PDF to Exact KB',jpgpdf:'JPG/PNG to PDF',pdfjpg:'PDF to JPG'}[type];
  $('modalTitle').textContent=title;
  $('modalFile').accept=(type==='image'||type==='signature'||type==='jpgpdf')?'image/jpeg,image/png,image/webp':'application/pdf';
  $('imageControls').style.display=(type==='image'||type==='signature')?'block':'none';
  $('pdfControls').style.display=type==='jpgpdf'?'block':'none';
  $('modalDesc').textContent =
    type==='image'?'Upload a photo and choose the maximum target size.':
    type==='signature'?'Upload a signature image and choose the maximum target size.':
    type==='jpgpdf'?'Upload a JPG/PNG image to create a single-page PDF.':
    type==='pdf'?'PDF compression engine is next up for this tool.':
    'PDF-to-JPG conversion engine is next up for this tool.';
  modal.classList.add('open');
}
function closeModal(){const m=$('modal');if(m)m.classList.remove('open')}

document.addEventListener('DOMContentLoaded',()=>{
  const modalFile=$('modalFile');
  if(modalFile) modalFile.addEventListener('change',e=>sourceFile=e.target.files[0]);

  const fileInput=$('file');
  if(fileInput) fileInput.addEventListener('change',e=>{
    if(e.target.files[0]){sourceFile=e.target.files[0];openTool('image');$('modalFile').files=e.target.files}
  });

  const drop=$('drop');
  if(drop){
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});
    drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
    drop.addEventListener('drop',e=>{
      e.preventDefault();drop.classList.remove('drag');
      const f=e.dataTransfer.files[0];
      if(f){sourceFile=f;openTool('image')}
    });
  }
});

async function compressImage(){
  const result=$('toolResult');
  if(!sourceFile){alert('Choose an image first.');return}
  const target=Number($('targetKb').value)*1024;
  if(!target||target<5120){alert('Choose a target of at least 5 KB.');return}
  const img=new Image();
  img.onload=async()=>{
    let maxW=Math.min(img.naturalWidth,2500);
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    canvas.width=maxW;canvas.height=Math.round(img.naturalHeight*(maxW/img.naturalWidth));
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let lo=0.05,hi=0.98,best=null;
    for(let i=0;i<14;i++){
      const q=(lo+hi)/2;
      const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',q));
      if(blob.size<=target){best=blob;lo=q}else hi=q;
    }
    if(!best){
      while(canvas.width>300&&!best){
        canvas.width=Math.round(canvas.width*.85);canvas.height=Math.round(canvas.height*.85);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.55));
        if(blob.size<=target) best=blob;
      }
    }
    if(!best){alert('Target is too small for this image. Try a larger target.');return}
    const url=URL.createObjectURL(best);
    result.style.display='block';
    result.innerHTML='<img class="previewImg" src="'+url+'"><b>✅ Ready: '+(best.size/1024).toFixed(1)+' KB</b><br><a class="btn btn-primary btn-sm" style="margin-top:12px;text-decoration:none;display:inline-block" download="formready-'+Math.round(best.size/1024)+'kb.jpg" href="'+url+'">Download JPG</a>';
  };
  img.src=URL.createObjectURL(sourceFile);
}

function concat(...arrs){let n=arrs.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n),p=0;for(const a of arrs){out.set(a,p);p+=a.length}return out}

function jpgToPdfBytes(jpegBytes,w,h){
  const enc=new TextEncoder(),objects=[];
  const add=s=>{objects.push(enc.encode(s));return objects.length};
  const content=`q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ`;
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  objects.push(enc.encode(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`));
  objects.push(jpegBytes);
  objects.push(enc.encode('\nendstream'));
  add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  let pdf=enc.encode('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
  const objs=[[1,objects[0]],[2,objects[1]],[3,objects[2]]];
  objs.push([4,concat(objects[3],objects[4],enc.encode('\nendstream'))]);
  objs.push([5,objects[5]]);
  const offsets=[0];
  for(const [num,data] of objs){offsets[num]=pdf.length;pdf=concat(pdf,enc.encode(`${num} 0 obj\n`),data,enc.encode('\nendobj\n'))}
  const xref=pdf.length;
  pdf=concat(pdf,enc.encode(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return pdf;
}

async function makePdf(){
  const result=$('toolResult');
  if(!sourceFile){alert('Choose an image first.');return}
  const img=new Image();
  img.onload=async()=>{
    const c=document.createElement('canvas'),scale=Math.min(1600/img.naturalWidth,1600/img.naturalHeight,1);
    c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.88));
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const pdf=jpgToPdfBytes(bytes,c.width,c.height);
    const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'}));
    result.style.display='block';
    result.innerHTML='<b>✅ PDF created</b><br><a class="btn btn-primary btn-sm" style="margin-top:12px;text-decoration:none;display:inline-block" download="formready-document.pdf" href="'+url+'">Download PDF</a>';
  };
  img.src=URL.createObjectURL(sourceFile);
}

/* ===== applications data =====
   Compiled 24 Aug 2026 from official notifications/portals where possible.
   "verified" = date this record was compiled. Always re-check the linked
   official notification before submitting — cycles, dates and specs change. */
const APPLICATIONS=[
  {code:'UPSC',name:'UPSC Civil Services',cat:'Central Govt',status:'closed',
    notifTitle:'Civil Services Examination, 2026 — Notice No. 05/2026-CSE (Mains in progress; window for this cycle is closed)',
    applyStart:'04 Feb 2026',applyEnd:'27 Feb 2026 (extended)',
    officialUrl:'https://www.upsc.gov.in/sites/default/files/Notif-CSP-2026-Engl-060226Rev.pdf',
    photo:{dims:'350 × 350 px',minKB:20,maxKB:300,format:'JPG/JPEG',notes:'white/off-white background, face ~75% of frame, filename must be photo.jpg'},
    signature:{dims:'~350–500 px wide (exact box unconfirmed)',minKB:20,maxKB:100,format:'JPG/JPEG',notes:'black ink, white background, filename must be signature.jpg — re-verify exact px on upsconline.nic.in at apply time'},
    verified:'24 Aug 2026'},
  {code:'SSC-CGL',name:'SSC CGL',cat:'Central Govt',status:'closed',
    notifTitle:'SSC CGL 2025 (most recent cycle — SSC CGL 2026 notification not yet released as of today)',
    applyStart:'09 Jun 2025',applyEnd:'04 Jul 2025',
    officialUrl:'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2025.pdf',
    photo:{dims:'3.5 cm × 4.5 cm',minKB:20,maxKB:50,format:'JPEG/JPG'},
    signature:{dims:'4 cm × 2 cm',minKB:10,maxKB:20,format:'JPEG/JPG',notes:'signed on white paper, black ink pen'},
    verified:'24 Aug 2026'},
  {code:'SSC-CHSL',name:'SSC CHSL',cat:'Central Govt',status:'closed',
    notifTitle:'SSC CHSL 2025 (most recent cycle — SSC CHSL 2026 notification not yet released as of today)',
    applyStart:'23 Jun 2025',applyEnd:'18 Jul 2025',
    officialUrl:'http://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2025.pdf',
    photo:{dims:'3.5 cm × 4.5 cm',minKB:20,maxKB:50,format:'JPEG/JPG',notes:'white background recommended'},
    signature:{dims:'4 cm × 2 cm',minKB:10,maxKB:20,format:'JPEG/JPG',notes:'PNG format and non-white backgrounds are commonly rejected'},
    verified:'24 Aug 2026'},
  {code:'IBPS-PO',name:'IBPS PO',cat:'Banking',status:'open',
    notifTitle:'CRP PO/MT-XVI — Recruitment of Probationary Officers/Management Trainees (2027-28 vacancies)',
    applyStart:'01 Jul 2026',applyEnd:'26 Jul 2026 (extended)',
    officialUrl:'https://www.ibps.in/wp-content/uploads/Detailed-Notification_CRP-PO-XVI_Final_V1_30.06.2026.pdf',
    photo:{dims:'3.5 cm × 4.5 cm (200 × 230 px)',minKB:20,maxKB:50,format:'JPG/JPEG',notes:'recent colour photo, light/white background, no cap or dark glasses'},
    signature:{dims:'140 × 60 px',minKB:10,maxKB:20,format:'JPG/JPEG',notes:'signed in black ink on white paper, not in capitals'},
    otherDocs:[
      {label:'Left thumb impression',notes:'240 × 240 px @ 200 DPI (~3×3 cm) · 20–50 KB · JPG, black/blue ink on white paper'},
      {label:'Handwritten declaration',notes:'800 × 400 px @ 200 DPI (~10×5 cm) · 50–100 KB · JPG, black ink, English, not capitals'}],
    verified:'24 Aug 2026'},
  {code:'IBPS-CL',name:'IBPS Clerk',cat:'Banking',status:'open',
    notifTitle:'CRP CSA-XVI — Recruitment of Customer Service Associates (2027-28 vacancies)',
    applyStart:'01 Aug 2026',applyEnd:'28 Aug 2026 (extended)',
    officialUrl:'https://www.ibps.in/wp-content/uploads/Notification_CRP_CSA_XVI-Final.pdf',
    photo:{dims:'3.5 cm × 4.5 cm (200 × 230 px)',minKB:20,maxKB:50,format:'JPG/JPEG',notes:'recent colour photo, light/white background, no cap or dark glasses'},
    signature:{dims:'140 × 60 px',minKB:10,maxKB:20,format:'JPG/JPEG',notes:'signed in black ink on white paper, not in capitals'},
    otherDocs:[
      {label:'Left thumb impression',notes:'240 × 240 px @ 200 DPI (~3×3 cm) · 20–50 KB · JPG'},
      {label:'Handwritten declaration',notes:'800 × 400 px @ 200 DPI (~10×5 cm) · 50–100 KB · JPG, black ink, English'}],
    verified:'24 Aug 2026'},
  {code:'SBI-PO',name:'SBI PO',cat:'Banking',status:'open',
    notifTitle:'Advt No. CRPD/PO/2026-27/09 — Recruitment of Probationary Officers (Mains stage upcoming)',
    applyStart:'18 Jun 2026',applyEnd:'08 Jul 2026',
    officialUrl:'https://sbi.bank.in/csfile/18062026_1_Detailed_Adv.2026.pdf',
    photo:{dims:'200 × 230 px (preferred)',minKB:20,maxKB:50,format:'JPG/JPEG',notes:'recent colour photo, light/white background — keep ~8 physical copies on hand too'},
    signature:{dims:'140 × 60 px (preferred)',minKB:10,maxKB:20,format:'JPG/JPEG',notes:'black ink on white paper, not in capitals'},
    otherDocs:[
      {label:'Left thumb impression',notes:'240 × 240 px @ 200 DPI (~3×3 cm) · 20–50 KB'},
      {label:'Handwritten declaration',notes:'800 × 400 px @ 200 DPI (~10×5 cm) · 50–100 KB'}],
    verified:'24 Aug 2026'},
  {code:'SBI-CL',name:'SBI Clerk',cat:'Banking',status:'open',
    notifTitle:'Advt No. CRPD/CR/2026-27/17 — Recruitment of Junior Associates (Customer Support & Sales)',
    applyStart:'11 Aug 2026',applyEnd:'31 Aug 2026',
    officialUrl:'https://sbi.bank.in/webfiles/uploads/files_2627/08/JA_2026_Detailed_Advt_Eng.pdf',
    photo:{dims:'200 × 230 px (preferred)',minKB:20,maxKB:50,format:'JPG/JPEG',notes:'recent colour photo, light/white background'},
    signature:{dims:'140 × 60 px (preferred)',minKB:10,maxKB:20,format:'JPG/JPEG',notes:'black ink on white paper, not in capitals'},
    otherDocs:[
      {label:'Left thumb impression',notes:'240 × 240 px @ 200 DPI (~3×3 cm) · 20–50 KB'},
      {label:'Handwritten declaration',notes:'800 × 400 px @ 200 DPI (~10×5 cm) · 50–100 KB'}],
    verified:'24 Aug 2026'},
  {code:'RRB-NTPC',name:'RRB NTPC',cat:'Railway',status:'closed',
    notifTitle:'CEN 06/2025 (Graduate) & CEN 07/2025 (Undergraduate) — Non-Technical Popular Categories. Live status/dates unconfirmed — check rrbapply.gov.in',
    officialUrl:'https://www.rrbapply.gov.in',
    photo:{dims:'~320 × 240 px (≈35×45 mm)',minKB:30,maxKB:70,format:'JPEG/JPG',notes:'⚠ not verified against an official RRB source (site unreachable) — strong secondary consensus only, confirm on rrbapply.gov.in. Recent photo, no cap/sunglasses, live capture required at application time.'},
    signature:{dims:'~140 × 60 px (≈50×20 mm)',minKB:30,maxKB:70,format:'JPEG/JPG',notes:'⚠ not verified against an official RRB source — running handwriting, not block letters'},
    verified:'24 Aug 2026'},
  {code:'RRB-GRP-D',name:'RRB Group D',cat:'Railway',status:'closed',
    notifTitle:'CEN 08/2024 (Level-1) — most recent documented cycle; a CEN 01/2026 reference also surfaced — confirm which is currently live on rrbapply.gov.in',
    officialUrl:'https://www.rrbapply.gov.in',
    photo:{dims:'~320 × 240 px',minKB:50,maxKB:100,format:'JPEG/JPG',notes:'⚠ not verified against an official RRB source — sources conflict on exact KB range, confirm on rrbapply.gov.in. Plain white/light background, not older than ~2 months.'},
    signature:{dims:'~140 × 60 px',minKB:30,maxKB:50,format:'JPEG/JPG',notes:'⚠ not verified against an official RRB source — running handwriting, black ink, must match across all stages'},
    verified:'24 Aug 2026'},
  {code:'NDA',name:'NDA',cat:'Defence',status:'closed',
    notifTitle:'NDA & NA Examination (II), 2026 — window closed; exam scheduled 13 Sep 2026',
    applyStart:'20 May 2026',applyEnd:'09 Jun 2026',
    officialUrl:'https://www.upsc.gov.in/sites/default/files/Notif-NDA-II-2026-Engl-200526.pdf',
    photo:{dims:'350 × 350 px (UPSC-wide OTR policy)',minKB:20,maxKB:300,format:'JPG/JPEG',notes:'colour, white background; live photo capture also mandatory during application — exact KB range not stated in the notification itself, re-verify on upsconline.nic.in'},
    signature:{dims:'~350–500 px wide (secondary-sourced)',minKB:20,maxKB:100,format:'JPG/JPEG',notes:'TRIPLE SIGNATURE required — sign three times, one below the other, black ink on plain white paper (confirmed via the matching CDS-II 2026 notification text)'},
    verified:'24 Aug 2026'},
  {code:'CDS',name:'CDS',cat:'Defence',status:'closed',
    notifTitle:'Combined Defence Services Examination (II), 2026 — Notice No. 11/2026-CDS-II — window closed; exam scheduled 13 Sep 2026',
    applyStart:'20 May 2026',applyEnd:'09 Jun 2026',
    officialUrl:'https://www.upsc.gov.in/sites/default/files/Notification_CDS_II_English.pdf',
    photo:{dims:'Not given as a numeric size in the notification — it points candidates to the Photos & Signature instructions on upsconline.nic.in',format:'JPG/JPEG',notes:'live photo capture is mandatory in addition to the uploaded photo (verbatim from the official notification)'},
    signature:{dims:'Not given as a numeric size in the notification (secondary sources: ~350–500 px)',format:'JPG/JPEG',notes:'TRIPLE SIGNATURE required — sign three times, one below the other, on plain white paper in black ink (verbatim from the official notification)'},
    verified:'24 Aug 2026'},
  {code:'BPSC',name:'BPSC',cat:'State PSC',status:'closed',
    notifTitle:'Integrated 72nd Combined (Preliminary) Competitive Examination — prelim POSTPONED, new date not yet announced',
    applyStart:'07 May 2026',applyEnd:'31 May 2026',
    officialUrl:'https://bpsc.bihar.gov.in/wp-content/uploads/BPSC_content/Notices/Advertisement-Integrated-72th-CCE-PT_BPSC-20260505-p1euvo.pdf',
    photo:{dims:'No separate upload — captured live via webcam during the application',format:'Live webcam capture',notes:'ensure a clear, well-lit live photo'},
    signature:{dims:'150–220 px wide × 250–320 px tall',maxKB:20,format:'JPEG',notes:'one Hindi + one English signature required, must be clearly legible'},
    otherDocs:[{label:'Physical copies',notes:'keep 5 copies of your current photograph on hand — may be required later in the process'}],
    verified:'24 Aug 2026'},
  {code:'UPPSC',name:'UPPSC',cat:'State PSC',status:'closed',
    notifTitle:'Combined State/Upper Subordinate Services (PCS) Exam 2026 — Advt No. A-1/E-1/2026 — window closed; prelim scheduled 06 Dec 2026',
    applyStart:'25 Jun 2026',applyEnd:'03 Aug 2026 (correction window to 10 Aug 2026)',
    officialUrl:'https://uppsc.up.nic.in',
    photo:{dims:'Not confirmed from an official source — the OTR portal blocked automated verification',format:'JPG (per portal norm)',notes:'⚠ Unverified third-party estimate only: 3.5×4.5 cm / 20–50 KB. Confirm the real figure on the OTR portal (otr.pariksha.nic.in) before use.'},
    signature:{dims:'Not confirmed from an official source',format:'JPG (per portal norm)',notes:'⚠ Unverified third-party estimate only: 3.5×1.5 cm / 10–20 KB. Confirm on the OTR portal before use.'},
    verified:'24 Aug 2026'},
  {code:'MPPSC',name:'MPPSC',cat:'State PSC',status:'closed',
    notifTitle:'State Service Examination 2026 — Advt No. 29/2025 — prelim held 26 Apr 2026, cycle concluded; next notification awaited',
    applyStart:'10 Jan 2026',applyEnd:'09 Feb 2026 (late-fee extensions to 01 Apr 2026)',
    officialUrl:'https://mppsc.mp.gov.in/uploads/advertisement/Advt_State_Service_Exam_2026_Dated_31_12_2025.pdf',
    photo:{dims:'Not stated numerically in the official advertisement (it links to a separate visual template)',format:'JPG only (mandatory)',notes:'⚠ Unverified third-party estimate only: ~200×230 px / ≤100 KB. Confirm against the official portal template before use.'},
    signature:{dims:'Not stated numerically in the official advertisement',format:'JPG only (mandatory)',notes:'⚠ Unverified third-party estimate only: ~140×60 px / ≤40 KB. Confirm before use.'},
    verified:'24 Aug 2026'},
  {code:'CTET',name:'CTET',cat:'Teaching',status:'closed',
    notifTitle:'CTET September 2026 — Information Bulletin — window closed; exam scheduled 06 Sep 2026',
    applyStart:'11 May 2026',applyEnd:'10 Jun 2026',
    officialUrl:'https://cdnbbsr.s3waas.gov.in/s3443dec3062d0286986e21dc0631734c9/uploads/2026/05/202605111250310617.pdf',
    photo:{dims:'3.5 cm × 4.5 cm',minKB:10,maxKB:100,format:'JPG/JPEG',notes:'recent passport-size colour photo, light/white background'},
    signature:{dims:'3.5 cm × 1.5 cm',minKB:3,maxKB:30,format:'JPG/JPEG'},
    verified:'24 Aug 2026'},
];

function initials(name){
  return name.split(/[\s-]+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

const CAT_CLASS={
  'Central Govt':'cat-central','Banking':'cat-banking','Railway':'cat-railway',
  'Defence':'cat-defence','State PSC':'cat-state','Teaching':'cat-teaching'
};

function parseExamDate(str){
  if(!str) return null;
  const clean=str.replace(/\(.*?\)/g,'').trim();
  const d=new Date(clean);
  return isNaN(d)?null:d;
}
function daysLeft(a){
  const d=parseExamDate(a.applyEnd);
  if(!d) return null;
  const now=new Date();now.setHours(0,0,0,0);
  d.setHours(0,0,0,0);
  return Math.round((d-now)/86400000);
}
function shortDate(d){
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
}

function statusPill(a){
  if(a.status==='open'){
    const dl=daysLeft(a);
    if(dl!==null&&dl>=0&&dl<=5) return {cls:'urgent',text:'Closes in '+(dl===0?'today':dl+'d')};
    if(dl!==null&&dl>0){const d=parseExamDate(a.applyEnd);return {cls:'open',text:'Open · closes '+shortDate(d)}}
    return {cls:'open',text:'Open'};
  }
  if(a.status==='expected') return {cls:'expected',text:'Expected soon'};
  return {cls:'closed',text:'Closed'};
}

function renderApplications(filterCat,query){
  const grid=$('examGrid');
  if(!grid) return;
  const q=(query||'').trim().toLowerCase();
  const items=APPLICATIONS.filter(a=>
    (filterCat==='All'||a.cat===filterCat) &&
    (!q||a.name.toLowerCase().includes(q)||a.cat.toLowerCase().includes(q))
  );
  grid.innerHTML=items.map(a=>{
    const p=statusPill(a);
    return `
    <div class="exam-card" onclick="showExamDetail('${a.code}')">
      <div class="exam-badge ${CAT_CLASS[a.cat]||''}">${initials(a.name)}</div>
      <h3>${a.name}</h3>
      <div class="cat">${a.cat}</div>
      <span class="status-pill ${p.cls}">${p.text}</span>
    </div>`;
  }).join('') || '<p style="color:var(--muted)">No applications match your search.</p>';
}

function renderTrustBar(){
  const el=$('trustBar');
  if(!el) return;
  const total=APPLICATIONS.length;
  const openCount=APPLICATIONS.filter(a=>a.status==='open').length;
  const latest=APPLICATIONS.reduce((m,a)=>a.verified>m?a.verified:m,APPLICATIONS[0].verified);
  el.innerHTML=`<span><b>${total}</b> exams tracked</span><span class="sep">·</span>`+
    `<span><b class="pos">${openCount}</b> accepting applications now</span><span class="sep">·</span>`+
    `<span>Verified against official notifications ${latest}</span>`;
}

function fmtKB(spec){
  if(!spec) return 'Not specified';
  if(spec.minKB && spec.maxKB) return spec.minKB+'–'+spec.maxKB+' KB';
  if(spec.maxKB) return 'up to '+spec.maxKB+' KB';
  return 'Size not specified';
}

function statusLabel(a){
  if(a.status==='open') return '🟢 Applications currently open';
  if(a.status==='expected') return '🟡 Next cycle expected — dates not yet notified';
  return '🔴 Applications closed for this cycle';
}

function showExamDetail(code){
  const a=APPLICATIONS.find(x=>x.code===code);
  if(!a) return;
  const detail=$('examDetail');
  $('examDetailTitle').textContent=a.name+' — Document Requirements';
  const crumb=$('examBreadcrumb');
  if(crumb) crumb.innerHTML='<a href="applications.html">Applications</a><span>/</span><span>'+a.name+'</span>';

  const notice=$('examNotice');
  const p=statusPill(a);
  notice.innerHTML=
    '<span class="status-pill '+p.cls+' lg">'+p.text+'</span><br><br>'+
    '<b>'+statusLabel(a)+'</b><br>'+
    (a.notifTitle||'Notification details not available')+
    (a.applyStart||a.applyEnd?'<br>Apply window: '+(a.applyStart||'—')+' to '+(a.applyEnd||'—'):'')+
    '<br><small>Data verified '+a.verified+' against the official notification — always re-check the current notification before submitting your form, as dates and specs can change between cycles.</small>';

  const specs=$('examSpecs');
  let html=
    '<div class="spec"><b>Photo</b><span>'+(a.photo?a.photo.dims+' · '+fmtKB(a.photo)+' · '+a.photo.format+(a.photo.notes?' · '+a.photo.notes:''):'Not specified')+'</span></div>'+
    '<div class="spec"><b>Signature</b><span>'+(a.signature?a.signature.dims+' · '+fmtKB(a.signature)+' · '+a.signature.format+(a.signature.notes?' · '+a.signature.notes:''):'Not specified')+'</span></div>';
  if(a.otherDocs&&a.otherDocs.length){
    a.otherDocs.forEach(d=>{
      html+='<div class="spec"><b>'+d.label+'</b><span>'+d.notes+'</span></div>';
    });
  }
  specs.innerHTML=html;

  const link=$('examOfficialLink');
  if(a.officialUrl){link.href=a.officialUrl;link.style.display='inline-flex'}
  else{link.style.display='none'}

  detail.classList.add('open');
  detail.scrollIntoView({behavior:'smooth',block:'start'});
}

function initCatTabs(){
  const tabs=document.querySelectorAll('.cat-tabs .tool-tab');
  const search=$('examSearch');
  let active='All';
  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    active=t.dataset.cat;
    renderApplications(active,search?search.value:'');
  }));
  if(search) search.addEventListener('input',()=>renderApplications(active,search.value));

  const trends=document.querySelectorAll('.trend-chip');
  trends.forEach(c=>c.addEventListener('click',()=>{
    if(search){search.value=c.dataset.q;renderApplications(active,search.value)}
  }));

  renderTrustBar();
}
