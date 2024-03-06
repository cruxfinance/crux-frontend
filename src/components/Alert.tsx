import React from 'react';
import { Transition, TransitionGroup, TransitionStatus } from 'react-transition-group';
import Alert, { AlertColor } from '@mui/material/Alert';
import { Box } from '@mui/system';
import { useAlert } from '@contexts/AlertContext';
import { Collapse } from '@mui/material';

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, transform ${duration}ms`,
} as React.CSSProperties;

const transitionStyles: Record<TransitionStatus, React.CSSProperties> = {
  entering: {
    opacity: 0,
    transform: 'translateX(100%)',
  },
  entered: {
    opacity: 1,
    transform: 'translateX(0%)',
  },
  exiting: {
    opacity: 0,
    transform: 'translateX(100%)',
  },
  exited: {
    opacity: 0
  },
  unmounted: {},
};

const truncateMessage = (message: string, maxLength: number = 100) => {
  return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;
};

const AlertComponent = () => {
  const { alerts, removeAlert } = useAlert();

  const handleRemoveAlert = (id: string) => {
    removeAlert(id);
  };

  const alertColors = {
    success: '#4caf50', // Green
    error: '#f44336', // Red
    warning: '#ff9800', // Orange
    info: '#2196f3', // Blue
  };

  return (
    <Box sx={{ position: 'fixed', top: 0, right: 0, margin: 2, zIndex: 9999 }}>
      <TransitionGroup>
        {alerts.map((alert) => (
          <Transition
            key={alert.id}
            in={!alert.exiting}
            timeout={400}
            onExited={() => handleRemoveAlert(alert.id)}
          >
            {(state) => (
              <Alert
                variant="filled"
                sx={{

                  ...defaultStyle,
                  ...transitionStyles[state]
                }}
                severity={alert.type}
                onClose={() => removeAlert(alert.id)}
              >
                {alert.message}
              </Alert>
            )}
          </Transition>
        ))}
      </TransitionGroup>
    </Box>
  );
}

export default AlertComponent;
