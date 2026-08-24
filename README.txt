FormReady
=========
Open index.html in a modern browser (or serve the folder statically — it's
plain HTML/CSS/JS, no build step).

Pages:
- index.html         Home — hero, the two main options (Resize & Compress,
                      Convert Files), and the Application Mode banner.
- tools.html          All tools, filterable by Resize & Compress / Convert.
- applications.html   Searchable, category-filtered exam/application list
                      with a document-requirements panel per exam.
- about.html           Why FormReady exists, values, and the roadmap.

Shared:
- styles.css   Design system (teal + amber palette, light & dark mode).
- app.js       Nav/theme toggle, the resize & convert tool logic, and the
               Application Mode exam data.

Working in this prototype:
- Responsive 4-page layout with working dark mode (persisted via localStorage)
- Image compression to a target KB (browser-side)
- Signature-to-KB uses the same image engine
- JPG/PNG image to PDF
- Drag & drop
- Application Mode: search + category filters across 15 exams (UPSC, SSC,
  IBPS, SBI, Railway, NDA/CDS, state PSCs, CTET); requirements are
  intentionally placeholders until verified from current official
  notifications

Not yet implemented:
- PDF compression
- PDF to JPG
- Production security/backend
- SEO pages, analytics, accounts and payments
