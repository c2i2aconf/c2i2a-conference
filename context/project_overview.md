# Project Overview — C2I2A / ICAIA Conference Platform

## Mission
Build and operate the official multi-edition conference platform for HEEC Marrakech's international conference on Artificial Intelligence and its Applications. The platform must be credible enough for real organizers, authors, reviewers, participants, partners, and teachers to use—not merely demonstrate pages.

## What the platform already is
The repository combines:
- Next.js App Router public website
- Payload CMS admin
- Neon PostgreSQL data
- Private Vercel Blob uploads
- Resend transactional email
- FR/EN localization
- yearly conference editions and archives
- attendee registration
- passwordless participant portal
- paper submission
- reviewer decisions
- CMS-managed speakers, sessions, dates, committees, sponsors, gallery, pages and site settings

The public website is expected to degrade gracefully when the database is unavailable, while operational failures should still be visible to maintainers.

## Current edition history / source material
### 2024
The repository already seeds a 2024 archived edition and program migrated from the earlier SciencesConf site. Treat it as legacy data that can be improved later but must not be silently replaced.

### 2025
Official historical source supplied by the project owner:
- `https://icaia25.sciencesconf.org/`
- title/theme shown by SciencesConf: **Intelligence Artificielle et ses Applications : IA pour un développement durable et inclusif**
- official dates page currently shows:
  - abstract deadline: 1 September 2025
  - acceptance notification: 25 September 2025
  - event: 18 October 2025
  - venue: HEEC Marrakech

Goal: import the authoritative 2025 conference content into Payload as a full archived edition rather than keeping it outside the platform.

### Earlier C2I2A SciencesConf source
Historical source supplied by the owner:
- `https://c2i2a.sciencesconf.org/`

Use it as supporting historical evidence when enriching older archive content. Do not overwrite newer official records without comparison.

### 2027 / ICAIA'27
The supplied official argumentaire describes the third edition, organized by HEEC Marrakech and Université Cadi Ayyad.

Core identity from the document:
- Event: **L'Intelligence Artificielle et ses Applications (ICAIA'27)**
- Main theme: **Vers un Écosystème Numérique Augmenté : Innover, Protéger et Transformer notre Monde Connecté**
- Sub-theme: **L'harmonisation des technologies intelligentes dans un monde en convergence**
- Venue: HEEC Marrakech / Marrakech, Morocco
- Contact: `icaia@heec.ma`

### Important unresolved date conflict
The argumentaire body and detailed calendar state **15 May 2027** as the conference date. The poster on page 1 states **22 May 2027**. This must be confirmed by the organizer before publishing the final live date.

## ICAIA'27 academic scope
The document defines 15 thematic axes:
1. Responsible AI and digital transformation
2. Trust, ethics and intelligent-system security
3. Emerging-technology convergence: AI, IoT, Blockchain, 5G/6G, Cloud
4. AI and sustainable development
5. Digital society and inclusion
6. Governance, regulation and AI business models
7. Innovation, research and intelligent applications
8. Generative AI, foundation models and autonomous agents
9. Explainable AI, auditability and adaptive IS governance
10. AI, education and EdTech
11. AI in health and digital wellbeing
12. AI, finance, insurance and new business models
13. Smart cities, mobility and connected territories
14. Industry 4.0/5.0, logistics and intelligent supply chains
15. AI, languages and heritage, especially low-resource languages

These axes should become structured CMS data, not one large hardcoded text block.

## ICAIA'27 submission requirements
The source document expands the current platform requirements substantially:
- research papers
- case studies / experience reports
- systematic review papers
- doctoral communications
- scientific posters
- accepted languages: French, English and Arabic, with English abstract required
- extended abstract: 800–1,000 words
- full text: 15–20 pages
- APA 7 bibliography
- accepted files: DOCX and PDF
- anonymized review manuscript
- separate cover-page information with authors, affiliations, emails, corresponding author and selected axis
- double review by two scientific committee members
- third review on disagreement
- decisions: accepted, revisions required, rejected
- anonymized review reports communicated to authors

The current implementation does not yet model all of these requirements.

## ICAIA'27 key dates from the argumentaire body
These are source facts but should not all be published until the date conflict is resolved:
- Call launch: 1 Sep 2026
- Extended abstract deadline: 15 Dec 2026
- Abstract acceptance notification: 15 Jan 2027
- Full paper deadline: 15 Mar 2027
- Review return/final notification: 5 Apr 2027
- Corrected final version: 20 Apr 2027
- Registration closes: 30 Apr 2027
- Final programme publication: 5 May 2027
- Conference: 15 May 2027 according to body/calendar
- Extended journal versions: 30 Jun 2027

## Participation model from ICAIA'27 source
Registration is required for all participants. At least one author must register for every accepted paper. The document defines fees:
- Morocco faculty/researchers/professionals: 1,200 MAD
- Morocco doctoral students/students: 600 MAD
- international in-person participants: €150
- remote participation: €60 / 600 MAD
- committee members and invited speakers: exempt

The platform currently models free registration only. Payment and proof-of-payment workflows are future scope and must not be faked as already implemented.

## Product goals for the next milestone
1. Make the site accurate enough to present to the teacher/organizers.
2. Import the real 2025 edition into the archive.
3. Prepare a structured 2027 edition based on the official argumentaire after resolving conflicting facts.
4. Harden public API and draft/security boundaries before expanding workflow complexity.
5. Improve registration/submission/review flows toward the real ICAIA'27 process.
6. Keep content editable by organizers through Payload.

## Non-goals for the immediate milestone
Unless explicitly promoted into `current-ticket.md`, do not attempt all of these at once:
- full payment gateway
- automated visa-letter issuance
- multi-reviewer scoring engine
- full Arabic website localization
- journal submission integration
- certificate generation

Prefer a reliable vertical slice suitable for demonstration and handoff.
