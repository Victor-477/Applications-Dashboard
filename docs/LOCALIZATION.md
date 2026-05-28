# Localization

English is the primary source language for Applications Dashboard.

Translations are maintained as direct equivalents of the English interface text. When new UI text is added, add the English entry first and then translate it.

## Supported Languages

| Code | Language |
| --- | --- |
| `en` | English |
| `pt` | Portuguese |
| `zh` | Chinese |
| `de` | German |
| `es` | Spanish |
| `ja` | Japanese |

## User Behavior

- The default language is English.
- The selected language is stored in `localStorage` as `app-dashboard-language`.
- The selected language is restored when the app is opened again.
- The app updates the document `lang` attribute for accessibility and browser tooling.

## Files

| File | Purpose |
| --- | --- |
| `src/i18n.ts` | Main interface translations and language selector options. |
| `src/i18n/patchTextTranslations.ts` | Translated Patch Files and project patch summary text. |
| `scripts/verify-i18n.cjs` | Automated smoke test for supported languages. |

## Adding a Language

1. Add the code to the `Language` type in `src/i18n.ts`.
2. Add a visible option to `languageOptions`.
3. Add translated form labels.
4. Add the translated main interface object.
5. Add patch text translations in `src/i18n/patchTextTranslations.ts`.
6. Add the language to `scripts/verify-i18n.cjs`.
7. Run the validation commands.

## Validation

Run:

```bash
npm run build
npx electron scripts\verify-i18n.cjs
```

The current i18n verification checks:

- English.
- Portuguese.
- Chinese.
- German.
- Spanish.
- Japanese.

## System Logs

System logs are intentionally stored and exported in English, regardless of the selected interface language. This keeps CSV, TXT, JSON, NDJSON, and LOG exports consistent for support and auditing.
