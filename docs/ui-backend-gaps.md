# UI backend gaps

- Session naming: covered by `PATCH /api/sessions/{id}` with `{title: string | null}` and
  `title_source` (`agent`, `operator`, `prompt`) on session items, summaries and family links.
  Operator titles persist across agent updates; null restores the latest agent title or
  the first delivered prompt's first line. Prompt titles are provisional.

Generated with Claude AI — please review before distribution.
