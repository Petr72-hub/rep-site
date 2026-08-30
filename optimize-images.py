# -*- coding: utf-8 -*-
"""
Сжатие картинок сайта КЭТАЛИЗАТОР.

Зачем: сейчас папка assets весит ~15,7 МБ, из них peter-hero.png — 2,4 МБ,
и он грузится в первом экране. На мобильном интернете это несколько секунд
белого экрана. WebP при том же качестве обычно даёт минус 70–85 %.

Что делает скрипт:
  1) уменьшает картинки до разумного максимального размера;
  2) сохраняет рядом версию .webp;
  3) добавляет в index.html <picture> с webp и исходным png как запасным
     вариантом (старые браузеры продолжат работать).

Как запустить (один раз установить библиотеку):
    pip install pillow
    python optimize-images.py

Оригиналы не удаляются: они переносятся в assets/_original/.
"""
import io, os, re, shutil, sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Сначала установите библиотеку: pip install pillow')

ASSETS = 'assets'
BACKUP = os.path.join(ASSETS, '_original')

# Максимальная ширина в пикселях: больше нужного экрану смысла не имеет.
MAX_WIDTH = {
    'peter-hero.png': 1000,
    'peter-lab.png': 800,
    'peter-laptop.png': 800,
    'peter-teaching.png': 1200,
    'material-bio-1.png': 1400,
    'material-bio-2.png': 1400,
    'material-chem-1.png': 1400,
    'material-chem-2.png': 1400,
}
DEFAULT_MAX_WIDTH = 512      # стикеры кота
QUALITY = 82

os.makedirs(BACKUP, exist_ok=True)
total_before = total_after = 0

for name in sorted(os.listdir(ASSETS)):
    if not name.lower().endswith('.png'):
        continue
    src = os.path.join(ASSETS, name)
    if not os.path.isfile(src):
        continue

    before = os.path.getsize(src)
    shutil.copy2(src, os.path.join(BACKUP, name))

    im = Image.open(src).convert('RGBA')
    limit = MAX_WIDTH.get(name, DEFAULT_MAX_WIDTH)
    if im.width > limit:
        im = im.resize((limit, round(im.height * limit / im.width)), Image.LANCZOS)

    webp = os.path.join(ASSETS, os.path.splitext(name)[0] + '.webp')
    im.save(webp, 'WEBP', quality=QUALITY, method=6)
    im.save(src, 'PNG', optimize=True)

    after = os.path.getsize(webp)
    total_before += before
    total_after += after
    print('%-26s %6d КБ -> %5d КБ webp' % (name, before // 1024, after // 1024))

print('\nИтого: %.1f МБ -> %.1f МБ (webp)' % (total_before / 1048576, total_after / 1048576))

# --- Подставляем <picture> в index.html -----------------------------------
html = io.open('index.html', encoding='utf-8').read()
if '<source type="image/webp"' in html:
    print('index.html уже использует <picture> — пропускаю.')
else:
    def wrap(m):
        tag = m.group(0)
        src = re.search(r'src="(assets/[^"]+\.png)"', tag)
        if not src:
            return tag
        webp = src.group(1).rsplit('.', 1)[0] + '.webp'
        return '<picture><source type="image/webp" srcset="%s">%s</picture>' % (webp, tag)

    html = re.sub(r'<img\b[^>]*src="assets/[^"]+\.png"[^>]*>', wrap, html)
    io.open('index.html', 'w', encoding='utf-8').write(html)
    print('index.html обновлён: картинки отдаются в webp, png остался запасным.')
