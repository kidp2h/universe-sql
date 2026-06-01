# AI Development Rules

## UI/UX Consistency

* All UI changes must follow the existing system design and layout.
* Do not change the design language, spacing, typography, colors, or component structure unless explicitly requested.
* Reuse existing components, styles, and patterns whenever possible.
* Do not hardcode colors if the project already uses design tokens, CSS variables, or a theme system.
* All features and components must support both Light Mode and Dark Mode.

### Theme Requirements

* Verify all UI changes in both Light Mode and Dark Mode.
* Avoid contrast issues, invisible borders, unreadable text, or inaccessible color combinations.
* Use existing theme tokens, CSS variables, or design system primitives.
* Never introduce hardcoded theme-specific colors unless explicitly required.
* Any new UI component must automatically adapt to theme changes.

### When Adding New UI Components

* Follow existing layout and spacing conventions.
* Reuse existing UI primitives whenever possible.
* Ensure responsiveness and consistency with surrounding components.
* Validate appearance in both themes before considering the task complete.

---

## Internationalization (i18n)

* All user-facing text must support internationalization (i18n).
* Do not hardcode display strings directly inside components.
* Use the project's existing i18n infrastructure for all visible text.
* Every newly added text must provide translations for:

  * English (`en`)
  * Vietnamese (`vi`)

### Applies To

* Buttons
* Labels
* Tooltips
* Dialogs
* Modals
* Menus
* Notifications
* Toast messages
* Empty states
* Error messages
* Validation messages
* Table headers
* Placeholders
* Any user-visible text

### Requirements

* Reuse existing translation namespaces and patterns.
* If a new translation key is required:

  * Add the English translation.
  * Add the Vietnamese translation.
  * Keep translation files synchronized.

Avoid:

```tsx
<Button>Save</Button>
```

Prefer:

```tsx
<Button>{t("common.save")}</Button>
```

Avoid:

```tsx
toast.success("Query executed successfully");
```

Prefer:

```tsx
toast.success(t("query.executeSuccess"));
```

### Validation

* No newly added user-facing text may be hardcoded.
* Missing translations should be treated as incomplete work.
* Any PR introducing user-facing text without i18n support should be considered incomplete.

---

## File Structure & Maintainability

* Avoid creating overly large files.
* If a file becomes too large or contains multiple responsibilities, split it into smaller modules.
* Prefer separation of concerns over putting everything into a single file.
* Reusable logic should be extracted into shared utilities, hooks, or services.
* Large UI sections should be separated into smaller components.
* Keep files readable, maintainable, and easy to navigate.

### Recommended Guidelines

* Components should have a single responsibility.
* Avoid massive pages with excessive inline logic.
* Extract when appropriate:

  * Hooks
  * Utilities
  * Constants
  * Types
  * API logic
  * Reusable UI components
  * Feature-specific business logic

### Folder Organization

Prefer feature-oriented structures when possible.

Example:

```text
feature/
├─ components/
├─ hooks/
├─ services/
├─ types/
├─ constants/
└─ utils/
```

---

## Code Quality

After implementation is complete, run:

```bash
bun run lint
```

### Requirements

* All Biome warnings must be fixed.
* All Biome errors must be fixed.
* Do not ignore warnings or errors.
* Do not disable lint rules unless absolutely necessary and justified.
* Do not finalize code with unresolved linting issues.

### Formatting

If formatting is required, run:

```bash
bun run format
```

or:

```bash
biome check --write .
```

---

## Build Verification

After linting succeeds, run:

```bash
bun run build
```

### Requirements

* All build errors must be fixed.
* Do not consider the task complete until the build succeeds.
* Ensure new changes do not break existing functionality.
* Verify generated bundles compile successfully.

---

## Testing Expectations

When modifying existing functionality:

* Verify that existing behavior remains intact.
* Avoid regressions.
* Ensure edge cases are handled.
* Validate both Light Mode and Dark Mode.
* Validate both English and Vietnamese translations.

When adding new functionality:

* Verify user flows manually.
* Verify loading, empty, success, and error states.
* Ensure accessibility is not degraded.

---

## Dependency Management

* Do not introduce new dependencies unless truly necessary.
* Prefer existing project libraries and utilities.
* Justify any new dependency before adding it.
* Avoid duplicate libraries that solve the same problem.

---

## Performance Considerations

* Avoid unnecessary re-renders.
* Memoize expensive computations when appropriate.
* Avoid large component trees with excessive state propagation.
* Lazy-load large features when possible.
* Do not sacrifice maintainability for premature optimization.

---

## Final Checklist

Before completing any task, verify:

* [ ] UI matches the existing design system
* [ ] Existing UX patterns were preserved
* [ ] Light Mode is fully supported
* [ ] Dark Mode is fully supported
* [ ] All user-facing text supports i18n
* [ ] English translations were added
* [ ] Vietnamese translations were added
* [ ] No hardcoded user-facing text
* [ ] No Biome warnings
* [ ] No Biome errors
* [ ] Code formatting is correct
* [ ] Large files were properly refactored if necessary
* [ ] No unnecessary dependencies were added
* [ ] `bun run build` completes successfully
* [ ] No obvious runtime issues
* [ ] Existing functionality was not broken

---

## Additional Notes

* Prioritize maintainability and consistency over unnecessary rewrites.
* Avoid duplicated logic.
* Prefer type safety.
* Follow existing architectural patterns.
* Reuse existing components before creating new ones.
* Keep code easy to understand for future contributors.
* When uncertain, choose the solution most consistent with the current codebase.
