# Antigravity Project – Coding Rules & Standards

## Document Purpose
This file dictates the strict coding conventions, architectural boundaries, and UI/UX standards for the Antigravity application. All developers and AI agents must adhere to these rules to ensure a premium, maintainable, and stable codebase.

---

## 1. No Monolithic Files
Files must be strictly modular and focused on a single responsibility. Giant, monolithic files are strictly prohibited.

*   **Single Responsibility Principle:** A file should handle only UI, only business logic, or only data fetching—never all three.
*   **Size Limits:** If a class or file exceeds 300-400 lines, it must be refactored into smaller, reusable components or helper classes.
*   **Separation of Concerns:** Keep your layout definitions, data models, and logic execution completely separate.

---

## 2. Premium UI/UX (No Generic AI Screens)
The application must look and feel like a top-tier, premium brand. Generic, out-of-the-box UI templates or basic "AI-generated" wireframe looks are unacceptable.

*   **Attention to Detail:** Use exact padding, margins, and safe-area insets. Whitespace should be deliberate and breathable.
*   **Typography & Colors:** Adhere strictly to the brand's established color palette and typography scale. Avoid default system fonts unless specifically styled.
*   **Feedback & Animations:** Use subtle, smooth transitions and micro-interactions (e.g., ripple effects, loading skeletons, smooth state transitions) rather than jarring, instant view swaps.
*   **High-Fidelity Components:** Buttons, cards, and inputs must have proper corner radii, appropriate elevation/shadows, and clear active/disabled states.

---

## 3. Screen & Activity Management
Every major view in the application must be treated as a distinct Activity or independent screen container.

*   **Strict Isolation:** Each screen must be completely self-contained. State from one Activity should not bleed into another unless explicitly passed via safe routing arguments or a shared state manager.
*   **Lifecycle Awareness:** Screens must properly handle creation, pausing, resuming, and destruction without leaking memory or crashing.
*   **Routing:** Navigation between screens must be explicit, trackable, and follow standard back-stack management principles.

---

## 4. Clean Folder Architecture & Repository Guidelines
The project must maintain a highly organized, predictable directory structure. Do not dump files into a single root directory. 

*   **Frontend & Backend Separation:** Maintain strictly separate folders for the frontend and backend, with each folder implementing its own clean, modular architecture.
*   **Documentation Discipline:** Do not generate useless `.md` files or redundant documentation in the repository.
*   **Structural Pattern (within the respective frontend/backend layers):**
    *   `activities/` — Contains all isolated screen controllers.
    *   `components/` — Reusable, high-fidelity UI elements (custom buttons, cards, dialogs).
    *   `models/` — Data structures, entities, and payloads.
    *   `services/` — API calls, database operations, and background tasks.
    *   `utils/` — Helper functions, bitwise operations, and shared math/formatting logic.
    *   `assets/` — Fonts, premium iconography, and media.

---

## 5. Do Not Disturb Working Files
Stability is paramount. Existing, tested, and working code must be protected during new feature development.

*   **Additive Development:** When adding new features, create new files, activities, or services rather than heavily modifying existing ones.
*   **Safe Extensions:** If a working file must be updated, use extension functions, inheritance, or dependency injection to add functionality without rewriting the core logic.
*   **Zero Regression:** Before modifying any core utility or shared component, verify that the change will not break other screens relying on it. If in doubt, duplicate and isolate the new logic.