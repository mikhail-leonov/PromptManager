# Prompt Templates Library

A private, browser-based library for reusable AI prompt templates. Organize templates in a nested folder tree, drag and drop to rearrange them, and fill in a `{{text}}` placeholder with your own input to produce a finished prompt you can copy in one click.

It's a single static page built on Bootstrap 5 with vanilla JavaScript — no build step and no backend. Your templates are stored locally in the browser and moved around with JSON export/import. The interface ships in English and Russian.

---

## Features

- **Template library** — create, edit, and delete named prompt templates, each with a body.
- **`{{text}}` placeholder** — type into the "Your text" box and every `{{text}}` in the selected template is replaced live, with the substitution highlighted in the preview. One click copies the rendered result to the clipboard.
- **Nested folders** — group templates into folders and subfolders to any depth. Folders collapse/expand, and deleting a folder moves its contents up to the parent rather than discarding them.
- **Drag & drop** — move templates and folders between folders, reorder templates (drop above or below a sibling), or drop onto empty space to send something back to the root. Dropping a folder into itself or one of its own descendants is blocked.
- **Import & export** — export the whole library (folders + templates) to a JSON file, and import to merge another library in. Import remaps incoming IDs to avoid collisions and understands older export shapes.
- **Localized interface** — switch language from the navbar; English and Russian are included.

---

## Getting started

The app is static. Serving it over HTTP is recommended (the clipboard copy and `localStorage` are most reliable in a normal browser context):

Click the **New template** button in the sidebar, give it a name and a body containing `{{text}}` wherever your input should go, and save. Select the template, type into **Your text**, and the **Result** panel shows the finished prompt with a **Copy** button.

> Your library is saved in this browser's `localStorage`. Persistence is best-effort — a sandboxed preview or restricted context may block storage, in which case the app still runs but won't remember data between reloads. Use **Export JSON** to keep a backup.

---

## How a template works

A template body is plain text with one special token:

```
Summarize the following in three bullet points:

{{text}}
```

Whatever you type into **Your text** is substituted for every `{{text}}` occurrence. In the preview, an empty input shows `{{text}}` as a placeholder; once you type, the inserted value is highlighted so you can see exactly what will be sent. **Copy** puts the fully rendered text on your clipboard.

---

## Data & storage

State is kept in `localStorage` under three keys:

| Key | Contents |
|-----|----------|
| `prompt_templates_v1` | Templates — `{ id, name, body, folderId }` |
| `prompt_template_folders_v1` | Folders — `{ id, name, parentId, collapsed }` |
| `prompt_templates_lang_v1` | Selected interface language |

On load, an older flat format (folders stored as plain name strings, templates carrying a `folder` name) is automatically migrated to the nested model (folder objects plus `folderId` references).

Export produces `prompt-templates.json`:

```json
{
  "folders": [
    { "id": "…", "name": "Writing", "parentId": null, "collapsed": false }
  ],
  "templates": [
    { "id": "…", "name": "Summarize", "body": "Summarize:\n\n{{text}}", "folderId": "…" }
  ]
}
```

Import also accepts a bare array of templates and the older string-folder / `template.folder` shapes.

---

## Project structure

```
index.html                 App shell: navbar, sidebar tree, editor panel, template modal
public/
  css/
    bootstrap/bootstrap.min.css  Bootstrap 5 base
    app.css                      Warm "heritage" theme (Bootstrap variable overrides) + tree/drag-drop styles
  icons/
    common/bootstrap-icons.css   Bootstrap Icons
  fonts/
    common/fraunces.css          Fraunces display font (used for the brand wordmark)
  js/
    bootstrap/bootstrap.min.js   Bootstrap behaviour (modal)
    lng/
      en.js                      English pack — self-registers into window.AppLang
      ru.js                      Russian pack
    app.js                       Application logic (loads last)
```

`index.html` loads Bootstrap, then the language packs, then `app.js`. App functions are intentionally global so the inline `onclick` handlers in the markup keep working. Static text uses `data-i18n` (plus `data-i18n-html`, `data-i18n-ph`, `data-i18n-title` for HTML content, placeholders, and titles), resolved against the active pack via a `t(key, vars)` helper with `{placeholder}` interpolation and English fallback.

---

## Adding an interface language

1. Copy `public/js/lng/en.js` to `public/js/lng/<code>.js`.
2. Change the registration code (`L.register('<code>', { name:'…', dir:'ltr' }, { … })`) and translate the values.
3. Add a `<script src="public/js/lng/<code>.js">` tag in `index.html`, before `app.js`.

The new language appears in the navbar selector automatically; the initial language is chosen from your saved preference, then the browser language, then English.

---

## Browser support

A current desktop or mobile browser. Requires the bundled Bootstrap 5 and Bootstrap Icons (included under `public/`, so no internet connection is needed). The one-click copy uses the Clipboard API.

---

## Privacy

There is no backend. Your templates live only in your own browser and are never uploaded. Use **Export JSON** to back them up or move them to another machine.
