import React from 'react';
import './Avatar.css';

const Avatar = ({ user, onClick }) => {
    // Function to generate a color from a string (user's name)
    const stringToColor = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';

    const avatarStyle = user && !user.avatar_url 
        ? { backgroundColor: stringToColor(fullName || 'Default User') }
        : {};

    return (
        <div className="avatar-container" onClick={onClick}>
            {user && user.avatar_url ? (
                <img src={user.avatar_url} alt={fullName} className="avatar-image" />
            ) : (
                <div className="avatar-initials" style={avatarStyle}>
                    {user ? getInitials(user.first_name) : ''}
                </div>
            )}
        </div>
    );
};

export default Avatar;
