import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { hospitalService, type Hospital } from '../services/hospitalServices';

interface HospitalsState {
    data: Hospital[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastFetched: number | null;
}

const initialState: HospitalsState = {
    data: [],
    status: 'idle',
    error: null,
    lastFetched: null,
};

const STALE_MS = 60_000;

export const fetchHospitals = createAsyncThunk(
    'hospitals/fetch',
    async (_, { getState, rejectWithValue }) => {
        const state = (getState() as { hospitals: HospitalsState }).hospitals;
        const now = Date.now();

        if (state.status === 'succeeded' && state.lastFetched && now - state.lastFetched < STALE_MS) {
            return null;
        }

        try {
            return await hospitalService.getAvailableHospitals();
        } catch (err: any) {
            return rejectWithValue(err.message || 'Unknown error');
        }
    }
);

const hospitalsSlice = createSlice({
    name: 'hospitals',
    initialState,
    reducers: {
        hospitalLinked(state, action: PayloadAction<Hospital>) {
            const exists = state.data.some(h => h.id === action.payload.id);
            if (!exists) state.data.push(action.payload);
        },
        hospitalUnlinked(state, action: PayloadAction<string>) {
            state.data = state.data.filter(h => h.id !== action.payload);
        },
        patientCountChanged(state, action: PayloadAction<{ hospitalName: string; delta: number }>) {
            const h = state.data.find(h => h.name === action.payload.hospitalName);
            if (h) h.totalPatients = Math.max(0, (h.totalPatients || 0) + action.payload.delta);
        },
        invalidate(state) {
            state.lastFetched = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchHospitals.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchHospitals.fulfilled, (state, action) => {
                if (action.payload !== null) {
                    state.data = action.payload;
                    state.lastFetched = Date.now();
                }
                state.status = 'succeeded';
            })
            .addCase(fetchHospitals.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            .addCase('RESET_ALL', () => initialState);
    },
});

export const {
    hospitalLinked,
    hospitalUnlinked,
    patientCountChanged,
    invalidate: invalidateHospitals,
} = hospitalsSlice.actions;
export default hospitalsSlice.reducer;
