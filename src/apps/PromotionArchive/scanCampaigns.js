// 업로드 폴더 사전 스캔 — handleUpload 의 그룹화 로직을 그대로 미리 시뮬레이션해서
// 모달에서 "실제 등록될 캠페인 수 / 누락 사유" 를 정확히 표시하는 데 사용.
//
// handleUpload 와 동일한 규칙:
//   - 확장자 jpg/jpeg/png 만
//   - 블랙리스트: 개발 / 팝업 / popup / Thumbs.db / dotfile
//   - '디자인' segment 가 path 에 있어야 함 (designIndex > 0)
//   - 프로모션: pc/mobile 폴더의 직속 자식 중 device 별 가장 큰 파일 1개
//   - 브랜드웹: pc/mobile 폴더의 직속 자식 전체를 페이지로 보존
//   - 브랜드웹은 03.디자인 직속 이미지도 PC 페이지로 허용

const ALLOWED_EXT_REGEX = /\.(jpe?g|png)$/i;
const EXCLUDE_REGEX = /개발|팝업|popup|Thumbs\.db|^\.|(^|[_\s-])(pop|layer\d*|button|state|thumb|thumbnail|menu|gnb|navi(?:gation)?|nav|open|레이어|버튼|상태|메뉴|네비|내비|중앙|폴라로이드|내용)([_\s.-]|$)/i;
const MOBILE_MENU_SUFFIX = /_00(?:(?:_[a-z]{2,4})?_v\d+)?(?=\.[^.]+$)/i;

const inferSection = (path) => {
  if (/(^|[\\/])브랜드\s*웹/.test(path) || /brand[\s_-]?web/i.test(path)) return 'brandweb';
  return 'promotion';
};

const brandWebSeries = (title) => {
  const withoutDate = String(title || '').replace(/^(?:[A-Za-z]+_)?20\d{6}_\s*/, '').trim();
  const match = withoutDate.match(/^(.*?)_([1-9]\d*)차$/);
  return match ? { key: match[1].replace(/\s+/g, '').toLowerCase(), title: match[1].trim() } : null;
};

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

    const section = inferSection(rel);
    const isDesignDirect = pathParts.length === designIndex + 2;
    const isDeviceDirect = pathParts.length === designIndex + 3;
    if (!isDeviceDirect && !(section === 'brandweb' && isDesignDirect)) {
      result.notDirectChild++;
      continue;
    }

    const deviceFolder = isDeviceDirect ? (pathParts[designIndex + 1] || '') : '';
    let type = isDesignDirect ? 'pc' : null;
    if (/^(pc|web)$/i.test(deviceFolder)) type = 'pc';
    else if (/^(mo|mobile|m)$/i.test(deviceFolder)) type = 'mobile';
    if (section === 'brandweb' && type === 'pc' && /^m_/i.test(file.name)) {
      result.blacklisted++;
      continue;
    }
    if (section === 'brandweb' && type === 'mobile' && MOBILE_MENU_SUFFIX.test(file.name)) {
      result.blacklisted++;
      continue;
    }
    if (!type) { result.noDeviceMatch++; continue; }

    const title = pathParts[designIndex - 1].trim() || '미분류';
    const series = section === 'brandweb' ? brandWebSeries(title) : null;
    const groupKey = `${section}:${series?.key || title}`;
    if (!groups[groupKey]) groups[groupKey] = { title: series?.title || title, section, pcCandidates: [], moCandidates: [] };
    if (type === 'pc') groups[groupKey].pcCandidates.push(file);
    else groups[groupKey].moCandidates.push(file);
    result.pickedFiles++;
  }

  result.groups = Object.values(groups).map(g => ({
    title: g.title,
    section: g.section,
    isBrandWeb: g.section === 'brandweb',
    hasPc: g.pcCandidates.length > 0,
    hasMo: g.moCandidates.length > 0,
    pageCount: g.section === 'brandweb'
      ? Math.min(10, g.pcCandidates.length) + Math.min(10, g.moCandidates.length)
      : undefined,
    pcSizeKB: g.pcCandidates.length
      ? Math.round(Math.max(...g.pcCandidates.map(f => f.size)) / 1024)
      : 0,
    moSizeKB: g.moCandidates.length
      ? Math.round(Math.max(...g.moCandidates.map(f => f.size)) / 1024)
      : 0,
  }));

  return result;
}
