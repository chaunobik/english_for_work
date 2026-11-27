# English for Work — SRS & quality gates
## Scope
Single-user Vietnamese UI, English content, static GitHub Pages, zero paid API dependencies. 182 daily lessons, 156 study days, 120 min core + 20 optional vocabulary min, 1000 words, 390 phrases, 78 roleplays, 26 assessments. Preserve workbook content and source/QA caveats. Browser-local progress only; backup/restore JSON. No secret or personal progress in public repo. External audio and AI conversation use external providers, not embedded paid APIs.
## Acceptance matrix
| Gate | Requirement | Test / expected |
|---|---|---|
| G0 | Source workbook and repo | Correct sheet names; access and branch verified |
| G1 | Traceable specification | Every mandatory function mapped to test; no unbounded scope |
| G2 | Exact migration | IDs unique, counts exact, day/week mapping, minutes 18720, 5000 word review dates, all task/resource references resolved, assessment resources not leaked in training |
| G3 | Learning | Open any day; per-skill instructions, resource links and alternatives, roleplay prompts; checkboxes and notes persist after reload; next incomplete day |
| G4 | Vocabulary | Browse/search all 1000 + 390; reveal flashcard; rate, calculate next review, overdue queue, audio or dictionary fallback; no future unscheduled cards in daily review |
| G5 | Assessment | 26 tests, five inputs 0–10, weights 30/35/15/10/10 and weekly thresholds, incomplete not passed; backup/export/import invalid input rejected; writing/errors retained |
| G6 | Integration | Automated desktop/mobile browser smoke and persistence, no JS exceptions or overflow, no personal data transmitted, static paths work, invalid import safe, core content usable offline after caching if supported |
| G7 | Release | Only after G2–G6 PASS, GitHub Pages publishing enabled; verify HTTP and user flow on live URL |
## Design
Dashboard, path, daily lesson, vocabulary, assessment, progress. Native static HTML/CSS/JS is acceptable instead of React if it reduces dependency/build complexity without sacrificing requirements. Hash navigation, responsive layout, local browser storage for text progress and review; external dictionary link fallback. Optional microphone recording is not release-critical; do not claim tested unless run. Backup restores progress, not course content. No automatic CEFR claim.
## Gate policy
PASS only with executed evidence; FAIL fix and rerun; BLOCKED stops promotion. No merge to main or production until gates pass. Track residual source limitations (audio availability, independently unverified IPA/CEFR) separately from software QA.