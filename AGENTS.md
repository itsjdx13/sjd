# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains a single content area:

- `majed/notes.txt`: the primary collection of personal, finance, and trading notes.
- `AGENTS.md`: contributor instructions for maintaining the repository.

Keep related notes under `majed/`. If the collection grows, split content into clearly named topic files such as `majed/trading-indicators.md` or `majed/mindset.md`; avoid adding unrelated files at the repository root. Create `assets/` only when notes need referenced images or documents.

## Build, Test, and Development Commands

There is currently no application, package manifest, build system, or automated test suite. Use lightweight checks when editing:

```powershell
rg --files
rg "MACD" majed/notes.txt
Get-Content -LiteralPath majed/notes.txt -TotalCount 20
```

`rg --files` reviews the repository contents, `rg` locates terms without modifying the source, and `Get-Content` performs a quick readability check. If executable code is added later, document its setup, run, lint, and test commands here in the same change.

## Content Style & Naming Conventions

Use UTF-8 for new text files. The existing notes include Persian and English text and may contain legacy encoding artifacts; do not run bulk encoding conversion or automatic cleanup without reviewing the diff. Prefer Markdown for newly structured notes, lowercase descriptive filenames, and hyphens between words. Keep headings short, use one topic per section, and preserve original quotations or terminology when reorganizing source material.

## Testing Guidelines

No testing framework or coverage requirement is configured. Before submitting a content change, inspect the diff, confirm non-Latin text remains readable, verify links and paths, and search for accidental duplicate or truncated sections. Any future code should include tests in a conventional `tests/` directory or beside source files, following the framework's standard naming pattern.

## Commit & Pull Request Guidelines

Git history is not available in this workspace, so no existing commit convention can be inferred. Use concise, imperative commit subjects, optionally with a Conventional Commit prefix, for example `docs: organize trading indicator notes`.

Pull requests should explain the purpose and scope, identify renamed or split files, and note any encoding changes. Link relevant issues when available. Include screenshots only for rendered documents or other visual changes.
