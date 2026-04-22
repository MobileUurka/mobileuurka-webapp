import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { notificationService, type Notification } from '../services/notificationService';

interface NotificationsState {
    data: Notification[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: NotificationsState = {
    data: [],
    status: 'idle',
};

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
    const res = await notificationService.getMyNotifications();
    return res.notifications;
});

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification(state, action: PayloadAction<Notification>) {
            // Prepend real-time notification if not already present
            if (!state.data.find(n => n.id === action.payload.id)) {
                state.data.unshift(action.payload);
            }
        },
        markRead(state, action: PayloadAction<string>) {
            const n = state.data.find(n => n.id === action.payload);
            if (n) n.readAt = new Date().toISOString();
        },
        markAllRead(state) {
            const now = new Date().toISOString();
            state.data.forEach(n => { if (!n.readAt) n.readAt = now; });
        },
        removeNotification(state, action: PayloadAction<string>) {
            state.data = state.data.filter(n => n.id !== action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload;
            })
            .addCase(fetchNotifications.rejected, (state) => { state.status = 'failed'; });
    },
});

export const { addNotification, markRead, markAllRead, removeNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
