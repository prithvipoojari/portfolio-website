/* ========================================================================
   SITE CONTENT — edit this file to update the portfolio.
   app.js renders everything below; no HTML changes needed.
   ======================================================================== */

const USER_DATA = {

  // == PROFILE ==========================================
  name:         "Prithvi Manjunath Poojari",
  shortName:    "Prithvi Poojari",
  headline:     "MS Computer Science · Northeastern University",
  focus:        "Machine learning · LLM applications · Software engineering",
  availability: "Open to co-op & internship roles · Spring & Summer 2027",
  photo:        "assets/me.jpg",
  // Google Drive "anyone with the link can view"; opens the PDF viewer in a new tab
  resume:       "https://drive.google.com/file/d/1DX3vwoWQqeyxaRQkLKqqfxgQuQEYt429/view",
  bio:
    "I'm an electronics and computer science engineer pursuing a Master's in Computer Science " +
    "at Northeastern University. I build machine learning and LLM-powered systems, including a " +
    "published AI dermatology assistant and a clinical trial companion app, and I'm drawn to " +
    "software that creates positive social impact and solves complex engineering problems at scale.",


  // == AT A GLANCE (About tab) ==========================================
  facts: [
    { label: "Education", value: "MS Computer Science, Northeastern University (Khoury College)" },
    { label: "Focus",     value: "Deep learning, RAG & LLM applications, computer vision, data analysis" },
    { label: "Published", value: "DermAI, Indonesian Journal of Electrical Engineering and Informatics",
      url: "https://doi.org/10.52549/ijeei.v12i4.5806", linkName: "paper" },
    { label: "Speaking",  value: "Invited talk on implementing LLM projects" },
    { label: "Based in",  value: "Boston, MA" },
    { label: "Off-hours", value: "Guitarist · Gamer · Cinephile · Reader" },
  ],


  // == WORK EXPERIENCE (most recent first) ==========================================
  experience: [
    {
      role:     "Technical Operations & Client Support Associate",
      org:      "Shree Marikamba Solutions Pvt. Ltd. (SMSPL)",
      location: "Navi Mumbai, India · Hybrid",
      dates:    "Aug 2024 — Jul 2025",
      bullets: [
        "Supported site visits and field operations for CCTV surveillance projects, configuring devices ahead of technician installation.",
        "Mapped camera placements, quantities and device types onto AutoCAD floor layouts from manual site surveys.",
        "Presented deployed GPS tracking software to a client on-site and gathered feedback, questions and enhancement requests.",
        "Documented client concerns and communicated requirements for follow-up actions and software changes.",
        "Handled client inquiries, inventory checks and coordination across operations, technical and client-facing teams.",
      ],
    },
    {
      role:     "Data Science & Scrum Manager Intern",
      org:      "Hackveda Limited",
      location: "Delhi, India · Remote",
      dates:    "Jun 2023 — Feb 2024",
      bullets: [
        "Developed a future-location prediction system in Dataiku on an AWS EC2 instance, building predictive models from the provided dataset.",
        "Ran exploratory data analysis for credit card fraud detection: correlation and outlier analysis to surface key variables and anomalies, PCA for feature importance, and t-SNE to visualize transaction clusters.",
        "Analyzed student performance data to identify patterns and built a predictive model to support data-driven decisions.",
        "Facilitated agile ceremonies as part of the scrum team, keeping sprint planning and delivery on track.",
        "Led orientation webinars for incoming intern cohorts and reviewed interns' project presentations during scrum meetings.",
      ],
    },
  ],


  // == EDUCATION ==========================================
  education: [
    {
      degree:   "Master of Science in Computer Science",
      school:   "Northeastern University · Khoury College of Computer Sciences",
      location: "Boston, MA",
      dates:    "Jan 2026 — Present",
      details: [
        "GPA: 3.834 / 4.0",
        "Coursework: Programming Design Paradigms, Database Management Systems",
      ],
    },
    {
      degree:   "Bachelor of Engineering in Electronics and Computer Science",
      school:   "University of Mumbai",
      location: "India",
      dates:    "Jun 2020 — Jun 2024",
      details: [
        "GPA: 7.75 / 10.0",
      ],
    },
  ],


  // == PROJECTS ==========================================
  // status: "active" (in progress) or "done"
  projects: [
    {
      name:    "DermAI",
      tagline: "AI dermatology diagnosis assistant",
      status:  "done",
      badge:   "Published · IJEEI",
      summary: "Chatbot that classifies skin conditions with a ResNet-50 model, then answers follow-up " +
               "questions using retrieval-augmented generation over AstraDB with OpenAI embeddings " +
               "for personalized, grounded responses.",
      metrics: [
        { value: "92.6%", label: "mean sensitivity" },
        { value: "99.8%", label: "specificity" },
        { value: "99.9%", label: "AUC" },
        { value: "7%",    label: "hallucination rate" },
      ],
      tags:  ["Python", "ResNet-50", "RAG", "AstraDB", "OpenAI", "Chainlit"],
      links: [
        { label: "GitHub",      url: "https://github.com/prithvipoojari/DermAI" },
        { label: "Paper (DOI)", url: "https://doi.org/10.52549/ijeei.v12i4.5806" },
      ],
    },
    {
      name:    "SentinelDesk",
      tagline: "Multilingual IT-support triage agent (English & German)",
      status:  "done",
      badge:   "Hackathon · Team of 5",
      summary: "Reads incoming support tickets in English or German, predicts their type, queue and priority, " +
               "and retrieves similar resolved tickets across both languages. A rule-based safety gate routes " +
               "each ticket to the on-call engineer, human review, or a Gemini-drafted reply that may only state " +
               "facts from cited past resolutions. PII is masked before any text reaches the LLM, and nothing is " +
               "sent without human approval. Built in a 5-hour hackathon.",
      role:    "Agent: escalation gate, grounded reply drafting, citation validation",
      metrics: [
        { value: "90.7%", label: "high-priority escalation recall" },
        { value: "100%",  label: "citation validity" },
        { value: "0.878", label: "type macro-F1" },
        { value: "40 ms", label: "median triage latency" },
      ],
      tags:  ["Python", "FastAPI", "Gemini", "Sentence Transformers", "FAISS", "scikit-learn", "React", "TypeScript"],
      links: [
        { label: "GitHub", url: "https://github.com/prithvipoojari/GDG-cloudburst" },
      ],
    },
    {
      name:    "Trial Companion",
      tagline: "Clinical trial assistant powered by Gemini",
      status:  "active",
      summary: "Turns dense clinical trial protocol documents into plain-language summaries, wellness " +
               "plans and grounded Q&A. Gemini 2.5 Pro handles parsing and summarization; Gemini Flash " +
               "generates quizzes.",
      tags:  ["Python", "FastAPI", "React", "Tailwind CSS", "Gemini 2.5 Pro", "Gemini Flash"],
      links: [],   // TODO: add { label: "GitHub", url: "..." }
    },
    {
      name:    "Brain Tumor Detection",
      tagline: "CNN classifier for brain scans",
      status:  "done",
      summary: "Convolutional neural network that detects brain tumors in scan images, trained on an " +
               "augmented brain scan dataset.",
      metrics: [
        { value: "96.45%", label: "validation accuracy" },
        { value: "96.13%", label: "test accuracy" },
      ],
      tags:  ["Python", "CNN", "OpenCV", "Deep Learning"],
      links: [],   // TODO: add { label: "GitHub", url: "..." }
    },
  ],


  // == SKILLS ==========================================
  skills: [
    { group: "Languages",     items: ["Python", "Java", "R", "SQL", "HTML / CSS"] },
    { group: "AI / ML",       items: ["scikit-learn", "OpenCV", "NumPy", "Pandas", "CNNs (ResNet-50)",
                                      "RAG pipelines", "OpenAI & Gemini APIs", "Chainlit", "PCA / t-SNE"] },
    { group: "Web & Backend", items: ["FastAPI", "React", "Tailwind CSS"] },
    { group: "Data & Tools",  items: ["PostgreSQL", "AstraDB (vector DB)", "Git", "Jupyter", "Google Colab",
                                      "Dataiku", "AWS EC2", "VS Code", "IntelliJ IDEA"] },
  ],

  strengths: [
    { name: "Research & technical writing", desc: "Published DermAI in IJEEI." },
    { name: "Public speaking",              desc: "Delivered an invited talk on implementing LLM projects." },
    { name: "Agile / Scrum",                desc: "Facilitated sprint ceremonies as a scrum manager intern." },
    { name: "Mentoring",                    desc: "IEEE student council member; onboarded intern cohorts at Hackveda." },
  ],


  // == CONTACT ==========================================
  // every entry gets a copy button; hero: false keeps it out of the intro's button row
  contact: [
    { label: "Email",          value: "poojari.pri@northeastern.edu",   url: "mailto:poojari.pri@northeastern.edu" },
    { label: "Personal email", value: "poojari1prithvi@gmail.com",      url: "mailto:poojari1prithvi@gmail.com", hero: false },
    { label: "LinkedIn",       value: "linkedin.com/in/prithvipoojari", url: "https://www.linkedin.com/in/prithvipoojari/" },
    { label: "GitHub",         value: "github.com/prithvipoojari",      url: "https://github.com/prithvipoojari" },
  ],
};
