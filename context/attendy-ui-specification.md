# Attendee UI Specification — C2I2A / ICAIA Conference Platform

> File name kept as `attendy-ui-specification.md` to match the requested repository structure. This document covers participant/attendee-facing UI.

## Experience goal
The attendee experience should feel like a credible academic conference platform: clear, formal, modern, fast to scan, and easy to use on mobile. The user should immediately understand:
- what the conference is
- which edition is current
- when and where it happens
- whether submissions/registration are open
- what the important dates are
- how to participate
- how to access their account

## Visual direction
Preserve the existing institutional design language:
- HEEC deep royal blue primary
- Moroccan gold accent
- clean academic layout
- generous whitespace
- strong display headings
- restrained motion
- no decorative folklore/zellige motifs
- full dark-mode support

## Navigation
Desktop and mobile navigation should make these high-value destinations obvious:
- Home
- About / Conference description
- Themes / Call for papers
- Important dates
- Programme
- Speakers
- Registration
- Submission
- Committees
- Partners
- Access / Venue
- Archive
- Account when authenticated

Do not overload the main nav. Lower-frequency pages can live in grouped menus/footer.

## Homepage hierarchy
### 1. Hero
Must communicate:
- current edition brand, e.g. ICAIA'27 / C2I2A
- official conference title/theme from CMS
- date
- venue
- main CTA: Register
- secondary CTA: Submit
- countdown only when date is confirmed and in the future

If the event date is unresolved, do not show a fabricated countdown.

### 2. Conference summary
Short description of the edition and organizer(s). Link to full presentation.

### 3. Important dates
Show the next 3–5 relevant deadlines, with status labels such as open/upcoming/closed/extended.

### 4. Call for papers / thematic axes
For ICAIA'27, thematic axes are central content. Show a concise grid/list and link to full details.

### 5. Keynote speakers
Only show real confirmed keynote speakers from CMS. Do not use placeholder identities on a production-facing page.

### 6. Programme preview
When programme exists, show the current/final programme preview. Before publication, show a clear “programme forthcoming” state rather than an empty broken section.

### 7. Partners
Use structured partner tiers/categories and accessible logo alt text.

### 8. Venue
Show HEEC/official venue details, map and access link.

## Important dates page
- chronological timeline/table
- clear deadline/status
- mobile-friendly layout
- use absolute dates, not ambiguous relative language
- distinguish submission deadlines, notifications, registration deadlines and event date

## 2025 archive experience
The 2025 edition should be a real archive, not an external link dump.

Archive page should preserve as much authoritative historical content as can be verified from the official SciencesConf source:
- theme: `IA pour un développement durable et inclusif`
- event date: 18 October 2025
- venue: HEEC Marrakech
- important dates
- description
- programme, committees, partners, gallery and other content when available/verified
- an optional “Original SciencesConf site” source link

Archive content must never present old registration/submission CTAs as currently open.

## Registration UX
Current immediate UX:
- first name
- last name
- email
- affiliation
- country
- locale
- confirmation state
- email-delivery state

Future ICAIA'27 UX should support participant category and fee/payment workflow, but only after backend modeling exists.

Potential participant categories from the official 2027 argumentaire:
- Morocco faculty/researcher/professional
- Morocco doctoral student/student
- international in-person
- remote
- exempt committee/invited speaker

Do not display payment completion controls until payment/proof records exist server-side.

## Authentication UX
Passwordless portal flow should be simple:
1. enter email
2. receive link
3. open account

Always use non-enumerating success language for magic-link requests.

Account page should surface:
- profile identity
- registrations
- submissions
- submission decision state
- action to submit when permitted

Later add payment/proof and review feedback when modeled.

## Submission UX — current
Current flow supports title, abstract and one PDF.

The page should clearly display:
- active edition
- submission deadline
- accepted file size/type
- authentication requirement
- success state and email confirmation

## Submission UX — target based on ICAIA'27
The real source requirements imply a future multi-step submission form:

### Step 1 — Contribution
- title
- contribution type
- thematic axis
- manuscript language
- abstract/extended abstract
- keywords

### Step 2 — Authors
- corresponding author
- co-authors
- affiliations
- emails

### Step 3 — Files
- anonymized review manuscript
- separate cover information where required
- PDF and/or DOCX depending on submission stage

### Step 4 — Confirmation
- checklist for anonymization
- originality declaration
- AI-use declaration if adopted as a form field
- final review before submit

Do not implement the multi-step UI ahead of its backend model.

## Review decision UX
The source document supports three outcomes:
- accepted
- accepted subject to modifications
- rejected

Author-facing feedback should be distinct from private internal reviewer notes.

## Programme UI
Keep the current day-tabs/time-slot model because it maps well to a conference schedule.

Improve progressively with:
- room labels
- session type badges
- speaker links
- mobile time-slot readability
- printable/shareable programme later

All session relationships should be same-edition.

## Committees UI
ICAIA'27 source includes multiple categories. Target categories:
- honorary committee
- steering committee
- scientific committee
- organizing committee

Large committees need searchable/scannable layouts rather than oversized cards for every person.

## Partners/publications UI
Distinguish:
- national partners
- international partners
- partner journals

Journal publication information should be a dedicated content section, not mixed into sponsor tiers.

## Accessibility
- WCAG-conscious contrast
- meaningful heading order
- visible keyboard focus
- labelled form inputs and errors
- alt text for meaningful images/logos
- respect reduced motion
- no information conveyed by color only
- touch targets appropriate for mobile

## Responsive priorities
Design and test at minimum:
- 390px mobile
- tablet
- standard laptop
- wide desktop

Critical actions (register, submit, login) must remain obvious on mobile without requiring excessive scrolling/navigation.

## Empty/error states
Public site must degrade gracefully:
- DB unavailable → readable fallback shell, no crash
- missing programme → “programme forthcoming”
- no speakers → omit section
- submissions closed → explain deadline/closed status
- email failure after successful registration/submission → confirm database success and clearly state mail was not delivered

## Content integrity
The UI must never turn uncertain source data into certainty. Known example: ICAIA'27 event date conflict (15 May vs 22 May 2027). Keep the date unpublished/unconfirmed until resolved.
