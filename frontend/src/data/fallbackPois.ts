import { MapPin, TrainFront, Toilet, Store, Pill, Droplets, BusFront, type LucideIcon } from 'lucide-react';
import type { Poi, PoiType } from '../types';

// 서버가 응답하지 않을 때(현장 통신 장애 등) 사용하는 내장 데이터.
// 좌표 출처: OpenStreetMap (2026-06 조회). 백엔드 시드 데이터와 동일하게 유지할 것.
export const FALLBACK_POIS: Poi[] = [
  { id: 1,  type: 'MEET',    name: '모임 장소 (SK올림픽핸드볼경기장 앞)', lat: 37.51735, lng: 127.12640, memo: '주최 측 공지에 따라 변경될 수 있음 · 동2문 인근', active: true },
  { id: 2,  type: 'SUBWAY',  name: '올림픽공원역 (5·9호선)', lat: 37.51652, lng: 127.13089, memo: '3번 출구 → 동2문 방면, 도보 약 5분', active: true },
  { id: 3,  type: 'SUBWAY',  name: '몽촌토성역 (8호선)', lat: 37.51753, lng: 127.11267, memo: '1번 출구, 도보 약 15분', active: true },
  { id: 4,  type: 'TOILET',  name: '공중화장실 (경기장 서측)', lat: 37.51824, lng: 127.12302, memo: '올림픽공원 내', active: true },
  { id: 5,  type: 'TOILET',  name: '공중화장실 (경기장 북측)', lat: 37.52026, lng: 127.12577, memo: '올림픽공원 내', active: true },
  { id: 6,  type: 'TOILET',  name: '공중화장실 (공원 북동측)', lat: 37.52169, lng: 127.12439, memo: '올림픽공원 내', active: true },
  { id: 7,  type: 'TOILET',  name: '공중화장실 (공원 중앙)', lat: 37.51716, lng: 127.12086, memo: '올림픽공원 내', active: true },
  { id: 8,  type: 'TOILET',  name: '공중화장실 (공원 북측)', lat: 37.52110, lng: 127.12099, memo: '올림픽공원 내', active: true },
  { id: 9,  type: 'TOILET',  name: '공중화장실 (몽촌토성 방면)', lat: 37.51809, lng: 127.11679, memo: '올림픽공원 내', active: true },
  { id: 10, type: 'TOILET',  name: '공중화장실 (몽촌토성역 방면)', lat: 37.51904, lng: 127.11599, memo: '올림픽공원 내', active: true },
  { id: 11, type: 'STORE',   name: 'GS25 올림픽공원역점', lat: 37.51653, lng: 127.13060, memo: '생수·간식', active: true },
  { id: 12, type: 'STORE',   name: 'CU 올림픽프라자상가점', lat: 37.51573, lng: 127.13106, memo: '생수·간식', active: true },
  { id: 13, type: 'STORE',   name: 'CU 한국체대 체육과학관점', lat: 37.51987, lng: 127.12966, memo: '생수·간식', active: true },
  { id: 14, type: 'STORE',   name: 'CU 올림픽타운점', lat: 37.51335, lng: 127.12265, memo: '생수·간식', active: true },
  { id: 15, type: 'STORE',   name: 'GS25 송파누리점', lat: 37.51276, lng: 127.12375, memo: '생수·간식', active: true },
  { id: 16, type: 'STORE',   name: '세븐일레븐 뉴송파방이점', lat: 37.51342, lng: 127.11819, memo: '생수·간식', active: true },
  { id: 17, type: 'WATER',   name: '물·물품 나눔처', lat: 37.51800, lng: 127.12620, memo: '현장 공지로 위치 갱신', active: true },
  { id: 18, type: 'SHELTER', name: '버스쉼터', lat: 37.516872, lng: 127.126890, memo: '경기장 인근 휴식 공간', active: true },
];

export const TYPE_INFO: Record<PoiType, { label: string; color: string; Icon: LucideIcon }> = {
  MEET:     { label: '모임터',  color: '#dc2626', Icon: MapPin },
  SUBWAY:   { label: '지하철', color: '#2563eb', Icon: TrainFront },
  TOILET:   { label: '화장실', color: '#059669', Icon: Toilet },
  STORE:    { label: '편의점', color: '#9333ea', Icon: Store },
  PHARMACY: { label: '약국',   color: '#d97706', Icon: Pill },
  WATER:    { label: '나눔',   color: '#0891b2', Icon: Droplets },
  SHELTER:  { label: '버스쉼터', color: '#0d9488', Icon: BusFront },
};

// SK올림픽핸드볼경기장
export const CENTER: [number, number] = [37.51735, 127.12640];
