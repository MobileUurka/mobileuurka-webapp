import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { feedbackService } from '../services/feedbackService';

interface FeedbackUnreadState {
    byFeedbackId: Record<string, number>;
    totalUnread: number;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: FeedbackUnreadState = {
    byFeedbackId: {},
    totalUnread: 0,
    status: 'idle',
};

export const fetchFeedbackUnreadSummary = createAsyncThunk('feedback/fetchUnreadSummary', async () => {
    const res = await feedbackService.getUnreadSummary();
    return res.data;
});

const feedbackSlice = createSlice({
    name: 'feedback',
    initialState,
    reducers: {
        incrementFeedbackUnread(state, action: PayloadAction<string>) {
            const id = action.payload;
            state.byFeedbackId[id] = (state.byFeedbackId[id] ?? 0) + 1;
            state.totalUnread += 1;
        },
        markFeedbackRead(state, action: PayloadAction<string>) {
            const id = action.payload;
            const count = state.byFeedbackId[id] ?? 0;
            if (count > 0) {
                delete state.byFeedbackId[id];
                state.totalUnread = Math.max(0, state.totalUnread - count);
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFeedbackUnreadSummary.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchFeedbackUnreadSummary.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.byFeedbackId = action.payload.byFeedbackId;
                state.totalUnread = action.payload.totalUnread;
            })
            .addCase(fetchFeedbackUnreadSummary.rejected, (state) => { state.status = 'failed'; })
            .addCase('RESET_ALL', () => initialState);
    },
});

export const { incrementFeedbackUnread, markFeedbackRead } = feedbackSlice.actions;
export default feedbackSlice.reducer;
