# OpenCAD Governance

This document describes how OpenCAD is governed, how decisions are made, and how community members can take on leadership roles.

---

## Principles

OpenCAD's governance is based on these principles:

1. **Meritocracy** — Influence is earned through contribution, not appointed
2. **Transparency** — Decisions are made in public, documented for all to see
3. **Openness** — Anyone can contribute, regardless of background or affiliation
4. **Consensus** — Decisions are made through discussion; voting is a last resort
5. **Domain Respect** — Architecture and engineering expertise is valued equally with technical expertise

---

## Roles

### Community Member

**Who:** Anyone who uses OpenCAD, participates in discussions, or reports issues.

**Rights:**
- Use OpenCAD under the Apache 2.0 license
- Participate in GitHub Discussions and Discord
- File issues and feature requests
- Attend community calls

**Responsibilities:**
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)

### Contributor

**Who:** Anyone who has made a merged contribution (code, docs, design, translation, etc.).

**Rights:**
- All Community Member rights
- Listed in [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Eligible to become a Maintainer

**Path:** Make your first contribution — see [CONTRIBUTING.md](CONTRIBUTING.md).

### Maintainer

**Who:** Contributors who have demonstrated sustained, high-quality involvement in the project.

**Rights:**
- All Contributor rights
- Merge pull requests
- Approve/reject contributions
- Manage issues and project boards
- Represent OpenCAD publicly
- Vote on governance decisions

**Requirements:**
- 10+ merged PRs of good quality
- Active in code review and community discussions
- Deep understanding of project architecture and goals
- Endorsed by 2+ existing Maintainers
- No active Code of Conduct violations

**Responsibilities:**
- Review PRs within 48 hours (best effort)
- Mentor new contributors
- Uphold the Code of Conduct
- Participate in governance decisions
- Maintain documentation and code quality

**Removal:**
- Inactivity for 6+ months (may be reinstated upon return)
- Code of Conduct violation
- Resignation

### Lead Maintainer

**Who:** A Maintainer who coordinates overall project direction.

**Rights:**
- All Maintainer rights
- Coordinates release schedule
- Represents project in media and partnerships
- Facilitates Technical Steering Committee
- Tie-breaking vote in deadlocked decisions

**Current Lead Maintainer:** [TBD — founding team member]

**Succession:** If the Lead Maintainer steps down or is inactive for 6+ months, the Technical Steering Committee elects a successor.

### Technical Steering Committee (TSC)

**Who:** Maintainers who have been active in architecture decisions.

**Composition:** 3–7 Maintainers, elected by Maintainer vote.

**Responsibilities:**
- Make architecture decisions (documented as ADRs)
- Resolve technical disputes when consensus fails
- Approve new Maintainers
- Set technical roadmap priorities
- Review and approve security policies

**Decision Making:**
- Consensus preferred
- If consensus fails after 2 weeks of discussion: simple majority vote
- Lead Maintainer breaks ties

**Current TSC Members:** [TBD — founding team members]

---

## Decision Making

### Levels of Decisions

| Level | Scope | Process | Example |
|-------|-------|---------|---------|
| **Trivial** | Code style, small fixes | Individual contributor | Fix typo in docs |
| **Normal** | Feature implementation, bug fixes | PR review by Maintainer | Add fillet operation |
| **Significant** | API changes, new dependencies | TSC discussion + ADR | Switch CRDT library |
| **Major** | Governance, licensing, partnerships | Maintainer vote | Change license, join foundation |

### Decision Process

```
1. Proposal (GitHub Issue or Discussion)
        ↓
2. Community Discussion (minimum 1 week)
        ↓
3. Consensus Check
   ├── Consensus reached → Decision accepted
   └── No consensus → TSC discussion (1 week)
        ↓
4. TSC Vote (if no consensus)
   ├── Majority → Decision accepted
   └── Deadlock → Lead Maintainer breaks tie
        ↓
5. Document (ADR for Significant/Major decisions)
```

### Objections

Any Maintainer may object to a decision, which triggers:

1. **Discussion period** — 1 week to resolve the objection
2. **TSC review** — If unresolved, TSC reviews and votes
3. **Override** — TSC can override objection with 2/3 majority

Objections must be substantive, with clear reasoning. Frivolous objections may be dismissed by TSC vote.

---

## Adding Maintainers

### Nomination

Any Maintainer may nominate a Contributor for Maintainer status by:

1. Opening a private discussion with existing Maintainers
2. Providing evidence of the nominee's contributions
3. Getting 2 Maintainers to second the nomination

### Voting

- Maintainers vote via private ballot
- Requires 2/3 majority to approve
- Nominee must accept the role

### Onboarding

New Maintainers receive:
- Merge access to the repository
- Introduction to other Maintainers
- Overview of current priorities
- Mentorship from an existing Maintainer (first 30 days)

---

## Releases

### Release Schedule

| Type | Frequency | Purpose |
|------|-----------|---------|
| **Patch** | As needed | Bug fixes, security patches |
| **Minor** | Monthly | New features, improvements |
| **Major** | Quarterly | Breaking changes, milestones |

### Release Process

1. **Release candidate** — Cut from `main`, tagged as `vX.Y.Z-rc.1`
2. **Testing period** — 1 week for community testing
3. **Bug fixes** — Address critical issues found
4. **Final release** — Tag as `vX.Y.Z`, publish release notes
5. **Announcement** — Post on Discord, Discussions, social media

### Release Notes

Every release includes:
- Summary of changes
- Full changelog (auto-generated from conventional commits)
- Contributor recognition
- Known issues
- Upgrade instructions (if breaking changes)

---

## Financial Transparency

OpenCAD is developed by a commercial entity that offers hosted services. The relationship between the open-source project and the commercial entity is:

- **The core platform is forever open-source** — Apache 2.0 license cannot be retroactively changed
- **Hosted services are separate** — Cloud sync, AI features, and collaboration are commercial offerings
- **Community contributions benefit everyone** — A healthier project means better tools for all users
- **Financial decisions are transparent** — Major business decisions affecting the project are announced in Discussions

### Revenue Allocation

Revenue from hosted services funds:
- Core development team salaries
- Infrastructure costs (CI/CD, hosting, CDN)
- Community programs (events, swag, bounties)
- Security audits and certifications

Annual financial summaries are published in GitHub Discussions.

---

## Conflict Resolution

### Code of Conduct Violations

Handled per [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) enforcement process. Separate from technical disputes.

### Technical Disputes

1. **Discussion** — Parties discuss in GitHub Issue or Discussion
2. **Mediation** — Uninvolved Maintainer medi
3. **TSC Vote** — If unresolved after 2 weeks, TSC votes
4. **Final** — TSC decision is binding (can be revisited with new evidence)

### Governance Disputes

1. **TSC Review** — TSC reviews the governance question
2. **Community Input** — Open discussion for 1 week
3. **Maintainer Vote** — If needed, Maintainers vote
4. **Amendment** — This document is updated if governance changes

---

## Amendments

This governance document can be amended by:

1. **Proposal** — Open a GitHub Issue with proposed changes
2. **Discussion** — 2 weeks of community discussion
3. **Maintainer Vote** — 2/3 majority required to approve
4. **Implementation** — Update this document, announce the change

Minor clarifications (no substantive change) can be made by any Maintainer.

---

## Historical Context

OpenCAD was founded in April 2026 with the mission to make professional architectural tools accessible to everyone. The governance model is inspired by successful open-source projects including:

- **Kubernetes** — Steering committee model
- **Rust** — Team-based governance
- **VS Code** — Open-core with commercial backing
- **Blender** — Community-driven development

---

## Contact

- **Governance questions:** Open a [GitHub Discussion](https://github.com/CariHQ/opencad/discussions) with the `governance` label
- **Private matters:** Contact the Lead Maintainer at [lead@opencad.org](mailto:lead@opencad.org)
- **Code of Conduct:** [conduct@opencad.org](mailto:conduct@opencad.org)

---

*Last updated: April 12, 2026*
