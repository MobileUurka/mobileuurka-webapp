import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { patientService } from '../services/patientServices';
import type { Patient } from '../constants/patientColumns';

interface PatientsState {
    data: Patient[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastFetched: number | null;
}

const initialState: PatientsState = {
    data: [],
    status: 'idle',
    error: null,
    lastFetched: null,
};

// Stale threshold: 60 seconds
const STALE_MS = 60_000;

export const fetchPatients = createAsyncThunk(
    'patients/fetch',
    async (_, { getState, rejectWithValue }) => {
        const state = (getState() as { patients: PatientsState }).patients;
        const now = Date.now();

        // Skip only if data is genuinely fresh (not invalidated)
        if (
            state.status === 'succeeded' &&
            state.lastFetched &&
            now - state.lastFetched < STALE_MS
        ) {
            return null;
        }

        try {
            const response = await patientService.getPatientsRiskOverview({ page: 1, limit: 100 });
            if (!response.success) throw new Error('Failed to fetch patients');

            return response.data.map((item: any) => ({
                ...item.patient,
                diagnosis: item.diagnosis,
                riskLevel: item.riskLevel,
                nextVisit: item.nextVisit,
                lastVisitDate: item.lastVisitDate,
                originalData: item,
            })) as Patient[];
        } catch (err: any) {
            return rejectWithValue(err.message || 'Unknown error');
        }
    }
);

const patientsSlice = createSlice({
    name: 'patients',
    initialState,
    reducers: {
        // Invalidate + trigger background re-fetch
        // Used by socket events — keeps existing data visible while re-fetching
        invalidate(state) {
            state.lastFetched = null;
            // Only drop back to idle if we're not already loading
            if (state.status !== 'loading') {
                state.status = 'idle';
            }
        },
        // Hard remove (patient deleted) — no re-fetch needed
        patientRemoved(state, action: PayloadAction<string>) {
            state.data = state.data.filter(p => p.id !== action.payload);
        },
        // Keep these for direct in-place updates if the payload is ever enriched
        patientAdded(state, action: PayloadAction<Patient>) {
            const exists = state.data.some(p => p.id === action.payload.id);
            if (!exists) state.data.unshift(action.payload);
        },
        patientUpdated(state, action: PayloadAction<Patient>) {
            const idx = state.data.findIndex(p => p.id === action.payload.id);
            if (idx !== -1) state.data[idx] = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPatients.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchPatients.fulfilled, (state, action) => {
                if (action.payload !== null) {
                    state.data = action.payload;
                    state.lastFetched = Date.now();
                }
                state.status = 'succeeded';
            })
            .addCase(fetchPatients.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            .addCase('RESET_ALL', () => initialState);
    },
});

export const { patientAdded, patientUpdated, patientRemoved, invalidate: invalidatePatients } = patientsSlice.actions;
export default patientsSlice.reducer;
