```markdown
# Design System Specification: The Terminal Editorial

## 1. Overview & Creative North Star: "The Synthetic Architect"
This design system is a rejection of the "soft and friendly" SaaS aesthetic. It is built for the power user—the developer, the engineer, the architect. The Creative North Star is **The Synthetic Architect**: a high-density, high-precision interface that blends the brutal efficiency of a CLI with the sophisticated depth of high-end editorial layouts.

We achieve this through **Intentional Asymmetry** and **Tonal Depth**. Instead of centering everything, we use a left-heavy, terminal-inspired alignment. We break the grid with overlapping "glass" modules and high-contrast monospace accents that make every data point feel like a line of sacred code. This is not a website; it is an environment.

---

## 2. Color Strategy & Surface Logic
The palette is rooted in deep obsidian tones, punctuated by high-energy neon violets and clinical grays.

### The "No-Line" Rule
**Strict Mandate:** Traditional 1px solid borders for sectioning are prohibited. Boundaries must be defined solely through background color shifts. To separate a sidebar from a main view, place a `surface-container-low` section against a `surface` background. The eye should perceive the change in depth, not a physical wire.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers of synthetic material.
- **Base Layer:** `surface` (#131313) – The infinite void.
- **De-emphasized Zones:** `surface-container-lowest` (#0E0E0E) – Inset areas like terminal wells or code blocks.
- **Active Modules:** `surface-container-high` (#2A2A2A) – Floating cards or active sidebars.

### The "Glass & Gradient" Rule
To elevate the "developer" look into a premium experience, use Glassmorphism for floating elements (Command Palettes, Popovers). 
- **Recipe:** `surface-container` at 70% opacity + 20px Backdrop Blur.
- **Signature Texture:** Apply a subtle linear gradient from `primary` (#D3BBFF) to `primary-container` (#6D28D9) at a 45-degree angle for primary CTAs and critical status indicators to provide a "glowing filament" effect.

---

## 3. Typography: The Monospace Dialectic
We use a dual-font strategy to balance legibility with a technical soul.

*   **Display & Headlines (Space Grotesk):** These are our "Architect" fonts. Large, geometric, and authoritative. Use `display-lg` (3.5rem) with tight letter spacing (-0.02em) for hero moments.
*   **Body & UI (Inter):** The "Workhorse." Used for long-form data and settings where legibility is paramount.
*   **The Accent (JetBrains Mono):** The "Signature." Used for labels, tags, code snippets, and small metadata. All `label-sm` tokens should default to JetBrains Mono to reinforce the terminal aesthetic.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not shadows.

*   **The Layering Principle:** Place a `surface-container-highest` card on a `surface-container-low` background to create a "lift" of +2 units.
*   **Ambient Shadows:** If a floating element (like a dropdown) requires a shadow, it must be ultra-diffused. 
    *   *Spec:* `0px 20px 40px rgba(0, 0, 0, 0.4)`. No hard edges.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` (#4A4455) at 15% opacity. It should be felt, not seen.
*   **Grid Pattern:** Overlay a subtle 24px square grid pattern (1px stroke, 5% opacity of `on-surface`) across `surface` backgrounds to mimic an engineering blueprint.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`). Sharp corners (`DEFAULT`: 0.25rem). Text is `on-primary-container`.
*   **Secondary:** No background. `Ghost Border` (15% opacity). JetBrains Mono text.
*   **State:** On hover, primary buttons should "glow" using a `primary` shadow at 20% opacity.

### Input Fields
*   **Styling:** Background is `surface-container-lowest`. Bottom-border only (2px) using `primary` when focused.
*   **Prompt:** Every input should be preceded by a `>` character in `primary` color to mimic a CLI.

### Cards & Lists
*   **Rule:** Forbid divider lines. Use `spacing-6` (1.3rem) of vertical white space to separate list items. 
*   **Selection:** An active list item should change its background to `surface-container-high` and add a 2px `primary` vertical "indicator" on the far left.

### Command Palette (Special Component)
A center-screen modal using the **Glassmorphism Spec**. Use `JetBrains Mono` for all text. High-density layout (12px padding between items). Use `primary` for the cursor/selection highlight.

---

## 6. Do’s and Don'ts

### Do
*   **Do** use extreme contrast for typography (White `on-surface` against `surface`).
*   **Do** use `JetBrains Mono` for any numerical data or timestamps.
*   **Do** embrace density. Developers prefer seeing more data at once over "breathable" empty space.
*   **Do** use `0.25rem` (4px) radius for almost everything. Roundness is for consumers; sharpness is for creators.

### Don't
*   **Don't** use 100% opaque borders. They clutter the clinical aesthetic.
*   **Don't** use standard "drop shadows." Use background color shifts.
*   **Don't** use "soft" colors like pastels. If it isn't Deep Charcoal, White, or Neon Violet, it doesn't belong.
*   **Don't** center-align long-form text. Keep it terminal-left.

---

## 7. Spacing Scale (High-Density)
*   **Micro (0.2rem - 0.4rem):** For internal component padding (labels inside chips).
*   **Standard (0.9rem):** For gutter spacing between cards.
*   **Macro (2.75rem - 5.5rem):** For section breaks. Use these large gaps to replace the need for divider lines.```