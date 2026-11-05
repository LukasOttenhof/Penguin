Gr 8–9 Science AI Platform — Technical Spec
Nov 4, 2026 · @Lukas
Accounts and roles
• Two roles: teacher and student
• Teacher sign-up: email + password or Google SSO
• Teacher creates classes; each class gets a join code
• Students join with class code + teacher-issued username; no student email required
• A student can belong to multiple classes
• Teacher can reset student passwords and remove students
• Role-based access control enforced server-side on every endpoint
• Sessions in HTTP-only cookies; passwords hashed (argon2 or bcrypt)
Data and RAG
• Two collections: course material (per class, teacher-owned) and user documents (per student or teacher, private)
• Uploads: PDF, DOCX, PPTX, TXT, Markdown; images stretch (OCR)
• Ingestion: extract text → chunk (~500 tokens, ~50 overlap) → embed → store
• Vector store: Postgres + pgvector (one DB for app data and vectors)
• Chunk metadata: class, owner, document, unit, page, visibility
• Retrieval always filtered by class and owner; students never retrieve another student's documents
• Hybrid search: vector + keyword, top-k re-ranked
• Every RAG answer cites document and page
• Teacher tags material by unit (e.g. Gr 8 cells, Gr 9 electricity)
• Re-ingest on document update; delete removes its chunks
Student AI assistant
• Chat grounded in the class's course material via RAG
• Scoped to the open assignment; knows its instructions and rubric
• Help level set by teacher per assignment: hints only, explain concepts, or open help
• Hints-only mode: Socratic prompting, never gives final answers to assessed questions
• Output check: second pass blocks responses that hand over the answer in restricted modes
• Input and output moderation: unsafe content, off-topic, personal info → refuse and redirect
• Responses pitched at Grade 8–9 reading level
• "Ask about this": student highlights part of their work and sends it to the assistant
• Every conversation logged and visible to the teacher
• Per-student rate limit
• Assistant can be switched off per assignment (e.g. during a quiz)
Student workspace
• VS Code-style layout: resizable panes, explorer left, editor centre, assistant right
• Explorer: assignment instructions, student's files, class material
• Multiple files per assignment (e.g. hypothesis, procedure, data, conclusion)
• Rich-text editor: headings, lists, tables, images, equations, chemical formulas
• Data table with simple charting for lab results
• Tabs for open files; command palette stretch
• Autosave and version history
• Submit locks the work; teacher can reopen; late flag after due date
• Teacher read-only view of any student's workspace
Teacher canvas
• Infinite canvas per unit or assignment: sticky notes, text, shapes, connectors, images, document cards
• Built on an open-source canvas library (e.g. Excalidraw); state saved as JSON
• AI brainstorm panel grounded in course material: assignment ideas, lab activities, question sets, misconceptions to target
• AI output lands on the canvas as editable notes
• Select notes → "Make assignment": drafts instructions, rubric, help level, due date
• Rubric builder: criteria × levels table, editable
• Draft assignments saved and published to a class when ready
Student work analysis
• Per submission: rubric-aligned feedback draft and misconception tags
• Class view: misconception clusters with student lists and example evidence
• Rubric score distribution per criterion (AI-suggested, teacher-confirmed)
• Chat-log analysis: most-asked questions, students who are stuck, assistant over-reliance
• Teacher edits or approves all feedback before students see it
• No AI-assigned grades released automatically
• Export: CSV and PDF
Safety and privacy
• Students are 13–15: collect display name only (first name + last initial); no email, birthdate or photo
• TLS in transit; encryption at rest for DB and file storage
• No student data used for model training; confirm provider terms
• Teacher can view, export and delete any student's data; deleting a class purges its data
• Moderation on all LLM input and output
• Audit log of all AI interactions
• Host in a Canadian region if the provider offers one
• Demo uses synthetic students and work only
Stack and infrastructure
• Front end: React + TypeScript
• Workspace: react-resizable-panels for panes, TipTap for the rich-text editor
• Canvas: Excalidraw (or similar open-source canvas)
• Back end: FastAPI (Python)
• Database: Postgres + pgvector
• File storage: object storage (e.g. IBM Cloud Object Storage)
• LLM: IBM Granite on watsonx.ai for chat, brainstorm and analysis
• Embeddings: watsonx.ai embedding model
• Guardrails: Granite Guardian or equivalent classifier, plus prompt rules and output check
• Document parsing: a PDF/Office text extractor (e.g. unstructured or docling)
• Deploy: Docker containers on IBM Cloud (e.g. Code Engine)
• All LLM calls server-side; API keys never reach the browser
Hackathon requirements
• IBM Bob as the primary development tool; keep Bob session summary screenshots
• AI as a core component (assistant, RAG, analysis)
• SkillsBuild certificate from every team member
• Project page: problem statement, AI and technical approach, how Bob was used
• 3-minute spoken video and slides, publicly accessible links
• Submit by Dec 10, 5:00 PM ET (3:00 PM Edmonton)
