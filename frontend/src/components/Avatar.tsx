import React, { useState, useEffect } from 'react';
import { getProfileImageUrl } from '../utils/imageUtils';
import './Avatar.css';

interface AvatarProps {
    src?: string;
    alt: string;
    name?: string;
    size?: number | string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

const Avatar: React.FC<AvatarProps> = ({
    src,
    alt,
    name,
    size = 40,
    className = '',
    onClick
}) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [src]);

    const imageUrl = getProfileImageUrl(src);
    const sizeStyle = typeof size === 'number' ? { width: size, height: size, fontSize: size * 0.4 } : { width: size, height: size };

    // Generate initials if no name provided
    const initials = name ? name.charAt(0).toUpperCase() : '?';

    return (
        <div
            className={`avatar-container ${className}`}
            style={sizeStyle}
            onClick={onClick}
        >
            {imageUrl && !error ? (
                <img
                    src={imageUrl}
                    alt={alt}
                    className="avatar-image"
                    onError={() => setError(true)}
                    loading="lazy"
                />
            ) : (
                <div className="avatar-placeholder">
                    {initials}
                </div>
            )}
        </div>
    );
};

export default Avatar;
