import React, { createContext, useContext, useState } from 'react';

interface FeedbackContextValue {
    patientId?: string;
    patientName?: string;
    setPatientContext: (id?: string, name?: string) => void;
    clearPatientContext: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue>({
    setPatientContext: () => {},
    clearPatientContext: () => {},
});

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [patientId, setPatientId] = useState<string | undefined>();
    const [patientName, setPatientName] = useState<string | undefined>();

    const setPatientContext = (id?: string, name?: string) => {
        setPatientId(id);
        setPatientName(name);
    };

    const clearPatientContext = () => {
        setPatientId(undefined);
        setPatientName(undefined);
    };

    return (
        <FeedbackContext.Provider value={{ patientId, patientName, setPatientContext, clearPatientContext }}>
            {children}
        </FeedbackContext.Provider>
    );
};

export const useFeedbackContext = () => useContext(FeedbackContext);
