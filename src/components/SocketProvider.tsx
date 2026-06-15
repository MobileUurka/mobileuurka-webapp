import { useEffect, useRef } from 'react';
import { socketService, SOCKET_EVENTS } from '../services/socketService';
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
        const onPatientUpdated = (data: any) => {
            console.log('🔌 [socket] patient:updated received', data?.patient?.id);
            dispatch(invalidatePatients());
            if (data?.patient?.id) {
                dispatch(profileUpdated({ patientId: data.patient.id, data: data.patient }));
            }
        };
        const onPatientDeleted = (data: any) => {
            console.log('🔌 [socket] patient:deleted received', data?.patientId);
            if (data?.patientId) {
                dispatch(patientRemoved(data.patientId));
                dispatch(profileEvicted(data.patientId));
                if (data?.patient?.hospital) {
                    dispatch(patientCountChanged({ hospitalName: data.patient.hospital, delta: -1 }));
                }
            }
        };

        // --- Patient Records (visits, labwork, triage, medications, etc.) ---
        // Record mutations affect riskLevel/diagnosis on the list too, so invalidate both.
        const onRecordMutated = (data: any) => {
            console.log('🔌 [socket] patient:record:* received', data);
            dispatch(invalidatePatients());
            if (data?.patientId) {
                console.log(`🔌 [socket] invalidating profile for patient: ${data.patientId}`);
                dispatch(invalidateProfile(data.patientId));
            }
        };

        // --- Hospitals ---
        const onHospitalLinked = (data: any) => {
            if (data?.hospital) dispatch(hospitalLinked(data.hospital));
        };
        const onHospitalUnlinked = (data: any) => {
            if (data?.hospitalId) dispatch(hospitalUnlinked(data.hospitalId));
        };

        // --- Staff ---
        const onStaffAdded = (data: any) => {
            if (data?.user) dispatch(staffMemberAdded(data.user));
        };
        const onStaffUpdated = (data: any) => {
            if (data?.user) dispatch(staffMemberUpdated(data.user));
        };
        const onStaffDeleted = (data: any) => {
            if (data?.userId) dispatch(staffMemberRemoved(data.userId));
        };

        // --- Notifications ---
        const onNotificationNew = (data: any) => {
            console.log('🔌 [socket] notification:new received', data);
            if (data) dispatch(addNotification(data));
        };

        // --- Feedback replies ---
        const onFeedbackReply = (data: any) => {
            console.log('🔔 [socket] feedback:reply received', data);
            if (!data) return;
            if (data.reply?.senderId && data.reply.senderId !== userIdRef.current && data.feedbackId) {
                dispatch(incrementFeedbackUnread(data.feedbackId));
            }
            const sender = data.reply?.senderName ?? 'Someone';
            const page   = data.feedbackPage ?? 'feedback';
            showToastRef.current({
                type: 'reply',
                title: `New reply from ${sender}`,
                message: `On "${page}" feedback: ${data.reply?.message?.slice(0, 60) ?? ''}${(data.reply?.message?.length ?? 0) > 60 ? '…' : ''}`,
                onClick: () => navigateRef.current('/Feedback'),
            });
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
            sock.off(SOCKET_EVENTS.FEEDBACK_REPLY, onFeedbackReply);
        };
    }, [dispatch]);

    return null; // renders nothing
}
