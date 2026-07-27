---
name: Botimi
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#464554'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  max-width: 1440px
---

## Brand & Style
The design system for Botimi is built on a foundation of **High-Contrast Minimalism** fused with **Corporate Modern** sensibilities. It prioritizes clarity, precision, and an air of professional reliability. The target audience is sophisticated users who require high-density information processed through a calm, unobtrusive interface.

The aesthetic is defined by vast white space, razor-sharp typography, and a "function-first" hierarchy. By utilizing a pristine white foundation with structural slate accents, the UI evokes a sense of organized efficiency and modern intelligence.

## Colors
The palette is engineered for maximum legibility and structural depth without relying on heavy shadows. 

- **Primary (#6366F1):** Reserved strictly for primary call-to-actions, active states, and critical brand touchpoints.
- **Surface Foundation:** The base layer is pure `#FFFFFF`. Depth is created using a tiered system of cool grays (`#F8FAFC` for large background areas, `#F1F5F9` for nested containers).
- **Typography:** Headlines utilize `#0F172A` (Deep Charcoal) to provide a heavy visual anchor, while body text uses `#475569` (Slate) to reduce eye strain during long-form reading.

## Typography
The typographic system uses a tri-font strategy to balance character with utility. 

**Hanken Grotesk** is used for headings to provide a sharp, contemporary edge. **Inter** handles all body copy and UI elements for its unmatched readability and neutral tone. **JetBrains Mono** is employed for labels, data points, and technical metadata to reinforce the precise, bot-driven nature of the platform.

Maintain strict adherence to the defined line heights to ensure the "airy" feel of the light theme is preserved even in text-heavy views.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model for desktop and a **Fluid** model for mobile devices. 

- **Desktop:** 12-column grid with a 1440px max-width, 24px gutters, and 40px side margins.
- **Tablet:** 8-column grid with 16px gutters and 24px margins.
- **Mobile:** 4-column grid with 16px gutters and 16px margins.

Spacing follows a strict 4px (0.25rem) base unit. Use larger "xl" spacing between distinct sections to maintain the minimalist, high-contrast aesthetic and prevent the UI from feeling cluttered.

## Elevation & Depth
Elevation in this design system is primarily achieved through **Tonal Layering** and **Low-Contrast Outlines** rather than aggressive shadows. 

1.  **Level 0 (Base):** `#FFFFFF` (Main background).
2.  **Level 1 (Cards/Sections):** `#F8FAFC` background with a 1px border of `#E2E8F0`.
3.  **Level 2 (Popovers/Dropdowns):** `#FFFFFF` with a very soft ambient shadow (0px 4px 20px rgba(15, 23, 42, 0.05)) and a `#E2E8F0` border.

Avoid using shadows on buttons or primary containers; rely on the subtle gray backgrounds and crisp borders to define boundaries.

## Shapes
The shape language is "Soft" (0.25rem base), leaning into a professional and architectural feel. 

- Small components (Buttons, Inputs, Chips) use a **0.25rem (4px)** radius.
- Medium components (Cards, Modals) use a **0.5rem (8px)** radius.
- Large containers use a **0.75rem (12px)** radius.

This subtle rounding balances the high-contrast "sharpness" of the colors and typography, making the interface feel modern and approachable without becoming overly "bubbly."

## Components
- **Buttons:** Primary buttons use a solid `#6366F1` fill with white text. Secondary buttons use a `#F1F5F9` fill with `#0F172A` text. Text is always uppercase or semi-bold for clarity.
- **Input Fields:** Use a `#FFFFFF` background with a 1px `#E2E8F0` border. On focus, the border transitions to `#6366F1` with a subtle 2px outer glow of the same color at 10% opacity.
- **Chips:** Small, pill-shaped indicators using `#F1F5F9` background and `#475569` text. Active chips transition to the primary indigo.
- **Cards:** Use the Level 1 elevation (Slate-50 background, Slate-200 border). No shadow is applied to cards to maintain a "flat" architectural look.
- **Lists:** Items are separated by 1px horizontal rules (`#F1F5F9`). Hover states should use a subtle shift to `#F8FAFC`.
- **Data Tables:** High-density layouts should use JetBrains Mono for numeric values to ensure column alignment and a technical "pro" feel.