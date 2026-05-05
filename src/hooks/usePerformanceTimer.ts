/**
 * usePerformanceTimer
 *
 * Measures how long a user-facing action takes (e.g. creating a patient,
 * submitting a lab form) and reports the result to the feedback service
 * as a structured performance metric.
 *
 * Usage:
 *   const timer = usePerformanceTimer('Create Patient');
 *   timer.start();
 *   // ... user fills form ...
 *   const ms = timer.stop();   // stops and records the metric
 *
 * Metrics are stored in sessionStorage under 'perf_metrics' so they
 * survive page navigations within the session and can be read by the
 * Feedback page for display.
 */

import { useRef, useCallback } from 'react';

export interface PerfMetric {
    action: string;
    durationMs: number;
    recordedAt: string; // ISO string
    page: string;
}

const STORAGE_KEY = 'perf_metrics';
const MAX_STORED = 100; // cap to avoid unbounded growth

function readMetrics(): PerfMetric[] {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function writeMetrics(metrics: PerfMetric[]) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(metrics.slice(-MAX_STORED)));
    } catch { /* storage full — silently skip */ }
}

export function recordMetric(metric: PerfMetric) {
    const existing = readMetrics();
    writeMetrics([...existing, metric]);
}

export function getAllMetrics(): PerfMetric[] {
    return readMetrics();
}

export function clearMetrics() {
    sessionStorage.removeItem(STORAGE_KEY);
}

export function usePerformanceTimer(action: string, page?: string) {
    const startRef = useRef<number | null>(null);

    const start = useCallback(() => {
        startRef.current = performance.now();
    }, []);

    const stop = useCallback((): number | null => {
        if (startRef.current === null) return null;
        const durationMs = Math.round(performance.now() - startRef.current);
        startRef.current = null;

        const metric: PerfMetric = {
            action,
            durationMs,
            recordedAt: new Date().toISOString(),
            page: page ?? window.location.pathname,
        };

        recordMetric(metric);
        return durationMs;
    }, [action, page]);

    const cancel = useCallback(() => {
        startRef.current = null;
    }, []);

    return { start, stop, cancel };
}
