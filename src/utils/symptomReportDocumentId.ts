/**
 * Stable document key for symptom-report comments shared across all clinicians.
 * Prefer historyId (unique per report version); never use the patient UUID alone.
 */
export function resolveSymptomReportDocumentId(report: any, patientId?: string): string {
  const historyId = report?.historyId ?? report?.history_id;
  if (historyId) return String(historyId);

  const reportId = report?.id;
  if (reportId && patientId && String(reportId) !== String(patientId)) {
    return String(reportId);
  }

  if (patientId) return `symptom-report:${patientId}`;
  return '';
}

/** All document ids that may hold comments for this symptom report view. */
export function collectSymptomReportDocumentIds(
  report: any,
  patientId?: string,
  reportHistory: any[] = [],
  profileComments: any[] = [],
): string[] {
  const ids = new Set<string>();

  const current = resolveSymptomReportDocumentId(report, patientId);
  if (current) ids.add(current);

  if (report?.historyId) ids.add(String(report.historyId));
  if (report?.history_id) ids.add(String(report.history_id));
  if (report?.id && patientId && String(report.id) !== String(patientId)) {
    ids.add(String(report.id));
  }

  for (const entry of reportHistory) {
    if (entry?.id) ids.add(String(entry.id));
    if (entry?.historyId) ids.add(String(entry.historyId));
  }

  for (const comment of profileComments) {
    if (comment?.documentId) ids.add(String(comment.documentId));
  }

  if (patientId) {
    ids.add(patientId);
    ids.add(`symptom-report:${patientId}`);
  }

  return [...ids];
}
