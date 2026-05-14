// src/lib/dexie.js
import Dexie from 'dexie';

export const db = new Dexie('PromotionArchiveDB');

// 데이터베이스 스키마 (저장할 데이터 구조) 정의
db.version(1).stores({
  banners: '++id, title, game, year, created_at, liked', // 검색에 자주 쓰는 필드들
  // 이미지는 banners 안에 포함되지만, 별도 인덱싱은 하지 않음
});