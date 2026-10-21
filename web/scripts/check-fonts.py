"""Inspect committed WOFF2 cmap/fvar/OS2 tables with upstream FontTools."""
from pathlib import Path
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
POLISH = 'Zażółć gęślą jaźń ZAŻÓŁĆ GĘŚLĄ JAŹŃ'
count = 0
for face in ('Inter-normal', 'Inter-italic', 'Roboto-normal', 'Roboto-italic'):
    fonts = [TTFont(ROOT / 'public/fonts' / f'{face}-{subset}.woff2') for subset in ('latin', 'latin-ext')]
    covered = set().union(*(font.getBestCmap() for font in fonts))
    missing = sorted(set(map(ord, POLISH)) - covered)
    assert not missing, f'{face}: missing codepoints {missing}'
    assert all(ord(c) in fonts[1].getBestCmap() for c in 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ' if ord(c) > 255), f'{face}: latin-ext coverage'
    for font in fonts:
        axes = {axis.axisTag: axis for axis in font['fvar'].axes}
        assert axes['wght'].minValue == 400 and axes['wght'].maxValue == 700, f'{face}: weight range'
        assert set(axes) == {'wght'}, f'{face}: only the weight axis remains'
        assert bool(font['OS/2'].fsSelection & 1) == ('italic' in face), f'{face}: italic metadata'
        count += 1
print(f'{count} WOFF2 faces: Polish cmap, 400–700 and italic metadata verified.')
