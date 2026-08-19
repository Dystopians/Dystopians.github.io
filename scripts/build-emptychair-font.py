#!/usr/bin/env python3
"""为 Empty Chair 页面生成字体子集。

原始的 WenYue_GuTiFangSong_F.otf 有 16.3 MB，浏览器要等它下完才能换上正确的字体，
所以页面总是先闪一下后备字体。这个脚本把它裁到页面真正用到的那几百个字（约 500 KB），
并生成 _includes/emptychair-fonts.html（预加载 + @font-face + 首屏加载逻辑）。

改完诗稿或页面文案后重新跑一次：
    python3 scripts/build-emptychair-font.py

需要 fonttools 和 brotli：pip install fonttools brotli
"""
import io, os, re, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 原始字体放在 _fonts/：下划线开头的目录 Jekyll 不会发布，
# 所以这份 16 MB 的商业字体留在仓库里可以重新生成子集，但不会挂到公网上。
SRC_FONT = os.path.join(ROOT, "_fonts/WenYue_GuTiFangSong_F.otf")
OUT_FONT = os.path.join(ROOT, "assets/fonts/wenyue-emptychair.woff2")
FALLBACK = "assets/fonts/wenyue-fallback.woff2"          # 字库缺字用，Noto Serif SC 子集
OUT_INC  = os.path.join(ROOT, "_includes/emptychair-fonts.html")
SOURCES  = ["EmptyChair/index.html", "_layouts/emptychair.html",
            "_includes/poems/ChaoCuoYao.md", "_includes/poems/MaoRenShuKu.md"]
# 余量：ASCII + 常用中文标点，避免以后改一两个字就得重新生成
EXTRA = set(chr(c) for c in range(0x20, 0x7F)) | set(
    "，。、；：？！“”‘’（）《》〈〉—…·「」『』【】〔〕％＋－×÷＝　～｜／＼＿°")
# 兜底字体用的是 Noto Serif SC 的 Light(300)：文悦古体仿宋笔画很细，
# 用 Regular(400) 兜底会在句子中间冒出几个明显更黑的字。
# 字面上文悦比 Noto 大约 6%，正文字号下放大 4% 已经足够，再多就会让缺字显得突出。
FALLBACK_WEIGHT = 300
FALLBACK_SIZE_ADJUST = "104%"


def page_chars():
    """返回 (页面真正用到的字, 连同余量一起要收进子集的字)。"""
    text = ""
    for rel in SOURCES:
        p = os.path.join(ROOT, rel)
        if os.path.exists(p):
            text += io.open(p, encoding="utf-8").read()
    text = re.sub(r"<style[\s\S]*?</style>|<script[\s\S]*?</script>", "", text)
    text = re.sub(r"<[^>]+>", " ", text)          # 标签名不会显示
    text = re.sub(r"\{[\{%][\s\S]*?[\}%]\}", " ", text)  # Liquid 语法不会显示
    used = set(text)
    return used, used | EXTRA


def ranges(codepoints):
    """把码位压成 U+A-B 形式，别让 unicode-range 太长。"""
    out, start, prev = [], None, None
    for cp in sorted(codepoints):
        if start is None:
            start = prev = cp
        elif cp == prev + 1:
            prev = cp
        else:
            out.append((start, prev)); start = prev = cp
    if start is not None:
        out.append((start, prev))
    return ", ".join("U+%04X" % a if a == b else "U+%04X-%04X" % (a, b) for a, b in out)


def main():
    from fontTools.ttLib import TTFont
    from fontTools import subset

    if not os.path.exists(SRC_FONT):
        sys.exit("找不到原始字体：%s" % SRC_FONT)

    font = TTFont(SRC_FONT, lazy=True)
    cmap = set()
    for t in font["cmap"].tables:
        cmap |= set(t.cmap.keys())

    used, wanted = page_chars()
    have = sorted(c for c in wanted if ord(c) in cmap)
    # 缺字只看页面真正用到的内容，余量里的冷僻标点不必单独兜底
    missing = sorted(c for c in used if ord(c) not in cmap and c.strip() and ord(c) > 0x2E80)

    subset.main([SRC_FONT, "--output-file=" + OUT_FONT, "--flavor=woff2",
                 "--unicodes=" + ",".join("U+%04X" % ord(c) for c in have)])

    kb = os.path.getsize(OUT_FONT) / 1024
    print("子集完成：%d 字 → %.0f KB（原字体 %.1f MB）" %
          (len(have), kb, os.path.getsize(SRC_FONT) / 1048576))

    if missing:
        print("\n⚠️  这 %d 个字不在文悦古体仿宋里，会用 %s 兜底：" % (len(missing), FALLBACK))
        print("    " + "".join(missing))
        print("    若换了诗稿，请重新生成兜底字体：")
        print("    curl -sA 'Mozilla/5.0 Chrome/120' \\")
        print("      \"https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@%d&text=%s\"" % (FALLBACK_WEIGHT, "".join(missing)))
        print("    取出其中的 woff2 地址下载为 " + FALLBACK)

    inc = TEMPLATE.format(
        subset_range=ranges(ord(c) for c in have),
        fallback_range=ranges(ord(c) for c in missing) or "U+FFFD",
        size_adjust=FALLBACK_SIZE_ADJUST,
        sample="".join(have[:1] or ["空"]),
        fallback_load=(',\n        document.fonts.load("400 1em WenYueGutiFangSong", "%s")' % missing[0]) if missing else "",
        count=len(have), kb=int(kb))
    io.open(OUT_INC, "w", encoding="utf-8").write(inc)
    print("\n已写出 %s" % os.path.relpath(OUT_INC, ROOT))


TEMPLATE = """<!-- 由 scripts/build-emptychair-font.py 生成，请勿手改 -->
<!-- 文悦古体仿宋子集：{count} 字 / {kb} KB（原字体 16 MB，等它下完才换字体，所以会先闪一下后备字） -->
<link rel="preload" href="{{{{ '/assets/fonts/wenyue-emptychair.woff2' | relative_url }}}}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{{{{ '/assets/fonts/wenyue-fallback.woff2' | relative_url }}}}" as="font" type="font/woff2" crossorigin>
<style>
  @font-face {{
    font-family: 'WenYueGutiFangSong';
    src: url('{{{{ '/assets/fonts/wenyue-emptychair.woff2' | relative_url }}}}') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: block;
    unicode-range: {subset_range};
  }}
  /* 字库里没有的字（攥癌癔窿腌钚铀 等）：改用 Noto Serif SC Light 顶上。
     不这么做的话它们会各自掉到系统宋体，笔画明显更黑，在细笔画的仿宋里非常刺眼。
     这里 font-weight 声明成 400 是有意的：文件本身是 300 的字形，
     声明成 400 才能被正文（font-weight:400）选中。 */
  @font-face {{
    font-family: 'WenYueGutiFangSong';
    src: url('{{{{ '/assets/fonts/wenyue-fallback.woff2' | relative_url }}}}') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: block;
    size-adjust: {size_adjust};
    unicode-range: {fallback_range};
  }}
  html.ec-fonts-pending body {{ opacity: 0; }}
  body {{ opacity: 1; transition: opacity .4s ease; }}
</style>
<script>
  // 字体就位后再显示正文，避免先渲染一遍后备字体再跳字（FOUT）。
  // 无论成功失败，最多等 2.5 秒就放行，字体挂了也不会白屏。
  (function () {{
    var root = document.documentElement;
    root.classList.add('ec-fonts-pending');
    var reveal = function () {{ root.classList.remove('ec-fonts-pending'); }};
    var timer = setTimeout(reveal, 2500);
    var done = function () {{ clearTimeout(timer); reveal(); }};
    if (document.fonts && document.fonts.load) {{
      Promise.all([
        document.fonts.load("400 1em WenYueGutiFangSong", "{sample}"),
        document.fonts.load("600 1em WenYueGutiFangSong", "{sample}"){fallback_load}
      ]).then(done, done);
    }} else {{
      done();
    }}
  }})();
</script>
"""

if __name__ == "__main__":
    main()
