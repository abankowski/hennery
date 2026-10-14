from pathlib import Path
import tempfile
import unittest

import gate
import supply


class Supply(unittest.TestCase):
    def test_components_include_frontend_and_bundled_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            rust = root / 'rust'
            rust.mkdir()
            (rust / 'LICENSE').write_text('Rust licence')
            (rust / 'Cargo.toml').write_text('[package]\nname="dependency"')
            openssl = rust / 'openssl'
            openssl.mkdir()
            (openssl / 'LICENSE.txt').write_text('OpenSSL Apache-2.0')
            web = root / 'frontend'
            web.mkdir()
            (web / 'LICENSE').write_text('Frontend licence')
            (web / 'package.json').write_text('{"name":"frontend","version":"1.2.3","license":"MIT"}')
            cargo = {'packages': [{'name': 'dependency', 'version': '1.0.0', 'license': 'MIT', 'source': 'registry+https://crates.io',
                                   'manifest_path': str(rust / 'Cargo.toml')}], 'workspace_members': []}
            frontend = {'MIT': [{'name': 'frontend', 'version': '1.2.3', 'path': str(web)}]}
            components, notices, findings = supply.components(cargo, frontend)
            self.assertEqual({c['name'] for c in components}, {'dependency', 'frontend'})
            self.assertIn('Frontend licence', notices)
            self.assertIn('OpenSSL Apache-2.0', notices)
            self.assertEqual(findings, [])
            sbom = supply.spdx(components, 'a' * 40, 'test-target')
            self.assertEqual(sbom['spdxVersion'], 'SPDX-2.3')
            self.assertEqual(len(sbom['packages']), 2)
            (web / 'LICENSE').unlink()
            self.assertTrue(supply.components(cargo, frontend)[2])

    def test_source_and_runtime_digests(self):
        self.assertNotEqual(supply.tree_digest({'index.html': b'a'}), supply.tree_digest({'index.html': b'b'}))
        self.assertNotEqual(supply.tree_digest({'a': b'x'}), supply.tree_digest({'b': b'x'}))

    def test_checksum_inventory_is_complete_and_acyclic(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'payload').write_bytes(b'bytes')
            supply.checksums(root)
            self.assertEqual((root / 'sha256.sum').read_text(), gate.digest(b'bytes') + '  payload\n')
            supply.checksums(root)  # stable, never hashes itself
            self.assertNotIn('sha256.sum', (root / 'sha256.sum').read_text())
            (root / 'payload').write_bytes(b'changed')
            with self.assertRaises(gate.Refused):
                supply.verify_checksums(root)


if __name__ == '__main__':
    unittest.main()
