import { useEffect, useRef } from 'react';
import { socketService, SOCKET_EVENTS } from '../services/socketService';
import { type Hospital } from '../services/hospitalServices';
import { type User } from '../services/userServices';
import { type Notification } from '../services/notificationService';
import { useAppDispatch } from '../store/hooks';
import { invalidatePatients, patientRemoved } from '../store/patientsSlice';
import { hospitalLinked, hospitalUnlinked, patientCountChanged } from '../store/hospitalsSlice';
import { staffMemberAdded, staffMemberUpdated, staffMemberRemoved } from '../store/staffSlice';
import { profileUpdated, profileEvicted, invalidateProfile } from '../store/patientProfileSlice';
import { addNotification } from '../store/notificationsSlice';
import { incrementFeedbackUnread } from '../store/feedbackSlice';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type SocketPayload = Record<string, unknown>;

type FeedbackSocketPayload = {
    feedbackId?: string;
    feedbackPage?: string;
    feedbackMessage?: string;
    senderId?: string;
    senderName?: string;
    reply?: {
        senderId?: string;
        senderName?: string;
        message?: string;
    };
};

const asSocketPayload = (payload: unknown): SocketPayload =>
    typeof payload === 'object' && payload !== null ? payload as SocketPayload : {};

const isHospital = (value: unknown): value is Hospital =>
    typeof value === 'object' && value !== null &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).name === 'string';

const isUser = (value: unknown): value is User =>
    typeof value === 'object' && value !== null &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).email === 'string' &&
    typeof (value as any).firstName === 'string' &&
    typeof (value as any).lastName === 'string' &&
    typeof (value as any).role === 'string';

const isNotification = (value: unknown): value is Notification =>
    typeof value === 'object' && value !== null &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).title === 'string' &&
    typeof (value as any).message === 'string' &&
    typeof (value as any).type === 'string';

/**
 * Mounts once inside the authenticated layout.
 * Connects the socket and routes all real-time events directly into the Redux store.
 * No re-fetches needed — the store is updated in place.
 */
export default function SocketProvider() {
    const dispatch = useAppDispatch();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Keep a ref to showToast so the socket handler always has the latest version
    // without needing to re-register listeners on every render
    const showToastRef = useRef(showToast);
    const navigateRef = useRef(navigate);
    const userIdRef = useRef(user?.id);
    useEffect(() => { showToastRef.current = showToast; }, [showToast]);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);
    useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

    useEffect(() => {
        const sock = socketService.connect();
        if (!sock) return;

        // --- Patients ---
        const onPatientCreated = () => {
            console.log('🔌 [socket] patient:created received');
            dispatch(invalidatePatients());
        };
        const onPatientUpdated = (data: unknown) => {
            const payload = asSocketPayload(data);
            const patient = payload.patient as { id?: string } | undefined;
            console.log('🔌 [socket] patient:updated received', patient?.id);
            dispatch(invalidatePatients());
            if (patient?.id) {
                dispatch(profileUpdated({ patientId: patient.id, data: patient }));
            }
        };
        const onPatientDeleted = (data: unknown) => {
            const payload = asSocketPayload(data);
            const patient = payload.patient as { hospital?: string } | undefined;
            const patientId = typeof payload.patientId === 'string' ? payload.patientId : undefined;
            console.log('🔌 [socket] patient:deleted received', patientId);
            if (patientId) {
                dispatch(patientRemoved(patientId));
                dispatch(profileEvicted(patientId));
                if (patient?.hospital) {
                    dispatch(patientCountChanged({ hospitalName: patient.hospital, delta: -1 }));
                }
            }
        };

        // --- Patient Records (visits, labwork, triage, medications, etc.) ---
        // Record mutations affect riskLevel/diagnosis on the list too, so invalidate both.
        const onRecordMutated = (data: unknown) => {
            const payload = asSocketPayload(data);
            console.log('🔌 [socket] patient:record:* received', payload);
            dispatch(invalidatePatients());
            if (typeof payload.patientId === 'string') {
                console.log(`🔌 [socket] invalidating profile for patient: ${payload.patientId}`);
                dispatch(invalidateProfile(payload.patientId));
            }
        };

        // --- Hospitals ---
        const onHospitalLinked = (data: unknown) => {
            const payload = asSocketPayload(data);
            if (isHospital(payload.hospital)) dispatch(hospitalLinked(payload.hospital));
        };
        const onHospitalUnlinked = (data: unknown) => {
            const payload = asSocketPayload(data);
            if (typeof payload.hospitalId === 'string') dispatch(hospitalUnlinked(payload.hospitalId));
        };

        // --- Staff ---
        const onStaffAdded = (data: unknown) => {
            const payload = asSocketPayload(data);
            if (isUser(payload.user)) dispatch(staffMemberAdded(payload.user));
        };
        const onStaffUpdated = (data: unknown) => {
            const payload = asSocketPayload(data);
            if (isUser(payload.user)) dispatch(staffMemberUpdated(payload.user));
        };
        const onStaffDeleted = (data: unknown) => {
            const payload = asSocketPayload(data);
            if (typeof payload.userId === 'string') dispatch(staffMemberRemoved(payload.userId));
        };

        // --- Notifications ---
        const onNotificationNew = (data: unknown) => {
            const payload = asSocketPayload(data);
            console.log('🔌 [socket] notification:new received', payload);
            if (isNotification(payload)) dispatch(addNotification(payload));
        };

        // --- Feedback replies ---
        const onFeedbackReply = (data: unknown) => {
            const payload = asSocketPayload(data) as FeedbackSocketPayload;
            console.log('🔔 [socket] feedback:reply received', payload);
            if (!payload) return;
            if (payload.reply?.senderId && payload.reply.senderId !== userIdRef.current && payload.feedbackId) {
                dispatch(incrementFeedbackUnread(payload.feedbackId));
            }
            const sender = payload.reply?.senderName ?? 'Someone';
            const page   = payload.feedbackPage ?? 'feedback';
            showToastRef.current({
                type: 'reply',
                title: `New reply from ${sender}`,
                message: `On "${page}" feedback: ${payload.reply?.message?.slice(0, 60) ?? ''}${(payload.reply?.message?.length ?? 0) > 60 ? '…' : ''}`,
                onClick: () => navigateRef.current('/Feedback'),
            });
            window.dispatchEvent(new Event('feedback-data-updated'));
        };

        // --- New Feedback ---
        const onFeedbackNew = (data: unknown) => {
            const payload = asSocketPayload(data) as FeedbackSocketPayload;
            console.log('🔔 [socket] feedback:new received', payload);
            if (!payload) return;
            if (payload.senderId && payload.senderId !== userIdRef.current && payload.feedbackId) {
                dispatch(incrementFeedbackUnread(payload.feedbackId));
            }
            const sender = payload.senderName ?? 'Someone';
            const page   = payload.feedbackPage ?? 'feedback';
            showToastRef.current({
                type: 'reply',
                title: `New feedback from ${sender}`,
                message: `On "${page}": ${payload.feedbackMessage?.slice(0, 60) ?? ''}${(payload.feedbackMessage?.length ?? 0) > 60 ? '…' : ''}`,
                onClick: () => navigateRef.current('/Feedback'),
            });
            window.dispatchEvent(new Event('feedback-data-updated'));
        };

        sock.on(SOCKET_EVENTS.PATIENT_CREATED, onPatientCreated);
        sock.on(SOCKET_EVENTS.PATIENT_UPDATED, onPatientUpdated);
        sock.on(SOCKET_EVENTS.PATIENT_DELETED, onPatientDeleted);
        sock.on(SOCKET_EVENTS.PATIENT_RECORD_CREATED, onRecordMutated);
        sock.on(SOCKET_EVENTS.PATIENT_RECORD_UPDATED, onRecordMutated);
        sock.on(SOCKET_EVENTS.PATIENT_RECORD_DELETED, onRecordMutated);
        sock.on(SOCKET_EVENTS.HOSPITAL_LINKED, onHospitalLinked);
        sock.on(SOCKET_EVENTS.HOSPITAL_UNLINKED, onHospitalUnlinked);
        sock.on(SOCKET_EVENTS.STAFF_ADDED, onStaffAdded);
        sock.on(SOCKET_EVENTS.STAFF_UPDATED, onStaffUpdated);
        sock.on(SOCKET_EVENTS.STAFF_DELETED, onStaffDeleted);
        sock.on(SOCKET_EVENTS.NOTIFICATION_NEW, onNotificationNew);
        sock.on(SOCKET_EVENTS.FEEDBACK_NEW, onFeedbackNew);
        sock.on(SOCKET_EVENTS.FEEDBACK_REPLY, onFeedbackReply);

        return () => {
            sock.off(SOCKET_EVENTS.PATIENT_CREATED, onPatientCreated);
            sock.off(SOCKET_EVENTS.PATIENT_UPDATED, onPatientUpdated);
            sock.off(SOCKET_EVENTS.PATIENT_DELETED, onPatientDeleted);
            sock.off(SOCKET_EVENTS.PATIENT_RECORD_CREATED, onRecordMutated);
            sock.off(SOCKET_EVENTS.PATIENT_RECORD_UPDATED, onRecordMutated);
            sock.off(SOCKET_EVENTS.PATIENT_RECORD_DELETED, onRecordMutated);
            sock.off(SOCKET_EVENTS.HOSPITAL_LINKED, onHospitalLinked);
            sock.off(SOCKET_EVENTS.HOSPITAL_UNLINKED, onHospitalUnlinked);
            sock.off(SOCKET_EVENTS.STAFF_ADDED, onStaffAdded);
            sock.off(SOCKET_EVENTS.STAFF_UPDATED, onStaffUpdated);
            sock.off(SOCKET_EVENTS.STAFF_DELETED, onStaffDeleted);
            sock.off(SOCKET_EVENTS.NOTIFICATION_NEW, onNotificationNew);
            sock.off(SOCKET_EVENTS.FEEDBACK_NEW, onFeedbackNew);
            sock.off(SOCKET_EVENTS.FEEDBACK_REPLY, onFeedbackReply);
        };
    }, [dispatch]);

    return null; // renders nothing
}
