# ForensicSketch AI (PS-01) // Team Cypher (T1-25)

> **AI Crime Scene Sketch Generator from Natural-Language Witness Description with Cryptographic Chain-of-Custody & Identity Locking**

Official HackFest 2026 repository for team Cypher (T1-25).

---

## Overview

Police departments face a critical operational bottleneck in the initial hours of an investigation: a shortage of trained forensic sketch artists. While an eyewitness may vividly recall a suspect's facial structure immediately following an incident, translating natural-language recollection into an actionable composite sketch traditionally requires scheduling a specialist. Delays lead to suspect flight and cognitive memory decay.

**ForensicSketch AI** operates as an on-demand, digital forensic composite terminal for law enforcement officers and witnesses:
- **Identity-Preserving Iterative Refinement:** Follow-up witness statements modify only targeted anatomical features (e.g. *"make the jaw sharper"*, *"narrow the eyes"*) while locking the rest of the face and craniofacial bone structure.
- **14-Point Canonical Anatomical State (`FacialStateJSON`):** Cumulative tracking of craniofacial geometry across 14 anatomical regions.
- **Cryptographic Chain-of-Custody (SHA-256):** Every single action (case view, prompt submission, feature refinement, likeness rating, database query, high-res export) is cryptographically linked with SHA-256 hash chaining:
  $$\text{row\_hash} = \text{SHA256}(\text{prev\_hash} \parallel \text{officer\_id} \parallel \text{case\_id} \parallel \text{action\_type} \parallel \text{timestamp} \parallel \text{details\_json})$$
- **Demonstration Law Enforcement Mugshot Search:** Partial investigative leads ranked via 512-dimensional vector similarity and semantic trait overlap, with strict non-identification disclaimers.
- **Court-Ready Evidence Dossier Export:** Direct browser export of official multi-page PDF case packages via `jsPDF` and `2048x2048` high-resolution PNG composites with forensic metadata footer banners.

---

## Frontend Architecture & Features Implemented

The application frontend is built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **jsPDF**, following cinematic, editorial, dark-first UI standards:

1. **Investigator Command Navigation Bar:**
   - Active telemetry strip displaying node ID, locked case seed (`#849204`), provider status, and live SHA-256 custody verification indicator.
   - **Demo Officer Quick-Switch:** Instant switching between pre-configured officer profiles (`KA-4091 Det. Vikram Rao`, `KA-1182 Analyst Priya Nair`, `KA-0045 Supt. Arjun Mehta`) with audit-logged role-based access.
   - **Render Preset Switcher:** Forensic Graphite 2B/4B, Charcoal Shaded, and Photorealistic ID.

2. **Interactive Split-Screen Composite Studio:**
   - **Cognitive AI Interviewer Mode:** Structured, non-leading sequential anatomical questioning.
   - **Browser Voice Input (Web Speech API):** Hands-free natural-language witness dictation.
   - **Regional Languages:** English, Kannada (ಕನ್ನಡ), Hindi (हिन्दी), and Marathi (मराठी) with original transcript provenance.
   - **Contradiction Detection:** Automatic alerts for incompatible anatomical claims (e.g., age vs beard, clean shaven vs heavy facial hair).
   - **Anatomical Quick-Chips Matrix:** Clickable trait pills grouped by Jaw & Chin, Eyes & Brows, Nose & Cheeks, Hair & Beard, Scars & Identifying Marks, and Accessories.
   - **Interactive Before/After Split Slider:** Real-time draggable comparison dividing Iteration $N-1$ and Iteration $N$.
   - **14-Point Facial State Inspector:** Live side drawer displaying all 14 anatomical keys with update diff badges.
   - **Forensic Disguise Modeler (Phase 7):** Non-evidentiary simulation overlays (Beanie, Aviator Sunglasses, Heavy Beard, Medical Mask) with prominent `SIMULATION ONLY` watermark protection.
   - **Ambiguity Variations (Phase 5):** Variations A, B, and C generated from ambiguous statements, allowing non-destructive branching.
   - **Witness Likeness Slider (1–10):** Real-time witness certainty scoring linked to audit events.
   - **Non-Destructive Filmstrip Timeline:** Thumbnails, latency metrics, provider badges, and one-click branching.

3. **Smart Investigation Dashboard (Phase 12):**
   - Incident overview and key investigative metrics.
   - **Collaborative Multi-Witness Fusion (Phase 11):** Separate witness workspaces, alignment percentages, anatomical agreement/divergence matrix, and officer-approved weighted consensus.
   - Suspect leads summary and **Ethical Safe-AI Policy Shield** monitoring (celebrity filter, unauthorized biometric protection).

4. **Tamper-Evident SHA-256 Custody Terminal (Phase 9):**
   - Interactive **"Verify SHA-256 Chain Integrity"** engine recalculating every digest in sequence to guarantee zero tampered records.
   - Query filters by Case ID, Officer Badge, and Action Type.
   - Expandable cryptographic link payload inspector with JSON diffs.

5. **Court Evidence Package & High-Res PNG Export (Phase 13):**
   - Official multi-page **Court Dossier PDF** containing department headers, suspect sketch, witness likeness score, 14-point trait table, chronological refinement log, flagged suspect leads, disclaimer, and officer signature block.
   - Standalone **2048x2048 PNG** export with chain-of-custody footer banner.

---

## Directory Structure

```text
cypher-t1-25/
├── README.md
├── .gitignore
├── ai_crime_sketch_implementation_plan.md
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── index.html
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── index.css
        ├── api/
        │   └── client.ts
        ├── types/
        │   └── forensic.ts
        ├── data/
        │   └── mockForensicData.ts
        ├── utils/
        │   ├── crypto.ts
        │   ├── exportDossier.ts
        │   └── proceduralSketch.ts
        └── components/
            ├── layout/
            │   └── Navbar.tsx
            ├── studio/
            │   ├── SketchStudio.tsx
            │   ├── CanvasViewer.tsx
            │   ├── RefinementChat.tsx
            │   ├── FeatureQuickChips.tsx
            │   └── IterationTimeline.tsx
            ├── dashboard/
            │   └── InvestigationDashboard.tsx
            ├── audit/
            │   └── AuditLogView.tsx
            └── matching/
                └── MatchModal.tsx
```

---

## Getting Started

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### Installation & Running the Frontend
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production
```bash
cd frontend
npm run build
```
Builds verified in under 1 second with 0 TypeScript errors.
