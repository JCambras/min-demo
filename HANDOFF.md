# Min Demo - Handoff Document

## What This Is

Min is an AI workflow orchestration platform for RIAs (Registered Investment Advisors). Tagline: "One conversation. Everything handled."

The demo shows an advisor onboarding a new client family — Min creates real Salesforce records, generates a real PDF onboarding packet, and creates follow-up tasks.

---

## Current State

### What's Working
- ✅ Next.js frontend with two-pane UI
- ✅ Salesforce OAuth connection (Client Credentials Flow)
- ✅ Creates real Contacts in Salesforce
- ✅ Creates real Accounts (Households) in Salesforce
- ✅ Creates real Tasks in Salesforce
- ✅ Generates real PDF onboarding packets (6 pages)
- ✅ "Why?" buttons explaining each step's reasoning
- ✅ Undo functionality
- ✅ Evidence links to actual Salesforce records
- ✅ Home screen with 5 quick action buttons
- ✅ Form to enter new family information
- ✅ Multiple family members support

### What's Placeholder/Simulated
- E-signature (DocuSign) — simulated delay
- Attach signed documents — simulated
- Other quick actions (Annual Review, Beneficiary Update, etc.) — show "coming soon" message

### What's Planned But Not Built
- Replay feature (watch completed workflows step by step)
- Streaming text effect (typewriter animation for responses)
- Voice input

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API routes |
| PDF Generation | jsPDF |
| Salesforce | OAuth Client Credentials Flow, REST API |
| Database | None yet (Salesforce is the system of record) |

---

## Project Structure
```
~/min-demo/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main UI (home, form, workflow screens)
│   │   │   ├── layout.tsx        # App wrapper
│   │   │   ├── globals.css       # Global styles
│   │   │   └── api/
│   │   │       ├── salesforce/
│   │   │       │   └── route.ts  # Salesforce API (create contacts, households, tasks)
│   │   │       └── pdf/
│   │   │           └── route.ts  # PDF generation
│   │   ├── components/
│   │   │   └── ui/               # shadcn/ui components
│   │   └── lib/
│   │       └── utils.ts          # Utility functions
│   ├── .env.local                # Salesforce credentials (not in git)
│   └── package.json
└── HANDOFF.md                    # This file
```

---

## Salesforce Configuration

### Org Details
- **Domain:** `orgfarm-ebd962788a-dev-ed.develop.my.salesforce.com`
- **Username:** `jcambras.6e4c16baf114@agentforce.com`
- **Connected App:** Min

### OAuth Setup
- Flow: Client Credentials
- Run As User: jcambras.6e4c16baf114@agentforce.com
- Scopes: Full access (full), Manage user data via APIs (api), Perform requests at any time (refresh_token, offline_access)
- IP Relaxation: Enabled

### .env.local Contents
```
SALESFORCE_CLIENT_ID=your_connected_app_client_id
SALESFORCE_CLIENT_SECRET=your_connected_app_client_secret
SALESFORCE_USERNAME=your_salesforce_username
SALESFORCE_PASSWORD=your_salesforce_password
```

---

## Key Features to Preserve

### 1. "Why?" Buttons
Each workflow step has a `reasoning` field. Clicking "why?" shows Min's explanation for that step.

### 2. Undo Functionality
User can cancel a workflow mid-execution. Currently just resets UI state (doesn't delete Salesforce records).

### 3. Evidence Links
Each completed step shows a link to the created record in Salesforce or the generated PDF.

### 4. Replay Feature (Planned)
Store workflow events and allow "replaying" completed workflows like a recording. The `Workflow_Event__c` data model was designed for this.

---

## Commands to Run
```bash
# Navigate to project
cd ~/min-demo/frontend

# Install dependencies (if needed)
pnpm install

# Start dev server
pnpm dev

# View app
open http://localhost:3000

# Test Salesforce connection
open http://localhost:3000/api/salesforce
```

---

## Next Steps (Day 3 Continued)

1. **Test the new UI** — Home screen → Onboard New Family → Enter data → Confirm
2. **Add streaming text effect** — Make responses appear word by word
3. **Build other workflows** — Annual Review, Beneficiary Update
4. **Add Replay feature** — Timeline scrubber to watch completed workflows

---

## Design Decisions

- **Human-in-the-loop:** Min always shows the plan and requires confirmation before executing
- **Trust surface:** Right pane shows exactly what will happen, with evidence links
- **Advisor time is sacred:** Minimize clicks, automate the boring stuff
- **Salesforce as system of record:** Min orchestrates, Salesforce stores

---

## Vision Documents

See these files in the outputs folder:
- `Min_Vision_Document.docx` — Full product vision
- `Min_Demo_Build_Plan.docx` — 30-day build plan
- `Min_Salesforce_Data_Model.md` — Database schema design

---

## Context for New Session

Jon is CTPO at AdviceOne, building Min for mid-sized RIAs ($100M-$500M AUM). He prefers:
- Wheel of Time analogies for explaining technical concepts
- Step-by-step instructions with explanations
- LFG = "let's move on to the next step"
- Practical over theoretical
- Building real, working features over mockups
