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
  const [emoji, setEmoji] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    // Determine if this is the current user or partner
    if (currentUser?.id === userId) {
      setIsCurrentUser(true);
      const name = currentUser.display_name || 'You';
      setInitial(name.charAt(0).toUpperCase());
      setEmoji(currentUser.profile_emoji || null);
    } else if (partner?.id === userId) {
      setIsCurrentUser(false);
      const name = partner.display_name || partner.email;
      setInitial(name.charAt(0).toUpperCase());
      setEmoji(partner.profile_emoji || null);
    } else {
      // Unknown user (shouldn't happen, but handle gracefully)
      setInitial('?');
      setEmoji(null);
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
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Badge circle */}
      <div
        className={`w-full h-full rounded-full ${emoji ? 'bg-gray-800/50' : gradientClass} flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/20`}
        style={{ fontSize: emoji ? size * 0.6 : size * 0.5 }}
      >
        {emoji || initial}
      </div>
    </div>
  );
}
