// 데이터 안전 렌더링 (객체나 null이 들어와도 에러 방지)
export const safeRender = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return "[Object]";
        }
    }
    return String(value);
};

// 날짜 포맷팅 (Firestore Timestamp 및 일반 Date 처리)
export const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    
    // Handle Firestore Timestamp (seconds 속성이 있는 경우)
    if (typeof timestamp === 'object' && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('ko-KR', {
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit'
        });
    }
    
    // 일반 Date 객체 또는 문자열/숫자
    return new Date(timestamp).toLocaleDateString('ko-KR', {
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit'
    });
};