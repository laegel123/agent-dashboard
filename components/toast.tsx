/**
 * Toast notifications — 디자인 원본에 없는 보강 컴포넌트.
 *
 * 스펙: docs/UI_GUIDE.md "Toast — useToast() 훅 시그니처" / "Toast — Demo 모드 안내"
 *  - 4 kinds: demo (4s) / success (3s) / error (4s) / info (3s)
 *  - 최대 3개 동시 표시. 초과 시 가장 오래된 것 제거.
 *  - 클릭 시 즉시 dismiss.
 *  - 위치: fixed top:16, right:16, zIndex:50
 *
 * Store 패턴: 모듈 레벨 상태 + useSyncExternalStore. Context 보일러플레이트 회피.
 */

'use client';

import { useCallback, useSyncExternalStore } from 'react';

type ToastKind = 'demo' | 'success' | 'error' | 'info';
interface ToastItem {
  id: string;
  kind: ToastKind;
  text: string;
  expiresAt: number;
}

const MAX_TOASTS = 3;
const DURATIONS: Record<ToastKind, number> = {
  demo: 4000,
  error: 4000,
  success: 3000,
  info: 3000,
};

const LABELS: Record<ToastKind, string> = {
  demo: 'Demo mode',
  success: 'Success',
  error: 'Error',
  info: 'Info',
};

// 좌측 dot 색. demo/info 는 dot 없음 — UI_GUIDE 의 success/error 케이스만 강조.
const DOT_COLORS: Record<ToastKind, string | null> = {
  demo: null,
  success: 'var(--running)',
  error: 'var(--error)',
  info: null,
};

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

// Stable empty snapshot — useSyncExternalStore 의 SSR/initial render 안전.
const EMPTY: ToastItem[] = [];

function emit() {
  for (const l of listeners) l();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  return EMPTY;
}

function clearTimer(id: string) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
}

function dismiss(id: string) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  clearTimer(id);
  emit();
}

function push(kind: ToastKind, text: string) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const duration = DURATIONS[kind];
  const item: ToastItem = { id, kind, text, expiresAt: Date.now() + duration };
  toasts = [...toasts, item];
  // FIFO trim — 가장 오래된 것부터 제거.
  while (toasts.length > MAX_TOASTS) {
    const dropped = toasts[0];
    toasts = toasts.slice(1);
    clearTimer(dropped.id);
  }
  timers.set(
    id,
    setTimeout(() => dismiss(id), duration)
  );
  emit();
}

export function useToast() {
  // 안정적인 함수 참조 — onAction 의 deps 배열 안에 넣어도 매번 재생성되지 않음.
  return {
    demo: useCallback((text: string) => push('demo', text), []),
    success: useCallback((text: string) => push('success', text), []),
    error: useCallback((text: string) => push('error', text), []),
    info: useCallback((text: string) => push('info', text), []),
  };
}

export function ToastHost() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const dot = DOT_COLORS[item.kind];
  return (
    <div
      role="status"
      onClick={onDismiss}
      style={{
        background: 'rgba(40,30,20,0.92)',
        color: '#fbf8f1',
        padding: '12px 16px',
        borderRadius: 10,
        fontSize: 12.5,
        lineHeight: 1.45,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        animation: 'slide-in 0.2s ease-out',
        minWidth: 240,
        maxWidth: 340,
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      {dot && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dot,
            flex: '0 0 auto',
            marginTop: 6,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 600,
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: 2,
          }}
        >
          {LABELS[item.kind]}
        </div>
        <div>{item.text}</div>
      </div>
    </div>
  );
}
