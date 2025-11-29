import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

interface UserBadgeProps {
  userId: string;
  size?: number;
  className?: string;
}

export default function UserBadge({ userId, size = 24, className = '' }: UserBadgeProps) {
  const { currentUser, partner } = useUser();
  const [initial, setInitial] = useState('');
  const [fullName, setFullName] = useState('');
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    // Determine if this is the current user or partner
    if (currentUser?.id === userId) {
      setIsCurrentUser(true);
      const name = currentUser.display_name || 'You';
      setFullName(name);
      setInitial(name.charAt(0).toUpperCase());
    } else if (partner?.id === userId) {
      setIsCurrentUser(false);
      const name = partner.display_name || partner.email;
      setFullName(name);
      setInitial(name.charAt(0).toUpperCase());
    } else {
      // Unknown user (shouldn't happen, but handle gracefully)
      setFullName('Unknown');
      setInitial('?');
    }
  }, [userId, currentUser, partner]);

  // Gradient colors inspired by the map icon
  // Current user: Cyan/teal gradient (left side of icon)
  // Partner: Purple/pink gradient (right side of icon)
  const gradientClass = isCurrentUser
    ? 'bg-gradient-to-br from-cyan-400 to-teal-500'
    : 'bg-gradient-to-br from-purple-500 to-pink-500';

  return (
    <div
      className={`relative group ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Badge circle */}
      <div
        className={`w-full h-full rounded-full ${gradientClass} flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/20`}
        style={{ fontSize: size * 0.5 }}
      >
        {initial}
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
          {fullName}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
