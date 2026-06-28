# AffinityFlow UI mockups

Standalone HTML previews following `design/design-system.md`. These do **not** modify the running app.

Open any file in a browser (double-click, or `open path/to/file.html`).

---

## Canvas (Organize board)

| File | Concept |
|------|---------|
| [canvas-variant-a-inspector-open.html](./canvas-variant-a-inspector-open.html) | **Classic docked inspector** — 56px toolbar, full-width canvas, 320px right panel always open, zoom/undo bar bottom-left |
| [canvas-variant-b-collapsed-inspector.html](./canvas-variant-b-collapsed-inspector.html) | **Maximum canvas** — inspector collapsed to vertical “Organize” tab, minimap bottom-right, centered floating toolbar, breadcrumb header |
| [canvas-variant-c-split-chrome.html](./canvas-variant-c-split-chrome.html) | **Split chrome** — selection pill on canvas, zoom top-right, narrower inspector with hover detail card demo |
| [canvas-variant-hybrid-cb.html](./canvas-variant-hybrid-cb.html) | **Hybrid** — breadcrumb header, bottom-center zoom bar, bottom-right minimap, inspector open by default but collapsible |

---

## Data input (Upload research data)

| File | Concept |
|------|---------|
| [ingest-variant-a-unified-form.html](./ingest-variant-a-unified-form.html) | **Unified flat form** — single 720px surface with section dividers (project, RQs, data), drop zone, compact radio cards, sticky footer |
| [ingest-variant-b-two-pane.html](./ingest-variant-b-two-pane.html) | **Two-pane** — project setup left column, large drop zone right, breadcrumb toolbar, footer with cancel + continue |
| [ingest-variant-c-data-first.html](./ingest-variant-c-data-first.html) | **Data-first minimal** — inline project name, prominent upload panel, research questions in collapsed optional section, status in footer |

---

## Shared design-system choices

- Warm neutral palette (`#F7F6F2` canvas, `#171714` ink, `#5B4AE8` accent)
- No gradients or glass effects
- 36px controls, 6px input/button radius, 8px panels
- Quiet destructive actions (icon buttons, danger on hover)
- No workflow stepper pills on canvas hybrid; ingest variants omit step pills per design system guidance

Pick a variant (or mix elements) before implementing in the Next.js app.
