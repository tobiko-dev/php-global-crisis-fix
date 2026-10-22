import importlib.util
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


class CollectorTests(unittest.TestCase):
    def test_missing_php_is_unknown_and_never_verified(self):
        with patch.object(collector.shutil, "which", return_value=None):
            version, note = collector.collect_version()
        self.assertEqual(version, "")
        self.assertIn("not found", note)

    def test_version_read_has_no_shell_and_disables_configuration(self):
        outcome = subprocess.CompletedProcess([], 0, "PHP 8.4.27 (cli) (built: Oct 21 2026)\n", "")
        with patch.object(collector.shutil, "which", return_value="/usr/bin/php"):
            with patch.object(collector.subprocess, "run", return_value=outcome) as command:
                version, note = collector.collect_version("php")
        self.assertEqual(version, "8.4.27")
        self.assertEqual(command.call_args.args[0], ["/usr/bin/php", "-n", "-v"])
        self.assertNotIn("shell", command.call_args.kwargs)
        self.assertIn("does not identify", note)

    def test_vendor_suffix_is_preserved_for_review(self):
        outcome = subprocess.CompletedProcess([], 0, "PHP 8.3.6-custom (cli)\n", "")
        with patch.object(collector.shutil, "which", return_value="/usr/bin/php"):
            with patch.object(collector.subprocess, "run", return_value=outcome):
                self.assertEqual(collector.collect_version()[0], "8.3.6-custom")

    def test_timeout_and_nonzero_do_not_return_partial_positive_version(self):
        with patch.object(collector.shutil, "which", return_value="/usr/bin/php"):
            with patch.object(collector.subprocess, "run", side_effect=subprocess.TimeoutExpired("php", 5)):
                self.assertEqual(collector.collect_version()[0], "")
            outcome = subprocess.CompletedProcess([], 1, "PHP 8.4.27", "failure")
            with patch.object(collector.subprocess, "run", return_value=outcome):
                self.assertEqual(collector.collect_version()[0], "")

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
