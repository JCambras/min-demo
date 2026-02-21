# Min — Vendor Management Policy

**Version:** 1.0
**Effective Date:** February 21, 2026
**Owner:** Jon Cambras, Founder / Acting CISO
**Next Review Date:** August 21, 2026
**Classification:** Internal

---

## 1. Purpose

This policy establishes the process for evaluating, onboarding, monitoring, and offboarding third-party vendors that process, store, or have access to Min's systems or client data. It ensures vendors meet Min's security and compliance requirements as a SOC 2-aligned, SEC-regulated platform.

---

## 2. Scope

This policy applies to all third-party service providers that:

- Process or store client data (PII, financial data, account information)
- Provide infrastructure services (hosting, database, CDN)
- Integrate with Min's application via API
- Have access to Min's source code or deployment pipelines

---

## 3. Vendor Criticality Classification

| Tier | Criteria | Review Frequency | Examples |
|------|----------|-----------------|----------|
| Critical | Processes client PII, provides core infrastructure, or single point of failure | Annually | Salesforce, Vercel, Turso |
| High | Integrates with client workflows or handles sensitive operations | Annually | DocuSign, BridgeFT (future) |
| Medium | Development tools with access to source code or CI/CD | Semi-annually | GitHub, Anthropic |
| Low | No data access, no integration, replaceable | As needed | Domain registrar, email provider |

---

## 4. Current Vendor Register

| Vendor | Service | Tier | SOC 2 | DPA | Data Shared | Last Review |
|--------|---------|------|-------|-----|-------------|-------------|
| Salesforce | CRM, OAuth identity, audit trail | Critical | Type II (annual) | Included in MSA | Client PII, household data, audit records | 2026-02-21 |
| Vercel | Application hosting, CDN, deployment | Critical | Type II (annual) | DPA available | Application code, environment variables | 2026-02-21 |
| Turso (libSQL) | Analytics database, audit buffer | Critical | Pending verification | Pending | Org patterns, events, audit log (PII-scrubbed) | 2026-02-21 |
| DocuSign | Electronic signature | High | Type II (annual) | Included in MSA | Client names, emails, account details (for signing) | 2026-02-21 |
| GitHub | Source code, CI/CD, dependency scanning | Medium | Type II (annual) | DPA available | Source code, CI/CD logs | 2026-02-21 |
| Anthropic | AI API (development only) | Medium | SOC 2 in progress | DPA available | No production data — dev/testing only | 2026-02-21 |
| Wealthbox | CRM integration (planned) | High | Not verified | Pending | Client PII (future) | Not yet onboarded |
| BridgeFT | Custodial data aggregation (planned) | Critical | Type II (verified) | Pending | Custodial account data (future) | Not yet onboarded |

---

## 5. Vendor Assessment Process

### 5.1 Pre-Onboarding Assessment

Before onboarding a new vendor (Critical or High tier):

| Step | Requirement | Evidence Required |
|------|------------|-------------------|
| 1. Security review | Review vendor's SOC 2 Type II report (or equivalent) | SOC 2 report or bridge letter |
| 2. DPA execution | Execute Data Processing Agreement | Signed DPA |
| 3. Integration review | Assess data flows, encryption, and access controls | Architecture diagram |
| 4. Incident response | Confirm vendor has incident notification procedures | Vendor IR policy or contract clause |
| 5. Sub-processor review | Identify vendor's sub-processors that handle Min data | Sub-processor list |
| 6. Approval | Document decision and risk acceptance | Vendor assessment form |

### 5.2 Vendor Assessment Template

For each Critical/High vendor, document:

```
Vendor Name: _______________
Assessment Date: _______________
Assessor: _______________

1. SECURITY CERTIFICATIONS
   [ ] SOC 2 Type II    Report date: ___________
   [ ] SOC 2 Type I     Report date: ___________
   [ ] ISO 27001        Certificate date: ___________
   [ ] None available   Compensating controls: ___________

2. DATA HANDLING
   Data types shared: _______________
   Encryption at rest: [ ] Yes  [ ] No  Method: ___________
   Encryption in transit: [ ] Yes  [ ] No  Method: ___________
   Data residency: _______________
   Retention period: _______________
   Deletion process: _______________

3. ACCESS CONTROLS
   Authentication method: _______________
   MFA supported: [ ] Yes  [ ] No
   Role-based access: [ ] Yes  [ ] No
   API authentication: _______________

4. INCIDENT RESPONSE
   Notification timeline: _______________
   Contact method: _______________
   SLA for security incidents: _______________

5. CONTRACTUAL
   DPA executed: [ ] Yes  [ ] No  Date: ___________
   Liability cap: _______________
   Termination for cause clause: [ ] Yes  [ ] No
   Data return/deletion on termination: [ ] Yes  [ ] No

6. RISK ASSESSMENT
   Residual risk: [ ] Low  [ ] Medium  [ ] High
   Risk acceptance: [ ] Accepted  [ ] Conditionally accepted  [ ] Rejected
   Conditions: _______________

Assessor signature: _______________  Date: ___________
```

---

## 6. Ongoing Monitoring

### 6.1 Annual Review (Critical and High Vendors)

1. Request updated SOC 2 Type II report
2. Review any security incidents reported by the vendor in the prior year
3. Verify DPA remains current and covers actual data flows
4. Assess whether vendor's sub-processor list has changed
5. Confirm data deletion/return procedures are still documented
6. Update vendor register with review date

### 6.2 Continuous Monitoring

| Signal | Action |
|--------|--------|
| Vendor security incident (public disclosure) | Immediate impact assessment |
| Vendor SOC 2 report contains qualified opinion | Schedule remediation discussion |
| Vendor announces acquisition or leadership change | Review contractual commitments |
| New data type shared with vendor | Update DPA and assessment |
| Vendor deprecates security feature Min relies on | Evaluate alternatives |

### 6.3 Dependency Scanning

- Dependabot monitors npm dependencies for known vulnerabilities
- `pnpm audit --audit-level=high` runs in CI pipeline
- Critical/High vulnerabilities in vendor dependencies must be patched within 7 days

---

## 7. Data Processing Agreements

### 7.1 Required DPA Provisions

All DPAs with Critical and High vendors must include:

| Provision | Requirement |
|-----------|------------|
| Purpose limitation | Data used only for contracted services |
| Sub-processor notification | Vendor notifies Min of sub-processor changes |
| Data breach notification | Within 72 hours of discovery |
| Data deletion | Upon termination, vendor deletes Min data within 30 days |
| Audit rights | Min may audit or request evidence of compliance |
| Data residency | Data stored in US or approved jurisdictions |
| Security measures | Encryption at rest and in transit, access controls, logging |

### 7.2 DPA Status

| Vendor | DPA Status | Next Action |
|--------|-----------|-------------|
| Salesforce | Covered by MSA | Review at MSA renewal |
| Vercel | DPA available on request | Execute by March 2026 |
| Turso | Pending | Request DPA by March 2026 |
| DocuSign | Covered by MSA | Review at MSA renewal |
| GitHub | DPA available | Execute by March 2026 |

---

## 8. Vendor Offboarding

When a vendor relationship ends:

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Revoke all API keys, OAuth tokens, and access credentials | Within 24 hours |
| 2 | Confirm data deletion per DPA terms | Within 30 days |
| 3 | Obtain written confirmation of data deletion | Within 45 days |
| 4 | Remove vendor from application code and configuration | Next release cycle |
| 5 | Update vendor register | Same day |
| 6 | Rotate any shared secrets | Within 24 hours |

---

## 9. Exceptions

Exceptions to this policy require:

1. Written risk assessment documenting the exception
2. Compensating controls identified
3. Founder/CISO approval
4. Time-bound exception (maximum 90 days, then re-evaluate)
5. Documentation in vendor register

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial policy with 8 vendors assessed |
