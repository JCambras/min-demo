# Min — SOC 2 Remaining Items Tracker

**Last Updated:** February 21, 2026
**Status:** 44 of 56 roadmap items complete — 12 remaining (all external)
**Owner:** Jon Cambras

---

## Priority 1: Do This Week (Feb 24-28)

### 1. Complete Security Awareness Training
- **Action:** Sign up for KnowBe4 (https://www.knowbe4.com) or SANS Securing the Human (https://www.sans.org/security-awareness-training/)
- **Deliverable:** Certificate of completion (PDF)
- **Store:** Upload to compliance platform (once onboarded) and save in `policies/training/`
- **Time:** 1-2 hours
- **Cost:** ~$30 (individual) or free trial available
- **Roadmap item:** Week 7

### 2. Identify External IR Contact
- **Action:** Research and contact a cybersecurity attorney or incident response consultant
- **Options:**
  - Law firm with data breach practice (look for IAPP-certified attorneys in your state)
  - IR retainer firms: CrowdStrike Services, Mandiant, Kroll, or a local MSSP
  - Virtual CISO service: Fractional CISO, Pondurance, or similar
- **Deliverable:** Name, firm, contact info, engagement terms
- **Store:** Update `policies/Incident_Response_Plan.md` §3.2 External Contacts table
- **Time:** 1 hour research + 1-2 calls
- **Cost:** Retainer typically $2-5K/year; some offer pay-per-incident
- **Roadmap item:** Week 8

### 3. Send DPA Requests (use email templates below)
- **Vercel:** Email support or account team requesting DPA execution
- **Turso:** Email support requesting DPA
- **GitHub:** Available at https://github.com/customer-terms — may just need to accept online
- **Deliverable:** Signed DPAs (PDF)
- **Store:** `policies/dpa/` folder + upload to compliance platform
- **Time:** 30 minutes to send emails
- **Roadmap item:** Week 11 (Vendor Management Policy §7.2)

### 4. Request Vendor SOC 2 Reports (use email templates below)
- **Salesforce:** Request via Salesforce Trust (https://trust.salesforce.com) or account team
- **Vercel:** Request via account team or support
- **DocuSign:** Request via DocuSign Trust Center (https://www.docusign.com/trust)
- **GitHub:** Available via GitHub Enterprise sales or trust center
- **Turso:** Request via support — verify SOC 2 status
- **Deliverable:** SOC 2 Type II reports (PDF, under NDA)
- **Store:** `policies/vendor-soc2/` folder (do NOT commit to git — confidential)
- **Time:** 30 minutes to send emails; 1-2 weeks for responses
- **Roadmap item:** Week 13

---

## Priority 2: Do in March

### 5. Sign Up for Vanta
- **Action:** Schedule demo at https://www.vanta.com/get-started
- **Why Vanta over Drata:** Stronger integration ecosystem, better for early-stage startups, automated evidence collection for GitHub/Vercel
- **Deliverable:** Active Vanta account with integrations connected
- **Time:** 1 hour demo + 2 hours onboarding
- **Cost:** ~$10K/year (negotiate — first-year discounts common for startups)
- **Roadmap items:** Week 1, Week 13
- **Unlocks:** Items #9, #11 below

### 6. Set Up Log Aggregation
- **Recommended:** Axiom (https://axiom.co) — generous free tier, Vercel integration built-in
- **Alternative:** Betterstack (https://betterstack.com) — combined logs + uptime
- **Setup steps:**
  1. Create Axiom account
  2. Create dataset for Min logs
  3. In Vercel → Settings → Log Drains → Add Axiom
  4. Set retention to 12 months
  5. Create saved queries for: audit errors, auth failures, 5xx responses
- **Deliverable:** Log drain active, 12-month retention configured
- **Time:** 1-2 hours
- **Cost:** Free tier may suffice; paid starts at ~$25/month
- **Roadmap item:** Week 9

### 7. Set Up Uptime Monitoring + Alerting
- **Recommended:** Better Uptime (https://betteruptime.com) — includes status page
- **Setup steps:**
  1. Create account
  2. Add monitor: `GET https://[your-domain]/api/health` every 60 seconds
  3. Configure alerts: SMS + email on downtime
  4. Add alerting rules from `policies/Service_Level_Targets.md` §7.1
- **Deliverable:** Monitoring live, alerts configured
- **Time:** 30 minutes
- **Cost:** Free tier for 1 monitor; $20/month for advanced
- **Roadmap item:** Week 10

### 8. Create Public Status Page
- **Recommended:** Better Uptime built-in status page (comes with #7)
- **Components to display:**
  - Application (polls `/api/health`)
  - Salesforce Integration (manual or linked to Salesforce Trust)
  - DocuSign Integration (manual or linked to DocuSign status)
  - Database (part of `/api/health` check)
- **Deliverable:** Public URL (e.g., `status.minplatform.com`)
- **Time:** 30 minutes (if using Better Uptime with #7)
- **Cost:** Included in #7
- **Roadmap item:** Week 10

---

## Priority 3: Do in April-May

### 9. Upload All Policies to Compliance Platform
- **Prerequisite:** #5 (Vanta account active)
- **Policies to upload:**
  1. Information Security Policy (`policies/Information_Security_Policy.md`)
  2. Risk Assessment (`policies/Risk_Assessment.md`)
  3. Change Management Policy (`policies/Change_Management_Policy.md`)
  4. Personnel Security Policy (`policies/Personnel_Security_Policy.md`)
  5. Vendor Management Policy (`policies/Vendor_Management_Policy.md`)
  6. Incident Response Plan (`policies/Incident_Response_Plan.md`)
  7. Privacy Policy (`policies/Privacy_Policy.md`)
  8. Data Processing Agreement (`policies/Data_Processing_Agreement.md`)
  9. Service Level Targets (`policies/Service_Level_Targets.md`)
  10. Tabletop Exercise Record (`policies/Tabletop_Exercise_001.md`)
  11. SECURITY.md (vulnerability disclosure)
- **Time:** 1 hour
- **Roadmap item:** Week 13

### 10. Engage Penetration Testing Firm
- **Options (budget-friendly for startups):**
  - Cobalt (https://cobalt.io) — pentest-as-a-service, starts ~$5K
  - HackerOne Pentest (https://www.hackerone.com/penetration-testing) — $10-15K
  - Synack (https://www.synack.com) — crowdsourced, $10-15K
  - Independent consultant — $5-8K for a focused web app pentest
- **Scope:** Focus on multi-tenant boundaries, OAuth flow, RBAC bypass, SOQL injection, session management
- **Deliverable:** Pentest report with findings and severity ratings
- **Time:** 1-2 weeks for the test; schedule 2-4 weeks out
- **Cost:** $5,000-$15,000
- **Roadmap item:** Week 12

### 11. Run Platform Gap Analysis
- **Prerequisite:** #5 (Vanta account), #9 (policies uploaded)
- **Action:** Run Vanta's automated gap analysis after integrations connected
- **Deliverable:** Gap report with remediation items
- **Time:** 2 hours to review and assign owners
- **Roadmap item:** Week 13

---

## Completed Quick Win

### 12. Add CI as Required Status Check ✅
- **Status:** Done (PR #18)
- **Roadmap item:** Week 6

---

## Email Templates

See `policies/Vendor_Outreach_Emails.md` for ready-to-send templates.

---

## Progress Summary

| Category | Complete | Remaining |
|----------|----------|-----------|
| Code changes | 100% | — |
| Policy documents | 100% | — |
| Test suite | 100% (847 tests) | — |
| External vendor setup | 0% | 7 items |
| Training & exercises | 50% | 1 item (security awareness) |
| Vendor due diligence | 0% | 2 items (DPAs, SOC 2 reports) |
