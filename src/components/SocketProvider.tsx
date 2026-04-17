import { useEffect } from 'react';
import { socketService, SOCKET_EVENTS } from '../services/socketService';
import { useAppDispatch } from '../store/hooks';
import { invalidatePatients, patientRemoved } from '../store/patientsSlice';
import { hospitalLinked, hospitalUnlinked, patientCountChanged } from '../store/hospitalsSlice';
import { staffMemberAdded, staffMemberUpdated, staffMemberRemoved } from '../store/staffSlice';
import { profileUpdated, profileEvicted, invalidateProfile } from '../store/patientProfileSlice';

/**
 * Mounts once inside the authenticated layout.
 * Connects the socket and routes all real-time events directly into the Redux store.
 * No re-fetches needed — the store is updated in place.
 */
export default function SocketProvider() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const sock = socketService.connect();
        if (!sock) return;

        // --- Patients ---
        // The list endpoint (getPatientsRiskOverview) joins multiple tables for
        // riskLevel/diagnosis — we can't patch rows in-place with the raw socket payload.
        // Instead, invalidate the list so it re-fetches silently in the background.
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
        };
    }, [dispatch]);

    return null; // renders nothing
}
