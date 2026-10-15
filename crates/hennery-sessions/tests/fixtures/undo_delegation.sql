-- Test-only rollback of migration 18 before reconstructing a historical schema.
-- Production migrations remain append-only.
DROP TRIGGER delegation_child_identity;
DROP TRIGGER delegation_child_immutable;
DROP TRIGGER delegation_endpoint_end;
DROP TRIGGER delegation_family_end;
DROP TRIGGER delegation_grant_end;
DROP TRIGGER delegation_answer_endpoint_end;
DROP TRIGGER delegation_answer_grant_end;
DROP TRIGGER delegation_config_invalidated;
DROP TABLE session_dispatch_queue;
DROP TABLE session_operations;
DROP TABLE session_attach_evidence;
DROP TABLE delegation_start_budgets;
DROP TABLE delegation_execution_policy;
ALTER TABLE sessions DROP COLUMN delegated_child;
ALTER TABLE turns DROP COLUMN input_origin;
ALTER TABLE answer_queue DROP COLUMN input_origin;
ALTER TABLE answer_queue DROP COLUMN delegation_handoff;
