/**
 * ActionChecklist
 *
 * Parses immediateActions, monitoringRequirements, and recommendations text
 * fields into structured action items — purely in the UI layer, no schema changes.
 *
 * Features:
 * - Clinicians can tick off items per visit (state is local/session only)
 * - CRITICAL risk level shows an escalation banner with a button to notify
 *   a supervising clinician via the existing notification system
 */

import React, { useState, useCallback } from 'react';
import {
  LuCircleCheck, LuCircle,
  LuHeartPulse
} from 'react-icons/lu';

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <strong key={index} style={{ fontWeight: 700, color: '#111827' }}>
              {part}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
};

interface ActionChecklistProps {
  immediateActions: string[];
  monitoringRequirements: string[];
  recommendations: string[];
  riskLevel: string;
  patientName?: string;
  onEscalate?: (message: string) => Promise<void>;
}

type CheckState = Record<string, boolean>;

const ActionChecklist: React.FC<ActionChecklistProps> = ({
  immediateActions,
  
}) => {
  const [checked, setChecked] = useState<CheckState>({});

  const toggle = useCallback((key: string) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const renderList = (
    items: string[],
    prefix: string,
    icon: React.ReactNode,
    accentColor: string,
    bgColor: string,
  ) => {
    if (!items.length) return null;
    const done = items.filter((_, i) => checked[`${prefix}-${i}`]).length;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: accentColor, display: 'flex' }}>{icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>
              {prefix === 'immediate' ? 'Immediate Actions' : prefix === 'monitoring' ? 'Monitoring Requirements' : 'Recommendations'}
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>{done}/{items.length} done</span>
        </div>
        <div style={{ background: bgColor, borderRadius: 8, padding: '8px 12px', border: `1px solid ${accentColor}22` }}>
          {items.map((item, i) => {
            const key = `${prefix}-${i}`;
            const isDone = !!checked[key];
            return (
              <div
                key={key}
                onClick={() => toggle(key)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '7px 4px', cursor: 'pointer',
                  borderBottom: i < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                  opacity: isDone ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <span style={{ color: isDone ? '#16a34a' : '#d1d5db', flexShrink: 0, marginTop: 1 }}>
                  {isDone ? <LuCircleCheck size={16} /> : <LuCircle size={16} />}
                </span>
                <span style={{
                  fontSize: 13, color: '#374151', lineHeight: 1.5,
                  textDecoration: isDone ? 'line-through' : 'none',
                }}>
                  {renderFormattedText(item)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {renderList(immediateActions, 'immediate', <LuHeartPulse size={14} />, '#dc2626', '#fef2f2')}
    </div>
  );
};

export default ActionChecklist;
