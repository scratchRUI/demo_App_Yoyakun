import unittest

import sys
from pathlib import Path
from types import SimpleNamespace

from _bootstrap import prepare_test_env

prepare_test_env()

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from serializers import build_record_response


class SerializersTest(unittest.TestCase):
    def test_build_record_response_handles_nullable_fields(self):
        record = SimpleNamespace(
            id=10,
            patient_id=5,
            raw_text="raw content",
            s_text=None,
            o_text="o text",
            a_text=None,
            p_text="p text",
            created_at="2026-03-05T17:00:00",
        )

        response = build_record_response(record)

        self.assertEqual(response.id, 10)
        self.assertEqual(response.patient_id, 5)
        self.assertEqual(response.original_text, "raw content")
        self.assertEqual(response.soap_summary.s_text, "")
        self.assertEqual(response.soap_summary.o_text, "o text")
        self.assertEqual(response.soap_summary.a_text, "")
        self.assertEqual(response.soap_summary.p_text, "p text")


if __name__ == "__main__":
    unittest.main()
