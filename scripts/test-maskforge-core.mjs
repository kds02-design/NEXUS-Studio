import assert from 'node:assert/strict';
import {
  KEY_DEFAULTS,
  extractColorKeyPixels,
  extractShapeLockPixels,
} from '../src/lib/colorKeyExtract.js';
import { EFFECT_DEFAULTS, extractEffectPixels } from '../src/lib/effectExtract.js';
import {
  buildTitleFxLayers,
  healBackEffectUnderTitle,
  softenFrontEffectAcrossTitle,
} from '../src/lib/titleFxComposite.js';

const rgba = (width, height, fill = [0, 0, 0, 255]) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(fill, i);
  return { width, height, data };
};

const at = (image, x, y) => image.data[(y * image.width + x) * 4 + 3];

// 한글 카운터와 같은 닫힌 배경은 기본 로컬 키에서 투명하게 남아야 한다.
{
  const source = rgba(7, 7);
  for (let y = 1; y <= 5; y++) for (let x = 1; x <= 5; x++) {
    if (x === 1 || x === 5 || y === 1 || y === 5) source.data.set([240, 180, 40, 255], (y * 7 + x) * 4);
  }
  const result = extractColorKeyPixels(source, { ...KEY_DEFAULTS, bg: [0, 0, 0] });
  assert.equal(KEY_DEFAULTS.holeProtect, false);
  assert.equal(at(result, 3, 3), 0, '닫힌 카운터가 기본값에서 채워지면 안 됩니다.');
  assert.equal(at(result, 1, 3), 255, '타이틀 몸체는 불투명하게 남아야 합니다.');
}

// 형태 잠금은 렌더 색과 무관하게 승인 마스크의 카운터를 그대로 따른다.
{
  const render = rgba(5, 5, [18, 22, 28, 255]);
  const mask = rgba(5, 5, [255, 255, 255, 255]);
  mask.data[(2 * 5 + 2) * 4 + 3] = 0;
  const result = extractShapeLockPixels(render, mask);
  assert.equal(at(result, 2, 2), 0);
  assert.equal(at(result, 1, 1), 255);
  assert.equal(result.qa.shapeLocked, true);
  assert.throws(() => extractShapeLockPixels(render, rgba(4, 5)), /크기가 다릅니다/);
}

// cutoff/gamma가 적용돼도 같은 검정 매트에 재합성했을 때 원래 RGB가 유지돼야 한다.
{
  const source = rgba(1, 1, [40, 80, 160, 255]);
  const result = extractEffectPixels(source, { ...EFFECT_DEFAULTS, bg: [0, 0, 0] });
  const alpha = result.data[3] / 255;
  const recomposed = [result.data[0], result.data[1], result.data[2]].map((v) => Math.round(v * alpha));
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(recomposed[c] - source.data[c]) <= 1, `채널 ${c} 재합성 오차`);
  assert.ok(result.qa.reconstructionMae < 0.005, `재합성 MAE가 큽니다: ${result.qa.reconstructionMae}`);
}

// 후방 FX는 글자 본체 아래를 끝까지 메우되, 글자 내부의 열린 카운터는 막지 않는다.
{
  const W = 9, H = 9;
  const fx = rgba(W, H, [0, 0, 0, 0]);
  const titleAlpha = new Uint8ClampedArray(W * H);
  for (let y = 2; y <= 6; y++) for (let x = 2; x <= 6; x++) titleAlpha[y * W + x] = 255;
  titleAlpha[4 * W + 4] = 0;
  for (let y = 1; y <= 7; y++) fx.data.set([255, 80, 20, 220], (y * W + 1) * 4);
  fx.data.set([80, 20, 10, 12], (4 * W + 3) * 4);
  const result = healBackEffectUnderTitle(fx, titleAlpha);
  assert.ok(at(result, 3, 4) > 12, '약한 잔여 알파도 후방 FX보다 약하면 오버필돼야 합니다.');
  assert.ok(at(result, 6, 4) > 0, '후방 FX 오버필은 타이틀 반대쪽까지 이어져야 합니다.');
  assert.equal(at(result, 4, 4), 0, '열린 카운터까지 후방 FX로 막으면 안 됩니다.');
  assert.ok(result.filledPixels > 0);
}

// 전방 FX는 경계 안쪽으로 제한된 거리만 감쇠하며 연장된다.
{
  const W = 9, H = 5;
  const fx = rgba(W, H, [0, 0, 0, 0]);
  const titleAlpha = new Uint8ClampedArray(W * H);
  for (let x = 2; x <= 7; x++) titleAlpha[2 * W + x] = 255;
  fx.data.set([120, 210, 255, 255], (2 * W + 1) * 4);
  const result = softenFrontEffectAcrossTitle(fx, titleAlpha, 3);
  assert.ok(at(result, 2, 2) > at(result, 4, 2), '전방 FX는 안쪽으로 갈수록 부드럽게 약해져야 합니다.');
  assert.equal(at(result, 5, 2), 0, '전방 FX가 지정 오버랩보다 깊게 침범하면 안 됩니다.');
}

// 타이틀·마스크·FX의 캔버스가 다르면 조용히 리사이즈하지 않고 즉시 거부한다.
{
  const render = rgba(5, 5, [180, 120, 40, 255]);
  const mask = rgba(5, 5, [255, 255, 255, 255]);
  assert.throws(() => buildTitleFxLayers(render, mask, rgba(4, 5), null), /크기가 다릅니다/);
}

console.log('Mask Forge core regression tests passed.');
