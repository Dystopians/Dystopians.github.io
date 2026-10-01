#!/usr/bin/env python3
"""把《现代诗歌的诗论》自学包转成网页版课程数据。

源文件：_poetics/START_HERE.md（下划线目录，Jekyll 不发布）
生成：
  poetics/course.js               课程数据：各视图的 HTML、80 道题的题面 / 两级提示 / 参考 / 检查标准、来源
  poetics/fonts/poem.woff2        朱雀仿宋子集：只收诗作、首页大字、单元标题用到的字
  poetics/fonts/poem.css          对应的 @font-face

改了 START_HERE.md 或网页里写死的标题文案后重新跑：
    python3 scripts/build-poetics.py
字体子集需要 fonttools 和 brotli：pip install fonttools brotli（没装就只生成课程数据），
以及朱雀仿宋原字体 _fonts/ZhuqueFangsong-Regular.ttf（8.8 MB，不进仓库，见下面 FONT_URL）。
不用站里现成的文悦古体仿宋：它把简体字直接映射到繁体字形（细→細、读→讀），而且转得不全，
课程原文明确按简体排印。朱雀仿宋是 SIL OFL 1.1 开源字体，许可证随子集放在 poetics/fonts/OFL.txt。

正文、题目、提示、参考一律保持原文；只改了下面 ADAPT 里那几句讲「离线文件包怎么用」的话，
因为网页版会自动保存作答和留痕，原话在网页里不再成立。
"""
import html, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_poetics/START_HERE.md")
OUT_JS = os.path.join(ROOT, "poetics/course.js")
SRC_FONT = os.path.join(ROOT, "_fonts/ZhuqueFangsong-Regular.ttf")
FONT_URL = "https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip"
OUT_FONT = os.path.join(ROOT, "poetics/fonts/poem.woff2")
OUT_FONT_CSS = os.path.join(ROOT, "poetics/fonts/poem.css")

# ---------- 网页版需要改写的几句（原文 → 新文），找不到就报错，免得源文件更新后静默失效 ----------
ADAPT = [
    ("中文主线｜10 个能力单元｜自助反馈｜离线可读",
     "中文主线｜10 个能力单元｜自助反馈｜网页版自动留痕"),
    ("核心材料、题目、答案、复查与延迟复习全部在本文件内。",
     "核心材料、题目、答案、复查与延迟复习全部在本课程网页内。"),
    ("完成四题后看[诊断答案](#a-d01)，再按逐题规则补课。",
     "完成四题后逐题核对参考，再按规则补课。"),
    ("没有设置自动提醒，需要你把实际日期写进记录。",
     "网页会以你最后完成综合验收的那天为第 0 天算出复习日，打开课程时提示；没有推送通知，日期也可以在学习记录里手动调整。"),
    ("本包不会根据阅读完成、展开答案或勾选页面自动标记掌握。下面的模板也另存为 `LEARNING_LOG.md`；复制后自行填写，网页不是会自动保存的表单。",
     "网页不会因为读完、展开答案或勾选页面就标记掌握。它只记三类事实：你写下并提交的初稿、你什么时候打开过提示与参考、你对照检查标准作出的自评；每个目标的状态都按课程规则由这些事实推出。"),
    ("**先完成初稿再查本区。**Markdown 中答案连续排在本区；一次只查一个题号，读完用“返回题目”回去。HTML 版把两级提示与参考分开折叠；先开提示 1，需要时再开提示 2，最后才开参考。",
     "**先完成初稿再看反馈。**每道题的两级提示和参考都折叠在题目下方：先开提示 1，需要时再开提示 2，最后才看参考。"),
]
# 「从这里开始」里那张文件说明表（四个文件各自怎么打开）换成网页版的说明
FILE_TABLE_RE = re.compile(r"\| 文件 \| 用途与打开方式 \|\n(?:\|.*\|\n)+")
WEB_NOTE = ("**网页版怎样留痕。**每道题下面都有作答框，写下的内容自动保存在这台设备的浏览器里，不会上传。"
            "提示与参考折叠在题目下方，什么时候打开过，网页如实记下；提交初稿后对照检查标准自评，"
            "[学习记录](#record)据此按课程规则推出每个目标的状态，也能导出 Markdown 或备份文件。"
            "换设备或清理浏览器数据之前，请先导出备份。\n")

# 「从这里开始」末尾那行文字导航：网页有自己的侧栏，这一行里还指向网页上不存在的「提示与答案」区
NAV_RE = re.compile(r"### 导航\n\[诊断与补课\].*\n")
# 侧栏里各单元的短名（取自原离线版导航）
UNIT_SHORT = {
    "u01": "诗论的边界", "u02": "细读与证据", "u03": "意象与语言变形", "u04": "分行与节奏", "u05": "主体与声音",
    "u06": "结构与时间", "u07": "难度与解释", "u08": "论争、传统与翻译", "u09": "社会与评价", "u10": "批评与修订",
}
# 顶层分区：遇到这些锚点就切到对应视图
TOP = {"start": "guide", "diagnosis": "diagnosis", "basics": "diagnosis", "anchor-poem": "anchor",
       "assessment": "assessment", "f-poem": "assessment", "exam-repair": "assessment",
       "review": "review", "record": "record", "coverage": "coverage", "feedback": "feedback",
       "sources": "sources", "optional": "sources"}
TOP.update({"u%02d" % k: "u%02d" % k for k in range(1, 11)})
STEP = {"ask": "问", "build": "建", "use": "用", "vary": "变", "keep": "留", "repair": "补"}
TASK_RE = re.compile(r"^((?:D|F|RV)\d{2}(?:-R\d{2})?|U\d{2}-[PQKR]\d{2})｜(.+)$")


def kind_of(tid):
    if re.match(r"^D\d\d$", tid): return "diag"
    if re.match(r"^D\d\d-R", tid): return "diag-r"
    if re.match(r"^F\d\d$", tid): return "final"
    if re.match(r"^F\d\d-R", tid): return "final-r"
    if tid.startswith("RV"): return "delay"
    return {"P": "predict", "K": "card", "R": "unit-r"}.get(tid[4]) or {"01": "fill", "02": "indep", "03": "vary"}[tid[5:]]


# ---------- 读入并切块 ----------
def load():
    text = io.open(SRC, encoding="utf-8").read()
    for a, b in ADAPT:
        if text.count(a) != 1:
            sys.exit("ADAPT 原文没找到或不唯一：%s" % a[:40])
        text = text.replace(a, b)
    if not FILE_TABLE_RE.search(text):
        sys.exit("没找到「从这里开始」里的文件说明表")
    text = FILE_TABLE_RE.sub(lambda m: WEB_NOTE, text, count=1)
    if not NAV_RE.search(text):
        sys.exit("没找到「从这里开始」里的文字导航")
    text = NAV_RE.sub("", text, count=1)
    return text.split("\n")


def blocks_of(lines):
    out, i, n = [], 0, len(lines)
    starts = re.compile(r"^(#{1,4} |```|>|\||<a id=|<!--fold|---\s*$)")
    while i < n:
        s = lines[i]
        if not s.strip():
            i += 1; continue
        m = re.match(r'^<a id="([^"]+)"></a>$', s.strip())
        if m:
            out.append(("anchor", m.group(1))); i += 1; continue
        m = re.match(r"^<!--fold-(start|end):([^:]+):(\w+)-->$", s.strip())
        if m:
            out.append(("fold", m.group(1), m.group(2), m.group(3))); i += 1; continue
        if s.startswith("```"):
            j, body = i + 1, []
            while not lines[j].startswith("```"):
                body.append(lines[j]); j += 1
            out.append(("code", body)); i = j + 1; continue
        m = re.match(r"^(#{1,4}) (.*)$", s)
        if m:
            out.append(("h", len(m.group(1)), m.group(2).strip())); i += 1; continue
        if s.strip() == "---":
            out.append(("hr",)); i += 1; continue
        if s.startswith(">"):
            body = []
            while i < n and lines[i].startswith(">"):
                body.append(re.sub(r"^>\s?", "", lines[i])); i += 1
            out.append(("quote", body)); continue
        if s.startswith("|"):
            body = []
            while i < n and lines[i].startswith("|"):
                body.append(lines[i]); i += 1
            out.append(("table", body)); continue
        body = []
        while i < n and lines[i].strip() and not starts.match(lines[i]):
            body.append(lines[i]); i += 1
        out.append(("p", body))
    return out


# ---------- 行内 ----------
ANCHOR_VIEW = {}   # 锚点 → 视图
LINK_FIX = {}      # 反馈区锚点（a-*/h-*/feedback-*）→ 对应题目锚点 q-*
MISSING = set()


def href_for(target):
    t = LINK_FIX.get(target, target)
    v = ANCHOR_VIEW.get(t)
    if v is None or v in ("feedback", "coverage"):
        MISSING.add(target); return "#/"
    return "#/%s" % v if t == v or t in TOP else "#/%s/%s" % (v, t)


def inline(s):
    s = html.escape(s, quote=False)
    def link(m):
        text, url = m.group(1), m.group(2)
        if url.startswith("#"):
            a = url[1:]
            if a.startswith("src-"):
                return '<a class="src" href="%s" data-src="%s">%s</a>' % (href_for(a), a, text)
            return '<a href="%s">%s</a>' % (href_for(a), text)
        return '<a href="%s" target="_blank" rel="noopener">%s</a>' % (html.escape(url), text)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![*\w])\*([^*\s][^*]*?)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return s


def para_text(lines):
    out = ""
    for k, ln in enumerate(lines):
        brk = ln.endswith("  ")
        out += inline(ln.rstrip())
        if k < len(lines) - 1:
            out += "<br>" if brk else ""
    return out


PARA_CLASS = [
    (r"^\*\*通关规则：\*\*", "rule"), (r"^所有单元共同适用：", "note"), (r"^\*\*错误分流：\*\*", "branch"),
    (r"^补救短讲：", "mini"), (r"^复查时关闭提示和答案", "note"), (r"^\*\*(适用)?边界：\*\*", "bound"),
    (r"^\*\*本单元目标：\*\*", "goal"), (r"^\*\*必要前置：\*\*", "pre"),
]


def render_para(lines):
    raw = "\n".join(lines)
    cls = next((c for pat, c in PARA_CLASS if re.match(pat, raw)), None)
    return '<p%s>%s</p>' % (' class="%s"' % cls if cls else "", para_text(lines))


def is_latin(lines):
    t = "".join(lines)
    return sum(ch.isascii() and ch.isalpha() for ch in t) > len(t) * 0.5


def render_quote(lines):
    rows = "".join('<div class="pl">%s</div>' % inline(l.rstrip()) if l.strip() else '<div class="gap"></div>' for l in lines)
    return '<figure class="poem%s">%s</figure>' % (" latin" if is_latin(lines) else "", rows)


def render_code(lines):
    if any("↓" in l for l in lines):           # 学习地图：网页里换成可点的地图
        return '<div class="course-map" data-map></div>'
    rows = []
    for l in lines:
        if not l.strip():
            rows.append('<div class="gap"></div>'); continue
        m = re.match(r"^(\d{1,2})\s+(.*)$", l)
        if m:
            rows.append('<div class="pl"><span class="ln">%s</span><span class="tx">%s</span></div>' % (m.group(1), inline(m.group(2))))
        else:                                      # 「第一节」这类节号
            rows.append('<div class="stanza">%s</div>' % inline(l.strip()))
    return '<figure class="poem numbered">%s</figure>' % "".join(rows)


def table_cells(rows):
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    return cells[0], [c for c in cells[2:]]


def render_table(rows):
    head, body = table_cells(rows)
    th = "".join("<th>%s</th>" % inline(c) for c in head)
    tb = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % inline(c) for c in r) for r in body)
    return '<div class="tbl"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, tb)


# ---------- 分视图 ----------
def split_views(blocks):
    views, order, cur = {}, [], "intro"
    views[cur] = []; order.append(cur)
    for b in blocks:
        if b[0] == "anchor" and b[1] in TOP:
            v = TOP[b[1]]
            if v not in views:
                views[v] = []; order.append(v)
            cur = v
        views[cur].append(b)
    return views, order


def collect_anchors(views):
    for v, blocks in views.items():
        for b in blocks:
            if b[0] == "anchor":
                ANCHOR_VIEW[b[1]] = v
    for a in list(ANCHOR_VIEW):
        m = re.match(r"^(a|h|feedback)-(.+)$", a)
        if m and ANCHOR_VIEW[a] == "feedback":
            LINK_FIX[a] = "q-" + m.group(2)
    # 学习记录里的「总览对照」在网页上并进学习记录页
    for a, v in list(ANCHOR_VIEW.items()):
        if v == "coverage":
            ANCHOR_VIEW[a] = "record"
    ANCHOR_VIEW["record"] = "record"


def word_ranges(text):
    t = re.sub(r"<[^>]+>", "", text)
    out = [[int(a), int(b)] for a, b in re.findall(r"(\d+)[–-](\d+)\s?字", t)]
    out += [[0, int(a)] for a in re.findall(r"不超过\s?(\d+)\s?字", t)]
    out += [[0, int(a)] for a in re.findall(r"(\d+)\s?字以内", t)]
    return out


def render_view(vid, blocks, tasks):
    """把一个视图的块渲染成 HTML；题目只留占位，题面存进 tasks。"""
    html_out, i, n = [], 0, len(blocks)
    pending_id, step_open, demo_open = None, False, False

    def close_demo():
        nonlocal demo_open
        if demo_open:
            html_out.append("</div>"); demo_open = False

    while i < n:
        b = blocks[i]
        if b[0] == "anchor":
            close_demo()
            pending_id = b[1]
            m = re.match(r"^u\d\d-(ask|build|use|vary|keep|repair)$", b[1])
            if m:
                if step_open:
                    html_out.append("</section>")
                html_out.append('<section class="step" data-step="%s" id="%s">' % (STEP[m.group(1)], b[1]))
                step_open, pending_id = True, None
            i += 1; continue
        if b[0] == "h":
            close_demo()
            level, text = b[1], b[2]
            m = TASK_RE.match(text) if level == 4 else None
            if m:
                tid, title = m.group(1), m.group(2)
                j, prompt, fields = i + 1, [], None
                while j < n and blocks[j][0] not in ("anchor", "h"):
                    bj = blocks[j]
                    if bj[0] == "p" and bj[1][0].startswith("[后置"):
                        j += 1; break
                    if bj[0] == "table" and table_cells(bj[1])[0][1:] == ["我的填写"]:
                        fields = [r[0] for r in table_cells(bj[1])[1]]
                    elif bj[0] == "p":
                        prompt.append(render_para(bj[1]))
                    elif bj[0] == "quote":
                        prompt.append(render_quote(bj[1]))
                    elif bj[0] == "table":
                        prompt.append(render_table(bj[1]))
                    elif bj[0] == "code":
                        prompt.append(render_code(bj[1]))
                    j += 1
                anchor = pending_id or "q-" + tid.lower()
                ph = "".join(prompt)
                tasks[tid] = {"id": tid, "title": title, "kind": kind_of(tid), "view": vid, "anchor": anchor,
                              "prompt": ph, "fields": fields, "ranges": word_ranges(ph)}
                html_out.append('<div class="task" data-task="%s" id="%s"></div>' % (tid, anchor))
                pending_id, i = None, j
                continue
            tag = {1: "h1", 2: "h2", 3: "h3", 4: "h4"}[level]
            idattr = ' id="%s"' % pending_id if pending_id else ""
            if level == 2 and re.match(r"^u\d\d$", vid) and pending_id == vid:
                html_out.append('<header class="unit-head" data-unit="%s" id="%s"></header>' % (vid, vid))
                pending_id = None
                i += 1; continue
            if level == 2 and "｜" in text:
                a, c = text.split("｜", 1)
                html_out.append('<h2 class="h2"%s><span class="h-main">%s</span><span class="h-sub">%s</span></h2>' % (idattr, inline(a), inline(c)))
                pending_id = None
                i += 1; continue
            if level == 3 and step_open and re.match(r"^(问|建|用|变|留)｜", text):
                k, rest = text.split("｜", 1)
                html_out.append('<h2 class="step-h"%s><span class="step-k">%s</span>%s</h2>' % (idattr, k, inline(rest)))
            elif level == 3 and step_open and text == "补救与复查入口":
                html_out.append('<h2 class="step-h"%s><span class="step-k">补</span>%s</h2>' % (idattr, inline(text)))
            else:
                html_out.append("<%s%s>%s</%s>" % (tag, idattr, inline(text), tag))
            pending_id = None
            i += 1; continue
        if vid == "record" and (b[0] == "table" or (b[0] == "p" and b[1][0].startswith("**单次回顾"))):
            if b[0] == "table" and "data-record" not in "".join(html_out):
                html_out.append('<div class="record-app" data-record></div>')
            i += 1; continue
        if b[0] == "p":
            raw = "\n".join(b[1])
            m = re.match(r"^\*\*完整示范｜(.+?)\*\*$", raw)
            if m:
                close_demo()
                html_out.append('<div class="demo"><div class="demo-k">完整示范</div><h4>%s</h4>' % inline(m.group(1).rstrip("。")))
                demo_open = True
            else:
                html_out.append(render_para(b[1]))
        elif b[0] == "quote":
            html_out.append(render_quote(b[1]))
        elif b[0] == "table":
            html_out.append(render_table(b[1]))
        elif b[0] == "code":
            html_out.append(render_code(b[1]))
        i += 1
    close_demo()
    if step_open:
        html_out.append("</section>")
    return "".join(html_out)


def parse_feedback(blocks, tasks):
    cur, buf = None, []
    for b in blocks:
        if b[0] == "fold" and b[1] == "start":
            cur, buf = (b[2], b[3]), []
        elif b[0] == "fold" and b[1] == "end":
            tid, kind = cur
            if tid not in tasks:
                sys.exit("反馈里有题号 %s，正文却没有这道题" % tid)
            paras = [x for x in buf if x[0] != "anchor"]
            if kind in ("hint1", "hint2"):
                if paras and paras[0][0] == "p" and paras[0][1][0].startswith("**提示"):
                    paras = paras[1:]
                tasks[tid][kind] = "".join(render_any(x) for x in paras)
            else:
                cut = next((k for k, x in enumerate(paras) if x[0] == "p" and "\n".join(x[1]) == "**检查标准与分流**"), None)
                if cut is None:
                    sys.exit("%s 的参考里没有「检查标准与分流」" % tid)
                body = paras[:cut]
                if body and body[0][0] == "p" and "\n".join(body[0][1]) == "**参考解析／可接受表现**":
                    body = body[1:]
                tasks[tid]["answer"] = "".join(render_any(x) for x in body)
                tasks[tid]["standard"] = "".join(render_any(x) for x in paras[cut + 1:])
            cur = None
        elif cur:
            buf.append(b)


def render_any(b):
    return {"p": lambda: render_para(b[1]), "quote": lambda: render_quote(b[1]),
            "table": lambda: render_table(b[1]), "code": lambda: render_code(b[1])}.get(b[0], lambda: "")()


def parse_goals(record_blocks, coverage_blocks):
    names = {}
    for b in record_blocks:
        if b[0] == "table":
            head, body = table_cells(b[1])
            if head[0] == "目标":
                for r in body:
                    gid, name = r[0].split(" ", 1)
                    names[gid] = name
    goals = []
    for b in coverage_blocks:
        if b[0] != "table":
            continue
        head, body = table_cells(b[1])
        for r in body:
            gid, desc = r[0].split(" ", 1)
            ids = lambda cell: [a.upper() for a in re.findall(r"\(#q-([a-z0-9-]+)\)", cell)]
            unit = re.search(r"\(#(u\d\d)\)", r[1]).group(1)
            goals.append({"id": gid, "name": names.get(gid, desc), "desc": desc, "unit": unit,
                          "action": re.sub(r"^\[[^\]]+\]\([^)]+\)：", "", r[1]),
                          "checks": ids(r[2]), "finals": ids(r[3]), "delays": ids(r[4])})
    if len(goals) != 10:
        sys.exit("总览对照表应有 10 个目标，实际 %d" % len(goals))
    return goals


def parse_sources(blocks):
    out, cur = [], None
    for b in blocks:
        if b[0] == "h" and b[1] == 3:
            m = re.match(r"^(S\d\d)　(.+)$", b[2])
            if m:
                cur = {"id": m.group(1), "title": inline(m.group(2)), "url": "", "desc": ""}
                out.append(cur)
                continue
        if b[0] == "h" and b[1] == 2:
            cur = None
        if cur and b[0] == "p":
            raw = "\n".join(b[1])
            m = re.match(r"^\[核查来源\]\((\S+)\)$", raw)
            if m:
                cur["url"] = m.group(1)
            else:
                cur["desc"] += render_para(b[1])
    return out


def main():
    lines = load()
    blocks = blocks_of(lines)
    views, order = split_views(blocks)
    collect_anchors(views)
    tasks = {}

    # 开头（标题、副标题、四段说明）
    intro = views.pop("intro")
    title = next(b[2] for b in intro if b[0] == "h" and b[1] == 1)
    subtitle = next(b[2] for b in intro if b[0] == "h" and b[1] == 2)
    intro_paras = [b for b in intro if b[0] == "p"]
    tagline = para_text(intro_paras[0][1])
    about = "".join(render_para(b[1]) for b in intro_paras[1:])

    out_views = {}
    for vid in order:
        if vid in ("intro", "feedback", "coverage"):
            continue
        out_views[vid] = render_view(vid, views[vid], tasks)
    parse_feedback(views["feedback"], tasks)
    # 反馈区开头那三段讲怎么用提示与参考：放进「从这里开始」
    fb_intro = []
    for b in views["feedback"]:
        if b[0] == "h" and b[1] == 3:
            break
        if b[0] == "p":
            fb_intro.append(render_para(b[1]))
    coverage_notes = [render_para(b[1]) for b in views["coverage"] if b[0] == "p"]
    sources = parse_sources(views["sources"])
    goals = parse_goals(views["record"], views["coverage"])

    for tid, t in tasks.items():
        if "answer" not in t:
            sys.exit("%s 没有参考答案" % tid)
        t.setdefault("hint1", None); t.setdefault("hint2", None)

    units = [{"id": "u%02d" % k, "no": "U%02d" % k, "short": UNIT_SHORT["u%02d" % k]} for k in range(1, 11)]
    for u in units:
        h = next(b[2] for b in views[u["id"]] if b[0] == "h" and b[1] == 2)
        full = h.split("　", 1)[1]
        u["title"], u["sub"] = (full.split("：", 1) + [""])[:2]
        u["tasks"] = [tid for tid, t in tasks.items() if t["view"] == u["id"]]

    data = {
        "title": title, "subtitle": subtitle, "tagline": tagline, "about": about,
        "views": out_views, "feedbackNotes": "".join(fb_intro), "coverageNotes": "".join(coverage_notes),
        "units": units, "goals": goals, "tasks": tasks, "sources": sources, "anchors": ANCHOR_VIEW,
    }
    if MISSING:
        sys.exit("这些内部链接找不到目标：%s" % ", ".join(sorted(MISSING)))
    js = "// 由 scripts/build-poetics.py 从 _poetics/START_HERE.md 生成，请勿手改\nexport default " + \
        json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    if "{{" in js or "{%" in js:
        sys.exit("生成结果里出现了 Liquid 记号，Jekyll 会误处理")
    io.open(OUT_JS, "w", encoding="utf-8").write(js)
    kinds = {}
    for t in tasks.values():
        kinds[t["kind"]] = kinds.get(t["kind"], 0) + 1
    print("课程数据：%d 个视图、%d 道题 %s、%d 条来源 → %s（%.0f KB）" % (
        len(out_views), len(tasks), kinds, len(sources), os.path.relpath(OUT_JS, ROOT), os.path.getsize(OUT_JS) / 1024))
    build_font(data)


# ---------- 字体子集 ----------
# 仿宋用在诗作、首页大字、各级标题、题目名和界面上的标题文字上；正文和按钮用系统黑体。
# 收字范围：课程里的诗、标题、题目名，加上 app.js 里写死的界面文字（去掉注释），
# 免得某个标题里有字不在子集，落到别的字体，一行里出现两种字形
UI_SRC = os.path.join(ROOT, "poetics/app.js")


def font_chars(data):
    text = data["title"] + data["subtitle"] + data["tagline"]
    for part in list(data["views"].values()) + [t["prompt"] + (t.get("answer") or "") for t in data["tasks"].values()]:
        for m in re.finditer(r'<figure class="poem[^"]*">(.*?)</figure>', part):
            text += m.group(1)
        for m in re.finditer(r"<h[1-4][^>]*>(.*?)</h[1-4]>", part):
            text += m.group(1)
    for t in data["tasks"].values():
        text += t["id"] + t["title"]
    for u in data["units"]:
        text += u["no"] + u["title"] + u["sub"] + u["short"]
    for g in data["goals"]:
        text += g["id"] + g["name"] + g["desc"]
    if os.path.exists(UI_SRC):
        js = io.open(UI_SRC, encoding="utf-8").read()
        js = re.sub(r"/\*[\s\S]*?\*/", "", js)
        js = re.sub(r"(^|\s)//.*$", "", js, flags=re.M)
        text += "".join(re.findall(r"'[^'\n]*'|`[^`]*`|\"[^\"\n]*\"", js))
    used = set(html.unescape(re.sub(r"<[^>]+>", "", text)))
    extra = set(chr(c) for c in range(0x20, 0x7F)) | set("，。、；：？！“”‘’（）《》〈〉—…·「」『』　｜／→←↗×＋−－")
    return used, used | extra


def ranges(cps):
    out, start, prev = [], None, None
    for cp in sorted(cps):
        if start is None:
            start = prev = cp
        elif cp == prev + 1:
            prev = cp
        else:
            out.append((start, prev)); start = prev = cp
    if start is not None:
        out.append((start, prev))
    return ", ".join("U+%04X" % a if a == b else "U+%04X-%04X" % (a, b) for a, b in out)


def build_font(data):
    try:
        from fontTools.ttLib import TTFont
        from fontTools import subset
    except ImportError:
        print("（没装 fonttools，跳过字体子集）"); return
    if not os.path.exists(SRC_FONT):
        print("（找不到 %s，跳过字体子集。原字体从这里下载解压：%s）" % (os.path.relpath(SRC_FONT, ROOT), FONT_URL)); return
    font = TTFont(SRC_FONT, lazy=True)
    cmap = set()
    for t in font["cmap"].tables:
        cmap |= set(t.cmap.keys())
    used, chars = font_chars(data)
    have = sorted(c for c in chars if ord(c) in cmap)
    missing = sorted(c for c in used if ord(c) not in cmap and c.strip() and ord(c) > 0x2E80)
    subset.main([SRC_FONT, "--output-file=" + OUT_FONT, "--flavor=woff2",
                 "--unicodes=" + ",".join("U+%04X" % ord(c) for c in have)])
    css = ("/* 由 scripts/build-poetics.py 生成，请勿手改。朱雀仿宋（SIL OFL 1.1，见 OFL.txt）子集：%d 字 */\n"
           "@font-face { font-family: 'PoemFangSong'; src: url('poem.woff2') format('woff2'); font-weight: 400; font-display: swap;\n"
           "  unicode-range: %s; }\n" % (len(have), ranges(ord(c) for c in have)))
    io.open(OUT_FONT_CSS, "w", encoding="utf-8").write(css)
    print("字体子集：%d 字 → %.0f KB" % (len(have), os.path.getsize(OUT_FONT) / 1024))
    if missing:
        print("⚠️ 朱雀仿宋缺这 %d 个字，会落到系统字体：%s" % (len(missing), "".join(missing)))

if __name__ == "__main__":
    main()
