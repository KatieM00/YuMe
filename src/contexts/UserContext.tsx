import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUserProfile, getPartnerInfo, type UserProfile, type PartnerInfo } from '../lib/partnerService';

interface UserContextType {
  currentUser: UserProfile | null;
  partner: PartnerInfo | null;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = async () => {
    try {
      setIsLoading(true);

      // Load current user profile
      const userProfile = await getCurrentUserProfile();
      setCurrentUser(userProfile);

      // Load partner info if linked
      if (userProfile?.partner_id) {
        const partnerInfo = await getPartnerInfo();
        setPartner(partnerInfo);
      } else {
        setPartner(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        partner,
        isLoading,
        refreshUserData: loadUserData
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
