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
