# 🥯 The Bagel
**The Ultimate Mobile-First Radial Menu for the Web**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A high-performance, accessible, and framework-agnostic radial menu engine. Built for "Glide" interactions, precise selection, and 60 FPS rendering on mobile devices.

---

## 🚀 Features

- **Mobile First**: Designed for thumb interaction with a "Dead Zone" to prevent accidental clicks.
- **High Performance**: Uses HTML5 Canvas with Path2D caching and dirty-check rendering loops.
- **Framework Agnostic**: Core logic is separate from UI. Includes React and Web Component wrappers.
- **Accessibility**: Mirrors state to a hidden DOM tree for Screen Readers.
- **Theming**: Full CSS Variable support for instant Dark Mode / Theming without re-renders.

## 📦 Installation

```bash
npm install @your-repo/bagel
```

## 💻 Usage (React)

```tsx
import { BagelMenu } from '@your-repo/bagel';

const MyComponent = () => {
  return (
    <BagelMenu
      isOpen={true}
      items={[
        { id: '1', label: 'Home', action: () => nav('/') },
        { id: '2', label: 'Settings', children: [
            { id: '2a', label: 'Profile' },
            { id: '2b', label: 'Logout' }
        ]}
      ]}
      onSelect={(path) => console.log(path)}
    />
  );
};
```

---

## 📐 The "Glide" Mathematics

The core innovation of The Bagel is the **Glide Interaction Model**. Unlike traditional menus that require precise clicks, Bagel allows users to "swipe" through rings.

### 1. Polar Coordinate Conversion
We convert every pointer event $(x, y)$ relative to the menu center into Polar Coordinates $(r, \theta)$:

$$ r = \sqrt{x^2 + y^2} $$
$$ \theta = \operatorname{atan2}(y, x) $$

*Note: $\theta$ is normalized to $[0, 2\pi]$ to simplify logic.*

### 2. Depth Resolution
The "Ring Index" (Depth) is determined by the radius $r$:

$$ \text{Depth} = \lfloor \frac{r - \text{innerRadius}}{\text{ringWidth}} \rfloor $$

If $r < \text{innerRadius}$, we are in the **Dead Zone** (Depth -1).

### 3. Iterative Path Finding
To handle high-speed movements ("flicks"), we solve the active path iteratively from the root outwards at every frame. This prevents "stale state" where the child ring calculation relies on an outdated parent selection.

For each depth $d$ from 0 to $\text{TargetDepth}$:
1. Get the list of items for the current branch.
2. Calculate the slice index based on $\theta$:
   $$ \text{Index} = \lfloor \frac{\theta - \text{startAngle}}{\text{SliceAngle}} \rfloor \pmod{\text{Count}} $$
3. If that item has children, it becomes the parent for depth $d+1$.

This ensures that even if you swipe diagonally across the menu in 16ms, the selection logic remains mathematically precise.

---

## 🔧 Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `innerRadius` | number | 50 | Radius of the center "Dead Zone" in pixels. |
| `ringWidth` | number | 60 | Width of each concentric ring. |
| `gap` | number | 0 | Visual gap between slices (approximate pixels). |
| `startAngle` | number | $-\pi/2$ | Rotation offset (Default: 12 o'clock). |

## 🎨 Theming

The renderer reads CSS variables from the container.

```css
.bagel-menu-overlay {
  --bagel-bg-active: rgba(100, 149, 237, 0.8);
  --bagel-bg-inactive: rgba(50, 50, 50, 0.6);
  --bagel-text-color: #ffffff;
  --bagel-glow-color: rgba(100, 149, 237, 0.6);
  --bagel-font-family: sans-serif;
}
```

---

## 📄 License

MIT © 2024

