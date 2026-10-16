---
target: 'critique the isomer homepage created in isomer#225'
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
timestamp: 2026-10-16T22-54-39Z
slug: packages-isomer-studio-src-home-home-view-tsx
superseded: true
---

> **Superseded after user clarification.** Home is a configurable DX workbench landing page inspired by EUI, not an introductory site or a single-task launcher. The 28/40 score and recommendations to simplify the entry points, collapse runtime details, remove Docs/Dev choices, or change random fallback behavior are withdrawn. The responsive chart overlap, 9px surface labels, and heading-level issue were retained and addressed in the subsequent adaptation. Preserve the information architecture and configured behavior.

## Method and target

Method: dual-agent (A: 4e11bf20-6996-4839-b669-80ccdd51590e · B: 342b9ebb-212a-4d46-9103-21b67dd592d9)

Target: Isomer Studio Home, `packages/isomer-studio/src/home/home_view.tsx`, PR #225 at `b8ff1376951a6387d93c9e2cc39000e9005afe28`. The PR screenshot and a live local preview were visually inspected.

## Design Health Score

| #         | Heuristic                       | Score     | Key issue                                                                               |
| --------- | ------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | Loaded runtime details are clear; featured-item behavior is not stable or labeled.      |
| 2         | Match System / Real World       | 3         | Strong domain language, but the headline is more evocative than task-oriented.          |
| 3         | User Control and Freedom        | 3         | Direct routes and Home return exist; Home removes familiar header mode controls.        |
| 4         | Consistency and Standards       | 3         | Coherent EUI/Studio language, with a distinct Home header pattern.                      |
| 5         | Error Prevention                | 3         | Config validation is surfaced, but random fallback content changes landmarks on reload. |
| 6         | Recognition Rather Than Recall  | 3         | Search, labels, counts and icons help; Docs-versus-Dev requires a choice at each tile.  |
| 7         | Flexibility and Efficiency      | 2         | Search shortcut is useful; no recent or continue-work shortcut is visible.              |
| 8         | Aesthetic and Minimalist Design | 2         | Distinctive visual style, but many stacked discovery and runtime sections compete.      |
| 9         | Error Recovery                  | 3         | Config errors can be actionable; unknown-route-to-Home behavior may surprise.           |
| 10        | Help and Documentation          | 3         | Docs links are plentiful, though not prioritized around the immediate task.             |
| **Total** |                                 | **28/40** | **Good**                                                                                |

## Design Specificity Verdict

The plum shell, Isomer-specific surface diagram, primitive groups, loaded packs and apps are authored for this product rather than interchangeable dashboard furniture. The home page is caught between a product overview and an operational launcher: the expressive headline and numerous explanatory sections compete with quickly searching, opening an app, or entering Dev/Docs.

The CLI detector scan on the PR's four homepage TSX files returned `[]` (exit 0, no static findings). Browser overlay inspection logged 458 events in 10 rule families: tight-leading (433), ai-color-palette (9), undersized-ui-text (7), text-occlusion (3), and one each for radial-spotlight-glow, cramped-padding, clipped-overflow-container, overused-font, skipped-heading, and edge-flush-cards. The 3 text-occlusion findings are confirmed: the surface-chart SVG and its heading/paragraph occupy the same x/y bounds. The 7 undersized labels are 9px surface names. The heading sequence skips h2 after the h1. The [Human] browser tab shows the injected overlay.

Likely false positives/noise include repeated tight-leading notices from injected styles/external docs, palette warnings on intentional Studio teal actions, the brand gradient, and the Inter font. Shell-level padding/clipping and carousel edge warnings also appear to target layout mechanics rather than clearly user-visible defects.

## Overall Impression

A memorable, technically specific home with a strong search-first foundation. Its biggest opportunity is to choose the launchpad job more decisively and remove friction between finding something and starting work.

## What's Working

1. The plum palette, typography and product-specific surface diagram create a recognizable Isomer identity.
2. Organizing around primitives, groups, apps and surfaces reflects the actual Studio mental model.
3. Search is prominent, supports purpose/props and has a visible keyboard shortcut.

## Priority Issues

### 1. [P1] Surface-chart content overlaps

The SVG exactly overlaps “Author once, render anywhere” and the adjacent explanatory paragraphs, confirmed by the browser overlay and element bounds. This obscures copy and makes the product's core explanation difficult to read. Separate the diagram and copy into non-overlapping responsive columns/rows; increase its 9px functional surface labels to at least 11px. Suggested command: `/impeccable layout`.

### 2. [P2] The primary job is not decisive

“ What are we rendering today?” leads into search, eight category chips, featured cards, applications, learning links, a surface chart, and loaded-runtime details. Search is visible, but the page asks users to interpret the product before acting. Make “Find a primitive” and “Open an app” the first two clear actions; reduce or defer explanatory sections. Suggested command: `/impeccable distill`.

### 3. [P2] Featured content is unstable and branches into Docs versus Dev

When no `featured` list is configured, six items are random on each load. Each card also offers two equally prominent destinations. Returning users lose stable landmarks and must repeatedly choose a mode. Use a deterministic default (or label an explicitly exploratory random section), and emphasize one destination with the other secondary. Suggested command: `/impeccable clarify`.

### 4. [P2] Runtime diagnostics compete with the launch flow

A full “Loaded in this Studio” panel and a separate surface diagram take substantial attention and contain maintainer-oriented detail. Keep a short status summary visible and disclose the detailed counts/config guidance on demand. Suggested command: `/impeccable distill`.

### 5. [P2] Home removes familiar mode controls

The header replaces the Dev/Docs switch and global search with one external docs link. Home does supply its own large search, but does not provide a compact, familiar route to the two main Studio modes. Preserve explicit “Open Workbench” and “Browse Docs” affordances or make the home search clearly serve as the launcher. Suggested command: `/impeccable clarify`.

## Persona Red Flags

**Returning primitive author:** Random featured choices and lack of recent/continue-work affordance make repeat entry less efficient; the long overview obscures the shortest path to a known primitive.

**First-time Isomer developer:** Many terms (primitives, packs, compositions, views, tools, surfaces) appear together; Docs and Dev split each featured tile before the visitor understands the distinction.

**Pack/config maintainer:** Runtime status is useful, but the panel and surface chart compete with launch actions; diagnostic content would benefit from a compact status summary and disclosure.

## Minor Observations

- Detector also flags the h1-to-h3 heading jump; use a coherent heading outline for screen-reader navigation.
- “prop” in the search placeholder is terse domain jargon; consider “property” for first-time users.
- The category row contains eight options; its compact chips look grouped but still exceed the four-choice working-memory guideline.
- The color-mode control is absent on Home; if intentional, keep the choice/persistence behavior consistent across routes.

## Questions to Consider

1. Is Home primarily a launcher or an introduction to Isomer? Which sections would be removed if it optimized for one?
2. Why should a returning developer see a random set of primitives instead of stable recommendations or recent work?
3. Does the surface chart explain the product, or does it mainly demonstrate architectural breadth?
4. Which action should a first-time user take in their first ten seconds, and is it the most visually obvious one?
