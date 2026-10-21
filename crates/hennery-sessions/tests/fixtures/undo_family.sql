-- Test-only rollback of sessions migration 25 before historical fixtures.
DROP TRIGGER attention_terminal_session;
DROP TRIGGER attention_terminal_insert;
DROP TRIGGER attention_terminal_update;
-- Test-only rollback of sessions migration 24 before historical fixtures.
ALTER TABLE sessions DROP COLUMN configuration_error;
ALTER TABLE session_attach_evidence DROP COLUMN config_updated_at;
ALTER TABLE session_attach_evidence DROP COLUMN config_checked;
-- Test-only rollback of sessions migration 23 before historical fixtures.
DROP TRIGGER family_view_title;
ALTER TABLE sessions DROP COLUMN agent_title;
ALTER TABLE sessions DROP COLUMN prompt_title;
ALTER TABLE sessions DROP COLUMN title_source;
-- Test-only rollback of sessions migration 22 before historical fixtures.
DROP TRIGGER idle_hold_session;
DROP TRIGGER idle_hold_family_insert;
DROP TRIGGER idle_hold_family_delete;
DROP TRIGGER idle_hold_notice_insert;
DROP TRIGGER idle_hold_notice_update;
DROP TRIGGER idle_hold_notice_delete;
DROP INDEX idle_hold_ready;
ALTER TABLE sessions DROP COLUMN idle_hold_dirty;
ALTER TABLE sessions DROP COLUMN idle_pinned;
DROP TRIGGER family_view_hat_frozen;
DROP TRIGGER family_view_notice_update;
DROP TABLE view_scope_invalidations;
-- Test-only rollback of sessions migration 21 for historical schema fixtures.
DROP TRIGGER family_view_attention_insert;
DROP TRIGGER family_view_attention_update;
DROP TRIGGER family_view_edge_insert;
DROP TRIGGER family_view_edge_update;
DROP TRIGGER family_view_edge_delete;
DROP TRIGGER family_view_operation_update;
DROP VIEW delegation_question_routing;
DROP TRIGGER family_view_session_state;
DROP TRIGGER family_view_pending_insert;
DROP TRIGGER family_view_pending_update;
DROP TRIGGER family_view_answer_insert;
DROP TRIGGER family_view_answer_delete;
DROP TRIGGER family_view_operation_insert;
DROP INDEX family_dirty_ready;
ALTER TABLE sessions DROP COLUMN family_dirty;
