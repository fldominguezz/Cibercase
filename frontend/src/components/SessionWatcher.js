/* import React, { useEffect, useState } from 'react';
import { getSessionExpiration } from '../api';

const SessionWatcher = () => {
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const data = await getSessionExpiration();
                const expiresAt = new Date(data.expires_at);
                const now = new Date();
                const timeLeft = expiresAt.getTime() - now.getTime();

                if (timeLeft < 5 * 60 * 1000) { // 5 minutes
                    setShowWarning(true);
                } else {
                    setShowWarning(false);
                }
            } catch (error) {
                console.error('Error checking session expiration:', error);
            }
        };

        const interval = setInterval(checkSession, 60 * 1000); // Check every minute

        return () => clearInterval(interval);
    }, []);

    if (!showWarning) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '10px',
            backgroundColor: 'orange',
            color: 'white',
            borderRadius: '5px',
            zIndex: 1000,
        }}>
            Your session will expire soon.
        </div>
    );
};

export default SessionWatcher; */

const SessionWatcher = () => null;

export default SessionWatcher;
