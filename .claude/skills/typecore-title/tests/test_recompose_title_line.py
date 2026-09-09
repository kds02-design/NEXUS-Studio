import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "recompose-title-line.py"


class RecomposeTitleLineTests(unittest.TestCase):
    def test_two_rows_become_one_without_vertical_scaling(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "proxy.png"
            output = root / "one-line.png"
            manifest = root / "manifest.json"
            plan_path = root / "plan.json"
            image = Image.new("RGB", (180, 100), "black")
            draw = ImageDraw.Draw(image)
            draw.rectangle((10, 10, 49, 29), fill="white")
            draw.rectangle((20, 60, 79, 79), fill="white")
            image.save(source)
            plan = {
                "schema": "typecore-title-geometry-plan/v2",
                "status": "planned",
                "exactText": "가나다라마",
                "constraints": {"minGlyphAspectRatio": 0.78, "maxGlyphAspectRatio": 1.15},
                "selected": {"lineCount": 1, "verticalScale": 1, "artworkRatio": 5.3},
                "proxyRecomposition": {"eligible": True, "candidate": {"rows": ["가나", "다라마"]}}
            }
            plan_path.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
            completed = subprocess.run([
                sys.executable, str(SCRIPT), "--source", str(source), "--output", str(output),
                "--manifest", str(manifest), "--geometry-plan", str(plan_path),
                "--text", "가나다라마", "--row1-text", "가나", "--row2-text", "다라마",
                "--join-with", "", "--ratio-tolerance", "0.2"
            ], check=True, capture_output=True, text=True)
            result = json.loads(completed.stdout)
            self.assertEqual(result["status"], "pass")
            self.assertEqual(result["verticalScale"], 1)
            self.assertFalse(result["nonProportionalScaling"])
            self.assertEqual(result["sourceMeanGlyphAspectRatios"], [1.0, 1.0])
            self.assertTrue(output.exists())

    def test_tall_narrow_proxy_glyphs_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "proxy-condensed.png"
            image = Image.new("RGB", (100, 100), "black")
            draw = ImageDraw.Draw(image)
            draw.rectangle((10, 10, 29, 29), fill="white")
            draw.rectangle((10, 60, 39, 79), fill="white")
            image.save(source)
            plan_path = root / "plan.json"
            plan_path.write_text(json.dumps({
                "schema": "typecore-title-geometry-plan/v2",
                "status": "planned",
                "exactText": "가나다라마",
                "constraints": {"minGlyphAspectRatio": 0.78, "maxGlyphAspectRatio": 1.15},
                "selected": {"lineCount": 1, "verticalScale": 1, "artworkRatio": 5.3},
                "proxyRecomposition": {"eligible": True, "candidate": {"rows": ["가나", "다라마"]}}
            }, ensure_ascii=False), encoding="utf-8")
            completed = subprocess.run([
                sys.executable, str(SCRIPT), "--source", str(source), "--output", str(root / "out.png"),
                "--manifest", str(root / "manifest.json"), "--geometry-plan", str(plan_path),
                "--text", "가나다라마", "--row1-text", "가나", "--row2-text", "다라마", "--join-with", ""
            ], capture_output=True, text=True)
            self.assertNotEqual(completed.returncode, 0)
            self.assertIn("condensed tall-narrow source rejected", completed.stderr)

    def test_two_line_final_plan_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "proxy.png"
            Image.new("RGB", (20, 20), "black").save(source)
            plan_path = root / "plan.json"
            plan_path.write_text(json.dumps({
                "schema": "typecore-title-geometry-plan/v2", "status": "planned", "exactText": "가나다라마",
                "constraints": {"minGlyphAspectRatio": 0.78, "maxGlyphAspectRatio": 1.15},
                "selected": {"lineCount": 2, "verticalScale": 1, "artworkRatio": 2.5},
                "proxyRecomposition": {"eligible": False, "candidate": None}
            }, ensure_ascii=False), encoding="utf-8")
            completed = subprocess.run([
                sys.executable, str(SCRIPT), "--source", str(source), "--output", str(root / "out.png"),
                "--manifest", str(root / "manifest.json"), "--geometry-plan", str(plan_path),
                "--text", "가나다라마", "--row1-text", "가나", "--row2-text", "다라마", "--join-with", ""
            ], capture_output=True, text=True)
            self.assertNotEqual(completed.returncode, 0)
            self.assertIn("eligible passing final single-line plan", completed.stderr)


if __name__ == "__main__":
    unittest.main()
