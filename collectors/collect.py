#!/usr/bin/env python3
"""Read local PHP CLI version metadata; never claim a web deployment is verified."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import threading
import time

VERSION = "0.1.0"
MAX_VERSION_OUTPUT_BYTES = 65536
VERSION_TIMEOUT_SECONDS = 5


def _stop_process(process):
    """Terminate and reap the direct child without an unbounded cleanup wait."""
    try:
        process.kill()
    except OSError:
        pass
    try:
        process.wait(timeout=1)
    except subprocess.TimeoutExpired:
        pass


def _capture_version_output(resolved):
    """Bound stdout while retaining a timeout on platforms without pipe selectors."""
    try:
        process = subprocess.Popen(
            [resolved, "-n", "-v"], stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        )
    except OSError:
        return None, "PHP version could not be read. No runtime verification was performed."

    result = {"data": None}
    finished = threading.Event()
    deadline = time.monotonic() + VERSION_TIMEOUT_SECONDS

    def read_output():
        try:
            # The extra byte detects overflow without buffering the entire output.
            result["data"] = process.stdout.read(MAX_VERSION_OUTPUT_BYTES + 1)
        except (OSError, ValueError):
            pass
        finally:
            try:
                process.stdout.close()
            finally:
                finished.set()

    # A descendant retaining stdout must not hold the collector open indefinitely.
    reader = threading.Thread(target=read_output, daemon=True)
    try:
        reader.start()
    except RuntimeError:
        _stop_process(process)
        process.stdout.close()
        return None, "PHP version could not be read. No runtime verification was performed."

    if not finished.wait(max(0, deadline - time.monotonic())):
        _stop_process(process)
        return None, "PHP version command timed out. No runtime verification was performed."
    output = result["data"]
    if output is None:
        _stop_process(process)
        return None, "PHP version could not be read. No runtime verification was performed."
    if len(output) > MAX_VERSION_OUTPUT_BYTES:
        _stop_process(process)
        return None, "PHP version output exceeded the 64 KiB limit. No runtime verification was performed."
    try:
        returncode = process.wait(timeout=max(0, deadline - time.monotonic()))
    except subprocess.TimeoutExpired:
        _stop_process(process)
        return None, "PHP version command timed out. No runtime verification was performed."
    if returncode != 0:
        return None, "PHP version command failed. No runtime verification was performed."
    return output, ""


def collect_version(executable="php"):
    """Return a bounded observation, without shell execution or php.ini loading."""
    resolved = shutil.which(executable)
    if not resolved:
        return "", "PHP executable was not found. Record the web runtime through your host or server operator."
    output, error = _capture_version_output(resolved)
    if output is None:
        return "", error
    try:
        text = output.decode("utf-8")
    except UnicodeError:
        return "", "PHP version could not be read. No runtime verification was performed."
    match = re.search(r"^PHP\s+([0-9]+\.[0-9]+\.[0-9]+[^\s]*)", text, re.MULTILINE)
    if not match:
        return "", "No recognizable PHP version was returned. Confirm the effective web runtime separately."
    version = match.group(1)
    if len(version) > 64:
        return "", "PHP returned an unexpected version format. Review it manually."
    return version, (
        "Local CLI observation collected with php -n -v (startup configuration disabled). "
        "This does not identify the active web runtime, vendor patch status, or running workers. "
        "Confirm those with the server operator before completing the evidence record."
    )


def make_fleet(args):
    version, note = collect_version(args.php)
    return {
        "schemaVersion": 1,
        "organization": args.organization,
        "demo": False,
        "assets": [{
            "id": args.id,
            "client": args.client,
            "name": args.name,
            "environment": args.environment,
            "provider": args.provider,
            "owner": args.owner,
            "phpVersion": version,
            "distribution": "unknown",
            "observation": "cli" if version else "unknown",
            "observedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "evidenceUrl": "",
            "evidenceNote": note,
            "reviewer": "",
            "restartConfirmedAt": "",
            "smokeTestAt": "",
            "providerConfirmation": {
                "coversBothCves": False,
                "confirmedAt": "",
                "reference": "",
                "reviewer": "",
            },
        }],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Collect a read-only local PHP CLI observation for PHP Response Desk. "
                    "It does not scan sites, install updates, or verify web workers."
    )
    parser.add_argument("--version", action="version", version=VERSION)
    parser.add_argument("--id", required=True, help="Stable asset identifier, e.g. server-01 (letters, numbers, dots, underscores, dashes)")
    parser.add_argument("--client", required=True, help="Customer label used in your private inventory")
    parser.add_argument("--name", default="Local PHP observation", help="Site or environment name")
    parser.add_argument("--organization", default="My agency")
    parser.add_argument("--owner", default="")
    parser.add_argument("--provider", default="Self-managed")
    parser.add_argument("--environment", choices=["production", "staging", "development"], default="production")
    parser.add_argument("--php", default="php", help="PHP executable name or explicit path; never interpreted by a shell")
    parser.add_argument("--out", help="New output JSON file; defaults to stdout; existing files are never overwritten")
    args = parser.parse_args(argv)
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,79}", args.id):
        parser.error("--id must be 1–80 letters/numbers/dots/underscores/dashes, starting with a letter or number")
    for field in ["client", "name", "organization"]:
        value = getattr(args, field).strip()
        if not value or len(value) > 200:
            parser.error(f"--{field} must contain 1–200 characters")
        setattr(args, field, value)
    for field in ["owner", "provider"]:
        if len(getattr(args, field)) > 200:
            parser.error(f"--{field} must contain at most 200 characters")
    document = json.dumps(make_fleet(args), indent=2, ensure_ascii=False) + "\n"
    if args.out:
        try:
            # O_EXCL also prevents following an existing output symlink.
            descriptor = os.open(Path(args.out).expanduser(), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                handle.write(document)
        except OSError as error:
            parser.exit(1, f"Could not create output file: {error.strerror}. Choose a new path.\n")
        print("Inventory saved. Import it into PHP Response Desk to complete web-runtime evidence.", file=sys.stderr)
    else:
        sys.stdout.write(document)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
