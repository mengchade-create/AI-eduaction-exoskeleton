"""Daily collaboration helpers for ExoKids.

The script intentionally uses only the Python standard library so it can run in
fresh workspaces before project dependencies are installed.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
NEXT = ROOT / "NEXT.md"
TODAY = ROOT / "TODAY.md"
SELF_TEST_SECTION = """---

## 自测要求（所有 PR 强制，不允许跳过）

完成后在 PR 描述里贴：
1. `tree <本 PR 涉及目录>` 输出
2. 所有新增/修改的测试命令的完整输出（pytest / vitest / 等）
3. lint 和 type check 输出
4. 沙盒内无法跑 docker 时，用等价方式验证（httpx ASGITransport / 单元测试 mock 等），贴证据
5. 任何"无法验证"的声明必须给出替代验证路径
"""


@dataclass
class PrBlock:
    """A parsed PR block from a phase plan."""

    number: int
    title: str
    status: str
    branch: str
    target: str
    deliverables: str
    notes: str
    acceptance: str
    boundaries: str
    body: str
    start: int
    end: int

    @property
    def label(self) -> str:
        """Return a stable PR label such as PR2."""

        return f"PR{self.number}"


def run(cmd: list[str], check: bool = False) -> subprocess.CompletedProcess[str]:
    """Run a command from the repository root."""

    return subprocess.run(
        cmd,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=check,
    )


def friendly_error(message: str) -> int:
    """Print a parser-friendly error without a traceback."""

    print(f"daily.py: {message}")
    print("请检查 docs/phase-<N>-plan.md 是否符合 SOP 中的固定格式。")
    return 1


def repo_path(path: Path) -> str:
    """Return a repository-relative path for display."""

    return path.relative_to(ROOT).as_posix()


def phase_number(path: Path) -> int:
    """Extract the phase number from docs/phase-N-plan.md."""

    match = re.search(r"phase-(\d+)-plan\.md$", path.name)
    return int(match.group(1)) if match else -1


def extract_field(body: str, field: str) -> str:
    """Extract one bold field from a PR body."""

    pattern = re.compile(
        rf"^\*\*{re.escape(field)}\*\*:\s*(.*?)(?=^\*\*[^*\n]+\*\*:|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    match = pattern.search(body)
    return match.group(1).strip() if match else ""


def parse_plan(path: Path) -> list[PrBlock]:
    """Parse all PR sections from a phase plan document."""

    text = path.read_text(encoding="utf-8")
    matches = list(re.finditer(r"^## PR(\d+):\s*(.+)$", text, re.MULTILINE))
    if not matches:
        raise ValueError(f"{path} 中没有找到 `## PR<N>:` 段落")

    blocks: list[PrBlock] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end() : end].strip()
        status = extract_field(body, "状态")
        branch = extract_field(body, "分支")
        if status not in {"done", "in-progress", "pending", "blocked"}:
            raise ValueError(f"{path} 的 PR{match.group(1)} 状态无效：{status!r}")
        if not branch:
            raise ValueError(f"{path} 的 PR{match.group(1)} 缺少分支字段")
        blocks.append(
            PrBlock(
                number=int(match.group(1)),
                title=match.group(2).strip(),
                status=status,
                branch=branch,
                target=extract_field(body, "目标"),
                deliverables=extract_field(body, "交付物"),
                notes=extract_field(body, "实现要点"),
                acceptance=extract_field(body, "验收"),
                boundaries=extract_field(body, "边界"),
                body=body,
                start=start,
                end=end,
            )
        )
    return blocks


def plan_docs() -> list[Path]:
    """Return phase plan documents in newest-first order."""

    return sorted(DOCS.glob("phase-*-plan.md"), key=phase_number, reverse=True)


def find_active_plan() -> tuple[Path, list[PrBlock]] | tuple[None, list[PrBlock]]:
    """Find the newest phase plan that still has pending work."""

    last: tuple[Path, list[PrBlock]] | None = None
    for path in plan_docs():
        blocks = parse_plan(path)
        last = (path, blocks)
        if any(block.status == "pending" for block in blocks):
            return path, blocks
    return last if last else (None, [])


def find_plan_for_pr(number: int) -> tuple[Path, list[PrBlock], PrBlock] | None:
    """Find the newest plan containing a PR number."""

    for path in plan_docs():
        blocks = parse_plan(path)
        for block in blocks:
            if block.number == number:
                return path, blocks, block
    return None


def print_plan(path: Path, blocks: list[PrBlock]) -> None:
    """Print a compact PR table."""

    print(f"PHASE_DOC={repo_path(path)}")
    print("PR号 | 标题 | 状态 | 分支")
    print("--- | --- | --- | ---")
    for block in blocks:
        print(f"{block.label} | {block.title} | {block.status} | {block.branch}")


def cmd_plan(_: argparse.Namespace) -> int:
    """Handle `plan`."""

    try:
        path, blocks = find_active_plan()
    except ValueError as exc:
        return friendly_error(str(exc))
    if path is None:
        print("没有找到 docs/phase-*-plan.md。")
        return 0
    print_plan(path, blocks)
    return 0


def next_pending() -> tuple[Path | None, PrBlock | None]:
    """Return the next pending PR in the active plan."""

    path, blocks = find_active_plan()
    if path is None:
        return None, None
    for block in blocks:
        if block.status == "pending":
            return path, block
    return path, None


def cmd_next(_: argparse.Namespace) -> int:
    """Handle `next`."""

    try:
        path, block = next_pending()
    except ValueError as exc:
        return friendly_error(str(exc))
    if path is None:
        print("ALL_DONE=true")
        print("没有找到 Phase 计划文档，请先规划 Phase。")
        return 0
    if block is None:
        print("ALL_DONE=true")
        print("该规划下一个 Phase")
        return 0
    print(f"NEXT_PR={block.label}")
    print(f"NEXT_TITLE={block.title}")
    print(f"NEXT_BRANCH={block.branch}")
    print(f"PHASE_DOC={repo_path(path)}")
    return 0


def render_template(template: str, block: PrBlock, phase_doc: Path) -> str:
    """Fill a PR template with a parsed PR block."""

    replacements = {
        "PR_LABEL": block.label,
        "TITLE": block.title,
        "BRANCH": block.branch,
        "PHASE_DOC": repo_path(phase_doc),
        "TARGET": block.target,
        "DELIVERABLES": block.deliverables,
        "NOTES": block.notes,
        "ACCEPTANCE": block.acceptance,
        "BOUNDARIES": block.boundaries,
    }
    rendered = template
    for key, value in replacements.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", value)
    return rendered.strip()


def next_header(phase_doc: Path, block: PrBlock) -> str:
    """Build the generated file header."""

    stamp = datetime.now().astimezone().isoformat(timespec="seconds")
    return f"<!-- 由 ops/daily.py draft-next 从 {repo_path(phase_doc)} 生成于 {stamp}; PR={block.label} -->"


def draft_next(number: int | None, force: bool, extra_note: str = "") -> tuple[bool, str]:
    """Generate NEXT.md for a PR."""

    if number is None:
        phase_doc, block = next_pending()
        if phase_doc is None or block is None:
            return False, "没有可生成的 pending PR。"
    else:
        found = find_plan_for_pr(number)
        if found is None:
            return False, f"没有找到 PR{number}。"
        phase_doc, _, block = found

    if NEXT.exists() and NEXT.read_text(encoding="utf-8").strip() and not force:
        return False, "NEXT.md 已存在且非空；如需覆盖请加 --force。"
    if NEXT.exists() and NEXT.read_text(encoding="utf-8").strip() and force:
        shutil.copyfile(NEXT, ROOT / "NEXT.md.bak")

    template_path = DOCS / "pr-template.md"
    if not template_path.exists():
        return False, "缺少 docs/pr-template.md。"
    content = render_template(template_path.read_text(encoding="utf-8"), block, phase_doc)
    if extra_note:
        content = f"{content}\n\n## 额外备注\n\n{extra_note.strip()}"
    if "## 自测要求（所有 PR 强制，不允许跳过）" not in content:
        content = f"{content}\n\n{SELF_TEST_SECTION.strip()}"
    content = f"{next_header(phase_doc, block)}\n\n{content.rstrip()}\n"
    NEXT.write_text(content, encoding="utf-8", newline="\n")
    return True, f"已生成 NEXT.md -> {block.label}: {block.title}"


def cmd_draft_next(args: argparse.Namespace) -> int:
    """Handle `draft-next`."""

    try:
        ok, message = draft_next(args.pr, args.force)
    except ValueError as exc:
        return friendly_error(str(exc))
    print(message)
    return 0 if ok else 1


def mark_done(number: int) -> tuple[bool, str]:
    """Mark a PR as done and commit the plan change."""

    found = find_plan_for_pr(number)
    if found is None:
        return False, f"没有找到 PR{number}。"
    path, _, block = found
    if block.status == "done":
        return True, f"PR{number} 已经是 done，跳过。"

    text = path.read_text(encoding="utf-8")
    section = text[block.start : block.end]
    new_section, count = re.subn(
        r"^\*\*状态\*\*:\s*(done|in-progress|pending|blocked)\s*$",
        "**状态**: done",
        section,
        count=1,
        flags=re.MULTILINE,
    )
    if count != 1:
        return False, f"PR{number} 的状态行无法更新。"
    path.write_text(text[: block.start] + new_section + text[block.end :], encoding="utf-8", newline="\n")

    rel_path = repo_path(path)
    run(["git", "add", rel_path])
    commit = run(["git", "commit", "-m", f"chore: mark PR{number} as done in phase plan", "--", rel_path])
    if commit.returncode != 0:
        return False, commit.stdout.strip()
    return True, commit.stdout.strip()


def cmd_mark_done(args: argparse.Namespace) -> int:
    """Handle `mark-done`."""

    try:
        ok, message = mark_done(args.pr)
    except ValueError as exc:
        return friendly_error(str(exc))
    print(message)
    return 0 if ok else 1


def next_file_pr() -> str | None:
    """Read the generated PR label from NEXT.md header."""

    if not NEXT.exists():
        return None
    first_line = NEXT.read_text(encoding="utf-8").splitlines()[0:1]
    if not first_line:
        return None
    match = re.search(r"PR=PR(\d+)", first_line[0])
    return f"PR{match.group(1)}" if match else None


def ask(prompt: str, yes: bool, default: str = "") -> str:
    """Prompt with a default that is used in --yes mode."""

    if yes:
        print(f"{prompt}{default}")
        return default
    return input(prompt)


def cmd_start(_: argparse.Namespace) -> int:
    """Print the current start-of-day context."""

    print("开工检查")
    if NEXT.exists() and NEXT.read_text(encoding="utf-8").strip():
        print("NEXT.md:")
        print(NEXT.read_text(encoding="utf-8"))
    else:
        print("NEXT.md 不存在或为空，请先运行 python ops/daily.py next。")
    status = run(["git", "status", "--short", "--branch"])
    print(status.stdout.strip())
    return 0


def check_worktree() -> None:
    """Print working tree and upstream status."""

    print("工作区状态:")
    print(run(["git", "status", "--short", "--branch"]).stdout.strip())
    print("未推送 commit:")
    ahead = run(["git", "log", "--oneline", "@{u}..HEAD"])
    print(ahead.stdout.strip() if ahead.returncode == 0 and ahead.stdout.strip() else "无或未设置 upstream")


def cmd_end(args: argparse.Namespace) -> int:
    """Handle end-of-day workflow."""

    check_worktree()
    merged = ask("今天合并了哪些 PR？（输入编号，逗号分隔，回车跳过）", args.yes, "")
    if merged.strip():
        for item in re.split(r"\s*,\s*", merged.strip()):
            if item:
                ok, message = mark_done(int(item))
                print(message)
                if not ok:
                    return 1

    try:
        phase_doc, block = next_pending()
    except ValueError as exc:
        return friendly_error(str(exc))
    if block is not None:
        if next_file_pr() == block.label:
            print(f"NEXT.md 已指向 {block.label}，跳过生成。")
        else:
            reply = ask(
                f"是否自动生成 NEXT.md 为 {block.label}: {block.title}？[Y/n/自定义]",
                args.yes,
                "Y",
            ).strip()
            if reply in {"", "Y", "y"}:
                print(draft_next(block.number, True)[1])
            elif reply in {"N", "n"}:
                print("跳过 NEXT.md 生成。")
            else:
                print(draft_next(block.number, True, reply)[1])
    elif phase_doc is not None:
        print("ALL_DONE=true，该规划下一个 Phase。")

    summary = ask("今天做了什么？一句话总结", args.yes, "")
    if summary.strip():
        stamp = datetime.now().astimezone().isoformat(timespec="seconds")
        with TODAY.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(f"- {stamp} {summary.strip()}\n")

    should_commit = ask('是否执行 git add -A && git commit -m "docs: daily log" && git push？[Y/n]', args.yes, "Y")
    if should_commit.strip() in {"", "Y", "y"}:
        run(["git", "add", "-A"])
        diff = run(["git", "diff", "--cached", "--quiet"])
        if diff.returncode == 0:
            print("没有待提交的收工记录。")
            return 0
        commit = run(["git", "commit", "-m", "docs: daily log"])
        print(commit.stdout.strip())
        if commit.returncode != 0:
            return commit.returncode
        push = subprocess.run(["git", "push"], cwd=ROOT)
        return push.returncode
    return 0


def build_parser() -> argparse.ArgumentParser:
    """Build the command parser."""

    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    plan = sub.add_parser("plan")
    plan.set_defaults(func=cmd_plan)

    next_cmd = sub.add_parser("next")
    next_cmd.set_defaults(func=cmd_next)

    draft = sub.add_parser("draft-next")
    draft.add_argument("--pr", type=int)
    draft.add_argument("--force", action="store_true")
    draft.set_defaults(func=cmd_draft_next)

    mark = sub.add_parser("mark-done")
    mark.add_argument("--pr", type=int, required=True)
    mark.set_defaults(func=cmd_mark_done)

    start = sub.add_parser("start")
    start.set_defaults(func=cmd_start)

    end = sub.add_parser("end")
    end.add_argument("--yes", action="store_true")
    end.set_defaults(func=cmd_end)
    return parser


def main(argv: list[str] | None = None) -> int:
    """Entrypoint."""

    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
