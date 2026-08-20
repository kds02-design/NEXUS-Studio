@echo off
rem 주간 자동 동기화 래퍼 — 작업 스케줄러 "NexusBannerCodexSync" 가 호출 (매주 목 06:00).
rem 1) 배너 코덱스 새 배너 등록  2) 브랜드웹 라이브러리 새 프로모션 등록
rem 로그: C:\work\00_claude\logs\banner-sync.log
cd /d C:\work\00_claude
"C:\Program Files\nodejs\node.exe" scripts\banner-codex-sync.mjs >> logs\banner-sync.log 2>&1
"C:\Program Files\nodejs\node.exe" scripts\promo-archive-sync.mjs >> logs\banner-sync.log 2>&1
