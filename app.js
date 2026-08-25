/* ===== shared chrome: theme + mobile nav ===== */
const SUN_SVG='<svg class="icon" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M17.99 17.99l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M17.99 6.01l1.77-1.77"/></svg>';
const MOON_SVG='<svg class="icon" viewBox="0 0 24 24" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem('fr-theme');
  if(saved) root.setAttribute('data-theme',saved);
  else if(window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme','dark');

  document.addEventListener('DOMContentLoaded',()=>{
    const themeBtn=document.getElementById('themeToggle');
    if(themeBtn){
      themeBtn.innerHTML=root.getAttribute('data-theme')==='dark'?SUN_SVG:MOON_SVG;
      themeBtn.addEventListener('click',()=>{
        const now=root.getAttribute('data-theme')==='dark'?'light':'dark';
        root.setAttribute('data-theme',now);
        localStorage.setItem('fr-theme',now);
        themeBtn.innerHTML=now==='dark'?SUN_SVG:MOON_SVG;
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
  const title={image:'Image to Exact KB',signature:'Signature to Exact KB',pdf:'PDF to Exact KB',jpgpdf:'JPG/PNG to PDF',pdfjpg:'PDF to JPG',dimensions:'Resize to Exact Pixels',formatconvert:'Convert Image Format',fileinfo:'Check File Info'}[type];
  $('modalTitle').textContent=title;
  const imageTypes=['image','signature','jpgpdf','dimensions','formatconvert','fileinfo'];
  $('modalFile').accept=imageTypes.includes(type)?'image/jpeg,image/png,image/webp':'application/pdf';
  const show=(id,on)=>{const el=$(id);if(el)el.style.display=on?'block':'none'};
  show('imageControls',type==='image'||type==='signature');
  show('pdfControls',type==='jpgpdf');
  show('pdfCompressControls',type==='pdf');
  show('pdfExtractControls',type==='pdfjpg');
  show('dimControls',type==='dimensions');
  show('formatControls',type==='formatconvert');
  show('infoControls',type==='fileinfo');
  $('modalDesc').textContent =
    type==='image'?'Upload a photo and choose the maximum target size.':
    type==='signature'?'Upload a signature image and choose the maximum target size.':
    type==='jpgpdf'?'Upload a JPG/PNG image to create a single-page PDF.':
    type==='pdf'?'Upload a PDF and choose the maximum target size — each page is rasterized and recompressed to fit.':
    type==='pdfjpg'?'Upload a PDF to extract its first page as a JPG image.':
    type==='dimensions'?'Upload a photo and set the exact width × height in pixels the form requires.':
    type==='formatconvert'?'Upload an image and pick the format the application portal expects.':
    'Upload any photo to instantly see its exact dimensions, size and format.';
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

function multiPagePdfBytes(pages){
  const enc=new TextEncoder();
  const n=pages.length;
  const kids=pages.map((p,i)=>(3+i*3)+' 0 R').join(' ');
  const objs=[
    {num:1,data:enc.encode(`<< /Type /Catalog /Pages 2 0 R >>`)},
    {num:2,data:enc.encode(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`)}
  ];
  pages.forEach((p,i)=>{
    const pageNum=3+i*3,imgNum=pageNum+1,contentNum=pageNum+2;
    const content=`q\n${p.w} 0 0 ${p.h} 0 0 cm\n/Im0 Do\nQ`;
    objs.push({num:pageNum,data:enc.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /XObject << /Im0 ${imgNum} 0 R >> >> /Contents ${contentNum} 0 R >>`)});
    const imgHeader=enc.encode(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);
    objs.push({num:imgNum,data:concat(imgHeader,p.bytes,enc.encode('\nendstream'))});
    objs.push({num:contentNum,data:enc.encode(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)});
  });
  let pdf=enc.encode('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
  const offsets=[0];
  for(const {num,data} of objs){offsets[num]=pdf.length;pdf=concat(pdf,enc.encode(`${num} 0 obj\n`),data,enc.encode('\nendobj\n'))}
  const xref=pdf.length;
  const size=offsets.length;
  let xrefTable=`xref\n0 ${size}\n0000000000 65535 f \n`;
  for(let i=1;i<size;i++) xrefTable+=String(offsets[i]||0).padStart(10,'0')+' 00000 n \n';
  pdf=concat(pdf,enc.encode(xrefTable),enc.encode(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return pdf;
}

function jpgToPdfBytes(jpegBytes,w,h){
  return multiPagePdfBytes([{bytes:jpegBytes,w,h}]);
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

async function resizeToDimensions(){
  const result=$('toolResult');
  if(!sourceFile){alert('Choose an image first.');return}
  const w=Number($('targetW').value),h=Number($('targetH').value);
  if(!w||!h||w<10||h<10){alert('Enter a valid width and height.');return}
  const img=new Image();
  img.onload=async()=>{
    const c=document.createElement('canvas');
    c.width=w;c.height=h;
    c.getContext('2d').drawImage(img,0,0,w,h);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));
    const url=URL.createObjectURL(blob);
    result.style.display='block';
    result.innerHTML='<img class="previewImg" src="'+url+'"><b>✅ Resized to '+w+'×'+h+' px</b><br><a class="btn btn-primary btn-sm" style="margin-top:12px;text-decoration:none;display:inline-block" download="formready-'+w+'x'+h+'.jpg" href="'+url+'">Download JPG</a>';
  };
  img.src=URL.createObjectURL(sourceFile);
}

async function convertFormat(){
  const result=$('toolResult');
  if(!sourceFile){alert('Choose an image first.');return}
  const mime=$('targetFormat').value;
  const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
  const img=new Image();
  img.onload=async()=>{
    const c=document.createElement('canvas');
    c.width=img.naturalWidth;c.height=img.naturalHeight;
    c.getContext('2d').drawImage(img,0,0);
    const blob=await new Promise(r=>c.toBlob(r,mime,.92));
    if(!blob){alert('Your browser cannot export this format.');return}
    const url=URL.createObjectURL(blob);
    result.style.display='block';
    result.innerHTML='<img class="previewImg" src="'+url+'"><b>✅ Converted to '+ext.toUpperCase()+'</b><br><a class="btn btn-primary btn-sm" style="margin-top:12px;text-decoration:none;display:inline-block" download="formready-converted.'+ext+'" href="'+url+'">Download '+ext.toUpperCase()+'</a>';
  };
  img.src=URL.createObjectURL(sourceFile);
}

function checkFileInfo(){
  const result=$('toolResult');
  if(!sourceFile){alert('Choose a file first.');return}
  const img=new Image();
  img.onload=()=>{
    result.style.display='block';
    result.innerHTML='<img class="previewImg" src="'+img.src+'"><b>'+sourceFile.name+'</b><br>'+
      '<span style="color:var(--muted);font-size:13px;line-height:1.8">'+
      img.naturalWidth+' × '+img.naturalHeight+' px<br>'+
      (sourceFile.size/1024).toFixed(1)+' KB<br>'+
      (sourceFile.type||'unknown type')+'</span>';
  };
  img.src=URL.createObjectURL(sourceFile);
}

async function renderPdfPageToCanvas(file,pageNum,scale){
  const buf=await file.arrayBuffer();
  const pdf=await window.pdfjsLib.getDocument({data:buf}).promise;
  const page=await pdf.getPage(pageNum);
  const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  return {canvas,pageCount:pdf.numPages};
}

async function pdfToJpg(){
  const result=$('toolResult');
  if(!sourceFile){alert('Choose a PDF first.');return}
  if(!window.pdfjsLib){alert('PDF engine still loading — try again in a second.');return}
  result.style.display='block';
  result.innerHTML='<span style="color:var(--muted)">Rendering page 1…</span>';
  try{
    const {canvas,pageCount}=await renderPdfPageToCanvas(sourceFile,1,2);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.92));
    const url=URL.createObjectURL(blob);
    result.innerHTML='<img class="previewImg" src="'+url+'"><b>✅ Page 1 extracted'+(pageCount>1?' (PDF has '+pageCount+' pages — only page 1 is extracted)':'')+'</b><br><a class="btn btn-primary btn-sm" style="margin-top:12px;text-decoration:none;display:inline-block" download="formready-page1.jpg" href="'+url+'">Download JPG</a>';
  }catch(e){
    result.innerHTML='<b style="color:var(--danger)">Could not read this PDF.</b><br><span style="font-size:12px;color:var(--muted)">'+e.message+'</span>';
  }
}

async function compressPdf(){
  const result=$('toolResult');
  if(!sourceFile){alert('Choose a PDF first.');return}
  if(!window.pdfjsLib){alert('PDF engine still loading — try again in a second.');return}
  const target=Number($('pdfTargetKb').value)*1024;
  if(!target||target<20480){alert('Choose a target of at least 20 KB.');return}
  result.style.display='block';
  result.innerHTML='<span style="color:var(--muted)">Reading PDF…</span>';
  try{
    const buf=await sourceFile.arrayBuffer();
    const pdfDoc=await window.pdfjsLib.getDocument({data:buf}).promise;
    const n=pdfDoc.numPages;
    const perPageBudget=Math.max(Math.floor(target/n)-300,4096);
    const pages=[];
    for(let i=1;i<=n;i++){
      result.innerHTML='<span style="color:var(--muted)">Compressing page '+i+' of '+n+'…</span>';
      const page=await pdfDoc.getPage(i);
      const viewport=page.getViewport({scale:1.5});
      const canvas=document.createElement('canvas');
      canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      let lo=0.05,hi=0.95,best=null;
      for(let k=0;k<12;k++){
        const q=(lo+hi)/2;
        const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',q));
        if(blob.size<=perPageBudget){best=blob;lo=q}else hi=q;
      }
      if(!best) best=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.05));
      const bytes=new Uint8Array(await best.arrayBuffer());
      pages.push({bytes,w:canvas.width,h:canvas.height});
    }
    const pdfBytes=multiPagePdfBytes(pages);
    const url=URL.createObjectURL(new Blob([pdfBytes],{type:'application/pdf'}));
    result.innerHTML='<b>✅ Compressed to '+(pdfBytes.length/1024).toFixed(1)+' KB ('+n+' page'+(n>1?'s':'')+')</b><br><span style="font-size:12px;color:var(--muted)">Pages are rasterized to hit your target — great for scanned documents, but text is no longer selectable.</span><br><a class="btn btn-primary btn-sm" style="margin-top:12px;text-decoration:none;display:inline-block" download="formready-compressed.pdf" href="'+url+'">Download PDF</a>';
  }catch(e){
    result.innerHTML='<b style="color:var(--danger)">Could not compress this PDF.</b><br><span style="font-size:12px;color:var(--muted)">'+e.message+'</span>';
  }
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
    verified:'24 Aug 2026',
    eligibility:{
      minAge:21,ageAsOn:'1 Aug 2026',
      maxAgeByCategory:{General:32,EWS:32,OBC:35,SC:37,ST:37,PwBD:42},
      qualification:'Graduate degree, any discipline, no minimum percentage — final-year candidates may apply for Prelims but must prove graduation before Mains',
      minQualLevel:'graduate',
      notes:'General: 6 attempts, OBC: 9 attempts, SC/ST: unlimited — all counted only up to the age ceiling above.'
    },
    fillGuide:[
      {field:'One Time Registration (OTR)',enter:'Complete this first, before anything else — a single profile reused for every future UPSC exam (CSE, NDA, CDS and more)',example:'—',note:'⚠ Once you use your one allowed OTR update, no further changes to any OTR field are possible — proofread before that, not after.'},
      {field:'Contact Details',enter:'An email and mobile number you check daily',example:'—',note:'Both are OTP-verified during OTR, and every UPSC communication — including your e-admit card — comes through these two.'},
      {field:'Password & Security Questions',enter:'A strong password plus answers you’ll actually remember months later',example:'—',note:'You’ll need these to recover your OTR account if you get locked out closer to the exam.'},
      {field:'Correspondence & Permanent Address',enter:'Fill both fully, or tick the “same as above” option if they match',example:'—',note:'—'},
      {field:'Photo & Signature',enter:'Upload per the spec in the Document Requirements tab above',example:'—',note:'Filenames must literally be photo.jpg and signature.jpg — this is stated verbatim in UPSC’s own notification.'},
      {field:'Exam Centre, Optional Subject, Mains Language, Service Preferences (Part 2)',enter:'Only fill this after OTR is fully complete',example:'—',note:'Choose your optional subject deliberately — it’s one of the hardest fields to live with later even where it is technically editable.'}
    ]},
  {code:'SSC-CGL',name:'SSC CGL',cat:'Central Govt',status:'closed',
    notifTitle:'SSC CGL 2025 (most recent cycle — SSC CGL 2026 notification not yet released as of today)',
    applyStart:'09 Jun 2025',applyEnd:'04 Jul 2025',
    officialUrl:'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2025.pdf',
    photo:{dims:'3.5 cm × 4.5 cm',minKB:20,maxKB:50,format:'JPEG/JPG'},
    signature:{dims:'4 cm × 2 cm',minKB:10,maxKB:20,format:'JPEG/JPG',notes:'signed on white paper, black ink pen'},
    verified:'24 Aug 2026',
    eligibility:{
      minAge:18,ageAsOn:'1 Aug 2026',
      maxAgeByCategory:{General:32,EWS:32,OBC:35,SC:37,ST:37,PwBD:42},
      qualification:'Bachelor’s degree from a recognized university, any discipline for most posts (a few posts like JSO/AAO want a specific stream — check the post-wise chart)',
      minQualLevel:'graduate',
      notes:'⚠ The actual age ceiling is post-wise (18–27 for most Group C posts, up to 18–32 for JSO) — this checker uses the widest ceiling across all CGL posts, so a match means "eligible for at least one CGL post," not necessarily every post. Confirm the exact post-wise limit in the notification.'
    },
    fillGuide:[
      {field:'One Time Registration (OTR)',enter:'Complete this first — one profile reused for every SSC exam: CGL, CHSL, MTS and more',example:'—',note:'Errors made here silently propagate into every SSC form you fill afterward — get it right once.'},
      {field:'Full Name, DOB, Gender, Category (inside OTR)',enter:'Exactly as on your Class 10 (Matriculation) certificate',example:'RAHUL KUMAR SHARMA — not "Rahul K. Sharma"',note:'⚠ These fields lock after first submission. A spelling mismatch with your certificate is a common rejection reason at document verification.'},
      {field:'Exam & Post Preferences',enter:'Select Combined Graduate Level Examination, then rank your exam centres and post preferences in genuine priority order',example:'—',note:'⚠ Post-preference order cannot be changed after final submission — no exceptions, per SSC’s own rules.'},
      {field:'Educational Qualification',enter:'Institution name, board/university, year of passing and percentage for Class 10, 12 and Bachelor’s',example:'—',note:'Keep your certificates open in another tab while filling this — typos here are a frequent cause of rejection at verification.'},
      {field:'Photo & Signature',enter:'Upload per the spec in the Document Requirements tab above',example:'—',note:'The portal rejects out-of-spec files immediately — resize before you start this step, not after.'},
      {field:'Final Review',enter:'Re-read every field before clicking submit',example:'—',note:'SSC does open a short correction window, but not everything is editable, and each correction costs a fee (₹200 for the first, ₹500 for a second) — treat your first submission as close to final as possible.'}
    ]},
  {code:'SSC-CHSL',name:'SSC CHSL',cat:'Central Govt',status:'closed',
    notifTitle:'SSC CHSL 2025 (most recent cycle — SSC CHSL 2026 notification not yet released as of today)',
    applyStart:'23 Jun 2025',applyEnd:'18 Jul 2025',
    officialUrl:'http://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2025.pdf',
    photo:{dims:'3.5 cm × 4.5 cm',minKB:20,maxKB:50,format:'JPEG/JPG',notes:'white background recommended'},
    signature:{dims:'4 cm × 2 cm',minKB:10,maxKB:20,format:'JPEG/JPG',notes:'PNG format and non-white backgrounds are commonly rejected'},
    verified:'24 Aug 2026',
    eligibility:{
      minAge:18,ageAsOn:'1 Jan 2026',
      maxAgeByCategory:{General:27,EWS:27,OBC:30,SC:32,ST:32,PwBD:42},
      qualification:'Passed Class 12 (or equivalent) from a recognized board — no graduation required. For DEO Grade-A specifically, Class 12 with Mathematics may be required.',
      minQualLevel:'class12',
      notes:'No minimum percentage in Class 12, and no cap on number of attempts.'
    }},
  {code:'IBPS-PO',name:'IBPS PO',cat:'Banking',status:'open',
    notifTitle:'CRP PO/MT-XVI — Recruitment of Probationary Officers/Management Trainees (2027-28 vacancies)',
    applyStart:'01 Jul 2026',applyEnd:'26 Jul 2026 (extended)',
    officialUrl:'https://www.ibps.in/wp-content/uploads/Detailed-Notification_CRP-PO-XVI_Final_V1_30.06.2026.pdf',
    photo:{dims:'3.5 cm × 4.5 cm (200 × 230 px)',minKB:20,maxKB:50,format:'JPG/JPEG',notes:'recent colour photo, light/white background, no cap or dark glasses'},
    signature:{dims:'140 × 60 px',minKB:10,maxKB:20,format:'JPG/JPEG',notes:'signed in black ink on white paper, not in capitals'},
    otherDocs:[
      {label:'Left thumb impression',notes:'240 × 240 px @ 200 DPI (~3×3 cm) · 20–50 KB · JPG, black/blue ink on white paper'},
      {label:'Handwritten declaration',notes:'800 × 400 px @ 200 DPI (~10×5 cm) · 50–100 KB · JPG, black ink, English, not capitals'}],
    verified:'24 Aug 2026',
    eligibility:{
      minAge:20,ageAsOn:'1 Jul 2026',
      maxAgeByCategory:{General:30,EWS:30,OBC:33,SC:35,ST:35,PwBD:40},
      qualification:'Graduation degree in any discipline from a recognized university, no minimum percentage',
      minQualLevel:'graduate',
      notes:'PwBD relaxation can run higher than shown (10–15 years depending on category+disability combination) — the figure above is a conservative estimate, confirm the exact combined relaxation in the notification.'
    },
    fillGuide:[
      {field:'Full Name',enter:'Exactly as on your Class 10 certificate',example:'RAHUL KUMAR SHARMA',note:'⚠ Locked after first submission — no correction window for this field. A mismatch with your certificates causes rejection at document verification.'},
      {field:'Father’s / Mother’s Name',enter:'As per your Class 10 certificate or official ID',example:'SURESH KUMAR SHARMA',note:'Same lock-after-submission rule as your own name.'},
      {field:'Date of Birth',enter:'DD-MM-YYYY, matching your Class 10 certificate exactly',example:'15-08-2001',note:'⚠ Also locked after submission — a common error is transposing the day and month.'},
      {field:'Category',enter:'Select your actual category (General/EWS/OBC-NCL/SC/ST/PwBD)',example:'OBC-NCL',note:'⚠ Locked after submission. Claiming a reserved category you’re not entitled to is treated as fraud, not a correctable mistake — never guess this field.'},
      {field:'Mobile Number & Email',enter:'An active number and inbox you check daily',example:'—',note:'Both are OTP-verified at registration and used for every update about this application, including your admit card.'},
      {field:'Exam Centre Preference',enter:'Choose in genuine order of preference',example:'—',note:'You may not get your first choice, but listing centres you can’t realistically travel to just to "save time" is a common regret.'},
      {field:'Photo & Signature Upload',enter:'Upload per the spec in the Document Requirements tab above',example:'—',note:'Use the Resize tools first to hit the exact spec, then come back and upload — re-uploading after a rejection mid-session can time out your form.'}
    ]},
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
    verified:'24 Aug 2026',
    eligibility:{
      minAge:21,ageAsOn:'1 Apr 2026',
      maxAgeByCategory:{General:30,EWS:30,OBC:33,SC:35,ST:35,PwBD:'35–40 (exact figure not confirmed — check notification)'},
      qualification:'Graduation degree in any discipline — final-year candidates may apply provisionally with proof of graduation due before the interview stage',
      minQualLevel:'graduate',
      notes:'PwBD and ex-servicemen relaxation follows standard government norms but the precise ceiling wasn’t confirmed from available sources for this cycle — confirm in the notification.'
    },
    fillGuide:[
      {field:'Basic Registration',enter:'Name, email and mobile to create your provisional registration',example:'—',note:'This step generates your registration number and password — save both immediately, you’ll need them to log back in and finish the form.'},
      {field:'Category',enter:'Select your actual category — UR/OBC/SC/ST/EWS/PwBD',example:'OBC',note:'⚠ Selecting the wrong category (e.g. General instead of OBC) usually cannot be corrected after submission, and directly affects your application fee.'},
      {field:'Educational Qualification',enter:'Mark your degree status accurately',example:'"Completed" or "Appearing"',note:'—'},
      {field:'Father’s/Mother’s Name, Gender, Marital Status, Address',enter:'As per your official documents',example:'—',note:'—'},
      {field:'Photo, Signature, Left Thumb Impression, Handwritten Declaration',enter:'Upload all four per the spec in the Document Requirements tab above',example:'—',note:'⚠ SBI PO requires all four uploads, not just photo and signature — the thumb impression and declaration are easy to miss on a first attempt.'},
      {field:'Application Fee',enter:'₹750 for UR/EWS/OBC · NIL for SC/ST/PwBD, paid by card or net banking',example:'—',note:'After payment, click Final Submit, then download and save both the e-receipt and the filled application PDF — you may need either later.'}
    ]},
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
  {code:'CAT',name:'CAT (IIM)',cat:'Higher Education',status:'open',
    notifTitle:'Common Admission Test 2026 — conducted by IIM Indore for admission to the IIMs and 1,300+ other B-schools',
    applyStart:'03 Aug 2026',applyEnd:'15 Sep 2026',
    officialUrl:'https://iimcat.ac.in',
    photo:{dims:'35 mm × 45 mm (min 150×150 px)',minKB:80,maxKB:1000,format:'JPG/JPEG',notes:'⚠ compiled from secondary/aggregator sources, not the official CAT Information Bulletin directly — recent colour photo, white/light background, not older than 6 months. Re-verify on iimcat.ac.in before uploading.'},
    signature:{dims:'80 mm × 35 mm (min 80×35 px)',maxKB:80,format:'JPG/JPEG',notes:'⚠ compiled from secondary sources — signed in black/blue ink on plain white paper. Re-verify on iimcat.ac.in before uploading.'},
    verified:'25 Aug 2026'},
  {code:'GRE',name:'GRE General Test',cat:'Higher Education',status:'open',
    notifTitle:'GRE General Test — administered year-round by ETS; registration is rolling, not a single open/close window like Indian govt exams',
    officialUrl:'https://www.ets.org/gre/test-takers/general-test/register.html',
    photo:{dims:'Not applicable — GRE registration has no photo/signature file upload step',format:'—',notes:'Unlike Indian govt exams, GRE verifies you in person: bring a valid, unexpired government-issued photo ID with a signature to the test center. A passport is strongly recommended, and mandatory for most international test-takers. Photocopies are not accepted.'},
    signature:{dims:'Not applicable',format:'—',notes:'Your signature is checked against your ID at the test center, not uploaded as a file.'},
    verified:'25 Aug 2026'},
  {code:'GMAT',name:'GMAT Focus Edition',cat:'Higher Education',status:'open',
    notifTitle:'GMAT Focus Edition — administered year-round by GMAC/mba.com; rolling registration, no fixed application window like Indian govt exams',
    officialUrl:'https://www.mba.com/exams/gmat-exam',
    photo:{dims:'Not applicable — GMAT registration has no photo/signature file upload step',format:'—',notes:'Like GRE, GMAT verifies you in person: a valid, unexpired government-issued photo ID with your signature and date of birth is required at the test center. For test-takers in India, a valid Indian passport is the only accepted ID — both in person and for the online exam.'},
    signature:{dims:'Not applicable',format:'—',notes:'Checked against your ID at the test center, not uploaded as a file.'},
    verified:'25 Aug 2026'},
  {code:'IELTS',name:'IELTS',cat:'Higher Education',status:'open',
    notifTitle:'IELTS — administered by IDP India; test dates run continuously through the year, no fixed application window',
    officialUrl:'https://ielts.idp.com/',
    photo:{dims:'Recent passport-size photograph — exact px/KB not stated in secondary sources',format:'JPG/JPEG (typical)',notes:'⚠ compiled from secondary/aggregator sources, not the official IDP portal directly. Re-verify the exact size on ielts.idp.com at registration.'},
    signature:{dims:'Not applicable — IELTS does not require a separate signature upload',format:'—',notes:'—'},
    otherDocs:[{label:'Passport scan',notes:'Clear colour scan of your passport\'s first + last pages (plus any observation pages) · under 1 MB · JPG, JPEG, PNG or PDF · the same physical passport is required on test day'}],
    verified:'25 Aug 2026'},
  {code:'SSC-MTS',name:'SSC MTS',cat:'Central Govt',status:'closed',
    notifTitle:'SSC Multi Tasking Staff (Non-Technical) & Havaldar (CBIC/CBN) Examination',
    officialUrl:'https://ssc.gov.in',
    photo:{dims:'Not independently verified for this specific recruitment — uses the same SSC OTR portal as SSC CGL/CHSL',format:'JPG/JPEG (typical)',notes:'⚠ likely the same 3.5×4.5 cm / 20–50 KB pattern as other SSC exams, but confirm on the notification before uploading.'},
    signature:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ likely the same pattern as other SSC exams, confirm on the notification.'},
    verified:'25 Aug 2026',
    eligibility:{
      minAge:18,ageAsOn:'1 Aug 2026',
      maxAgeByCategory:{General:27,EWS:27,OBC:30,SC:32,ST:32,PwBD:42},
      qualification:'Passed Class 10 (Matriculation) or equivalent — no higher qualification required',
      minQualLevel:'class10',
      notes:'⚠ The age ceiling is post-dependent: plain MTS posts are actually 18–25 (3 years lower than shown), Havaldar posts are 18–27 — this checker uses the wider Havaldar band, so a match means "eligible for at least one of the two post types," not necessarily MTS itself. Havaldar also has a physical test (e.g. 1600m walk in 15 min for men) this checker doesn\'t verify.'
    }},
  {code:'SSC-JE',name:'SSC JE',cat:'Central Govt',status:'closed',
    notifTitle:'SSC Junior Engineer (Civil, Mechanical, Electrical) Examination',
    officialUrl:'https://ssc.gov.in',
    photo:{dims:'Not independently verified for this specific recruitment — uses the same SSC OTR portal as SSC CGL/CHSL',format:'JPG/JPEG (typical)',notes:'⚠ likely the same 3.5×4.5 cm / 20–50 KB pattern as other SSC exams, but confirm on the notification before uploading.'},
    signature:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ likely the same pattern as other SSC exams, confirm on the notification.'},
    verified:'25 Aug 2026',
    eligibility:{
      minAge:18,ageAsOn:'1 Jan 2026',
      maxAgeByCategory:{General:32,EWS:32,OBC:35,SC:37,ST:37,PwBD:'up to ~47 (15-year relaxation range — exact figure depends on disability category, confirm on notification)'},
      qualification:'Diploma or B.E./B.Tech in Civil, Mechanical or Electrical Engineering — the specific branch required varies by post. Some diploma-holder posts also need 2 years of professional experience.',
      minQualLevel:'class12',
      notes:'⚠ This checker only verifies your qualification LEVEL, not your field — a non-engineering Class 12 pass or degree does NOT meet the real requirement even though it may show as a level-match here. The 32-year ceiling shown is the widest across departments (CPWD JE); most others cap at 30.'
    }},
  {code:'IBPS-SO',name:'IBPS SO',cat:'Banking',status:'closed',
    notifTitle:'CRP SPL-XVI — Recruitment of Specialist Officers (IT, Law, HR, Marketing, Agriculture) for participating banks',
    officialUrl:'https://www.ibps.in',
    photo:{dims:'Not independently verified for this specific recruitment — uses the same IBPS portal as IBPS PO',format:'JPG/JPEG (typical)',notes:'⚠ likely the same 200×230 px / 20–50 KB pattern as IBPS PO, but confirm on the notification.'},
    signature:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ likely the same 140×60 px pattern as IBPS PO, confirm on the notification.'},
    verified:'25 Aug 2026',
    eligibility:{
      minAge:20,ageAsOn:'1 Jul 2026',
      maxAgeByCategory:{General:30,EWS:30,OBC:33,SC:35,ST:35,PwBD:'up to ~40 (varies, confirm on notification)'},
      qualification:'Varies by post: IT Officer needs a Computer Science/IT/Electronics degree or diploma; Law Officer needs an LLB plus State Bar Council enrolment; Agricultural Field Officer, HR and Marketing Officer each need a specific relevant degree (Agriculture, HR/Social Work, MBA-Marketing respectively). No prior work experience required.',
      minQualLevel:'graduate',
      notes:'⚠ This checker only verifies qualification LEVEL — the actual requirement is a SPECIFIC degree per post, not any graduation degree. Check which SO post matches your actual degree before applying.'
    }},
  {code:'SBI-SO',name:'SBI SO',cat:'Banking',status:'closed',
    notifTitle:'SBI Specialist Cadre Officer (SCO) Recruitment — Manager/Deputy Manager and other specialist posts',
    officialUrl:'https://sbi.co.in/careers',
    photo:{dims:'Not independently verified for this specific recruitment — uses the same SBI portal as SBI PO',format:'JPG/JPEG (typical)',notes:'⚠ likely the same pattern as SBI PO, but confirm on the notification.'},
    signature:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ likely the same pattern as SBI PO, confirm on the notification.'},
    verified:'25 Aug 2026',
    eligibility:{
      minAge:21,ageAsOn:'31 Jul 2026',
      maxAgeByCategory:{General:35,EWS:35,OBC:38,SC:40,ST:40,PwBD:'varies, confirm on notification'},
      qualification:'Relevant degree in IT, Finance, Law or Engineering depending on post — most SCO posts also require 1–5+ years of post-qualification work experience.',
      minQualLevel:'graduate',
      notes:'⚠ Age and experience requirements are heavily post-dependent (e.g. Deputy Manager posts run 25–35, some senior posts run 28–40) — this checker uses the widest band across all current SCO posts, so a match means "eligible for at least one post," not every post. Work experience (which this checker captures but doesn\'t gate on) is often the real deciding factor for SBI SO — check the specific post\'s requirement.'
    }},
  {code:'RBI-GB',name:'RBI Grade B',cat:'Banking',status:'closed',
    notifTitle:'Reserve Bank of India Grade B (DR) Officer Recruitment',
    officialUrl:'https://opportunities.rbi.org.in',
    photo:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ confirm exact photo/signature spec on the RBI recruitment portal.'},
    signature:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ confirm exact spec on the RBI recruitment portal.'},
    verified:'25 Aug 2026',
    eligibility:{
      minAge:21,ageAsOn:'1 Apr 2026',
      maxAgeByCategory:{General:30,EWS:30,OBC:33,SC:35,ST:35,PwBD:35},
      qualification:'Graduation with minimum 60% marks (55% for SC/ST/PwBD) for the General stream; a Master\'s in Economics, Statistics or a related quantitative field with minimum 55% for the specialist DEPR/DSIM streams.',
      minQualLevel:'graduate',
      notes:'⚠ This checker doesn\'t verify your percentage — RBI Grade B has a real minimum-percentage cutoff, not just "any graduate," which most other exams on this list don\'t have. M.Phil/PhD holders get age relaxation up to 32/34 regardless of category.'
    }},
  {code:'NABARD-A',name:'NABARD Grade A',cat:'Banking',status:'closed',
    notifTitle:'NABARD Grade A (Assistant Manager) Recruitment — RDBS, Legal, Rajbhasha and other streams',
    officialUrl:'https://www.nabard.org',
    photo:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ confirm exact photo/signature spec on the NABARD recruitment portal.'},
    signature:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ confirm exact spec on the NABARD recruitment portal.'},
    verified:'25 Aug 2026',
    eligibility:{
      minAge:21,ageAsOn:'1 Jul 2026',
      maxAgeByCategory:{General:30,EWS:30,OBC:33,SC:35,ST:35,PwBD:'varies, confirm on notification'},
      qualification:'Bachelor\'s degree with minimum 60% (55% for SC/ST/PwBD), or postgraduate degree with minimum 55% (50% for SC/ST/PwBD), from a recognized university.',
      minQualLevel:'graduate',
      notes:'⚠ This checker doesn\'t verify your percentage — NABARD has a real minimum-percentage cutoff. The Protocol & Security Service stream has a completely different 25–40 age band with NO category relaxation at all — this checker\'s numbers above are for the general RDBS/Legal streams only.'
    }},
  {code:'LIC-AAO',name:'LIC AAO',cat:'Banking',status:'closed',
    notifTitle:'LIC Assistant Administrative Officer (Generalist) Recruitment',
    officialUrl:'https://licindia.in/careers',
    photo:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ confirm exact photo/signature spec on the LIC recruitment portal.'},
    signature:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ confirm exact spec on the LIC recruitment portal.'},
    verified:'25 Aug 2026',
    eligibility:{
      minAge:21,ageAsOn:'1 Aug 2026',
      maxAgeByCategory:{General:30,EWS:30,OBC:33,SC:35,ST:35,PwBD:'varies, confirm on notification'},
      qualification:'Bachelor\'s degree in any discipline from a recognized Indian university — no minimum percentage stated for the Generalist post.',
      minQualLevel:'graduate',
      notes:'Additional relaxation applies for existing LIC employees and ex-servicemen beyond the standard category relaxation shown.'
    }},
  {code:'RRB-JE',name:'RRB JE',cat:'Railway',status:'open',
    notifTitle:'CEN 04/2026 — Junior Engineer & Depot Material Superintendent Recruitment',
    applyStart:'14 Aug 2026',applyEnd:'13 Sep 2026',
    officialUrl:'https://www.rrbapply.gov.in',
    photo:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ confirm exact photo/signature spec on rrbapply.gov.in — RRB photo/signature specs have historically been hard to verify against a stable official source (see RRB NTPC/Group D entries above).'},
    signature:{dims:'Not independently verified for this specific recruitment',format:'JPG/JPEG (typical)',notes:'⚠ confirm exact spec on rrbapply.gov.in.'},
    verified:'25 Aug 2026',
    eligibility:{
      minAge:18,ageAsOn:'1 Jan 2027',
      maxAgeByCategory:{General:33,EWS:33,OBC:36,SC:38,ST:38,PwBD:'varies, confirm on notification'},
      qualification:'3-year diploma or B.E./B.Tech in a relevant engineering discipline — varies by post. No prior work experience required.',
      minQualLevel:'class12',
      notes:'⚠ This checker only verifies qualification LEVEL, not field — a non-engineering Class 12 pass does NOT meet the real requirement even though it may show as a level-match here.'
    }},
];

function initials(name){
  return name.replace(/[()]/g,'').split(/[\s-]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

const CAT_CLASS={
  'Central Govt':'cat-central','Banking':'cat-banking','Railway':'cat-railway',
  'Defence':'cat-defence','State PSC':'cat-state','Teaching':'cat-teaching',
  'Higher Education':'cat-highered'
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

  const tabs=$('detailTabs'),guideEl=$('examFillGuide'),specsEl=$('examSpecs');
  if(a.fillGuide&&a.fillGuide.length){
    tabs.style.display='flex';
    guideEl.innerHTML='<p class="fill-intro">Compiled from the official notification and the application steps it describes — screens can shift slightly between cycles, so treat this as a companion while you fill the real form, not a replacement for reading your own entries before final submit.</p>'+
      a.fillGuide.map(f=>
        '<div class="fill-row">'+
          '<div class="fill-field">'+f.field+'</div>'+
          '<div class="fill-body">'+
            '<div><b>Enter:</b> '+f.enter+'</div>'+
            (f.example&&f.example!=='—'?'<div><b>Example:</b> '+f.example+'</div>':'')+
            (f.note&&f.note!=='—'?'<div class="fill-note'+(f.note.startsWith('⚠')?' warn':'')+'">'+f.note+'</div>':'')+
          '</div>'+
        '</div>').join('');
    specsEl.style.display='grid';guideEl.style.display='none';
    const tabBtns=tabs.querySelectorAll('button');
    tabBtns.forEach(b=>b.classList.remove('active'));
    tabBtns[0].classList.add('active');
    tabBtns[0].onclick=()=>{tabBtns.forEach(b=>b.classList.remove('active'));tabBtns[0].classList.add('active');specsEl.style.display='grid';guideEl.style.display='none'};
    tabBtns[1].onclick=()=>{tabBtns.forEach(b=>b.classList.remove('active'));tabBtns[1].classList.add('active');specsEl.style.display='none';guideEl.style.display='block'};
  }else{
    tabs.style.display='none';
    specsEl.style.display='grid';guideEl.style.display='none';
  }

  const link=$('examOfficialLink');
  if(a.officialUrl){link.href=a.officialUrl;link.style.display='inline-flex'}
  else{link.style.display='none'}

  detail.classList.add('open');
  detail.scrollIntoView({behavior:'smooth',block:'start'});
}

const ELIGIBILITY_CODES=['UPSC','SSC-CGL','SSC-CHSL','SSC-MTS','SSC-JE','IBPS-PO','IBPS-SO','SBI-PO','SBI-SO','RBI-GB','NABARD-A','LIC-AAO','RRB-JE'];
const QUAL_RANK={below10:0,class10:1,class12:2,final:3,graduate:3,postgrad:3};
const QUAL_MIN_RANK={class10:1,class12:2,graduate:3};

function checkEligibility(){
  const age=Number($('eligAge').value);
  const category=$('eligCategory').value;
  const qual=$('eligQual').value;
  const results=$('eligResults');
  if(!results) return;
  if(!age||age<15||age>70){alert('Enter a valid age.');return}

  const userRank=QUAL_RANK[qual];

  const rows=ELIGIBILITY_CODES.map(code=>{
    const a=APPLICATIONS.find(x=>x.code===code);
    const e=a.eligibility;
    if(!e) return null;
    const minRank=QUAL_MIN_RANK[e.minQualLevel];
    const qualMeets=userRank>=minRank;
    const maxAge=e.maxAgeByCategory[category];
    const ageUncertain=typeof maxAge!=='number';
    const qualLabel=e.minQualLevel==='class10'?'Class 10 pass':e.minQualLevel==='class12'?'Class 12 pass':'at least final-year graduation';
    let verdict,cls;
    if(!qualMeets){
      verdict='Not yet — needs '+qualLabel;cls='closed';
    }else if(age<e.minAge){
      verdict='Not yet — below minimum age ('+e.minAge+')';cls='closed';
    }else if(ageUncertain){
      verdict='Possibly — exact age ceiling for '+category+' unclear, check notification';cls='expected';
    }else if(age<=maxAge){
      verdict='Likely eligible';cls='open';
    }else{
      verdict='Likely not eligible — above age limit ('+maxAge+' for '+category+')';cls='closed';
    }
    return {a,verdict,cls};
  }).filter(Boolean);

  results.innerHTML=
    '<p class="fill-intro">Checked against the '+rows.length+' exams we’ve researched eligibility rules for so far — more are coming. This only checks age, category and qualification <em>level</em> — not your specific field of study (e.g. SSC JE and RRB JE need an engineering diploma/degree specifically, not just any degree), and not work-experience requirements some specialist-officer roles have. This is a soft match, not a verdict: always confirm the exact clause in the official notification before paying the application fee.</p>'+
    rows.map(r=>
      '<div class="elig-row">'+
        '<div class="elig-exam">'+r.a.name+'</div>'+
        '<span class="status-pill '+r.cls+'">'+r.verdict+'</span>'+
        '<button class="btn btn-outline btn-sm" onclick="showExamDetail(\''+r.a.code+'\')">View checklist →</button>'+
      '</div>'
    ).join('');
  results.scrollIntoView({behavior:'smooth',block:'nearest'});
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
