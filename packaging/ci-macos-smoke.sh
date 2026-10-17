#!/bin/sh
# Exercise native service/path handling and actual CLI process startup/teardown.
# Each existing test supplies its own disposable HOME/data and first-exec warmup.
set -eu
cargo build -p hennery -p hennery-testkit --bins --locked
cargo test -p hennery --bin hennery service:: --locked
cargo test -p hennery-host --lib paths:: --locked
for test in help_lists_the_skeleton_commands up_pairs_its_own_host_once sigint_to_ups_process_group_still_shuts_down_cleanly; do
    cargo test -p hennery --test cli "$test" --locked -- --exact
done
