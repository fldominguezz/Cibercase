import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import { toast } from 'react-toastify';

// Hardcode the frontend's current version for comparison.
// In a real build system, this might be injected by a build script.
const FRONTEND_VERSION = "1.0.0"; 

const UpdateNotification = ({ currentUser }) => {
    const [backendVersion, setBackendVersion] = useState(null);
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    const [postponed, setPostponed] = useState(false);

    const fetchBackendVersion = useCallback(async () => {
        if (!currentUser || currentUser.role !== 'Admin') {
            return; // Only admins need to check for updates
        }
        try {
            const data = await apiFetch('/system/version');
            setBackendVersion(data);
            if (data && data !== FRONTEND_VERSION) {
                // Check if update was previously postponed
                const lastPostpone = localStorage.getItem('updatePostponedUntil');
                if (lastPostpone && new Date(lastPostpone) > new Date()) {
                    setPostponed(true);
                } else {
                    setShowUpdatePrompt(true);
                    setPostponed(false); // Reset postpone if time has passed
                }
            }
        } catch (error) {
            console.error("Failed to fetch backend version:", error);
            // Optionally, show an error toast to the admin
            // toast.error("Failed to check for updates.");
        }
    }, [currentUser]);

    useEffect(() => {
        fetchBackendVersion();
        const interval = setInterval(fetchBackendVersion, 300000); // Check every 5 minutes
        return () => clearInterval(interval);
    }, [fetchBackendVersion]);

    const handleUpdate = () => {
        // In a real scenario, this would trigger a client-side update process.
        // For now, we'll just show a message and perhaps redirect the user
        // to a documentation page or trigger a manual pull.
        toast.info("Por favor, actualiza tu sistema manualmente (pull desde GitHub) y reinicia el servicio.");
        // Maybe provide a link to the GitHub repo or internal documentation
        // window.location.href = "https://github.com/your-repo/cibercase/releases"; 
        setShowUpdatePrompt(false);
        setPostponed(false);
    };

    const handlePostpone = () => {
        const postponeUntil = new Date();
        postponeUntil.setDate(postponeUntil.getDate() + 1); // Postpone for 24 hours
        localStorage.setItem('updatePostponedUntil', postponeUntil.toISOString());
        setShowUpdatePrompt(false);
        setPostponed(true);
        toast.info("Actualización pospuesta por 24 horas.");
    };

    if (!currentUser || currentUser.role !== 'Admin' || !showUpdatePrompt || postponed) {
        return null;
    }

    return (
        <div className="alert alert-info d-flex justify-content-between align-items-center mb-0 rounded-0" role="alert">
            <div>
                <strong>¡Actualización Disponible!</strong> La versión {backendVersion} está disponible. Tu versión actual es {FRONTEND_VERSION}.
            </div>
            <div>
                <button className="btn btn-sm btn-primary me-2" onClick={handleUpdate}>Actualizar Ahora</button>
                <button className="btn btn-sm btn-secondary" onClick={handlePostpone}>Posponer</button>
            </div>
        </div>
    );
};

export default UpdateNotification;