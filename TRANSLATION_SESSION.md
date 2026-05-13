# Translation Session: French to English

**Date:** 2026-05-13
**Project:** BuildTrack Pro (`construction-tracker`)
**Goal:** Translate all French UI text across the entire React client to English.

---

## Summary

All visible French text in the application has been translated to English. This covered pages, export utilities, form labels, chart legends, table headers, empty states, tooltips, loading messages, and dropdown options.

---

## Files Modified

### Utility Files

| File | Changes |
|------|---------|
| `client/src/utils/helpers.ts` | `DISCIPLINE_LABELS` — Mecanique -> Mechanical, Electricite -> Electrical, Plomberie -> Plumbing, General -> General |
| `client/src/utils/exportPDF.ts` | All section titles, column headers, signature block, footer, file names |
| `client/src/utils/exportExcel.ts` | Sheet titles, column headers, discipline names |
| `client/src/utils/exportPresentation.ts` | Cover labels, intervenants/zones/billing/weighting/plans section headers and table headers |

### Page Files

| File | Key Changes |
|------|-------------|
| `pages/DailyReportFormPage.tsx` | All section headers (1-8), field labels, weather options, manpower position names, placeholders |
| `pages/DailyReportPage.tsx` | Already mostly English — no changes needed |
| `pages/WeeklyReportPage.tsx` | Delete modal, chart titles, LOT/studies/materials table headers, narrative labels |
| `pages/MonthlyReportPage.tsx` | Delete modal, subtitle, discipline names, chart labels, edit form fields |
| `pages/ProjectPresentationPage.tsx` | Info grid, progress labels, characteristics/description sections, KPI labels, intervenants/zones/billing/weighting/plans tabs — all labels, headers, empty states, placeholders |
| `pages/ContractsSubmittalsPage.tsx` | Page title, loading text, Add button |
| `pages/PerformancePage.tsx` | All KPI card labels, chart legends (activity donut, risk bar, radar), section titles, progress bar labels, status badges, empty states |
| `pages/PlantEquipmentPage.tsx` | All category labels, status labels, table headers, form field labels, filter dropdowns, empty state |
| `pages/ProjectMapPage.tsx` | Page title, filter labels/options, map legend, cell detail panel (progress, equipment, personnel sections), stats bar |
| `pages/SiteResourcesPage.tsx` | Empty state title and description |
| `pages/ProjectsPage.tsx` | Delete button tooltip |
| `pages/RisksPage.tsx` | Discipline dropdown options |

---

## Translation Reference

### Discipline Names

| French | English |
|--------|---------|
| Mecanique | Mechanical |
| Electricite | Electrical |
| Plomberie | Plumbing |
| General | General |

### Common UI Terms

| French | English |
|--------|---------|
| Ajouter | Add |
| Supprimer | Delete |
| Annuler | Cancel |
| Enregistrer | Save |
| Chargement... | Loading... |
| Aucun / Aucune | No / None |
| Avancement | Progress |
| En cours | In Progress |
| Termine | Completed |
| Non demarre | Not Started |
| En retard | Delayed |
| Situation de facturation | Billing Statement |
| Intervenants | Stakeholders |
| Ponderation | Weighting |
| Jalons | Milestones |
| Risques | Risks |
| Niveau | Level |
| Tableau des Intervenants | Stakeholders Table |
| Division par Zones & Niveaux | Zones & Levels Breakdown |
| Situations de Facturation | Billing Statements |
| Ponderation & Etat d'Approbations | Weighting & Approval Status |
| Nomenclature des Plans Transmis | Transmitted Plans Register |

---

## What Was NOT Changed

- **Internal code comments** (`{/* ... */}`) — not visible to users in the UI
- **`SchedulePage.tsx` CSV parser** — intentionally accepts `avancement` as a column alias so existing user CSV files with French headers still import correctly
- **`m3` unit symbol** — universal scientific notation, not French-specific
- **Database field names / API keys** — backend data model keys remain unchanged (e.g. `reportDate`, `generalSummary`)
