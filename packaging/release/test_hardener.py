import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('hardener', Path(__file__).resolve().parents[1] / 'harden-installer.py')
hardener = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hardener)


class Hardener(unittest.TestCase):
    def test_signature_identity_is_exact_tag_and_verification_precedes_extraction(self):
        result = hardener.harden('\n'.join(old for old, _ in hardener.REPLACEMENTS))
        self.assertIn('--cert-identity "https://github.com/marcinwadon/hennery/.github/workflows/release-publish.yml@refs/tags/v$APP_VERSION"', result)
        self.assertIn('--source-ref "refs/tags/v$APP_VERSION"', result)
        self.assertIn('refusing an archive without valid release-tag provenance', result)

    def test_all_anchors_are_required_once(self):
        pristine = '\n'.join(old for old, _ in hardener.REPLACEMENTS)
        result = hardener.harden(pristine)
        self.assertIn('ln "$_stage/$_bin_name" "$_install_dir/"', result)
        self.assertIn('[ "${#_checksum_value}" = 64 ]', result)
        for old, _ in hardener.REPLACEMENTS:
            with self.subTest(anchor=old[:60]):
                with self.assertRaises(SystemExit):
                    hardener.harden(pristine.replace(old, '', 1))
                with self.assertRaises(SystemExit):
                    hardener.harden(pristine + '\n' + old)


if __name__ == '__main__':
    unittest.main()
