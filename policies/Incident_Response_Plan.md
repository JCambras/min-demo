# Min — Incident Response Plan

**Version:** 1.0
**Effective Date:** February 21, 2026
**Owner:** Jon Cambras, Founder / Acting CISO
**Next Review Date:** August 21, 2026
**Classification:** Internal

---

## 1. Purpose

This plan establishes procedures for detecting, responding to, containing, and recovering from security incidents affecting Min's systems and client data. It provides severity classification, role assignments, playbooks for common scenarios, forensic procedures, and communication templates.

---

## 2. Scope

This plan covers incidents affecting:

- Min application (production and staging environments)
- Client data (PII, financial data, household information)
- Third-party integrations (Salesforce, DocuSign, Turso, Vercel)
- Source code and deployment infrastructure
- Authentication and access control systems

---

## 3. Incident Response Team

### 3.1 Current State (Solo Founder)

| Role | Person | Contact | Backup |
|------|--------|---------|--------|
| Incident Commander | Jon Cambras | [primary phone/email] | N/A — escalate to external IR contact |
| Technical Lead | Jon Cambras | [primary phone/email] | External security consultant (TBD) |
| Communications Lead | Jon Cambras | [primary phone/email] | Legal counsel (TBD) |

### 3.2 External Contacts

| Role | Organization | Contact | When to Engage |
|------|-------------|---------|----------------|
| Legal Counsel | [TBD — engage by Q2 2026] | TBD | SEV-1 incidents, potential regulatory notifications |
| External IR / Forensics | [TBD — engage by Q2 2026] | TBD | SEV-1 incidents requiring forensic investigation |
| Cyber Insurance | [TBD — evaluate by Q3 2026] | TBD | Any incident with potential financial impact |
| Salesforce Support | Salesforce | Premier Support Portal | Salesforce-related incidents |
| Vercel Support | Vercel | Support Portal | Infrastructure incidents |

---

## 4. Severity Classification

| Severity | Criteria | Response Time | Update Frequency |
|----------|----------|---------------|-----------------|
| SEV-1 (Critical) | Confirmed data breach, unauthorized access to client PII, complete system compromise | Immediate (within 15 minutes) | Every 30 minutes |
| SEV-2 (High) | Suspected breach, service outage during market hours, authentication system compromise | Within 1 hour | Every 2 hours |
| SEV-3 (Medium) | Partial service degradation, failed security control, suspicious activity without confirmed impact | Within 4 hours | Daily |
| SEV-4 (Low) | Minor security event, policy violation without data impact, informational alert | Within 24 hours | As needed |

---

## 5. Incident Response Phases

### Phase 1: Detection and Identification

**Sources of detection:**

| Source | Examples |
|--------|----------|
| Automated monitoring | `/api/health` endpoint failure, CI pipeline security alerts |
| Audit trail | Unusual MIN:AUDIT patterns, failed auth spikes |
| Dependency scanning | Dependabot critical vulnerability alert |
| External report | Customer report, SECURITY.md disclosure, vendor notification |
| Manual observation | Unexpected behavior during normal operations |

**Identification steps:**

1. Confirm the event is a genuine security incident (not a false positive)
2. Assign initial severity classification
3. Begin incident log with timestamp, description, and initial assessment
4. Notify external contacts if SEV-1 or SEV-2

### Phase 2: Containment

**Immediate containment (stop the bleeding):**

| Action | Command / Procedure |
|--------|-------------------|
| Revoke compromised credentials | Rotate `SF_COOKIE_SECRET`, Salesforce OAuth tokens |
| Block suspicious IP | Add to Vercel WAF blocklist (if available) or rate limiter |
| Disable compromised account | Deactivate Salesforce user profile |
| Isolate affected system | Vercel: promote previous deployment; Turso: read-only mode |
| Preserve evidence | Snapshot logs before any changes (see Section 8: Forensic Procedures) |

**Long-term containment (prevent recurrence during investigation):**

- Patch exploited vulnerability
- Rotate all credentials that may have been exposed
- Enable enhanced logging for affected systems
- Implement temporary access restrictions

### Phase 3: Eradication

1. Identify root cause of the incident
2. Remove attacker access (compromised accounts, backdoors, malicious code)
3. Patch vulnerability that was exploited
4. Verify fix in staging environment
5. Deploy fix to production via standard change management (Emergency Change category)

### Phase 4: Recovery

1. Restore systems to normal operation
2. Verify all security controls are functioning (health check, auth, RBAC, CSRF)
3. Monitor for signs of re-compromise (enhanced logging for 30 days)
4. Confirm data integrity (reconciliation checks)
5. Re-enable any temporarily restricted access

### Phase 5: Post-Incident Review

Within 5 business days of incident closure:

1. Conduct blameless post-mortem
2. Document timeline, root cause, and impact
3. Identify lessons learned
4. Create action items for preventing recurrence
5. Update this IRP if procedures were inadequate
6. File incident report (see Section 10: Communication Templates)

---

## 6. Scenario Playbooks

### Scenario 1: Wrong Client Data Displayed (Cross-Tenant Data Leakage)

**Severity:** SEV-1 (data breach — wrong client saw another client's data)

| Step | Action | Owner |
|------|--------|-------|
| 1 | Confirm the report: which user, which data, which household | Incident Commander |
| 2 | Immediately check tenant isolation: query Turso and Salesforce with both org_ids | Technical Lead |
| 3 | If confirmed: disable affected user sessions (clear cookies via Salesforce token revocation) | Technical Lead |
| 4 | Preserve evidence: export Turso audit_log and Salesforce MIN:AUDIT records for both orgs | Technical Lead |
| 5 | Identify root cause: check org_id filtering in affected query, review recent code changes | Technical Lead |
| 6 | Patch and deploy fix | Technical Lead |
| 7 | Notify affected clients using Customer Breach Notification template | Communications Lead |
| 8 | File regulatory notification if PII was exposed (see state breach notification laws) | Communications Lead |
| 9 | Post-incident review within 48 hours | Incident Commander |

### Scenario 2: Compromised OAuth Token / Unauthorized Salesforce Access

**Severity:** SEV-2 (authentication compromise)

| Step | Action | Owner |
|------|--------|-------|
| 1 | Identify scope: which Salesforce org, which user, what access occurred | Technical Lead |
| 2 | Revoke all active OAuth tokens for affected org (`/services/oauth2/revoke`) | Technical Lead |
| 3 | Rotate `SF_COOKIE_SECRET` environment variable | Technical Lead |
| 4 | Review Salesforce login history for unauthorized access patterns | Technical Lead |
| 5 | Review MIN:AUDIT trail for actions taken with compromised token | Technical Lead |
| 6 | If data was accessed: escalate to SEV-1 and follow Scenario 1 notification steps | Incident Commander |
| 7 | Require affected users to re-authenticate | Technical Lead |
| 8 | Assess how token was compromised (XSS, cookie theft, credential stuffing) | Technical Lead |
| 9 | Patch vulnerability and deploy | Technical Lead |

### Scenario 3: Dependency Vulnerability with Known Exploit

**Severity:** SEV-2 (if exploit in the wild) or SEV-3 (if theoretical)

| Step | Action | Owner |
|------|--------|-------|
| 1 | Assess exploitability: is the vulnerable code path reachable in Min? | Technical Lead |
| 2 | Check if exploit has been used against Min (review access logs, audit trail) | Technical Lead |
| 3 | If reachable and exploited: escalate to SEV-1 | Incident Commander |
| 4 | If reachable but not exploited: apply patch within 24 hours | Technical Lead |
| 5 | If not reachable: apply patch within 7 days via Normal change | Technical Lead |
| 6 | Update `pnpm audit` baseline after patching | Technical Lead |
| 7 | Review if similar vulnerabilities exist in other dependencies | Technical Lead |

### Scenario 4: Insider Threat — Unauthorized Data Access by Founder

**Severity:** SEV-1 (if confirmed intentional) or SEV-3 (if accidental/procedural)

| Step | Action | Owner |
|------|--------|-------|
| 1 | Detection: external quarterly security review identifies anomalous access pattern | External reviewer |
| 2 | Review MIN:AUDIT trail in Salesforce (validation rules prevent founder from editing) | External reviewer |
| 3 | Review Turso audit_log (write-ahead buffer provides independent record) | External reviewer |
| 4 | Compare Salesforce login history with audit trail timestamps | External reviewer |
| 5 | If confirmed: engage legal counsel immediately | Legal counsel |
| 6 | Notify affected clients per regulatory requirements | Legal counsel |
| 7 | Preserve all evidence per forensic procedures | External IR |

### Scenario 5: Complete Application Outage During Market Hours

**Severity:** SEV-2 (service disruption)

| Step | Action | Owner |
|------|--------|-------|
| 1 | Confirm outage: check `/api/health` endpoint, Vercel status page, Turso status | Technical Lead |
| 2 | Identify affected component: application, database, Salesforce, DNS | Technical Lead |
| 3 | If Vercel: check deployment status, promote last known good deployment | Technical Lead |
| 4 | If Turso: check Turso dashboard, verify connection string, test with `SELECT 1` | Technical Lead |
| 5 | If Salesforce: check Salesforce Trust status page, test OAuth flow | Technical Lead |
| 6 | If DNS: check domain registrar, verify CNAME/A records | Technical Lead |
| 7 | Communicate status to affected users (email or status page) | Communications Lead |
| 8 | Monitor recovery and verify all health checks pass | Technical Lead |
| 9 | Post-incident review: identify single points of failure, add monitoring | Incident Commander |

---

## 7. Escalation Matrix

```
Detection
    │
    ▼
Assess Severity
    │
    ├── SEV-4 (Low) ──────→ Log, monitor, resolve within 24h
    │
    ├── SEV-3 (Medium) ───→ Investigate within 4h, resolve within 48h
    │
    ├── SEV-2 (High) ─────→ Contain within 1h, engage external contacts if needed
    │                        Notify legal counsel if data may be affected
    │
    └── SEV-1 (Critical) ─→ Immediate response (15 min)
                             Engage legal counsel
                             Engage external IR/forensics
                             Begin customer notification preparation
                             Prepare regulatory notification
```

---

## 8. Forensic Procedures

### 8.1 Evidence Preservation Checklist

When a SEV-1 or SEV-2 incident is confirmed, immediately preserve:

| # | Evidence | Method | Priority |
|---|----------|--------|----------|
| 1 | Turso audit_log table | `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10000` — export to CSV | Immediate |
| 2 | Salesforce MIN:AUDIT records | SOQL: `SELECT Subject, Description, CreatedDate FROM Task WHERE Subject LIKE 'MIN:AUDIT%' ORDER BY CreatedDate DESC` | Immediate |
| 3 | Vercel deployment logs | Export from Vercel dashboard → Deployments → Function Logs | Within 1 hour |
| 4 | Salesforce login history | Setup → Login History → Export (last 6 months) | Within 1 hour |
| 5 | Git history for affected period | `git log --all --oneline --since="<date>"` | Within 1 hour |
| 6 | Vercel environment variables | Screenshot current values (do not export plaintext secrets) | Within 1 hour |
| 7 | DNS records | `dig` output for all Min domains | Within 4 hours |
| 8 | Dependency lockfile | `pnpm-lock.yaml` at time of incident (git snapshot) | Within 4 hours |

### 8.2 Chain of Custody

For each piece of evidence:

1. Record: who collected it, when (UTC timestamp), from which system
2. Store in a dedicated incident folder (naming: `INC-YYYY-MM-DD-###`)
3. Hash each file (SHA-256) and record the hash
4. Restrict access to incident commander and legal counsel only
5. Do not modify original evidence — work from copies only

### 8.3 External Forensics Engagement

For SEV-1 incidents:

1. Contact external IR firm within 2 hours of SEV-1 classification
2. Provide access to preserved evidence (not live systems)
3. Coordinate through legal counsel to maintain privilege
4. External firm produces forensic report with findings and recommendations

---

## 9. Regulatory Notification Requirements

### 9.1 SEC Notification

- **When:** If incident affects integrity of books and records (SEC Rule 17a-4) or involves unauthorized access to client accounts
- **Timeline:** As soon as practicable; consult legal counsel
- **Method:** SEC EDGAR filing or direct notification per current guidance

### 9.2 State Breach Notification

- **When:** Unauthorized access to client PII (SSN, financial account numbers, etc.)
- **Trigger:** Notification required if PII of residents of applicable states is compromised
- **Timeline:** Varies by state (generally 30-60 days from discovery)
- **Requirement:** Consult legal counsel for state-specific requirements; most states require written notification to affected individuals

### 9.3 Vendor Notification

- **When:** Incident involves vendor systems or data shared with vendors
- **Timeline:** Per vendor DPA terms (typically 72 hours)
- **Method:** Vendor security contact per Vendor Management Policy

---

## 10. Communication Templates

### 10.1 Customer Breach Notification Template

```
Subject: Important Security Notice from [Firm Name] — Action Required

Dear [Client Name],

We are writing to inform you of a security incident that may have affected
your personal information maintained in our systems.

WHAT HAPPENED
On [date], we discovered [brief description of incident]. We immediately
[containment actions taken].

WHAT INFORMATION WAS INVOLVED
The following types of information may have been affected:
- [List specific data types: name, email, SSN (last 4), account numbers, etc.]

WHAT WE ARE DOING
- [Action 1: e.g., "We have secured the affected systems"]
- [Action 2: e.g., "We have engaged a forensic security firm to investigate"]
- [Action 3: e.g., "We are offering complimentary credit monitoring"]
- [Action 4: e.g., "We have notified relevant regulatory authorities"]

WHAT YOU CAN DO
- Monitor your financial accounts for unauthorized activity
- [If SSN involved: "Consider placing a fraud alert or credit freeze"]
- Contact us with any questions at [contact information]

We take the security of your information seriously and sincerely apologize
for this incident.

Sincerely,
[Name]
[Title]
[Contact Information]

[If required by state law: Include state-specific notices, e.g., rights
under California Civil Code § 1798.82]
```

### 10.2 Regulatory Notification Template

```
SECURITY INCIDENT NOTIFICATION

Reporting Entity: Min Platform / [Firm Name]
SEC Registration: [CRD Number]
Date of Discovery: [Date]
Date of Notification: [Date]
Incident Reference: [INC-YYYY-MM-DD-###]

INCIDENT SUMMARY
[Brief description: what happened, when, scope of impact]

AFFECTED INDIVIDUALS
Number of individuals affected: [Count]
Types of data compromised: [List]
States of residence: [List]

TIMELINE
[Date/Time] — Incident detected via [method]
[Date/Time] — Containment actions initiated
[Date/Time] — Root cause identified
[Date/Time] — Remediation completed
[Date/Time] — Customer notification sent

REMEDIATION ACTIONS
1. [Technical fix implemented]
2. [Process improvement implemented]
3. [Monitoring enhancement implemented]

PREVENTIVE MEASURES
1. [Measure to prevent recurrence]
2. [Additional control implemented]

Contact: [Name, Title, Phone, Email]
```

### 10.3 Internal Incident Report Template

```
INCIDENT REPORT

Incident ID: INC-YYYY-MM-DD-###
Severity: SEV-[1/2/3/4]
Status: [Open / Contained / Resolved / Closed]
Incident Commander: [Name]

TIMELINE
[Date/Time UTC] — Detection: [How was it detected?]
[Date/Time UTC] — Triage: [Initial assessment]
[Date/Time UTC] — Containment: [Actions taken]
[Date/Time UTC] — Eradication: [Root cause removed]
[Date/Time UTC] — Recovery: [Systems restored]
[Date/Time UTC] — Closure: [Incident closed]

ROOT CAUSE
[Detailed description of what caused the incident]

IMPACT
- Data affected: [None / Types of data]
- Systems affected: [List]
- Users affected: [Count]
- Duration: [Start to resolution]
- Financial impact: [Estimated]

ACTIONS TAKEN
1. [Containment action]
2. [Eradication action]
3. [Recovery action]

LESSONS LEARNED
1. [What went well]
2. [What could be improved]
3. [What was surprising]

ACTION ITEMS
| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | [Preventive measure] | [Name] | [Date] | [Status] |
| 2 | [Process improvement] | [Name] | [Date] | [Status] |

Post-Mortem Date: [Date]
Report Author: [Name]
```

---

## 11. Tabletop Exercise Guide

### 11.1 Purpose

Quarterly tabletop exercises validate this plan's procedures and identify gaps before a real incident occurs.

### 11.2 Exercise Format

1. **Duration:** 30-60 minutes
2. **Participants:** Incident response team (currently: founder + optional external advisor)
3. **Facilitator:** Rotate between founder and external contact
4. **Scenario:** Select from Scenario Playbooks (Section 6) or create new scenario

### 11.3 Exercise Template

```
TABLETOP EXERCISE RECORD

Date: [Date]
Scenario: [Scenario # and description]
Participants: [Names and roles]
Facilitator: [Name]

SCENARIO WALKTHROUGH
[Step-by-step narrative of how the scenario unfolds]

DISCUSSION QUESTIONS
1. How would we detect this incident?
2. What would be our first containment action?
3. Who needs to be notified and when?
4. What evidence would we need to preserve?
5. How would we communicate with affected clients?
6. What would prevent this from happening?

FINDINGS
1. [Gap or issue identified]
2. [Procedure that worked well]
3. [Action item for improvement]

ACTION ITEMS
| # | Finding | Action | Owner | Due Date |
|---|---------|--------|-------|----------|
| 1 | [Finding] | [Action] | [Owner] | [Date] |

Next Exercise Date: [Date]
```

### 11.4 Exercise Schedule

| Quarter | Scenario | Focus Area |
|---------|----------|-----------|
| Q1 2026 | Scenario 1: Wrong client data displayed | Data integrity, customer notification |
| Q2 2026 | Scenario 2: Compromised OAuth token | Authentication, token management |
| Q3 2026 | Scenario 3: Critical dependency vulnerability | Patching, dependency management |
| Q4 2026 | Scenario 5: Application outage | Availability, communication |

---

## 12. Plan Maintenance

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Review and update IRP | Semi-annually | Founder/CISO |
| Tabletop exercise | Quarterly | Founder/CISO |
| Update external contacts | Quarterly | Founder/CISO |
| Test communication templates | Annually | Founder/CISO |
| Review regulatory requirements | Annually | Legal counsel |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial plan with 5 scenario playbooks |
