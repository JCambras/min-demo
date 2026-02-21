# Min — Change Management Policy

**Version:** 1.0
**Effective Date:** February 21, 2026
**Owner:** Jon Cambras, Founder / Acting CISO
**Next Review Date:** August 21, 2026
**Classification:** Internal

---

## 1. Purpose

This policy establishes a structured process for requesting, evaluating, approving, and implementing changes to Min's production systems. It ensures that changes are assessed for risk, tested before deployment, and auditable after the fact.

---

## 2. Scope

This policy applies to all changes to:

- Application source code (Next.js frontend, API routes, server-side libraries)
- Infrastructure configuration (Vercel project settings, environment variables, DNS)
- Database schema or data (Turso migrations, Salesforce field changes)
- Third-party integrations (Salesforce, DocuSign, Turso, Vercel)
- CI/CD pipeline configuration (GitHub Actions workflows, branch protection rules)
- Security controls (RBAC matrix, encryption keys, CSP headers)

---

## 3. Change Categories

### 3.1 Standard Change

Pre-approved, low-risk changes that follow established patterns and require no additional review.

| Criteria | Examples |
|----------|----------|
| No new dependencies | Copy changes, label updates, CSS adjustments |
| No schema changes | Configuration value updates within existing ranges |
| Covered by existing tests | Bug fixes where root cause is identified and fix is isolated |
| Reversible in < 5 minutes | Feature flag toggles, environment variable updates |

**Approval:** Self-approved. Must pass CI pipeline (lint, build, test, audit).

### 3.2 Normal Change

Changes that modify application behavior, add features, or alter security controls.

| Criteria | Examples |
|----------|----------|
| New API endpoints or actions | Adding a new Salesforce mutation action |
| Schema changes | New Turso table, new Salesforce field |
| Dependency additions/upgrades | Adding a new npm package, major version upgrades |
| Security-relevant changes | RBAC matrix changes, CSP modifications, auth flow changes |
| Integration changes | New third-party API connections |

**Approval:** PR with self-review checklist (AI-Generated Code Review Checklist in PR template). CI must pass. 24-hour waiting period before merge for non-urgent changes.

### 3.3 Emergency Change

Changes required to restore service or patch an actively exploited vulnerability.

| Criteria | Examples |
|----------|----------|
| Production is down | Application crash, database unreachable |
| Active security incident | Credential compromise, data exposure |
| Regulatory deadline | SEC or state regulator response requirement |
| Critical vulnerability | Zero-day in production dependency with known exploit |

**Approval:** Self-approved with immediate deployment. Post-implementation review within 24 hours. Incident report filed per Incident Response Plan.

---

## 4. Change Request Process

### 4.1 Request

1. Create a GitHub issue or PR describing:
   - What is changing and why
   - Which systems are affected
   - Risk assessment (what could go wrong)
   - Rollback plan

### 4.2 Review

1. Complete the AI-Generated Code Review Checklist:
   - [ ] No hardcoded secrets or credentials
   - [ ] Input validation on all external data
   - [ ] RBAC permissions verified for new endpoints
   - [ ] PII scrubbing in audit logs confirmed
   - [ ] Tests added for new functionality
   - [ ] No new lint errors introduced
2. CI pipeline must pass: `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm audit`
3. For Normal changes: review diff for unintended side effects

### 4.3 Approval

| Category | Approver | Method |
|----------|----------|--------|
| Standard | Self (founder) | Merge PR after CI passes |
| Normal | Self (founder) with checklist | Merge PR after CI passes + 24h wait |
| Emergency | Self (founder) | Direct push or expedited PR |

### 4.4 Implementation

1. Merge PR to `main` branch
2. Vercel automatic deployment triggers
3. Verify deployment via `/api/health` endpoint
4. Monitor Vercel deployment logs for errors

### 4.5 Post-Implementation

1. Verify health check returns `status: "ok"`
2. Spot-check affected functionality in production
3. For Emergency changes: file post-implementation review within 24 hours

---

## 5. Rollback Procedure

### 5.1 Code Changes

1. **Revert commit:** `git revert <commit-sha>` and push to `main`
2. **Redeploy previous version:** Use Vercel dashboard to promote previous deployment
3. **Verify:** Check `/api/health` and affected functionality

### 5.2 Database Changes

1. **Turso:** Schema changes are additive (CREATE TABLE IF NOT EXISTS). For data rollback, use write-ahead log timestamps.
2. **Salesforce:** Field-level changes require manual revert. Record-level changes are immutable (MIN:AUDIT validation rule prevents edit/delete).

### 5.3 Environment Variables

1. Update in Vercel dashboard
2. Trigger redeployment
3. Verify via health check

---

## 6. Solo Founder Compensating Controls

Since Min currently has a single developer (founder), the following compensating controls replace multi-person review:

| Traditional Control | Compensating Control |
|---------------------|---------------------|
| Peer code review | AI-Generated Code Review Checklist + CI gate |
| Change Advisory Board | 24-hour waiting period for Normal changes |
| Separation of duties | Write-ahead audit buffer (Turso → Salesforce dual-write) |
| Independent testing | Automated test suite (778+ tests) with CI enforcement |
| Change manager approval | Branch protection requiring CI pass |

### Quarterly Self-Assessment

Every quarter, the founder will:

1. Review all Emergency changes from the prior quarter
2. Verify no Standard changes should have been classified as Normal
3. Confirm rollback procedures were tested (at least one rollback drill per quarter)
4. Document assessment results in the compliance platform

---

## 7. Audit Trail

All changes are tracked via:

1. **Git history:** Every code change has a commit with author, timestamp, and message
2. **GitHub PRs:** Normal and Emergency changes have associated PRs with checklists
3. **Vercel deployment log:** Every deployment is timestamped with commit SHA
4. **MIN:AUDIT trail:** Application-level changes are logged to Salesforce

---

## 8. Metrics

| Metric | Target | Review Frequency |
|--------|--------|-----------------|
| Emergency changes per quarter | < 3 | Quarterly |
| Failed deployments per month | < 2 | Monthly |
| Mean time to rollback | < 15 minutes | Per incident |
| CI pipeline pass rate | > 95% | Monthly |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial policy |
