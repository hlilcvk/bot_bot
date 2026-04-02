from __future__ import annotations

import ast
import importlib.util
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set

from ..artifact_inventory import repo_root
from ..policy_loader import load_policy
from ..result_schema import AuditFinding


TEXT_EXTENSIONS = {".py", ".json", ".md", ".html", ".js", ".css", ".txt", ".yml", ".yaml"}
SKIP_PREFIXES = {"proptrex_radar/control/auditor"}
SKIP_EXACT = {"auditor.py"}


def _iter_text_files() -> Iterable[Path]:
    root = repo_root()
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if rel.startswith("data/"):
            continue
        if rel.startswith("rapor/"):
            continue
        if rel.startswith("proptrex_radar/control/auditor/reports/"):
            continue
        if rel.startswith("proptrex_radar/control/auditor/evidence/"):
            continue
        if rel in SKIP_EXACT:
            continue
        if any(rel.startswith(prefix) for prefix in SKIP_PREFIXES):
            continue
        if path.suffix.lower() in TEXT_EXTENSIONS:
            yield path


def _walk_js_references(entry_files: Iterable[Path]) -> Dict[str, Set[str]]:
    refs: Dict[str, Set[str]] = defaultdict(set)
    visited: Set[Path] = set()
    queue: List[Path] = [path for path in entry_files if path.exists()]
    import_pattern = re.compile(r'^\s*import\s+(?:.+?\s+from\s+)?[\'"]([^\'"]+)[\'"]', re.MULTILINE)
    dynamic_pattern = re.compile(r'import\(\s*[\'"]([^\'"]+)[\'"]\s*\)')
    fetch_pattern = re.compile(r'fetchJson\(\s*[\'"]([^\'"]+)[\'"]')
    page_root = repo_root() / "public" / "proptrex_radar"

    while queue:
        path = queue.pop()
        if path in visited or not path.exists():
            continue
        visited.add(path)
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for ref in import_pattern.findall(text) + dynamic_pattern.findall(text) + fetch_pattern.findall(text):
            if ref.startswith(("http://", "https://", "data:", "#", "mailto:")):
                continue
            if ref.startswith("assets/") or ref.startswith("contracts/") or ref.startswith("locale/"):
                target = (page_root / ref).resolve()
            elif ref.startswith("./") or ref.startswith("../"):
                target = (path.parent / ref).resolve()
            else:
                target = (path.parent / ref).resolve()
            refs[path.as_posix()].add(target.as_posix())
            if target.suffix.lower() == ".js" and target.exists():
                queue.append(target)
    return refs


def _collect_active_asset_refs() -> Set[str]:
    root = repo_root()
    html = root / "public" / "proptrex_radar" / "index.html"
    refs: Set[str] = set()
    if html.exists():
        text = html.read_text(encoding="utf-8", errors="ignore")
        for ref in re.findall(r'(?:src|href)=["\']([^"\']+)["\']', text):
            if ref.startswith(("http://", "https://", "data:", "#", "mailto:")):
                continue
            refs.add((html.parent / ref).resolve().as_posix())
        for ref in re.findall(r'fetchJson\(\s*[\'"]([^\'"]+)[\'"]', text):
            refs.add((html.parent / ref).resolve().as_posix())
    bootstrap = html.parent / "assets" / "js" / "bootstrap.js"
    refs.add(bootstrap.resolve().as_posix())
    refs_map = _walk_js_references([bootstrap])
    for values in refs_map.values():
        refs.update(values)
    return refs


def scan_forbidden_markers() -> List[AuditFinding]:
    policy = load_policy()
    markers = [str(item).lower() for item in policy.get("forbidden_markers", [])]
    findings: List[AuditFinding] = []
    for path in _iter_text_files():
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        lower = text.lower()
        for marker in markers:
            if marker in lower:
                findings.append(
                    AuditFinding(
                        code="FAKE_COMPLETION",
                        message=f"Forbidden marker '{marker}' found in {path.as_posix()}",
                        severity="high",
                        path=path.as_posix(),
                        scope="forbidden-marker",
                        evidence={"marker": marker},
                    )
                )
    return findings


def scan_temp_leftovers() -> List[AuditFinding]:
    root = repo_root()
    policy = load_policy()
    local_dev_paths = {str(item) for item in policy.get("local_dev_artifacts", [])}
    transient_paths = {str(item) for item in policy.get("transient_artifacts", [])}
    findings: List[AuditFinding] = []
    for path in root.rglob("*"):
        if not path.is_dir():
            continue
        rel = path.relative_to(root).as_posix()
        if rel in local_dev_paths or path.name == ".idea":
            findings.append(
                AuditFinding(
                    code="LOCAL_DEV_ARTIFACT",
                    message=f"Local IDE metadata present: {path.as_posix()}",
                    severity="low",
                    path=path.as_posix(),
                    scope="local-dev",
                )
            )
            continue
        if rel in transient_paths or path.name in {"__pycache__", ".pytest_cache", ".mypy_cache", "dist", "build"}:
            findings.append(
                AuditFinding(
                    code="GENERATED_TRANSIENT_ARTIFACT",
                    message=f"Transient artifact present after cleanup: {path.as_posix()}",
                    severity="medium",
                    path=path.as_posix(),
                    scope="transient-artifact",
                )
            )
    return findings


def scan_duplicate_routes() -> List[AuditFinding]:
    server = repo_root() / "proptrex_radar" / "server.py"
    if not server.exists():
        return []
    text = server.read_text(encoding="utf-8", errors="ignore")
    routes = re.findall(r'path\s*==\s*"([^"]+)"', text)
    findings: List[AuditFinding] = []
    for route, count in Counter(routes).items():
        if count > 1:
            findings.append(
                AuditFinding(
                    code="TOPOLOGY_DRIFT",
                    message=f"Duplicate route registration found for {route}",
                    severity="high",
                    path=server.as_posix(),
                    scope="route-registration",
                    evidence={"route": route},
                )
            )
    return findings


def scan_duplicate_configs() -> List[AuditFinding]:
    root = repo_root() / "public" / "proptrex_radar" / "assets" / "config"
    if not root.exists():
        return []
    findings: List[AuditFinding] = []
    by_name: Dict[str, List[Path]] = defaultdict(list)
    for path in root.glob("*"):
        if path.is_file():
            by_name[path.name].append(path)
    for name, paths in by_name.items():
        if len(paths) > 1:
            findings.append(
                AuditFinding(
                    code="TOPOLOGY_DRIFT",
                    message=f"Duplicate config filename found: {name}",
                    severity="medium",
                    path=paths[0].as_posix(),
                    scope="config-duplication",
                    evidence={"paths": [item.as_posix() for item in paths]},
                )
            )
    return findings


def _resolve_import(module_name: str, current_module: str, level: int) -> Optional[str]:
    if level > 0:
        base_parts = current_module.split(".")[:-level]
        if module_name:
            base_parts.extend(module_name.split("."))
        resolved = ".".join(part for part in base_parts if part)
        return resolved or None
    return module_name or None


def scan_unresolved_imports() -> List[AuditFinding]:
    root = repo_root()
    findings: List[AuditFinding] = []
    for path in root.rglob("*.py"):
        rel = path.relative_to(root).with_suffix("").as_posix().replace("/", ".")
        if rel.startswith("proptrex_radar.control.auditor") or rel == "auditor":
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8", errors="ignore"))
        except SyntaxError as exc:
            findings.append(
                AuditFinding(
                    code="DEAD_CODE_LEAK",
                    message=f"Syntax error prevents import resolution in {path.as_posix()}: {exc}",
                    severity="high",
                    path=path.as_posix(),
                    scope="import-resolution",
                )
            )
            continue
        imported: Set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imported.add(alias.name)
            elif isinstance(node, ast.ImportFrom):
                resolved = _resolve_import(node.module or "", rel, node.level)
                if resolved:
                    imported.add(resolved)
        for module_name in sorted(imported):
            root_name = module_name.split(".")[0]
            if root_name in {"json", "os", "sys", "time", "pathlib", "sqlite3", "urllib", "http", "typing", "dataclasses", "threading", "secrets", "mimetypes", "socket", "subprocess", "contextlib", "collections", "re", "ast", "hashlib", "importlib"}:
                continue
            if module_name.startswith("proptrex_radar") or module_name == "main":
                continue
            spec = importlib.util.find_spec(module_name)
            if spec is None:
                findings.append(
                    AuditFinding(
                        code="DEAD_CODE_LEAK",
                        message=f"Unresolved import candidate: {module_name} in {path.as_posix()}",
                        severity="high",
                        path=path.as_posix(),
                        scope="import-resolution",
                        evidence={"module": module_name},
                    )
                )
    return findings


def scan_circular_import_suspicion() -> List[AuditFinding]:
    root = repo_root()
    graph: Dict[str, Set[str]] = defaultdict(set)
    for path in root.rglob("*.py"):
        current = path.relative_to(root).with_suffix("").as_posix().replace("/", ".")
        try:
            tree = ast.parse(path.read_text(encoding="utf-8", errors="ignore"))
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.name
                    if name.startswith("proptrex_radar") or name == "main":
                        graph[current].add(name)
            elif isinstance(node, ast.ImportFrom):
                resolved = _resolve_import(node.module or "", current, node.level)
                if resolved and (resolved.startswith("proptrex_radar") or resolved == "main"):
                    graph[current].add(resolved)
    findings: List[AuditFinding] = []
    visited: Set[str] = set()
    stack: List[str] = []

    def dfs(node: str) -> None:
        visited.add(node)
        stack.append(node)
        for child in graph.get(node, set()):
            if child in stack:
                cycle = stack[stack.index(child):] + [child]
                findings.append(
                    AuditFinding(
                        code="TOPOLOGY_DRIFT",
                        message="Circular import suspicion detected",
                        severity="high",
                        path=node.replace(".", "/") + ".py",
                        scope="import-graph",
                        evidence={"cycle": cycle},
                    )
                )
            elif child not in visited:
                dfs(child)
        stack.pop()

    for node in list(graph.keys()):
        if node not in visited:
            dfs(node)
    return findings


def scan_broken_asset_refs() -> List[AuditFinding]:
    refs = _collect_active_asset_refs()
    root = repo_root() / "public" / "proptrex_radar"
    findings: List[AuditFinding] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if rel.startswith(("assets/config/", "contracts/", "locale/")):
            continue
        if path.suffix.lower() not in {".js", ".json", ".css", ".png", ".html"}:
            continue
        if path.parent.name in {"reports", "evidence"}:
            continue
        if path.resolve().as_posix() not in refs and rel.startswith("assets/"):
            findings.append(
                AuditFinding(
                    code="ORPHAN_FILE",
                    message=f"Asset not referenced from active surface: {path.as_posix()}",
                    severity="medium",
                    path=path.as_posix(),
                    scope="asset-ownership",
                )
            )
    return findings


def scan_locale_registry() -> List[AuditFinding]:
    root = repo_root() / "public" / "proptrex_radar" / "locale"
    files = [root / "en.json", root / "de.json", root / "tr.json"]
    findings: List[AuditFinding] = []
    payloads: Dict[str, Dict[str, Any]] = {}
    for path in files:
        if not path.exists():
            findings.append(
                AuditFinding(
                    code="MISSING_EVIDENCE",
                    message=f"Missing locale file: {path.as_posix()}",
                    severity="high",
                    path=path.as_posix(),
                    scope="locale-registry",
                )
            )
            continue
        payloads[path.name] = json.loads(path.read_text(encoding="utf-8"))
    if len(payloads) == 3:
        baseline = set(payloads["en.json"].keys())
        for name, payload in payloads.items():
            missing = sorted(baseline - set(payload.keys()))
            extra = sorted(set(payload.keys()) - baseline)
            if missing or extra:
                findings.append(
                    AuditFinding(
                        code="ORPHAN_FILE",
                        message=f"Locale mismatch in {name}",
                        severity="medium",
                        path=(root / name).as_posix(),
                        scope="locale-registry",
                        evidence={"missing": missing, "extra": extra},
                    )
                )
    return findings


def scan_contract_registry() -> List[AuditFinding]:
    root = repo_root() / "public" / "proptrex_radar" / "contracts"
    findings: List[AuditFinding] = []
    page = json.loads((root / "page-registry.json").read_text(encoding="utf-8"))
    nav = json.loads((root / "navigation-registry.json").read_text(encoding="utf-8"))
    locale = json.loads((root / "locale-registry.json").read_text(encoding="utf-8"))
    if page.get("canonicalRoute") != "/proptrex_radar/":
        findings.append(
            AuditFinding(
                code="TOPOLOGY_DRIFT",
                message="Page registry canonical route mismatch",
                severity="high",
                path=(root / "page-registry.json").as_posix(),
                scope="page-contract",
            )
        )
    nav_routes = [entry.get("route") for entry in nav.get("entries", [])]
    if "/proptrex_radar/" not in nav_routes:
        findings.append(
            AuditFinding(
                code="ORPHAN_FILE",
                message="Navigation registry missing proptrex_radar route",
                severity="high",
                path=(root / "navigation-registry.json").as_posix(),
                scope="navigation-registry",
            )
        )
    namespaces = set(locale.get("namespaces", []))
    if "proptrex_radar" not in namespaces:
        findings.append(
            AuditFinding(
                code="ORPHAN_FILE",
                message="Locale registry missing proptrex_radar namespace",
                severity="high",
                path=(root / "locale-registry.json").as_posix(),
                scope="locale-registry",
            )
        )
    return findings


def scan_report_tree_mismatch() -> List[AuditFinding]:
    root = repo_root()
    rapor = root / "rapor"
    reports = root / "proptrex_radar" / "control" / "auditor" / "reports"
    findings: List[AuditFinding] = []
    if not rapor.exists() or not reports.exists():
        return findings
    rapor_reports = {path.name for path in rapor.rglob("*_audit.md")}
    auditor_reports = {path.name for path in reports.glob("*_audit.md")}
    for name in sorted(rapor_reports - auditor_reports):
        findings.append(
            AuditFinding(
                code="REPORT_DIFF_MISMATCH",
                message=f"Rapor report has no matching auditor report: {name}",
                severity="high",
                path=(rapor / name).as_posix(),
                scope="report-alignment",
            )
        )
    for name in sorted(auditor_reports - rapor_reports):
        findings.append(
            AuditFinding(
                code="REPORT_DIFF_MISMATCH",
                message=f"Auditor report has no matching rapor entry: {name}",
                severity="high",
                path=(reports / name).as_posix(),
                scope="report-alignment",
            )
        )
    return findings


def scan_orphan_files() -> List[AuditFinding]:
    findings: List[AuditFinding] = []
    refs = _collect_active_asset_refs()
    root = repo_root() / "public" / "proptrex_radar" / "assets"
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if rel.startswith("config/"):
            continue
        if path.resolve().as_posix() not in refs:
            findings.append(
                AuditFinding(
                    code="ORPHAN_FILE",
                    message=f"Asset not referenced from active surface: {path.as_posix()}",
                    severity="medium",
                    path=path.as_posix(),
                    scope="asset-ownership",
                )
            )
    return findings


def run_hygiene_truth() -> List[AuditFinding]:
    findings: List[AuditFinding] = []
    for scanner in (
        scan_forbidden_markers,
        scan_temp_leftovers,
        scan_duplicate_routes,
        scan_duplicate_configs,
        scan_unresolved_imports,
        scan_circular_import_suspicion,
        scan_broken_asset_refs,
        scan_locale_registry,
        scan_contract_registry,
        scan_report_tree_mismatch,
        scan_orphan_files,
    ):
        findings.extend(scanner())
    return findings
