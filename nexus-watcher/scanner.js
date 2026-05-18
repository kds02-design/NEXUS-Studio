// scanner.js — 폴더 재귀 스캔 + 파일 메타데이터 추출.
// 네트워크 공유 경로(UNC) 도 그대로 입력 가능. extensions / exclude 필터 적용.
import { readdir, stat } from 'node:fs/promises';
import { join, sep, basename, extname, dirname, relative } from 'node:path';

// 경로 안의 디렉터리 세그먼트 중 하나라도 exclude 키워드와 일치하면 true.
// 대소문자 무시. 부분일치 (예: exclude "old" 가 "old_design" 도 잡음).
export function isExcluded(filePath, exclude = []) {
  if (!exclude.length) return false;
  const segments = filePath.split(/[\\/]/);
  const lowExcl = exclude.map((s) => String(s).toLowerCase());
  return segments.some((seg) => {
    const s = seg.toLowerCase();
    return lowExcl.some((ex) => ex && s.includes(ex));
  });
}

// 확장자 매칭 (.JPG 도 .jpg 와 동일하게 취급)
export function hasValidExtension(filePath, extensions = []) {
  const ext = extname(filePath).toLowerCase();
  return extensions.map((e) => e.toLowerCase()).includes(ext);
}

// 재귀적으로 모든 파일을 수집. 디렉터리 단위 exclude 도 여기서 한 번 더 가지치기.
export async function walkDir(rootPath, { extensions = [], exclude = [] } = {}) {
  const found = [];
  const visited = new Set();

  async function recurse(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      // ENOENT, EACCES, 네트워크 단절 등 — 호출부에서 잡도록 다시 던짐.
      throw new Error(`readdir 실패: ${dir} (${err.code || err.message})`);
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      // 디렉터리 단위 exclude
      if (entry.isDirectory()) {
        const lowName = entry.name.toLowerCase();
        if (exclude.some((ex) => ex && lowName.includes(String(ex).toLowerCase()))) continue;
        if (visited.has(full)) continue;
        visited.add(full);
        await recurse(full);
      } else if (entry.isFile()) {
        if (!hasValidExtension(full, extensions)) continue;
        if (isExcluded(full, exclude)) continue;
        found.push(full);
      }
    }
  }

  await recurse(rootPath);
  return found;
}

// 파일의 크기가 안정될 때까지 대기 (네트워크 복사 도중 업로드 방지).
// 초기 스캔에서 사용. chokidar 의 awaitWriteFinish 와 같은 역할.
export async function waitForStableSize(filePath, { stability = 1500, maxWait = 30000 } = {}) {
  const start = Date.now();
  let lastSize = -1;
  let lastStable = Date.now();
  while (Date.now() - start < maxWait) {
    let st;
    try { st = await stat(filePath); } catch { return false; }
    if (st.size === lastSize) {
      if (Date.now() - lastStable >= stability) return true;
    } else {
      lastSize = st.size;
      lastStable = Date.now();
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

// 파일에서 메타데이터 추출:
// - title: 파일명에서 확장자 제거
// - year/month/date: 부모 디렉터리 이름에서 YYYY 또는 YYYY-MM 패턴 탐색, 없으면 mtime/현재 시각
// - relativePath: watchRoot 기준 상대 경로 (Firestore 중복 키로 사용)
export async function buildFileMeta(filePath, watchRoot, defaults = {}) {
  const title = basename(filePath, extname(filePath));
  const relPath = relative(watchRoot, filePath).split(sep).join('/');
  const parents = dirname(filePath).split(/[\\/]/);

  // 연도 추출: 디렉터리 이름 중 4자리 숫자(2000~2099) 우선.
  let year = defaults.year ? String(defaults.year) : null;
  let month = null;
  for (const seg of parents) {
    const yMatch = seg.match(/(20\d{2})/);
    if (yMatch && !year) year = yMatch[1];
    const mMatch = seg.match(/^(20\d{2})[-_.](\d{1,2})/);
    if (mMatch) { year = mMatch[1]; month = String(parseInt(mMatch[2], 10)).padStart(2, '0'); }
    const monthOnly = seg.match(/^(\d{1,2})월$/);
    if (monthOnly) month = String(parseInt(monthOnly[1], 10)).padStart(2, '0');
  }

  let mtime = null;
  try { mtime = (await stat(filePath)).mtime; } catch {}
  if (!year) {
    const d = mtime || new Date();
    year = String(d.getFullYear());
  }
  if (!month) {
    const d = mtime || new Date();
    month = String(d.getMonth() + 1).padStart(2, '0');
  }
  const day = String((mtime || new Date()).getDate()).padStart(2, '0');
  const date = `${year}.${month}.${day}`;

  return {
    title,
    relativePath: relPath,
    fullPath: filePath,
    year,
    month,
    date,
    game: defaults.game || null,
  };
}
