---
name: Create-node dialog preset flow
description: How CreateNodeDialog's presetType shortcut interacts with its multi-step wizard (wiki-frontend)
---

`CreateNodeDialog` (wiki-frontend) is a multi-step wizard: step 0 = type-selection grid, step 1 = template-variant selection (only shown if the chosen type has variants), step 2 = title/details form, step 3 = review.

When opened with a `presetType`, it sets the template type and jumps to step 1 — it does NOT go straight to the title form. If the preset type has no variants, step 1 effectively behaves like the title form since there's nothing to pick.

**Why:** Types like `core_process_overview` have multiple template variants (Schlank/Standard/QM-detailliert). Skipping variant selection entirely would remove a meaningful choice; the preset shortcut is meant to skip *type* selection, not the variant step.

**How to apply:** When testing or building on the preset/quick-add flow, verify "type-selection grid is skipped," not "title form appears immediately." Any e2e test plan for this flow should treat the variant step as expected UI, not a bug.
