from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import contextlib
import io
import tarfile

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
            frontend = {'MIT': [{'name': 'frontend', 'versions': ['1.2.3'], 'paths': [str(web)]}]}
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

    def test_missing_each_channel_payload_refuses(self):
        for channels, tag in [(['github'], 'v0.1.0-alpha.1'), (['crates', 'github'], 'v0.1.0'), (['ghcr', 'github'], 'v0.1.0')]:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                targets = ['aarch64-apple-darwin']
                for name in supply.required_payloads(channels, targets, tag):
                    (root / name).write_bytes(b'fixture')
                supply.require_contract(root, channels, targets, tag)
                for path in root.iterdir():
                    path.unlink()
                    with self.subTest(channel=channels, missing=path.name), self.assertRaises(gate.Refused):
                        supply.require_contract(root, channels, targets, tag)
                    path.write_bytes(b'fixture')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in supply.required_payloads(['crates'], targets, 'v0.1.0-alpha.1'):
                (root / name).write_bytes(b'fixture')
            with self.assertRaises(gate.Refused):
                supply.require_contract(root, ['crates'], targets, 'v0.1.0-alpha.1')

    def test_freeze_checks_licences_and_freezes_complete_final_bytes_once(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            targets = ['aarch64-apple-darwin']
            for name in supply.required_payloads(['github'], targets, 'v0.1.0-alpha.1'):
                (root / name).write_bytes(b'fixture')
            base = 'hennery-' + targets[0]
            archive = root / (base + '.tar.xz')
            with tarfile.open(archive, 'w:xz') as tar:
                directory = tarfile.TarInfo(base + '/')
                directory.type = tarfile.DIRTYPE
                tar.addfile(directory)
                for name in ['hennery', 'LICENSE', 'README.md', 'THIRD-PARTY-NOTICES.txt']:
                    entry = tarfile.TarInfo(base + '/' + name)
                    entry.size = 1
                    tar.addfile(entry, io.BytesIO(b'x'))
            (root / (archive.name + '.sha256')).write_text(gate.digest(archive.read_bytes()) + '  ' + archive.name + '\n')
            (root / 'dist-manifest.json').write_text('{}')
            findings = root / 'licence-findings.json'
            findings.write_bytes(gate.canonical({'findings': ['unresolved']}))
            argv = ['supply.py', 'freeze', '--output', str(root), '--source-sha', 'a' * 40,
                    '--tag', 'v0.1.0-alpha.1', '--targets', targets[0], '--run-id', '10', '--run-attempt', '1']
            with patch('sys.argv', argv), self.assertRaisesRegex(gate.Refused, 'unresolved licence'):
                supply.main()
            findings.write_bytes(gate.canonical({'findings': []}))
            with patch('sys.argv', argv), contextlib.redirect_stdout(io.StringIO()):
                supply.main()
            inventory = gate.strict_json((root / 'release-inventory.json').read_bytes())
            gate.verify_files(inventory, root)
            supply.verify_checksums(root)
            supply.verify_binary_inventory(inventory, root)
            wrong = dict(inventory, binaries={})
            with self.assertRaises(gate.Refused):
                supply.verify_binary_inventory(wrong, root)
            self.assertIn('sha256.sum', [a['name'] for a in inventory['artifacts']])
            with patch('sys.argv', argv), self.assertRaisesRegex(gate.Refused, 'already frozen'):
                supply.main()

    def test_supplemental_licence_hash_cannot_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            directory = root / 'licences'
            directory.mkdir()
            (directory / 'text.txt').write_bytes(b'verbatim licence')
            entry = {'file': 'text.txt', 'sha256': gate.digest(b'verbatim licence'), 'source': 'immutable-upstream-revision'}
            (directory / 'manifest.json').write_bytes(gate.canonical({'cargo:dependency@1.0': [entry]}))
            with patch.object(supply, '__file__', str(root / 'supply.py')):
                self.assertEqual(supply.supplemental('cargo', 'dependency', '1.0')[0][1], 'verbatim licence')
                (directory / 'text.txt').write_bytes(b'changed licence')
                with self.assertRaises(gate.Refused):
                    supply.supplemental('cargo', 'dependency', '1.0')

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
