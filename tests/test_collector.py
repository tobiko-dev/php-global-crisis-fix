import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("collector", ROOT / "collectors" / "collect.py")
collector = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collector)


class FakeVersionProcess:
    def __init__(self, output, returncode=0):
        self.stdout = io.BytesIO(output)
        self.returncode = returncode
        self.killed = False

    def wait(self, timeout=None):
        return self.returncode

    def kill(self):
        self.killed = True


class CollectorTests(unittest.TestCase):
    def test_missing_php_is_unknown_and_never_verified(self):
        with patch.object(collector.shutil, "which", return_value=None):
            version, note = collector.collect_version()
        self.assertEqual(version, "")
        self.assertIn("not found", note)

    def test_version_read_has_no_shell_and_disables_configuration(self):
        outcome = FakeVersionProcess(b"PHP 8.4.27 (cli) (built: Oct 21 2026)\n")
        with patch.object(collector.shutil, "which", return_value="/usr/bin/php"):
            with patch.object(collector.subprocess, "Popen", return_value=outcome) as command:
                version, note = collector.collect_version("php")
        self.assertEqual(version, "8.4.27")
        self.assertEqual(command.call_args.args[0], ["/usr/bin/php", "-n", "-v"])
        self.assertNotIn("shell", command.call_args.kwargs)
        self.assertEqual(command.call_args.kwargs["stdout"], subprocess.PIPE)
        self.assertEqual(command.call_args.kwargs["stderr"], subprocess.DEVNULL)
        self.assertIn("does not identify", note)

    def test_vendor_suffix_is_preserved_for_review(self):
        outcome = FakeVersionProcess(b"PHP 8.3.6-custom (cli)\n")
        with patch.object(collector.shutil, "which", return_value="/usr/bin/php"):
            with patch.object(collector.subprocess, "Popen", return_value=outcome):
                self.assertEqual(collector.collect_version()[0], "8.3.6-custom")

    def test_timeout_and_nonzero_do_not_return_partial_positive_version(self):
        real_popen = subprocess.Popen
        program = "import sys, time; print('PHP 8.4.27', flush=True); time.sleep(3)"
        def slow_process(command, **kwargs):
            return real_popen([sys.executable, "-c", program], **kwargs)
        with patch.object(collector.shutil, "which", return_value="/usr/bin/php"):
            with patch.object(collector, "VERSION_TIMEOUT_SECONDS", 0.2):
                with patch.object(collector.subprocess, "Popen", side_effect=slow_process):
                    version, note = collector.collect_version()
                    self.assertEqual(version, "")
                    self.assertIn("timed out", note)
            outcome = FakeVersionProcess(b"PHP 8.4.27", returncode=1)
            with patch.object(collector.subprocess, "Popen", return_value=outcome):
                self.assertEqual(collector.collect_version()[0], "")

    def test_oversized_stdout_rejects_valid_prefix_and_stops_child(self):
        real_popen = subprocess.Popen
        children = []
        program = (
            "import sys, time; "
            "sys.stdout.buffer.write(b'PHP 8.4.27 (cli)\\n' + b'x' * 262144); "
            "sys.stdout.buffer.flush(); time.sleep(3)"
        )
        def noisy_process(command, **kwargs):
            child = real_popen([sys.executable, "-c", program], **kwargs)
            children.append(child)
            return child
        with patch.object(collector.shutil, "which", return_value="/usr/bin/php"):
            with patch.object(collector.subprocess, "Popen", side_effect=noisy_process):
                version, note = collector.collect_version()
        self.assertEqual(version, "")
        self.assertIn("64 KiB limit", note)
        self.assertIsNotNone(children[0].poll())

    def test_output_is_private_and_existing_file_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "inventory.json"
            command = [sys.executable, str(ROOT / "collectors/collect.py"), "--id", "test-01", "--client", "Fictional Client", "--php", "definitely-no-such-php-binary", "--out", str(output)]
            first = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            fleet = json.loads(output.read_text())
            asset = fleet["assets"][0]
            self.assertEqual(asset["observation"], "unknown")
            self.assertRegex(asset["observedAt"], r"T\d{2}:\d{2}:\d{2}\.\d{3}Z$")
            self.assertEqual(asset["restartConfirmedAt"], "")
            self.assertEqual(asset["reviewer"], "")
            self.assertFalse(asset["providerConfirmation"]["coversBothCves"])
            before = output.read_bytes()
            if os.name == "posix":
                self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            second = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(second.returncode, 1)
            self.assertEqual(output.read_bytes(), before)

    def test_identifier_cannot_be_a_path(self):
        result = subprocess.run([sys.executable, str(ROOT / "collectors/collect.py"), "--id", "../../report", "--client", "Example"], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
