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

/* ===== applications data (placeholders — verify against the current official notification) ===== */
const APPLICATIONS=[
  {code:'UPSC',name:'UPSC Civil Services',cat:'Central Govt'},
  {code:'SSC-CGL',name:'SSC CGL',cat:'Central Govt'},
  {code:'SSC-CHSL',name:'SSC CHSL',cat:'Central Govt'},
  {code:'IBPS-PO',name:'IBPS PO',cat:'Banking'},
  {code:'IBPS-CL',name:'IBPS Clerk',cat:'Banking'},
  {code:'SBI-PO',name:'SBI PO',cat:'Banking'},
  {code:'SBI-CL',name:'SBI Clerk',cat:'Banking'},
  {code:'RRB-NTPC',name:'RRB NTPC',cat:'Railway'},
  {code:'RRB-GRP-D',name:'RRB Group D',cat:'Railway'},
  {code:'NDA',name:'NDA',cat:'Defence'},
  {code:'CDS',name:'CDS',cat:'Defence'},
  {code:'BPSC',name:'BPSC',cat:'State PSC'},
  {code:'UPPSC',name:'UPPSC',cat:'State PSC'},
  {code:'MPPSC',name:'MPPSC',cat:'State PSC'},
  {code:'CTET',name:'CTET',cat:'Teaching'},
];

function initials(name){
  return name.split(/[\s-]+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

function renderApplications(filterCat,query){
  const grid=$('examGrid');
  if(!grid) return;
  const q=(query||'').trim().toLowerCase();
  const items=APPLICATIONS.filter(a=>
    (filterCat==='All'||a.cat===filterCat) &&
    (!q||a.name.toLowerCase().includes(q)||a.cat.toLowerCase().includes(q))
  );
  grid.innerHTML=items.map(a=>`
    <div class="exam-card" onclick="showExamDetail('${a.code}')">
      <div class="exam-badge">${initials(a.name)}</div>
      <h3>${a.name}</h3>
      <div class="cat">${a.cat}</div>
    </div>`).join('') || '<p style="color:var(--muted)">No applications match your search.</p>';
}

function showExamDetail(code){
  const a=APPLICATIONS.find(x=>x.code===code);
  if(!a) return;
  const detail=$('examDetail');
  $('examDetailTitle').textContent=a.name+' — Document Requirements';
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
}
