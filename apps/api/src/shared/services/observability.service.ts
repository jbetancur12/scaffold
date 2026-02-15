type EndpointMetrics = {
    count: number;
    errorCount: number;
    totalDurationMs: number;
    maxDurationMs: number;
};

class ObservabilityService {
    private readonly startedAt = Date.now();
    private readonly endpointMetrics = new Map<string, EndpointMetrics>();
    private totalRequests = 0;
    private totalErrors = 0;

    recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
        const key = `${method} ${path}`;
        const current = this.endpointMetrics.get(key) ?? {
            count: 0,
            errorCount: 0,
            totalDurationMs: 0,
            maxDurationMs: 0,
        };

        current.count += 1;
        current.totalDurationMs += durationMs;
        current.maxDurationMs = Math.max(current.maxDurationMs, durationMs);
        if (statusCode >= 400) {
            current.errorCount += 1;
            this.totalErrors += 1;
        }

        this.totalRequests += 1;
        this.endpointMetrics.set(key, current);
    }

    getSnapshot() {
        const endpoints = Array.from(this.endpointMetrics.entries()).map(([key, value]) => ({
            endpoint: key,
            requests: value.count,
            errors: value.errorCount,
            errorRate: value.count > 0 ? Number((value.errorCount / value.count).toFixed(4)) : 0,
            avgDurationMs: value.count > 0 ? Number((value.totalDurationMs / value.count).toFixed(2)) : 0,
            maxDurationMs: Number(value.maxDurationMs.toFixed(2)),
        }));

        return {
            uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
            process: {
                memoryRssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
                memoryHeapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
                pid: process.pid,
            },
            requests: {
                total: this.totalRequests,
                errors: this.totalErrors,
                errorRate: this.totalRequests > 0 ? Number((this.totalErrors / this.totalRequests).toFixed(4)) : 0,
            },
            endpoints,
        };
    }
}

export const observabilityService = new ObservabilityService();
