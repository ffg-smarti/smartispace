# Feature Specifications

Dieser Ordner enthält detaillierte Feature Specs vom Requirements Engineer.

## Was gehört in eine Feature Spec?

### 1. User Stories
Beschreibe, was der User tun möchte:
```markdown
Als [User-Typ] möchte ich [Aktion] um [Ziel zu erreichen]
```

### 2. Requirements (REQ-IDs)
Anforderungen werden als stabiles REQ-ID-System mit Status-Tracking definiert:

**REQ-IDs** sind stabil, werden nie umbenannt und haben einen Status:
- `DRAFT` – Work-in-progress, noch nicht final
- `APPROVED` – Vom User akzeptiert, bereit für Entwicklung
- `REJECTED` – Bewusst nicht umgesetzt (bleibt als Dokumentation)

| ID | Anforderung | Status |
|----|-------------|--------|
| REQ-ACCOUNT-REGISTER-001 | Neuer Benutzer kann sich mit E-Mail und Passwort registrieren | `APPROVED` |
| REQ-ACCOUNT-REGISTER-002 | Passwort muss mindestens 8 Zeichen lang sein | `APPROVED` |
| REQ-ACCOUNT-REGISTER-003 | Nach Registration wird User automatisch eingeloggt | `DRAFT` |

### 3. Edge Cases ✅
Was passiert bei unerwarteten Situationen:
```markdown
- Was passiert bei doppelter Email?
- Was passiert bei Netzwerkfehler?
- Was passiert bei gleichzeitigen Edits?
```

### 4. Design Decisions (vom Solution Architect) ✅
```markdown
## Database Schema
CREATE TABLE tasks (...);

## Component Architecture
FEATectDashboard
├── FEATectList
│   └── FEATectCard
```

### 5. QA Test Results (vom QA Engineer)
Am Ende des Feature-Dokuments fügt QA die Test-Ergebnisse hinzu:
```markdown
---

## QA Test Results

**Tested:** 2026-01-12
**App URL:** http://localhost:3000

### Requirements Status
- [x] REQ-ACCOUNT-REGISTER-001: User kann Email + Passwort eingeben
- [x] REQ-ACCOUNT-REGISTER-002: Passwort mindestens 8 Zeichen
- [ ] ❌ BUG: REQ-ACCOUNT-REGISTER-004: Doppelte Email wird nicht abgelehnt

### Bugs Found
**BUG-1: Doppelte Email-Registrierung**
- **Severity:** High
- **Steps to Reproduce:** 1. Register with email, 2. Try again with same email
- **Expected:** Error message
- **Actual:** Silent failure
```

### 6. Deployment Status (vom DevOps Engineer)
```markdown
---

## Deployment

**Status:** ✅ Deployed
**Deployed:** 2026-01-13
**Production URL:** https://your-app.vercel.app
**Git Tag:** v1.0.0-FEAT-1
```

## Workflow

1. **Requirements Engineer** erstellt Feature Spec
2. **User** reviewed Spec und gibt Feedback
3. **Solution Architect** fügt Tech-Design hinzu
4. **User** approved finales Design
5. **Frontend/Backend Devs** implementieren (dokumentiert via Git Commits)
6. **QA Engineer** testet und fügt Test-Ergebnisse zum Feature-Dokument hinzu
7. **DevOps** deployed und fügt Deployment-Status zum Feature-Dokument hinzu

## Status-Tracking

Feature-Status wird direkt im Feature-Dokument getrackt:
```markdown
# FEAT-1: Feature Name

**Status:** 🔵 Planned | 🟡 In Progress | ✅ Deployed
**Created:** 2026-01-12
**Last Updated:** 2026-01-12
```

**Status-Bedeutung:**
- 🔵 Planned – Requirements sind geschrieben, ready for development
- 🟡 In Progress – Wird gerade gebaut
- ✅ Deployed – Live in Production

**Git als Single Source of Truth:**
- Alle Implementierungs-Details sind in Git Commits
- `git log --grep="FEAT-1"` zeigt alle Änderungen für dieses Feature
- Keine separate FEATURE_CHANGELOG.md nötig!
