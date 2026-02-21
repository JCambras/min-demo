# Min — Internal Service Level Targets

**Version:** 1.0
**Effective Date:** February 21, 2026
**Owner:** Jon Cambras, Founder / Acting CISO
**Next Review Date:** August 21, 2026
**Classification:** Internal

---

## 1. Purpose

This document defines internal service level targets for Min's production systems. These are internal operational targets, not contractual SLAs with customers. They establish baselines for monitoring, alerting, and capacity planning as Min scales.

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| Uptime | Percentage of time the service returns a successful response to health checks |
| Availability | Percentage of time the service is capable of processing user requests |
| Degraded | Service is running but one or more dependencies are unhealthy |
| Outage | Service is unable to process user requests |
| Market Hours | Monday–Friday, 8:00 AM – 5:00 PM ET (excluding federal holidays) |
| Measurement Period | Calendar month |

---

## 3. Service Level Targets

### 3.1 Application Availability

| Metric | Target | Measurement | Allowed Downtime |
|--------|--------|-------------|-----------------|
| Monthly uptime (all hours) | 99.9% | `/api/health` returns HTTP 200 | ~43 minutes/month |
| Monthly uptime (market hours) | 99.95% | `/api/health` returns HTTP 200 during market hours | ~13 minutes/month |
| Max single outage duration | < 30 minutes | Time from detection to recovery | — |

### 3.2 Integration Availability

| Integration | Target | Degraded Threshold | Measurement |
|-------------|--------|-------------------|-------------|
| Salesforce API | 99.5% | > 5s response time | Salesforce status + `/api/health` SF check |
| DocuSign API | 99.0% | > 10s response time | DocuSign status + envelope send success rate |
| Turso Database | 99.9% | > 500ms query time | `/api/health` database check |

### 3.3 Response Time Targets

| Endpoint Category | P50 | P95 | P99 | Alerting Threshold |
|-------------------|-----|-----|-----|-------------------|
| API reads (search, query, detail) | < 200ms | < 1s | < 3s | P95 > 3s for 5 min |
| API mutations (create, update) | < 500ms | < 2s | < 5s | P95 > 5s for 5 min |
| Health check (`/api/health`) | < 100ms | < 500ms | < 1s | P95 > 1s for 5 min |
| PDF generation | < 2s | < 5s | < 10s | P95 > 10s for 5 min |
| DocuSign envelope send | < 3s | < 10s | < 30s | P95 > 30s for 5 min |

### 3.4 Error Rate Targets

| Metric | Target | Alerting Threshold |
|--------|--------|-------------------|
| API error rate (5xx) | < 0.1% of requests | > 1% for 5 min |
| Authentication failure rate | < 5% of auth attempts | > 10 failures in 5 min |
| Audit write failure rate | 0% (all mutations must be audited) | Any audit write failure |
| CSRF validation failure rate | < 1% of mutation requests | > 5% for 5 min |

---

## 4. Incident Response Targets

| Metric | Target | Reference |
|--------|--------|-----------|
| SEV-1 response time | < 15 minutes | IRP §4 |
| SEV-2 response time | < 1 hour | IRP §4 |
| SEV-3 response time | < 4 hours | IRP §4 |
| SEV-4 response time | < 24 hours | IRP §4 |
| Mean time to containment (SEV-1) | < 30 minutes | — |
| Mean time to resolution (SEV-1) | < 4 hours | — |
| Mean time to resolution (SEV-2) | < 24 hours | — |
| Post-incident review completion | Within 5 business days | IRP §5, Phase 5 |

---

## 5. Change Management Targets

| Metric | Target | Reference |
|--------|--------|-----------|
| CI pipeline pass rate | > 95% | Change Management Policy §8 |
| Failed deployments per month | < 2 | Change Management Policy §8 |
| Mean time to rollback | < 15 minutes | Change Management Policy §8 |
| Emergency changes per quarter | < 3 | Change Management Policy §8 |

---

## 6. Security Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Critical/High vulnerability patch time | < 7 days | Dependabot alert → PR merged |
| Dependency audit (zero HIGH+) | Continuous | `pnpm audit --audit-level=high` in CI |
| Access review completion | Quarterly | Personnel Security Policy §7 |
| Tabletop exercise completion | Quarterly | IRP §11 |
| Test suite pass rate | 100% (all 847+ tests) | CI pipeline |

---

## 7. Monitoring Implementation Plan

These targets require monitoring infrastructure to measure. Current state and planned implementation:

| Target | Current Measurement | Planned Measurement |
|--------|-------------------|-------------------|
| Application uptime | Manual (`/api/health` spot checks) | Uptime monitoring service (Better Uptime, Pingdom) |
| Response times | Not measured | Log aggregation service (Axiom, Datadog) with Vercel log drain |
| Error rates | Vercel function logs (manual review) | Log aggregation with alerting rules |
| Integration availability | `/api/health` endpoint checks SF + Turso | Uptime monitor polling `/api/health` every 60s |
| Audit write failures | Console logs only | Log aggregation with alert on `[MIN:AUDIT]` error patterns |

### 7.1 Alerting Rules (to configure when monitoring is live)

| Alert | Condition | Channel | Severity |
|-------|-----------|---------|----------|
| Application down | `/api/health` fails 3 consecutive checks | SMS + Email | SEV-2 |
| Degraded state | `/api/health` returns `degraded` for > 5 min | Email | SEV-3 |
| High error rate | > 1% 5xx responses for 5 min | Email | SEV-3 |
| Auth attack | > 10 failed auth in 5 min | SMS + Email | SEV-2 |
| Audit failure | Any `[MIN:AUDIT]` error log | Email | SEV-3 |
| Slow API | P95 response > 3s for 5 min | Email | SEV-4 |
| Dependency vulnerability | Dependabot HIGH+ alert | GitHub notification | SEV-3 |

---

## 8. Reporting

| Report | Frequency | Audience | Contents |
|--------|-----------|----------|----------|
| Uptime summary | Monthly | Internal | Uptime %, outage count, degraded minutes |
| Incident summary | Monthly | Internal | Incident count by severity, MTTR, action items |
| Security metrics | Quarterly | Internal + compliance platform | Vulnerability counts, patch times, test coverage |
| SLA compliance | Quarterly | Internal | All targets vs. actuals, trend analysis |

---

## 9. Target Review and Adjustment

These targets will be reviewed and adjusted based on:

1. **Baseline data:** Once monitoring is live, establish actual baseline metrics for 30 days before adjusting targets
2. **Customer feedback:** If customers report performance issues, tighten relevant targets
3. **Growth:** As user count increases, adjust response time targets for increased load
4. **Incidents:** After each incident, evaluate whether targets need tightening
5. **Industry benchmarks:** Compare against similar B2B SaaS platforms annually

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial service level targets |
