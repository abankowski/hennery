import unittest
import gate


class Primitives(unittest.TestCase):
    def test_strict_json(self):
        for raw in ('{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '\ufeff{}', '{"X":1,"x":2}'):
            with self.subTest(raw=raw), self.assertRaises(gate.Refused):
                gate.strict_json(raw)
