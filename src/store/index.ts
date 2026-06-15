import { configureStore } from '@reduxjs/toolkit';
import patientsReducer from './patientsSlice';
import hospitalsReducer from './hospitalsSlice';
import staffReducer from './staffSlice';
import patientProfileReducer from './patientProfileSlice';
import notificationsReducer from './notificationsSlice';
import feedbackReducer from './feedbackSlice';

export const store = configureStore({
    reducer: {
        patients: patientsReducer,
        hospitals: hospitalsReducer,
        staff: staffReducer,
        patientProfile: patientProfileReducer,
        notifications: notificationsReducer,
        feedback: feedbackReducer,
    },
});

// Dispatch this to wipe all cached data on logout
export const resetStore = () => ({ type: 'RESET_ALL' as const });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
