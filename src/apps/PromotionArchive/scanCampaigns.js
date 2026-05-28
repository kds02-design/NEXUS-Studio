// 업로드 폴더 사전 스캔 — handleUpload 의 그룹화 로직을 그대로 미리 시뮬레이션해서
// 모달에서 "실제 등록될 캠페인 수 / 누락 사유" 를 정확히 표시하는 데 사용.
//
// handleUpload 와 동일한 규칙:
//   - 확장자 jpg/jpeg/png 만
//   - 블랙리스트: 개발 / 팝업 / popup / Thumbs.db / dotfile
//   - '디자인' segment 가 path 에 있어야 함 (designIndex > 0)
//   - pc/mobile 폴더의 직속 자식 파일만 (pathParts.length === designIndex + 3)
//   - title = pathParts[designIndex - 1]
//   - 그룹별 pc/mobile 각각 가장 큰 사이즈 1개 → 1 캠페인 등록 단위

const ALLOWED_EXT_REGEX = /\.(jpe?g|png)$/i;
const EXCLUDE_REGEX = /개발|팝업|popup|Thumbs\.db|^\./i;

export function scanCampaigns(files) {
  const result = {
    rawCount: 0,        // 전체 파일 수
    extOk: 0,           // 확장자 통과
    blacklisted: 0,     // 블랙리스트로 제외된 수
    noDesignFolder: 0,  // '디자인' segment 없어서 제외
    notDirectChild: 0,  // pc/mobile 직속 자식 아니라 제외 (crop/banner 등)
    noDeviceMatch: 0,   // device folder 가 pc/mo 패턴 아니라 제외 (banner 등)
    pickedFiles: 0,     // 그룹에 포함된 파일 (선정 대상)
    groups: [],         // 캠페인 단위 그룹 (title 별 1개)
  };

  if (!files || !files.length) return result;

  const groups = {};

  for (const file of files) {
    result.rawCount++;

    if (EXCLUDE_REGEX.test(file.name)) { result.blacklisted++; continue; }
    if (!ALLOWED_EXT_REGEX.test(file.name)) continue;
    result.extOk++;

    const rel = file.webkitRelativePath || '';
    if (!rel || rel.split('/').length < 2) continue;
    const pathParts = rel.split('/');

    const designIndex = pathParts.findIndex(p => p.includes('디자인'));
    if (designIndex < 0 || designIndex === 0) { result.noDesignFolder++; continue; }

    if (pathParts.length !== designIndex + 3) { result.notDirectChild++; continue; }

    const deviceFolder = pathParts[designIndex + 1] || '';
    let type = null;
    if (/^(pc|web)$/i.test(deviceFolder)) type = 'pc';
    else if (/^(mo|mobile|m)$/i.test(deviceFolder)) type = 'mobile';
    if (!type) { result.noDeviceMatch++; continue; }

    const title = pathParts[designIndex - 1].trim() || '미분류';
    if (!groups[title]) groups[title] = { title, pcCandidates: [], moCandidates: [] };
    if (type === 'pc') groups[title].pcCandidates.push(file);
    else groups[title].moCandidates.push(file);
    result.pickedFiles++;
  }

  result.groups = Object.values(groups).map(g => ({
    title: g.title,
    hasPc: g.pcCandidates.length > 0,
    hasMo: g.moCandidates.length > 0,
    pcSizeKB: g.pcCandidates.length
      ? Math.round(Math.max(...g.pcCandidates.map(f => f.size)) / 1024)
      : 0,
    moSizeKB: g.moCandidates.length
      ? Math.round(Math.max(...g.moCandidates.map(f => f.size)) / 1024)
      : 0,
  }));

  return result;
}
