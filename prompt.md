Build a **client-side AI Prompt Templates Library** as a static web app — no backend, no build step. Plain HTML + Bootstrap 5 + Bootstrap Icons + vanilla JavaScript, with all data persisted in `localStorage`. The app lets users organize reusable prompt templates in a nested folder tree, fill a `{{text}}` placeholder with their own input, and copy the result.

## Tech & file layout
```
index.html
public/css/app.css            # custom theme
public/js/app.js              # all app logic
public/js/lng/en.js           # English language pack
public/js/lng/ru.js           # Russian language pack
(plus local Bootstrap CSS/JS, Bootstrap Icons, and a Fraunces webfont)
```
Load order in `index.html`: Bootstrap JS, then each language pack, then `app.js`. App logic functions are **global** so inline `onclick=""` handlers in the HTML work.

## Data model & persistence
- `templates`: `{ id, name, body, folderId }`
- `folders`: `{ id, name, parentId, collapsed }`
- Store in localStorage under versioned keys (`prompt_templates_v1`, `prompt_template_folders_v1`, `prompt_templates_lang_v1`).
- `uid()` = base36 timestamp + 4 random chars.
- **Migration**: on load, upgrade an old flat model (folders as plain name strings, templates carrying a `.folder` name) into the nested model (folder objects with `parentId`, templates with `folderId`), mapping folder names to new ids, then re-save.

## Layout (Bootstrap)
- **Navbar**: serif wordmark "prompt.templates" on the left; a small language `<select>` on the right.
- **Left sidebar** (width 25%, min 200px, max 340px): a header row reading "Templates (count)" plus a toolbar of icon buttons — Export JSON, Import JSON, New Folder, New Template — and a hidden `<input type="file" accept=".json">`. Below it, a scrollable tree container `#templateList`.
- **Main panel** (a card): a "Your text" section with a single-line input and a `{{text}}` badge; a "Result" section with a copy button + transient "Copied" note; and an output box (`#outputBox`) that's monospace, pre-wrap, min-height ~80px.
- **Modal** (`#tplModal`): title (New/Edit), fields for template Name, Folder (`<select>`), and Body (textarea, monospace, 6 rows); Cancel + Save in the footer.

## Tree rendering
- Recursively render folders then templates at each level, indenting `8 + depth*18` px via `padding-left`.
- Folder rows: chevron (down/right by `collapsed`), folder icon, name, and hover-revealed action buttons (New Subfolder, Rename, Delete). Clicking the row toggles collapse.
- Template rows: file icon, name, hover actions (Edit, Delete). Clicking selects the template (highlight selected row).
- When there are no templates, show a centered "No templates yet" message.
- Row action buttons must `event.stopPropagation()` so they don't trigger row click. Make `.row-actions` visible by default on touch devices (`@media (hover:none)`).

## Folder operations
- **Create**: prompt for a name; reject blank; reject a duplicate name among siblings (case-insensitive) with an alert; expand the parent.
- **Rename**: prompt pre-filled with current name.
- **Delete**: confirm (message includes folder name); reparent its child folders and templates to the deleted folder's parent (contents move up, not destroyed).
- **Toggle**: flip `collapsed`.
All operations `save()` then `render()`.

## Drag & drop (HTML5 DnD on `#templateList`)
- Rows are `draggable`. Track the dragged item as `{type:'template'|'folder', id}`.
- **dragover**: clear old indicators, then — over a folder row, show a "drop-into" highlight (unless invalid); over a template row, show "drop-before" or "drop-after" based on whether the cursor is in the top or bottom half; over empty area, highlight the root container.
- **drop**:
  - onto a folder → move the dragged template/folder *into* that folder;
  - onto a template, dragging a template → reorder before/after that template (and adopt its `folderId`);
  - onto a template, dragging a folder → move the folder into that template's folder;
  - onto empty area → move to root.
- **Invalid moves**: a folder cannot be dropped into itself or into one of its own descendants (write an `isAncestor` helper).
- Use `.dragging` (0.4 opacity) on the source and inset box-shadow indicators for into/before/after.

## Output / substitution
- Selecting a template renders its body into `#outputBox`, replacing every `{{text}}` with the user's input.
- In the live preview, escape HTML, and wrap the substituted text in a highlighted `<mark>`; if input is empty, show `{{text}}` greyed out.
- Store the raw (unescaped, substituted) string on a data attribute; the Copy button writes it to the clipboard via `navigator.clipboard` and briefly shows "Copied". Hide the copy button when no template is selected.

## Modal (add/edit)
- "New" clears fields; "Edit" pre-fills from the template.
- The Folder select lists "Root" plus every folder, indented to reflect depth (e.g. `└ ` prefixes).
- Save: trim name and body, require both (alert if missing), then create or update and refresh. Use the Bootstrap Modal JS API.

## Import / export
- **Export**: download `prompt-templates.json` containing `{ folders, templates }` (pretty-printed).
- **Import**: read the JSON; accept either `{folders, templates}` or a bare templates array; remap all incoming folder ids to fresh ones to avoid collisions; support legacy string-folders and templates referencing a folder by name; **append** to existing data (don't replace). Alert on invalid JSON. Reset the file input afterward.

## Internationalization
- Each language pack is an IIFE that self-registers into `window.AppLang` via `register(code, meta, dict)`, where `meta = { name, dir }`. Maintain an `order` array of codes.
- A `t(key, vars)` function looks up the current language, falls back to English, then to the raw key, and interpolates `{var}` placeholders.
- Apply translations to the static DOM via attributes: `data-i18n` (textContent), `data-i18n-html` (innerHTML), `data-i18n-ph` (placeholder), `data-i18n-title` (title).
- Build the language `<select>` from the registry; on change, persist the choice, set `<html lang>` and `dir`, re-apply static i18n, re-render the tree and output, and update any open modal title.
- **Initial language**: saved choice → browser language (`navigator.language` first two letters) → English → first available.
- Provide **en** and **ru** packs covering all UI strings (sidebar labels, row-action titles, "Your text"/"Result"/Copy/Copied, output placeholder, modal labels and Root, plus all prompt/confirm/alert messages such as duplicate-folder, delete-folder `{name}`, fill-both, delete-template, invalid-import).

## Theme (app.css)
A warm "heritage" look layered over Bootstrap by overriding its CSS variables. Palette: warm paper background (#f3eee2), deep brick accent (#6e2b26) for primary/links/brand, brass (#927339) for focus rings and warnings, muted browns for text and borders. Map these onto `--bs-*` tokens (body bg/color, primary + subtle variants, links, warning subtle, borders). Fonts: Fraunces serif for the brand wordmark, Inter for sans body, IBM Plex Mono for code/output. Theme the tree rows, drag indicators, and hover-revealed row actions using the Bootstrap variables.

## Init
On `DOMContentLoaded`: pick initial language, set `<html lang>`, build the language switcher, apply static i18n, load + migrate data, render the tree, wire up drag-and-drop, and instantiate the Bootstrap modal.