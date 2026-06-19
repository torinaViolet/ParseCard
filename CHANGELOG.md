# Changelog

## Unreleased

## 2.0.2 - 2026-06-19

- Support SillyTavern `ccv3` PNG metadata, preferring `ccv3` over `chara` when reading.
- Remove stale `chara` and `ccv3` chunks when writing PNG metadata, then write fresh `chara` and `ccv3` chunks.
- Preserve unknown `data` fields, `data.group_only_greetings`, and unknown `data.extensions` fields during character card round-trips.
- Preserve standalone and embedded world book metadata, book-level extensions, entry extensions, and unknown world book fields during round-trips.
- Add `OpenAIPreset` prompt CRUD helpers, default SillyTavern built-in prompt entries/order, common setting getters/setters, and Node.js load/save helpers for OpenAI/Chat Completion presets.

## 2.0.1 - 2026-06-11

- Support 10-digit Unix seconds as numbers and numeric strings.
- Support 13-digit Unix milliseconds as numbers and numeric strings.
- Restore compatibility with the historical `"{seconds}Z"` timestamp format.
- Preserve the existing current-time fallback for invalid timestamps.
- Add timestamp normalization and CharacterCard round-trip coverage.

## 2.0.0

- Initial open source release.
