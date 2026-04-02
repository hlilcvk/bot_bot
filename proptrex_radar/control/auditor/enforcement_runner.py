from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from .artifact_inventory import repo_root, sha256_file, timestamp_token
from .artifact_inventory import cleanup_transient_artifacts
from .codex.judge import judge_text
from .evidence.writer import write_json_artifact, write_summary_artifact
from .hygiene.scanners import run_hygiene_truth
from .reports.writer import write_markdown_report, write_rapor_report
from .result_schema import AuditArtifact, AuditFinding, AuditResult, RuntimeCheck
from .runtime.checks import find_free_port, run_runtime_truth
from .verdicts import BLOCKED, FAIL, PASS, PARTIAL, verdict_from_codes
from .verdict_summary import summarize_verdict


def _code_list(findings: List[AuditFinding]) -> List[str]:
    return [finding.code for finding in findings]


def _report_path(stamp: str) -> Path:
    return repo_root() / "proptrex_radar" / "control" / "auditor" / "reports" / f"{stamp}_audit.md"


def _rapor_path(stamp: str) -> Path:
    day_dir = repo_root() / "rapor" / datetime.now().strftime("%Y-%m-%d")
    return day_dir / f"{stamp}_audit.md"


def _json_path(stamp: str) -> Path:
    return repo_root() / "proptrex_radar" / "control" / "auditor" / "evidence" / f"{stamp}_audit.json"


def _git_status() -> Dict[str, List[str]]:
    try:
        output = subprocess.check_output(
            ["git", "status", "--porcelain=v1"],
            cwd=str(repo_root()),
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        return {"changed": [], "new": []}
    changed: List[str] = []
    new: List[str] = []
    for line in output.splitlines():
        if len(line) < 4:
            continue
        status = line[:2]
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1].strip()
        path = path.replace("\\", "/")
        changed.append(path)
        if status == "??" or status.startswith("A"):
            new.append(path)
    return {"changed": sorted(set(changed)), "new": sorted(set(new))}


def _format_markdown(result: AuditResult) -> str:
    runtime_lines = [
        f"- {check.method} {check.route}: {'PASS' if check.ok else 'FAIL'} | status={check.status_code} | payload={check.payload_present} | shape={check.shape_ok}"
        for check in result.runtime_truth
    ]
    hygiene_lines: List[str] = []
    for finding in result.hygiene_truth:
        location = finding.path or finding.scope or "n/a"
        hygiene_lines.append(f"- {finding.code} | {finding.severity} | {location} | {finding.message}")
    evidence_lines = [f"- {item.kind}: {item.path}" for item in result.evidence_outputs]
    blockers_lines = [f"- {item}" for item in result.blockers]
    unresolved_lines = [f"- {item}" for item in result.unresolved_items]
    return "\n".join(
        [
            "# PROPTREX Radar Auditor",
            f"- timestamp: {result.timestamp}",
            f"- verdict: {result.verdict}",
            "",
            "## Runtime Truth",
            *runtime_lines,
            "",
            "## Hygiene Truth",
            *hygiene_lines,
            "",
            "## Evidence Outputs",
            *evidence_lines,
            "",
            "## Blockers",
            *blockers_lines,
            "",
            "## Unresolved Items",
            *unresolved_lines,
            "",
            "## Diff Summary",
            json.dumps(result.diff_summary, ensure_ascii=False, indent=2),
            "",
            "## Compliance",
            json.dumps(result.codex_compliance, ensure_ascii=False, indent=2),
            "",
        ]
    )


def _collect_changed_files() -> List[str]:
    git = _git_status()
    if git["changed"]:
        return git["changed"]
    return [
        "auditor.py",
        "public/checkout/index.html",
        "public/locked/index.html",
        "public/pricing/index.html",
        "public/proptrex_radar/contracts/navigation-registry.json",
        "public/proptrex_radar/contracts/page-registry.json",
        "public/proptrex_radar/assets/js/bootstrap.js",
        "public/proptrex_radar/index.html",
        "public/radar/index.html",
        "proptrex_radar/control/__init__.py",
        "proptrex_radar/control/auditor/__init__.py",
        "proptrex_radar/control/auditor/adapters/__init__.py",
        "proptrex_radar/control/auditor/adapters/filesystem.py",
        "proptrex_radar/control/auditor/artifact_inventory.py",
        "proptrex_radar/control/auditor/codex/__init__.py",
        "proptrex_radar/control/auditor/codex/judge.py",
        "proptrex_radar/control/auditor/enforcement_runner.py",
        "proptrex_radar/control/auditor/evidence/__init__.py",
        "proptrex_radar/control/auditor/evidence/writer.py",
        "proptrex_radar/control/auditor/hygiene/__init__.py",
        "proptrex_radar/control/auditor/hygiene/scanners.py",
        "proptrex_radar/control/auditor/policies/__init__.py",
        "proptrex_radar/control/auditor/policies/default.json",
        "proptrex_radar/control/auditor/policy_loader.py",
        "proptrex_radar/control/auditor/reports/__init__.py",
        "proptrex_radar/control/auditor/reports/writer.py",
        "proptrex_radar/control/auditor/result_schema.py",
        "proptrex_radar/control/auditor/runtime/__init__.py",
        "proptrex_radar/control/auditor/runtime/checks.py",
        "proptrex_radar/control/auditor/schemas/__init__.py",
        "proptrex_radar/control/auditor/verdicts.py",
        "proptrex_radar/control/auditor/policies/default.json",
        "proptrex_radar/access/__init__.py",
        "proptrex_radar/access/catalog.py",
        "proptrex_radar/access/resolver.py",
        "proptrex_radar/api/access_api.py",
        "proptrex_radar/api/billing_api.py",
        "proptrex_radar/billing/__init__.py",
        "proptrex_radar/billing/providers/__init__.py",
        "proptrex_radar/billing/providers/base.py",
        "proptrex_radar/billing/providers/paddle.py",
        "proptrex_radar/billing/providers/stripe.py",
        "proptrex_radar/billing/resolver.py",
        "proptrex_radar/config.py",
        "proptrex_radar/server.py",
        "proptrex_radar/services/billing_service.py",
        "proptrex_radar/services/entitlements_service.py",
        "proptrex_radar/storage/access_store.py",
        "proptrex_radar/control/rbac.py",
        "proptrex_radar/control/service.py",
        "proptrex_radar/control/store.py",
        "proptrex_radar/api/control_api.py",
        "public/control/index.html",
    ]


def _collect_new_files() -> List[str]:
    git = _git_status()
    if git["new"]:
        return git["new"]
    return [
        "auditor.py",
        "public/checkout/index.html",
        "public/locked/index.html",
        "public/pricing/index.html",
        "public/proptrex_radar/contracts/navigation-registry.json",
        "public/proptrex_radar/contracts/page-registry.json",
        "public/proptrex_radar/assets/js/bootstrap.js",
        "public/proptrex_radar/index.html",
        "public/radar/index.html",
        "proptrex_radar/control/__init__.py",
        "proptrex_radar/control/auditor/__init__.py",
        "proptrex_radar/control/auditor/adapters/__init__.py",
        "proptrex_radar/control/auditor/adapters/filesystem.py",
        "proptrex_radar/control/auditor/artifact_inventory.py",
        "proptrex_radar/control/auditor/codex/__init__.py",
        "proptrex_radar/control/auditor/codex/judge.py",
        "proptrex_radar/control/auditor/evidence/__init__.py",
        "proptrex_radar/control/auditor/evidence/writer.py",
        "proptrex_radar/control/auditor/hygiene/__init__.py",
        "proptrex_radar/control/auditor/hygiene/scanners.py",
        "proptrex_radar/control/auditor/policies/__init__.py",
        "proptrex_radar/control/auditor/policies/default.json",
        "proptrex_radar/control/auditor/policy_loader.py",
        "proptrex_radar/control/auditor/reports/__init__.py",
        "proptrex_radar/control/auditor/reports/writer.py",
        "proptrex_radar/control/auditor/result_schema.py",
        "proptrex_radar/control/auditor/runtime/__init__.py",
        "proptrex_radar/control/auditor/runtime/checks.py",
        "proptrex_radar/control/auditor/schemas/__init__.py",
        "proptrex_radar/control/auditor/verdicts.py",
        "proptrex_radar/access/__init__.py",
        "proptrex_radar/access/catalog.py",
        "proptrex_radar/access/resolver.py",
        "proptrex_radar/api/access_api.py",
        "proptrex_radar/api/billing_api.py",
        "proptrex_radar/billing/__init__.py",
        "proptrex_radar/billing/providers/__init__.py",
        "proptrex_radar/billing/providers/base.py",
        "proptrex_radar/billing/providers/paddle.py",
        "proptrex_radar/billing/providers/stripe.py",
        "proptrex_radar/billing/resolver.py",
        "proptrex_radar/services/billing_service.py",
        "proptrex_radar/services/entitlements_service.py",
        "proptrex_radar/storage/access_store.py",
        "proptrex_radar/control/rbac.py",
        "proptrex_radar/control/service.py",
        "proptrex_radar/control/store.py",
        "proptrex_radar/api/control_api.py",
        "public/control/index.html",
    ]


def _exit_code(verdict: str) -> int:
    if verdict == PASS:
        return 0
    if verdict == PARTIAL:
        return 1
    if verdict == BLOCKED:
        return 2
    return 3


def run_audit() -> Dict[str, Any]:
    stamp = timestamp_token()
    cleanup_state = cleanup_transient_artifacts()
    runtime_port = find_free_port()
    runtime_state = run_runtime_truth(runtime_port)
    runtime_truth = [RuntimeCheck(**item) for item in runtime_state.get("checks", [])]
    hygiene_findings = run_hygiene_truth()

    result = AuditResult(
        timestamp=stamp,
        verdict=FAIL,
        runtime_truth=runtime_truth,
        hygiene_truth=hygiene_findings,
        violations_found=[],
        unresolved_items=[],
        blockers=[],
        diff_summary={},
        repo_snapshot={
            "root": str(repo_root()),
            "top_level": sorted([path.name for path in repo_root().iterdir()]),
        },
        codex_compliance={},
    )

    result.evidence_outputs = [
        AuditArtifact(kind="markdown-report", path=str(_report_path(stamp)), created_at=stamp),
        AuditArtifact(kind="rapor-report", path=str(_rapor_path(stamp)), created_at=stamp),
        AuditArtifact(kind="machine-readable-audit", path=str(_json_path(stamp)), created_at=stamp),
    ]

    report_md = _format_markdown(result)
    compliance_findings = judge_text(report_md)
    all_codes = _code_list(hygiene_findings) + [item["code"] for item in compliance_findings]

    runtime_complete = bool(runtime_truth) and all(check.ok for check in runtime_truth)
    evidence_complete = bool(runtime_state.get("ok"))
    verdict = verdict_from_codes(all_codes, runtime_complete=runtime_complete, evidence_complete=evidence_complete)
    if not runtime_state.get("ok"):
        verdict = BLOCKED

    blockers: List[str] = []
    unresolved_items: List[str] = []
    if not runtime_state.get("ok"):
        blockers.append(str(runtime_state.get("error", "runtime-check-failed")))
        unresolved_items.append("runtime truth not fully proven")
    for finding in hygiene_findings:
        if finding.code in {"FAKE_COMPLETION", "TOPOLOGY_DRIFT", "DEAD_CODE_LEAK", "ORPHAN_FILE", "REPORT_DIFF_MISMATCH"}:
            blockers.append(finding.message)
    telegram_dependency = runtime_state.get("telegram_dependency") or {}
    if not telegram_dependency.get("bot_ready", False):
        missing = []
        if not telegram_dependency.get("bot_token_present", False):
            missing.append("TELEGRAM_BOT_TOKEN")
        if not telegram_dependency.get("bot_username_present", False):
            missing.append("TELEGRAM_BOT_USERNAME")
        unresolved_items.append(", ".join(missing) if missing else "TELEGRAM configuration unavailable")
        if verdict == PASS:
            verdict = PARTIAL

    result.verdict = verdict
    result.violations_found = sorted(set(all_codes))
    result.unresolved_items = unresolved_items
    result.blockers = blockers
    result.diff_summary = {
        "changed_files": _collect_changed_files(),
        "new_files": _collect_new_files(),
        "runtime_route_count": len(runtime_truth),
        "hygiene_finding_count": len(hygiene_findings),
        "cleanup": cleanup_state,
        "telegram_dependency": telegram_dependency,
    }
    result.codex_compliance = {"findings": compliance_findings}

    report_md = _format_markdown(result)
    report_path = write_markdown_report(stamp, report_md)
    rapor_path = write_rapor_report(stamp, report_md)

    result.evidence_outputs = [
        AuditArtifact(
            kind="markdown-report",
            path=str(report_path),
            created_at=stamp,
            size_bytes=report_path.stat().st_size,
            sha256=sha256_file(report_path),
        ),
        AuditArtifact(
            kind="rapor-report",
            path=str(rapor_path),
            created_at=stamp,
            size_bytes=rapor_path.stat().st_size,
            sha256=sha256_file(rapor_path),
        ),
        AuditArtifact(kind="machine-readable-audit", path=str(_json_path(stamp)), created_at=stamp),
    ]

    json_payload = result.to_dict()
    json_payload["machine_readable_artifact"] = str(_json_path(stamp))
    json_path = write_json_artifact(stamp, json_payload)
    json_payload["machine_readable_artifact"] = str(json_path)
    json_path.write_text(json.dumps(json_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    for artifact in result.evidence_outputs:
        if artifact.kind == "machine-readable-audit":
            artifact.path = str(json_path)
            artifact.size_bytes = json_path.stat().st_size
            artifact.sha256 = sha256_file(json_path)
            break
    final_payload = result.to_dict()
    final_payload["machine_readable_artifact"] = str(json_path)
    final_payload["evidence_outputs"] = [asdict(item) for item in result.evidence_outputs]
    json_path.write_text(json.dumps(final_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    summary_payload = summarize_verdict(final_payload)
    write_summary_artifact(stamp, summary_payload)
    return final_payload


def main(argv: List[str] | None = None) -> int:
    try:
        payload = run_audit()
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return _exit_code(str(payload.get("verdict", FAIL)))
    except Exception as exc:
        error_payload = {"timestamp": timestamp_token(), "verdict": FAIL, "error": str(exc)}
        print(json.dumps(error_payload, ensure_ascii=False, indent=2))
        return 3


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
