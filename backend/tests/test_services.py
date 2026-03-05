import unittest

import sys
from pathlib import Path

from _bootstrap import prepare_test_env

prepare_test_env()

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import services


class ServicesHelpersTest(unittest.TestCase):
    def test_strip_markdown_code_fence_removes_fence(self):
        text = """```json\n{\"s_text\": \"x\"}\n```"""

        result = services._strip_markdown_code_fence(text)

        self.assertEqual(result, '{"s_text": "x"}')

    def test_strip_markdown_code_fence_keeps_plain_text(self):
        text = '{"soap": {"s_text": "a"}}'

        result = services._strip_markdown_code_fence(text)

        self.assertEqual(result, text)

    def test_normalize_soap_payload_fills_missing_and_casts(self):
        payload = {"s_text": "subjective", "o_text": 123}

        result = services._normalize_soap_payload(payload)

        self.assertEqual(
            result,
            {
                "s_text": "subjective",
                "o_text": "123",
                "a_text": "",
                "p_text": "",
            },
        )


if __name__ == "__main__":
    unittest.main()
