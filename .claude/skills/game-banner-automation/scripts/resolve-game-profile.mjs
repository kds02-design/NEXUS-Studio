import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const requestedGame = value('--game');
const explicitProfile = value('--profile');
const output = path.resolve(value('--output') || path.join(process.cwd(), 'game-profile-lock.json'));
const force = args.includes('--force');

if (!requestedGame && !explicitProfile) {
  throw new Error('Usage: resolve-game-profile.mjs --game <id-or-alias> [--profile custom.json] [--output game-profile-lock.json] [--force]');
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const profileDir = path.join(skillRoot, 'references', 'game-profiles');
const normalize = (input) => String(input || '').normalize('NFKC').toLowerCase().replace(/[\s._-]+/g, '');

const validate = (profile, source) => {
  if (profile?.schema !== 'game-banner-profile/v1') throw new Error(`${source}: unsupported profile schema`);
  for (const key of ['id', 'displayName', 'version', 'aliases', 'guide', 'framePolicy', 'brand']) {
    if (profile[key] === undefined || profile[key] === null) throw new Error(`${source}: missing ${key}`);
  }
  if (!Array.isArray(profile.aliases) || !profile.aliases.length) throw new Error(`${source}: aliases must be a non-empty array`);
  if (!Array.isArray(profile.framePolicy?.frames) || !profile.framePolicy.frames.length) throw new Error(`${source}: framePolicy.frames must be non-empty`);
  return profile;
};

let source;
let profile;
if (explicitProfile) {
  source = path.resolve(explicitProfile);
  profile = validate(JSON.parse(fs.readFileSync(source, 'utf8')), source);
} else {
  const candidates = fs.readdirSync(profileDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const file = path.join(profileDir, name);
      return { file, profile: validate(JSON.parse(fs.readFileSync(file, 'utf8')), file) };
    });
  const key = normalize(requestedGame);
  const matches = candidates.filter(({profile: candidate}) =>
    [candidate.id, ...candidate.aliases].some((alias) => normalize(alias) === key));
  if (matches.length !== 1) {
    const available = candidates.map(({profile: candidate}) => `${candidate.id} (${candidate.aliases.join(', ')})`).join('; ');
    throw new Error(matches.length ? `Ambiguous game profile: ${requestedGame}` : `Unknown game profile: ${requestedGame}. Available: ${available}`);
  }
  source = matches[0].file;
  profile = matches[0].profile;
}

if (fs.existsSync(output) && !force) throw new Error(`Refusing to overwrite existing profile lock: ${output}`);
fs.mkdirSync(path.dirname(output), { recursive: true });
const lock = {
  schema: 'game-banner-profile-lock/v1',
  status: 'locked',
  requestedGame: requestedGame || profile.id,
  profileId: profile.id,
  profileVersion: profile.version,
  sourceProfile: source,
  skillRoot,
  resolvedAt: new Date().toISOString(),
  profile
};
fs.writeFileSync(output, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({output, profileId: profile.id, profileVersion: profile.version, guide: profile.guide}, null, 2));
