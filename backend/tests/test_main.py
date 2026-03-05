import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import sys
from pathlib import Path

from _bootstrap import prepare_test_env

prepare_test_env()

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import HTTPException

import main
import schemas


class MainSyncHandlersTest(unittest.TestCase):
    def test_create_patient_strips_name_and_returns_patient(self):
        payload = schemas.PatientCreate(name="  山田 太郎  ")

        with patch.object(main, "create_patient_in_db", return_value=SimpleNamespace(id=1, name="山田 太郎", created_at="2026-03-05T17:00:00")) as create_mock:
            result = main.create_patient(payload, db=object())

        create_mock.assert_called_once()
        called_name = create_mock.call_args.args[1]
        self.assertEqual(called_name, "山田 太郎")
        self.assertEqual(result.name, "山田 太郎")

    def test_create_patient_with_blank_name_raises_422(self):
        payload = schemas.PatientCreate(name=" ")

        with self.assertRaises(HTTPException) as exc:
            main.create_patient(payload, db=object())

        self.assertEqual(exc.exception.status_code, 422)

    def test_get_patient_records_returns_sanitized_payload(self):
        fake_records = [
            SimpleNamespace(
                id=1,
                created_at="2026-03-05T17:00:00",
                s_text=None,
                o_text="o",
                a_text=None,
                p_text="p",
                raw_text=None,
            )
        ]

        with patch.object(main, "get_patient_by_id", return_value=SimpleNamespace(id=99)):
            with patch.object(main, "list_records_by_patient_id", return_value=fake_records):
                result = main.get_patient_records(99, db=object())

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].s_text, "")
        self.assertEqual(result[0].o_text, "o")
        self.assertEqual(result[0].a_text, "")
        self.assertEqual(result[0].p_text, "p")
        self.assertEqual(result[0].raw_text, "")

    def test_get_patient_records_not_found_raises_404(self):
        with patch.object(main, "get_patient_by_id", return_value=None):
            with self.assertRaises(HTTPException) as exc:
                main.get_patient_records(404, db=object())

        self.assertEqual(exc.exception.status_code, 404)


class MainAsyncHandlersTest(unittest.IsolatedAsyncioTestCase):
    async def test_create_record_not_found_raises_404(self):
        with patch.object(main, "get_patient_by_id", return_value=None):
            with self.assertRaises(HTTPException) as exc:
                await main.create_record(patient_id=404, audio=object(), db=object())

        self.assertEqual(exc.exception.status_code, 404)

    async def test_create_record_success_uses_dependencies(self):
        fake_record = SimpleNamespace(id=1)
        fake_response = SimpleNamespace(id=1, message="ok")

        with patch.object(main, "get_patient_by_id", return_value=SimpleNamespace(id=1)):
            with patch.object(main, "summarize_audio_to_soap", new=AsyncMock(return_value=({"s_text": "s", "o_text": "o", "a_text": "a", "p_text": "p"}, "raw"))) as summarize_mock:
                with patch.object(main, "create_record_in_db", return_value=fake_record) as create_record_mock:
                    with patch.object(main, "build_record_response", return_value=fake_response) as serializer_mock:
                        result = await main.create_record(patient_id=1, audio=object(), db=object())

        summarize_mock.assert_awaited_once()
        create_record_mock.assert_called_once()
        serializer_mock.assert_called_once_with(fake_record)
        self.assertIs(result, fake_response)


if __name__ == "__main__":
    unittest.main()
