import { useCallback, useEffect, useState } from 'react';
import {
  diagnosisVerificationService,
  type VerificationEntry,
} from '../services/diagnosisVerificationService';

type SourceType = 'predisposition' | 'symptom_report';

export function useClinicalVerification(
  patientId: string | undefined,
  sourceType: SourceType,
  sourceId?: string | null,
) {
  const [verifications, setVerifications] = useState<VerificationEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!patientId) {
      setVerifications([]);
      return;
    }

    setLoading(true);
    try {
      if (sourceId) {
        const res = await diagnosisVerificationService.getSourceVerifications(sourceType, sourceId);
        setVerifications(res.data?.verifications ?? []);
      } else {
        const res = await diagnosisVerificationService.getPatientVerifications(patientId);
        setVerifications(
          (res.data?.verifications ?? []).filter(v => v.sourceType === sourceType),
        );
      }
    } catch (err) {
      console.error('Failed to load verifications:', err);
      setVerifications([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, sourceType, sourceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const latestVerification = verifications[0] ?? null;

  const addVerification = useCallback((entry: VerificationEntry) => {
    setVerifications(prev => [entry, ...prev.filter(v => v.id !== entry.id)]);
  }, []);

  return { verifications, latestVerification, loading, reload, addVerification };
}

export function formatVerificationAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
