import assert from 'node:assert/strict';
import {
  NEXUS_BANNER_CRITERIA,
  NEXUS_BANNER_WEIGHTS,
  appendOrReplacePromptSection,
  calculateEvaluationReport,
  mergeEvaluationScores,
  validateCriteria,
} from '../src/lib/designEvaluationCore.js';

const criteria = NEXUS_BANNER_CRITERIA;
assert.deepEqual(Object.fromEntries(criteria.map(({ id, weight }) => [id, weight])), NEXUS_BANNER_WEIGHTS);
const scoreSet = Object.fromEntries(criteria.map(({ id }) => [id, { score: 85, reason: `${id} reason` }]));
const merged = mergeEvaluationScores(criteria, [scoreSet, scoreSet]);
assert.equal(merged.modelsAveraged, 2);
assert.deepEqual(merged.missing, []);

const pass = calculateEvaluationReport({ criteria, scores: merged.scores });
assert.equal(pass.overall, 85);
assert.equal(pass.pass, true);

const hardFail = calculateEvaluationReport({ criteria, scores: merged.scores, hardFailures: ['logo mismatch'] });
assert.equal(hardFail.pass, false);

const lowSet = { ...scoreSet, conversion: { score: 74, reason: 'low' } };
const lowMerged = mergeEvaluationScores(criteria, [lowSet]);
assert.equal(calculateEvaluationReport({ criteria, scores: lowMerged.scores }).pass, false);

const validation = validateCriteria([{ id: 'same', weight: 10 }, { id: 'same', weight: 20 }]);
assert.equal(validation.valid, false);
assert.deepEqual(validation.duplicateIds, ['same']);

assert.match(
  appendOrReplacePromptSection('base', '{{CRITERIA}}', 'criteria', 'active criteria'),
  /\[active criteria\]\ncriteria/,
);
assert.equal(
  appendOrReplacePromptSection('base {{CRITERIA}}', '{{CRITERIA}}', 'criteria', 'active criteria'),
  'base criteria',
);

console.log('design evaluation core: ok');
