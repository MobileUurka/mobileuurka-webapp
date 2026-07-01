import { resolveSymptomReportDocumentId } from './symptomReportDocumentId';

export interface SymptomReportVersion {
  id: string;
  createdAt: string;
  riskLevel: string;
  isLatest: boolean;
  data: any;
}

export function buildSymptomReportVersions(currentReport: any, history: any[] = []): SymptomReportVersion[] {
  const byId = new Map<string, SymptomReportVersion>();

  for (const entry of history) {
    if (!entry?.id) continue;
    const id = String(entry.id);
    byId.set(id, {
      id,
      createdAt: entry.createdAt ?? entry.updatedAt ?? '',
      riskLevel: String(entry.riskLevel ?? entry.risk_level ?? 'UNKNOWN').toUpperCase(),
      isLatest: false,
      data: { ...entry, historyId: id, id },
    });
  }

  if (currentReport) {
    const historyId = currentReport.historyId ?? currentReport.history_id;
    const id = historyId
      ? String(historyId)
      : resolveSymptomReportDocumentId(currentReport, currentReport.patientId);

    if (id) {
      const existing = byId.get(id);
      byId.set(id, {
        id,
        createdAt: currentReport.updatedAt ?? currentReport.createdAt ?? existing?.createdAt ?? '',
        riskLevel: String(
          currentReport.riskLevel ?? currentReport.risk_level ?? existing?.riskLevel ?? 'UNKNOWN',
        ).toUpperCase(),
        isLatest: true,
        data: { ...(existing?.data ?? {}), ...currentReport, historyId: id, id },
      });
    }
  }

  const versions = [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (versions.length > 0 && !versions.some((v) => v.isLatest)) {
    versions[0].isLatest = true;
  }

  for (const version of versions) {
    version.isLatest = version.id === versions.find((v) => v.isLatest)?.id;
  }

  return versions;
}

export function formatVersionLabel(version: SymptomReportVersion, index: number, total: number): string {
  const date = version.createdAt
    ? new Date(version.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown date';

  const versionNum = total - index;
  const prefix = version.isLatest ? 'Latest' : `Version ${versionNum}`;
  return `${prefix} · ${date} · ${version.riskLevel}`;
}

export function countCommentsByDocumentId(comments: any[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const comment of comments) {
    const id = String(comment?.documentId ?? '');
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function getVersionShortLabel(version: SymptomReportVersion, index: number, total: number): string {
  if (version.isLatest) return 'Latest';
  return `Version ${total - index}`;
}
