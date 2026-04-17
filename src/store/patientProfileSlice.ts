import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { patientService } from '../services/patientServices';
import type { PatientData } from '../types/patient';

interface PatientProfileState {
    // Keyed by patient ID so multiple profiles can be cached simultaneously
    profiles: Record<string, PatientData>;
    // Per-ID loading status
    statusById: Record<string, 'idle' | 'loading' | 'succeeded' | 'failed'>;
    errorById: Record<string, string | null>;
    lastFetchedById: Record<string, number>;
}

const initialState: PatientProfileState = {
    profiles: {},
    statusById: {},
    errorById: {},
    lastFetchedById: {},
};

// Stale threshold: 2 minutes (profile data changes less often than the list)
const STALE_MS = 2 * 60_000;

export const fetchPatientProfile = createAsyncThunk(
    'patientProfile/fetch',
    async (patientId: string, { getState, rejectWithValue }) => {
        const state = (getState() as { patientProfile: PatientProfileState }).patientProfile;
        const now = Date.now();
        const lastFetched = state.lastFetchedById[patientId];
        const status = state.statusById[patientId];

        // Skip only if data is genuinely fresh
        if (status === 'succeeded' && lastFetched && now - lastFetched < STALE_MS) {
            console.log(`🗂️ [store] profile fetch skipped (fresh): ${patientId}`);
            return null;
        }

        console.log(`🗂️ [store] profile fetching: ${patientId} (status was: ${status ?? 'undefined'})`);
        try {
            const response = await patientService.getPatientCompleteProfile(patientId);
            if (!response.success) throw new Error('Failed to fetch patient profile');
            return { patientId, data: response.data as PatientData };
        } catch (err: any) {
            return rejectWithValue({ patientId, message: err.message || 'Unknown error' });
        }
    }
);

const patientProfileSlice = createSlice({
    name: 'patientProfile',
    initialState,
    reducers: {
        // Called by socket PATIENT_UPDATED — merge new fields into cached profile
        profileUpdated(state, action: PayloadAction<{ patientId: string; data: Partial<PatientData> }>) {
            const { patientId, data } = action.payload;
            if (state.profiles[patientId]) {
                state.profiles[patientId] = { ...state.profiles[patientId], ...data };
            }
        },
        // Evict a single profile (e.g. after delete)
        profileEvicted(state, action: PayloadAction<string>) {
            const id = action.payload;
            delete state.profiles[id];
            delete state.statusById[id];
            delete state.errorById[id];
            delete state.lastFetchedById[id];
        },
        // Force re-fetch on next visit (used when a record inside the patient changes)
        invalidateProfile(state, action: PayloadAction<string>) {
            const id = action.payload;
            delete state.lastFetchedById[id];
            // Set to idle so the watching useEffect in Patient.tsx triggers a re-fetch.
            // We intentionally keep state.profiles[id] intact so stale data stays visible.
            state.statusById[id] = 'idle';
            console.log(`🗂️ [store] profile invalidated: ${id} → status=idle`);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPatientProfile.pending, (state, action) => {
                const id = action.meta.arg;
                state.statusById[id] = 'loading';
                state.errorById[id] = null;
            })
            .addCase(fetchPatientProfile.fulfilled, (state, action) => {
                if (action.payload === null) {
                    // Cache was fresh — just mark succeeded (already set)
                    const id = action.meta.arg;
                    state.statusById[id] = 'succeeded';
                    return;
                }
                const { patientId, data } = action.payload;
                state.profiles[patientId] = data;
                state.statusById[patientId] = 'succeeded';
                state.lastFetchedById[patientId] = Date.now();
            })
            .addCase(fetchPatientProfile.rejected, (state, action) => {
                const payload = action.payload as { patientId: string; message: string };
                if (payload?.patientId) {
                    state.statusById[payload.patientId] = 'failed';
                    state.errorById[payload.patientId] = payload.message;
                }
            })
            .addCase('RESET_ALL', () => initialState);
    },
});

export const { profileUpdated, profileEvicted, invalidateProfile } = patientProfileSlice.actions;
export default patientProfileSlice.reducer;
