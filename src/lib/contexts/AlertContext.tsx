import React, { createContext, useContext, useState, FC, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid'

interface Alert {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: ReactNode;
  exiting?: boolean; // Add this line
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (type: Alert['type'], message: Alert['message']) => void;
  removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (type: Alert['type'], message: Alert['message']) => {
    const id = uuidv4();
    setAlerts((prevAlerts) => [...prevAlerts, { id, type, message }]);
    setTimeout(() => removeAlert(id), 4000);
  };

  const removeAlert = (id: string) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) =>
        alert.id === id ? { ...alert, exiting: true } : alert
      )
    );

    // Schedule the actual removal after the animation duration
    setTimeout(() => {
      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
    }, 300); // At least as long as exit animation
  };

  const value = { alerts, addAlert, removeAlert };

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within a AlertProvider');
  }
  return context;
};
