# Min — Risk Assessment

**Version:** 1.0
**Assessment Date:** February 21, 2026
**Assessor:** Jon Cambras, Founder / Acting CISO
**Next Review Date:** May 21, 2026 (quarterly for P1 risks)
**Classification:** Internal

---

## 1. Risk Scoring Methodology

- **Likelihood:** Low (unlikely in next 12 months), Medium (possible), High (probable)
- **Impact:** Low (minor inconvenience), Medium (business disruption), High (regulatory action or significant financial loss), Critical (data breach requiring notification)
- **Residual Risk:** Risk remaining after current mitigations are applied
- **Review Cadence:** Quarterly for P1 risks, semi-annually for P2/P3

---

## 2. Risk Register

| # | Risk | Likelihood | Impact | Current Mitigation | Residual Risk | Priority |
|---|------|-----------|--------|-------------------|---------------|----------|
| R1 | Unauthorized access to client PII (SSNs, DOBs, account numbers) | Medium | Critical | PII scrubbed from audit logs, SSN masked in UI, bank accounts show last 4 digits only. No field-level encryption at rest. | High | P1 |
| R2 | Unauthorized access to custodial credentials (OAuth tokens) | Low | Critical | AES-256-GCM encryption in httpOnly cookies, secure flag, scrypt key derivation, 16-byte random IV per encryption. SF_COOKIE_SECRET required in all environments. | Medium | P1 |
| R3 | Data breach via compromised CRM integration | Medium | Critical | SOQL injection prevention, Salesforce ID validation, 200-char input limits, CSRF double-submit cookie, server-side RBAC enforcement. | Medium | P1 |
| R4 | Data integrity failure — incorrect financial data displayed | Medium | High | Reconciliation endpoint with fuzzy matching, confidence scoring with 0.70 threshold, manual mapping fallback. No automated reconciliation schedule. | High | P2 |
| R5 | Availability failure during market hours | Medium | High | No documented SLA. Vercel provides platform-level redundancy but no application-level HA. Health endpoint (`/api/health`) monitors database and Salesforce connectivity. | Medium | P2 |
| R6 | AI model produces incorrect compliance recommendation | Low | High | Compliance engine is 100% deterministic. No LLM involvement. Keyword-based matching. 50+ test cases. | Low | P3 |
| R7 | Supply chain risk — Anthropic API, Salesforce API, Turso | Medium | High | No Anthropic API calls in production. Salesforce retry logic with 30s timeout and exponential backoff. Turso not in critical path. Dependabot enabled for dependency scanning. | Medium | P2 |
| R8 | Insider threat — solo founder has unrestricted access | High | Critical | Audit logging of all mutations to both Turso (write-ahead) and Salesforce (customer-visible). Server-side RBAC. Founder could disable logging but Salesforce validation rules prevent edit/delete of audit records. | High | P1 |
| R9 | Social engineering targeting the founder | Medium | Critical | No phishing simulation. MFA delegated to Salesforce. Session timeout at 15 minutes. Cookie reduced to 8-hour maxAge. | High | P1 |
| R10 | Loss of source code or infrastructure credentials | Low | Critical | Source code in GitHub (private repo). CI/CD pipeline with branch protection. Dev fallback keys removed from source. Credentials in environment variables. No secrets manager yet. | Medium | P1 |
| R11 | Cross-tenant data leakage | Low | Critical | Salesforce org-level isolation via per-org OAuth tokens. Turso tables include org_id filtering. Parameterized queries prevent SQL injection. Tenant isolation test suite (5 tests). No LLM shared context. | Low | P2 |
| R12 | Expired or compromised OAuth refresh token | Medium | High | 8-hour cookie maxAge, 2-hour token expiration, mutex-protected refresh. Logout now revokes refresh token at Salesforce. Auth events logged to audit trail. | Low | P2 |

---

## 3. Risk Heat Map

```
              │ Low Impact  │ Medium      │ High        │ Critical
──────────────┼─────────────┼─────────────┼─────────────┼─────────────
High          │             │             │             │ R8, R9
Likelihood    │             │             │             │
──────────────┼─────────────┼─────────────┼─────────────┼─────────────
Medium        │             │             │ R4, R5, R7  │ R1, R3
Likelihood    │             │             │             │
──────────────┼─────────────┼─────────────┼─────────────┼─────────────
Low           │             │             │ R6          │ R2, R10, R11
Likelihood    │             │             │             │
```

---

## 4. Risk Acceptance Criteria

| Residual Risk Level | Acceptable? | Required Action |
|---------------------|-------------|-----------------|
| Low | Yes | Monitor via quarterly review |
| Medium | Conditionally | Document compensating controls; review quarterly |
| High | No | Remediation required within 90 days |
| Critical | No | Immediate remediation required |

---

## 5. P1 Remediation Plan

| Risk | Remediation Action | Owner | Target Date | Status |
|------|-------------------|-------|-------------|--------|
| R1 | Recommend Salesforce Shield to customers; implement lazy-loading for SSNs; add SSN access logging | Jon Cambras | May 2026 | Not started |
| R3 | Server-side RBAC enforcement | Jon Cambras | Feb 2026 | **Complete** |
| R8 | Write-ahead audit buffer (Turso + SF); external quarterly security review | Jon Cambras | Feb 2026 / May 2026 | Buffer complete; review not started |
| R9 | Complete security awareness training; implement device management policy | Jon Cambras | Apr 2026 | Not started |
| R10 | Migrate to secrets manager (Vercel encrypted env vars minimum); implement credential rotation schedule | Jon Cambras | Apr 2026 | Not started |

---

## 6. Controls Implemented Since Last Assessment

This is the initial assessment. The following controls have been implemented as part of the SOC 2 readiness program:

1. Server-side RBAC with permission matrix (R3, R8)
2. Dev fallback encryption keys removed (R2, R10)
3. Cookie maxAge reduced from 30 days to 8 hours (R9, R12)
4. Token revocation on logout (R12)
5. Security headers: HSTS, Permissions-Policy, CSP report-only (R3)
6. Write-ahead audit buffer: Turso + Salesforce dual-write (R8)
7. Auth event logging: login, logout, failed auth (R8, R9)
8. CI/CD pipeline with automated test gate (R3, R10)
9. Dependabot for dependency scanning (R7)
10. Tenant isolation test suite (R11)
11. Customer data deletion API for offboarding (R1)
12. System health endpoint for monitoring (R5)

---

## 7. Review Schedule

| Review Type | Frequency | Next Due |
|-------------|-----------|----------|
| P1 risks | Quarterly | May 21, 2026 |
| P2 risks | Semi-annually | August 21, 2026 |
| P3 risks | Semi-annually | August 21, 2026 |
| Full risk assessment | Annually | February 21, 2027 |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial risk assessment with 12 identified risks |
