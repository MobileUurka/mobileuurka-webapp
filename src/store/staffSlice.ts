import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { userService, type User } from '../services/userServices';

interface StaffState {
    data: User[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastFetched: number | null;
}

const initialState: StaffState = {
    data: [],
    status: 'idle',
    error: null,
    lastFetched: null,
};

const STALE_MS = 60_000;

export const fetchStaff = createAsyncThunk(
    'staff/fetch',
    async (_, { getState, rejectWithValue }) => {
        const state = (getState() as { staff: StaffState }).staff;
        const now = Date.now();

        if (state.status === 'succeeded' && state.lastFetched && now - state.lastFetched < STALE_MS) {
            return null;
        }

        try {
            return await userService.getUsers();
        } catch (err: any) {
            return rejectWithValue(err.message || 'Unknown error');
        }
    }
);

const staffSlice = createSlice({
    name: 'staff',
    initialState,
    reducers: {
        staffMemberAdded(state, action: PayloadAction<User>) {
            const exists = state.data.some(u => u.id === action.payload.id);
            if (!exists) state.data.unshift(action.payload);
        },
        staffMemberUpdated(state, action: PayloadAction<User>) {
            const idx = state.data.findIndex(u => u.id === action.payload.id);
            if (idx !== -1) state.data[idx] = action.payload;
        },
        staffMemberRemoved(state, action: PayloadAction<string>) {
            state.data = state.data.filter(u => u.id !== action.payload);
        },
        invalidate(state) {
            state.lastFetched = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchStaff.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchStaff.fulfilled, (state, action) => {
                if (action.payload !== null) {
                    state.data = action.payload;
                    state.lastFetched = Date.now();
                }
                state.status = 'succeeded';
            })
            .addCase(fetchStaff.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            .addCase('RESET_ALL', () => initialState);
    },
});

export const {
    staffMemberAdded,
    staffMemberUpdated,
    staffMemberRemoved,
    invalidate: invalidateStaff,
} = staffSlice.actions;
export default staffSlice.reducer;
