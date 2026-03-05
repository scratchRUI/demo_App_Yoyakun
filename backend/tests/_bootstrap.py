import os
import sys
import types


def prepare_test_env() -> None:
    os.environ.setdefault("DATABASE_URL", "sqlite://")

    google_module = sys.modules.setdefault("google", types.ModuleType("google"))

    if "google.genai" not in sys.modules:
        genai_module = types.ModuleType("google.genai")

        class DummyClient:
            def __init__(self, *args, **kwargs):
                pass

        types_module = types.ModuleType("google.genai.types")

        class UploadFileConfig:
            def __init__(self, *args, **kwargs):
                pass

        class GenerateContentConfig:
            def __init__(self, *args, **kwargs):
                pass

        types_module.UploadFileConfig = UploadFileConfig
        types_module.GenerateContentConfig = GenerateContentConfig

        genai_module.Client = DummyClient
        genai_module.types = types_module

        sys.modules["google.genai"] = genai_module
        sys.modules["google.genai.types"] = types_module
        setattr(google_module, "genai", genai_module)
