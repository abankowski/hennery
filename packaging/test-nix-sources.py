#!/usr/bin/env python3
"""Negative and positive coverage tests for the Nix input audit."""
import importlib.util
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('audit', pathlib.Path(__file__).with_name('check-nix-sources.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class SourceInputs(unittest.TestCase):
    def test_symlinked_source_root_is_canonicalized(self):
        # macOS also aliases /tmp and the default TMPDIR through /private.
        # An explicit alias reproduces that layout on Linux as well.
        with tempfile.TemporaryDirectory(dir='/tmp') as directory:
            root = pathlib.Path(directory) / 'root'
            alias = pathlib.Path(directory) / 'root-alias'
            filtered = pathlib.Path(directory) / 'filtered'
            filtered_alias = pathlib.Path(directory) / 'filtered-alias'
            (root / 'crates/example/src').mkdir(parents=True)
            (filtered / 'crates/example').mkdir(parents=True)
            alias.symlink_to(root, target_is_directory=True)
            filtered_alias.symlink_to(filtered, target_is_directory=True)
            source = pathlib.Path('crates/example/schema.sql')
            (root / 'crates/example/src/lib.rs').write_text('include_str!("../schema.sql");')
            (root / source).write_text('SELECT 1;')
            (filtered / source).write_text('SELECT 1;')
            self.assertEqual(audit.required_paths(alias), {source})
            audit.check(alias, filtered_alias)

    def test_include_symlink_escape_is_rejected_with_aliased_root(self):
        with tempfile.TemporaryDirectory(dir='/tmp') as directory:
            root = pathlib.Path(directory) / 'root'
            alias = pathlib.Path(directory) / 'root-alias'
            (root / 'crates/example/src').mkdir(parents=True)
            alias.symlink_to(root, target_is_directory=True)
            outside = pathlib.Path(directory) / 'outside.sql'
            outside.write_text('SELECT 1;')
            (root / 'crates/example/escape.sql').symlink_to(outside)
            for macro in ('include_str', 'include_bytes'):
                (root / 'crates/example/src/lib.rs').write_text(f'{macro}!("../escape.sql");')
                for source_root in (root, alias):
                    with self.subTest(macro=macro, root=source_root):
                        with self.assertRaisesRegex(ValueError, 'include outside source root'):
                            audit.required_paths(source_root)

    def test_omitted_include_and_runtime_fixture_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory) / 'root'
            filtered = pathlib.Path(directory) / 'filtered'
            (root / 'crates/example/src').mkdir(parents=True)
            (root / 'crates/example/tests/fixtures').mkdir(parents=True)
            (root / 'crates/example/src/lib.rs').write_text('const X: &str = include_str!("../schema.sql");\nconst B: &[u8] = include_bytes!(r#"../schema.sql"#);')
            (root / 'crates/example/schema.sql').write_text('SELECT 1;')
            fixture = pathlib.Path('crates/example/tests/fixtures/runtime.json')
            (root / fixture).write_text('{}')
            with self.assertRaisesRegex(ValueError, 'schema.sql'):
                audit.check(root, filtered)
            (filtered / 'crates/example').mkdir(parents=True)
            (filtered / 'crates/example/schema.sql').write_text('SELECT 1;')
            with self.assertRaisesRegex(ValueError, 'runtime.json'):
                audit.check(root, filtered)
            (filtered / fixture).parent.mkdir(parents=True)
            (filtered / fixture).write_text('{}')
            audit.check(root, filtered)

    def test_source_snippets_comments_and_generated_includes_are_opaque(self):
        stream = audit.tokens('/* nested /* include_str!("missing") */ comment */\n// include_bytes!("missing")\nlet generated = "include_bytes!({file:?})"; let raw = r##"include_str!(\"missing\")"##;')
        self.assertNotIn(('word', 'include_str'), stream)
        self.assertNotIn(('word', 'include_bytes'), stream)

    def test_unknown_include_expression_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / 'crates/example/src').mkdir(parents=True)
            (root / 'crates/example/src/lib.rs').write_text('include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/data"))')
            with self.assertRaisesRegex(ValueError, 'unsupported include expression'):
                audit.required_paths(root)


if __name__ == '__main__':
    unittest.main()
