# AffinityFlow Design System

**Direction:** “AffinityFlow designed with the visual sophistication of Daydream.”  
**Reference blend:** 70% Daydream / 20% Linear / 10% Notion  
**Scope:** Product UI—not a marketing-site imitation. Preserve every existing workflow and capability while refining hierarchy, density, styling, and interaction feedback.

## Design intent

Daydream’s public site pairs assertive editorial typography with warm neutrals, crisp contrast, modular storytelling, and a small number of saturated accents. AffinityFlow should borrow that confidence and restraint, not its page compositions. Linear contributes precise application chrome, compact controls, and disciplined states. Notion contributes familiar document-like structure and low-friction editing.

The resulting product is calm but not sterile, expressive but not decorative, and dense enough for serious synthesis work. It should make complex research feel ordered without making the interface feel automated beyond the researcher’s control.

### Product principles

1. **Make complexity feel composed.** Dense research data is expected. Use alignment, hierarchy, progressive disclosure, and zoom-aware detail rather than simply adding space.
2. **Keep the researcher in control.** AI proposes, explains, and previews; the user confirms consequential changes. Undo must remain visible and dependable.
3. **Show the work.** Preserve provenance from insight to code to source. Metadata should be available on demand without competing with the primary reading layer.
4. **Optimize for flow.** Setup, review, synthesis, organization, and export should feel like one continuous workspace—not separate landing pages.
5. **Use emphasis sparingly.** Strong type, color, and elevation are finite resources. One dominant action or focal surface per region.
6. **Prefer useful density.** Compact controls and short labels; generous space only where it improves comprehension or manipulation.
7. **Refine without reinvention.** Keep the existing information architecture, three-step workflow, project management, board organization, zoom, undo, and export behaviors intact.

## Visual personality

- Editorial clarity with product-grade precision.
- Warm, ink-like neutrals rather than blue-gray everywhere.
- Confident typography; quiet supporting chrome.
- Tactile only where objects are manipulated: notes, groups, menus, and floating tools.
- Colorful research content on a neutral stage.
- Slightly unconventional, never whimsical at the expense of comprehension.

Avoid gradients, glass effects, large marketing-style hero spacing, oversized rounded cards, excessive drop shadows, decorative motion, and blue applied to every interactive element.

## Inspirations and translation

| Source | Borrow | Do not borrow |
|---|---|---|
| Daydream (70%) | Warm neutral palette, bold editorial headlines, crisp black/cream contrast, modular visual rhythm, decisive accent colors, visual confidence | Marketing-page sections, billboard-sized type, narrative scroll effects, large empty bands, branded illustrations |
| Linear (20%) | Compact app chrome, subdued layers, keyboard-aware interactions, refined hover/focus states, restrained shadows | Ultra-dark default UI, low-contrast microcopy, technical density where it harms research readability |
| Notion (10%) | Familiar document hierarchy, inline editing, plain-language controls, lightweight menus | Monochrome sameness, loose canvas conventions, ambiguous icon-only actions |

Reference observations are adapted from [Daydream’s current public site](https://www.withdaydream.com/) and the supplied AffinityFlow setup and board screenshots. Values below are product-specific recommendations, not copied CSS.

## Information density

AffinityFlow has three density modes by context, not as a user preference:

- **Setup — comfortable:** 640–760 px content column; 16 px control gaps; concise help text. Enough breathing room to parse forms, but no hero-like top gap.
- **Application chrome — compact:** 32–36 px controls; 40–48 px rows; 8–12 px internal gaps. Navigation should recede behind the work.
- **Canvas — adaptive:** density changes with zoom. Preserve object identity at low zoom and reveal detail progressively as zoom increases.

Target a visible-information ratio of roughly 70% work / 30% chrome on setup screens and 88% work / 12% chrome on the board. Avoid repeating a title, description, step count, and pill navigation when two of those signals are enough.

## Layout system

### App shell

- Desktop sidebar: 248 px expanded, 56 px collapsed. Current project remains visible in either state.
- Sidebar and workspace use a single 1 px divider; avoid placing every sidebar section in its own card.
- Workspace header: 56 px compact toolbar on the board; 72 px maximum on setup screens.
- Setup content: `minmax(0, 720px)`, aligned to a 12-column shell rather than centered in the full viewport. Recommended left offset: 80–120 px from the sidebar at wide widths.
- Board canvas fills all remaining viewport space below the toolbar. Canvas controls float within safe-area insets of 12–16 px.

### Responsive behavior

- `>= 1280 px`: expanded sidebar; board inspector may dock right at 320 px.
- `960–1279 px`: collapsible sidebar; inspector overlays the canvas only while open.
- `768–959 px`: sidebar becomes a temporary drawer; setup remains single-column; board toolbar condenses labels.
- `< 768 px`: support review and lightweight edits, but communicate that spatial reorganization is best on a larger screen. Do not remove essential actions.

### Alignment

- Base grid: 4 px; primary layout increments: 8 px.
- Align page title, stepper, form sections, and footer actions to one vertical axis.
- Place primary actions consistently at the trailing edge of a page or panel.
- Use separators and section headings before adding another enclosing surface.

## Color system

Use semantic tokens. Hex values are starting points and must be verified in the rendered product.

### Neutral foundation

| Token | Value | Use |
|---|---:|---|
| `--color-canvas` | `#F7F6F2` | Main workspace; warm paper neutral |
| `--color-surface` | `#FEFDFB` | Cards, menus, panels |
| `--color-surface-subtle` | `#F0EFEA` | Sidebar, selected rows, secondary regions |
| `--color-surface-raised` | `#FFFFFF` | Floating tools and active overlays only |
| `--color-ink` | `#171714` | Primary text and strong icons |
| `--color-ink-muted` | `#66645D` | Secondary text |
| `--color-ink-faint` | `#8D8A81` | Placeholder and tertiary metadata |
| `--color-border` | `#DEDCD4` | Default boundaries |
| `--color-border-strong` | `#C6C3B9` | Active structural boundaries |

### Brand and status

| Token | Value | Use |
|---|---:|---|
| `--color-accent` | `#5B4AE8` | Primary actions, active navigation, focus |
| `--color-accent-hover` | `#4B3BD1` | Primary hover |
| `--color-accent-soft` | `#EEEBFF` | Selected row or soft highlight |
| `--color-success` | `#247A52` | Complete, safe, accepted |
| `--color-success-soft` | `#E5F3EA` | Success background |
| `--color-warning` | `#9B6500` | Caution and privacy review |
| `--color-warning-soft` | `#FFF1CF` | Warning background |
| `--color-danger` | `#B33A32` | Destructive actions and errors |
| `--color-danger-soft` | `#FBE8E5` | Error background |
| `--color-info` | `#246B91` | Informational state—not generic interactivity |

### Participant and note colors

Participant identity must not depend on hue alone. Pair color with initials, a short label, or a stable symbol.

- Blue: background `#E3EEFF`, edge `#6F9FEF`, ink `#173B6A`
- Rose: background `#FBE5EA`, edge `#DF7F96`, ink `#66243A`
- Amber: background `#FFF0CE`, edge `#D6A64D`, ink `#5A3C08`
- Mint: background `#E1F3EA`, edge `#6BAE8C`, ink `#194A35`
- Lilac: background `#EEE7FA`, edge `#9B7FD0`, ink `#3F2B64`
- Slate: background `#E9ECEF`, edge `#8A949D`, ink `#30363B`

Do not tint the whole application blue. The neutral canvas should make the research objects—not the chrome—carry color.

## Typography

Use a high-quality variable grotesk such as **Inter**, with `system-ui` fallback. If the product can license or self-host a more editorial grotesk later, evaluate **Söhne** or **Neue Montreal**; do not block implementation on it.

| Style | Size / line | Weight | Use |
|---|---:|---:|---|
| Display | 36 / 40 | 650 | Rare empty state or onboarding moment |
| Page title | 28 / 34 | 650 | Setup and board title |
| Section title | 18 / 24 | 620 | Form and inspector sections |
| Subsection | 15 / 20 | 620 | Group names, modal headings |
| Body | 14 / 21 | 450 | Default reading text |
| Body compact | 13 / 18 | 450 | Menus, controls, metadata |
| Label | 12 / 16 | 560 | Field labels and small headers |
| Micro | 11 / 14 | 520 | Canvas metadata at readable zoom |

- Use sentence case everywhere except proper nouns.
- Apply slight negative tracking only to titles (`-0.015em`); leave body copy neutral.
- Use tabular numerals for counts, zoom, and progress.
- Keep setup paragraphs to 60–72 characters per line.
- Never render essential board text below 11 CSS px. At low zoom, switch representation rather than scaling text into illegibility.

## Spacing

Token scale: `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px.

- Control inset: 8 px vertical / 12 px horizontal.
- Form field gap: 8 px; field group gap: 20 px.
- Section inset: 20–24 px.
- Setup section gap: 16 px.
- Page top inset: 32–48 px, never marketing-hero spacing.
- Floating control inset: 12 px from canvas edge and adjacent controls.
- Dense board object gap: 8 px minimum; group gap: 16 px minimum.

## Radius

- 4 px: sticky notes, chips, small tags.
- 6 px: inputs, buttons, menu items.
- 8 px: panels, groups, dropdowns.
- 12 px: modal and command surface.
- Pill radius: status or filtering chips only; do not make every button a pill.

The current product overuses large rounded containers. Reduce most 14–18 px radii to 6–8 px so the interface feels precise rather than soft and inflated.

## Shadows

Shadows indicate layering, not importance.

- `--shadow-1: 0 1px 2px rgba(23, 23, 20, .06)` — sticky note or subtle raised object.
- `--shadow-2: 0 4px 14px rgba(23, 23, 20, .10)` — menu, popover, floating toolbar.
- `--shadow-3: 0 16px 40px rgba(23, 23, 20, .14)` — modal or dragged object.

Static form sections and the sidebar should not cast shadows. Dragged items gain `shadow-3` and a slight scale only while held.

## Borders

- Default: 1 px solid `--color-border`.
- Strong/active: 1 px solid `--color-border-strong`.
- Focus: 2 px `--color-accent`, offset 2 px; do not replace focus with a color-only border.
- Selected canvas object: 2 px accent outline outside the object.
- Avoid double borders where a card touches a section divider.
- Canvas grid uses `rgba(23, 23, 20, .08)` and fades below 70% zoom; it must never compete with note text.

## Component inventory

### Navigation and structure

- App sidebar, project row, account menu, collapse control
- Compact workspace header, breadcrumbs, page title, object count
- Three-step workflow indicator
- Tabs and segmented controls
- Section header and divider
- Inspector / organize panel

### Actions and input

- Primary, secondary, quiet, icon, and destructive buttons
- Text input, textarea, search, inline rename
- Radio card, checkbox, switch, select, combobox
- File drop zone and file item
- Menu, popover, command menu, tooltip
- Dialog, confirmation dialog, toast, inline message

### Research and canvas

- Sticky note, participant badge, code/source reference
- Theme group, group title, group summary, collapse control
- Selection marquee, multi-select toolbar, drag preview
- Canvas minimap, zoom control, fit-to-content, undo/redo
- AI suggestion, rationale panel, confidence/caveat, accept/reject
- Empty, loading, processing, partial-result, and error surfaces

### Component rules

- One primary button per action region.
- Destructive actions are quiet by default, red only on hover/focus or inside confirmation UI.
- Icon-only buttons require a tooltip and accessible name.
- Radio cards use a tinted selected background plus check/radio state; avoid a border-only distinction.
- Sticky notes show the quote/code first and participant/source second. Truncate visually but never discard source access.
- Group containers should remain visually lighter than the notes inside them.

## State system

Every interactive component supports:

- **Default:** neutral surface and border.
- **Hover:** subtle surface shift; no layout movement.
- **Pressed:** slightly darker surface or 1 px visual inset.
- **Focus-visible:** 2 px accent ring with offset; always retained.
- **Selected:** accent-soft surface, accent edge or checkmark, and semantic attribute.
- **Disabled:** 45% ink opacity; no shadow; cursor and semantics reflect disabled state.
- **Loading:** preserve dimensions; use inline spinner or skeleton; keep label when possible.
- **Success:** short confirmation near the action; avoid permanent green chrome.
- **Warning:** explain risk and next step.
- **Error:** state what happened, whether work was saved, and how to recover.

AI-specific states:

- `Ready → Analyzing → Draft available → User-reviewed → Applied`
- Partial output must be labeled and usable.
- An applied AI action produces an undoable event with a human-readable summary.
- Never use shimmering or anthropomorphic “thinking” animation. Use a steady progress line or compact status with elapsed context.

## Canvas behaviors

### Navigation

- Wheel/trackpad scroll pans; pinch or `Cmd/Ctrl + wheel` zooms.
- Space + drag pans; drag on empty canvas may also pan when no selection tool is active.
- `+`, `−`, fit-to-content, and 100% controls remain grouped in one floating toolbar.
- Zoom centers on pointer position. Preserve the user’s focal point after opening or closing the inspector.
- Remember zoom and position per project.

### Zoom-aware representation

- `< 45%`: show group silhouettes, titles, counts, and participant color distribution; hide note body text.
- `45–69%`: show note title/first line and participant marker; hide tertiary metadata.
- `70–119%`: show readable note content and compact source metadata.
- `>= 120%`: reveal full note content, provenance controls, and editing affordances.

This replaces the current behavior where very small note text remains technically present but functionally unreadable.

### Selection and manipulation

- Click selects one; Shift-click adds; drag empty space creates a marquee.
- Selected objects receive an outside outline so note color remains intact.
- During drag, show destination guides and group insertion intent. Snap at 8 px; hold Alt/Option to bypass.
- Auto-pan near edges should accelerate gradually and stop immediately on release.
- Prevent accidental destructive regrouping: preview the destination and keep the operation undoable.
- Double-click group title for inline rename; Enter commits, Escape cancels.
- Keyboard movement uses 1 px; Shift + arrow uses 8 px.

### Board chrome

- Move “Organize the board” into a collapsible right inspector. Its collapsed state is a labeled icon button, not a persistent instructional card over the canvas.
- Keep counts and current selection in the compact toolbar.
- Replace the dotted blue field with a low-contrast neutral grid.
- At extreme zoom-out, offer “Fit board” rather than allowing illegible content to be the default resting state.

## Motion principles

- Motion explains change, spatial relationship, or system status.
- Hover/focus: 100–140 ms; panels/menus: 160–200 ms; canvas regrouping: 180–240 ms.
- Default easing: `cubic-bezier(.2, .8, .2, 1)`; exit slightly faster than enter.
- No decorative loops, parallax, gradient animation, or delayed flourish.
- Reordering and regrouping should animate from old to new position; do not fade objects out and back in.
- Respect `prefers-reduced-motion`: remove transforms and use immediate state changes or short opacity transitions under 100 ms.

## Writing style

Write like a skilled research partner: direct, calm, specific, and candid about uncertainty.

- Lead with the task or outcome: “Upload research data,” not “Add your data.”
- Use sentence case and concrete verbs: “Add research question,” “Review privacy,” “Create affinity board.”
- Keep helper text to one useful sentence. Put deeper guidance behind “Learn more.”
- Distinguish optional and required in labels, not repeated card subtitles.
- Describe AI actions precisely: “Suggest 6 themes from 62 codes.”
- Name consequences before confirmation: “Delete project and its 62 codes?”
- Errors explain recovery: “The CSV is missing a code column. Choose a column or upload another file.”
- Avoid hype, “magic,” and vague reassurance.

Recommended workflow labels:

1. **Add data**
2. **Review privacy**
3. **Organize board**

## Accessibility

- Meet WCAG 2.2 AA for all core workflows.
- Text contrast: 4.5:1 minimum; large text and meaningful object edges: 3:1 minimum.
- Touch targets: 44 × 44 px where possible; compact desktop controls may be 32 px only when adjacent spacing prevents misclicks and a larger accessible target is not practical.
- Full keyboard access for navigation, upload, setup, note selection, multi-selection, moving, grouping, renaming, undo/redo, inspector, and export.
- Provide a “Skip to workspace/canvas” link.
- Canvas objects must have a navigable semantic representation, such as a synchronized outline/list view. Announce selection count, move destination, regrouping, and undo via a polite live region.
- Never communicate participant, state, risk, or selection by color alone.
- Tooltips do not contain essential information and are available on keyboard focus.
- Visible focus is never clipped by overflow containers.
- Honor reduced motion, increased contrast, browser zoom to 200%, and text spacing overrides.
- AI suggestions identify machine-generated content, expose source evidence, and allow rejection without penalty.

## UI refinement recommendations

### Priority 0 — foundation

1. Replace the full-page blue/lavender cast with the warm neutral foundation. Reserve accent color for active and primary states.
2. Reduce setup page title from roughly display scale to 28 px and tighten the introductory block. Begin useful content within 32–48 px of the workspace header.
3. Replace large rounded, shadowed form cards with flatter 8 px sections separated by borders and 16 px gaps.
4. Standardize controls to 36 px height, 6 px radius, consistent focus rings, and clear primary/secondary/quiet hierarchy.
5. Replace tiny red “remove” text with a quiet icon button labeled “Remove research question,” revealing danger color on hover/focus.

### Priority 1 — navigation and setup

1. Simplify the sidebar: place account details in an account menu at the bottom; keep project creation and project list primary. Do not render the user block as a large card.
2. Give selected projects an accent-soft row with a 2 px leading indicator. Show delete in an overflow menu rather than a permanent “×”.
3. Compress the stepper into one line with connected states; do not combine a separate “Step 1 of 3” label with large pill buttons.
4. Merge “Project details” and “Research questions” into a single form surface with section dividers unless validation requires separate cards.
5. Replace the native file input with a clear drop zone that also supports browsing, lists accepted formats, and shows uploaded file status.
6. Turn the two upload organization choices into compact radio cards with selected fill, not two large outlined boxes.
7. Add a sticky setup footer with Back and Continue so the completion action never falls below the viewport.

### Priority 1 — affinity board

1. Make the board the visual foreground: a neutral canvas, quieter grid, and compact 56 px toolbar.
2. Apply zoom-aware note rendering. The supplied 44% view should show group titles/counts and note silhouettes—not microscopic body copy.
3. Consolidate zoom, fit, undo, and redo in a single floating toolbar; give each icon an accessible label and tooltip.
4. Convert the persistent “Organize the board” help card into a collapsible 320 px inspector with a brief first-run coach mark that can be dismissed.
5. Increase group-title contrast and reduce group-container weight. Notes should remain the richest objects.
6. Use participant color more softly and add participant initials/labels so pink versus blue is never the only cue.
7. Keep Export & share as the single primary toolbar action, but reduce its saturation when no export-affecting work is pending.
8. Add a minimap or overview mode for large boards and a reliable “Fit board” command.

### Priority 2 — trust and finish

1. Add explicit provenance and AI-rationale entry points to notes and generated themes.
2. Add consistent empty, analyzing, partial, error, and undo states.
3. Introduce command menu and keyboard shortcuts only after all visible controls are complete and accessible.
4. Add micro-motion for regrouping, panel transitions, and drag intent; keep it functional and reduced-motion safe.
5. Test the setup flow at 320%, 200%, and 100% browser zoom, and the canvas with keyboard-only and screen-reader list representations.

## Acceptance checklist

- Existing capabilities and workflow order still work.
- No gradients, decorative animation, or marketing-layout spacing appear in product screens.
- There is no more than one primary action per region.
- Setup screens fit their key next action in a typical laptop viewport.
- Essential canvas text is never rendered below 11 CSS px; representation changes at low zoom.
- Every interactive state is visible with keyboard and without color.
- AI changes disclose source/rationale and are undoable.
- The canvas remains the dominant surface on the board.
- Daydream influence is visible in typography, restraint, warmth, and composition—not in copied sections or ornamental styling.

