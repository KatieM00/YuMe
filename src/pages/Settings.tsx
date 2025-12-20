import { useState, useEffect, useRef } from 'react';
import { Heart, Copy, Check, UserPlus, Loader, User, Globe, Music, MapPin, Eye, EyeOff, X } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';
import {
  getCurrentUserProfile,
  getPartnerInfo,
  linkPartnerAccount,
  unlinkPartnerAccount,
  updateFullName,
  updateDisplayName,
  updateTimezone,
  updateProfileEmoji,
  updateLocation,
  updatePassword,
  updateImportantDates,
  type UserProfile,
  type PartnerInfo,
} from '../lib/partnerService';
import {
  checkSpotifyConnection,
  getSpotifyAuthUrl,
  disconnectSpotify,
  type SpotifyConnectionStatus,
} from '../lib/spotifyService';

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [spotifyConnection, setSpotifyConnection] = useState<SpotifyConnectionStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('Europe/London');
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isUpdatingFullName, setIsUpdatingFullName] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);
  const [isDisconnectingSpotify, setIsDisconnectingSpotify] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUpdatingEmoji, setIsUpdatingEmoji] = useState(false);
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ place_name: string; center: [number, number]; country_code: string; country_name: string; city: string }>>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [birthdayDate, setBirthdayDate] = useState('');

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    loadProfile();
    loadSpotifyConnection();
  }, []);

  useEffect(() => {
    // Update dropdown position on scroll or resize
    if (showLocationSuggestions) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);

      return () => {
        window.removeEventListener('scroll', updateDropdownPosition);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showLocationSuggestions]);

  useEffect(() => {
    // Check for Spotify connection status from URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify_connected') === 'true') {
      showToast('Spotify account connected successfully!', 'success');
      loadSpotifyConnection();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('spotify_error')) {
      showToast(`Failed to connect Spotify: ${params.get('spotify_error')}`, 'error');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Check if there are unsaved changes
    if (!profile) return;

    const hasChanges =
      fullName !== (profile.full_name || '') ||
      displayName !== (profile.display_name || '') ||
      timezone !== (profile.timezone || 'Europe/London') ||
      anniversaryDate !== (profile.anniversary_date || '') ||
      birthdayDate !== (profile.birthday_date || '') ||
      password !== '';

    setHasUnsavedChanges(hasChanges);
  }, [fullName, displayName, timezone, anniversaryDate, birthdayDate, password, profile]);

  useEffect(() => {
    // Click outside detection for emoji picker
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        emojiButtonRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  useEffect(() => {
    // Update emoji picker position when shown
    if (showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const pickerWidth = 350;
      const pickerHeight = 450;

      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;

      // On mobile (< 768px), show at bottom of screen
      if (viewportWidth < 768) {
        top = viewportHeight - pickerHeight - 16 + window.scrollY;
        left = (viewportWidth - pickerWidth) / 2 + window.scrollX;
      } else {
        // On desktop, position to the right of the button
        left = rect.right + window.scrollX + 8;
        top = rect.top + window.scrollY;

        // If it would overflow right edge, position to the left instead
        if (left + pickerWidth > viewportWidth + window.scrollX) {
          left = rect.left + window.scrollX - pickerWidth - 8;
        }

        // If it would overflow bottom, adjust top
        if (top + pickerHeight > viewportHeight + window.scrollY) {
          top = viewportHeight + window.scrollY - pickerHeight - 16;
        }
      }

      setEmojiPickerPosition({ top, left });
    }
  }, [showEmojiPicker]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
      setFullName(userProfile?.full_name || '');
      setDisplayName(userProfile?.display_name || '');
      setTimezone(userProfile?.timezone || 'Europe/London');
      setSelectedEmoji(userProfile?.profile_emoji || null);
      setCity(userProfile?.city || '');
      setCountryCode(userProfile?.country_code || '');
      setAnniversaryDate(userProfile?.anniversary_date || '');
      setBirthdayDate(userProfile?.birthday_date || '');

      // Set location search display if location exists
      if (userProfile?.city && userProfile?.country_name) {
        setLocationSearch(`${userProfile.city}, ${userProfile.country_name}`);
      }

      if (userProfile?.partner_id) {
        const partnerInfo = await getPartnerInfo();
        setPartner(partnerInfo);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSpotifyConnection = async () => {
    try {
      const connection = await checkSpotifyConnection();
      setSpotifyConnection(connection);
    } catch (err) {
      console.error('Error checking Spotify connection:', err);
    }
  };

  const handleCopyInviteCode = () => {
    if (profile?.invite_code) {
      navigator.clipboard.writeText(profile.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdateFullName = async () => {
    if (!fullName.trim()) {
      showToast('Full name cannot be empty', 'error');
      return;
    }

    setIsUpdatingFullName(true);

    try {
      const result = await updateFullName(fullName.trim());

      if (result) {
        showToast('Full name updated successfully', 'success');
        await loadProfile();
      } else {
        showToast('Failed to update full name', 'error');
      }
    } catch (err) {
      showToast('Failed to update full name', 'error');
    } finally {
      setIsUpdatingFullName(false);
    }
  };

  const handleLinkPartner = async () => {
    if (!inviteCode.trim()) {
      showToast('Please enter an invite code', 'error');
      return;
    }

    setIsLinking(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      const result = await linkPartnerAccount(inviteCode.trim());

      if (result.success) {
        showToast(result.message, 'success');
        setInviteCode('');
        await loadProfile();
      } else {
        showToast(result.message, 'error');
      }
    } catch (err) {
      showToast('Failed to link partner account', 'error');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkPartner = async () => {
    if (!confirm('Are you sure you want to unlink your partner? You will no longer share data.')) {
      return;
    }

    setIsUnlinking(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      const result = await unlinkPartnerAccount();

      if (result.success) {
        showToast(result.message, 'success');
        setPartner(null);
        await loadProfile();
      } else {
        showToast(result.message, 'error');
      }
    } catch (err) {
      showToast('Failed to unlink partner account', 'error');
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      showToast('Display name cannot be empty', 'error');
      return;
    }

    setIsUpdatingName(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      const result = await updateDisplayName(displayName.trim());

      if (result) {
        showToast('Display name updated successfully', 'success');
        await loadProfile();
      } else {
        showToast('Failed to update display name', 'error');
      }
    } catch (err) {
      showToast('Failed to update display name', 'error');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmoji = async (emoji: string | null) => {
    setIsUpdatingEmoji(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      const result = await updateProfileEmoji(emoji);

      if (result) {
        setSelectedEmoji(emoji);
        showToast(emoji ? 'Profile emoji updated successfully' : 'Profile emoji removed', 'success');
        await loadProfile();
        setShowEmojiPicker(false);
      } else {
        showToast('Failed to update profile emoji', 'error');
      }
    } catch (err) {
      showToast('Failed to update profile emoji', 'error');
    } finally {
      setIsUpdatingEmoji(false);
    }
  };

  const handleUpdateTimezone = async () => {
    setIsUpdatingTimezone(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      const result = await updateTimezone(timezone);

      if (result) {
        showToast('Timezone updated successfully', 'success');
        await loadProfile();
      } else {
        showToast('Failed to update timezone', 'error');
      }
    } catch (err) {
      showToast('Failed to update timezone', 'error');
    } finally {
      setIsUpdatingTimezone(false);
    }
  };

  const updateDropdownPosition = () => {
    if (locationInputRef.current) {
      const rect = locationInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5&types=place,locality,region,country`
      );
      const data = await response.json();

      if (data.features) {
        const suggestions = data.features.map((feature: any) => {
          const country = feature.context?.find((c: any) => c.id.startsWith('country'));
          const countryCode = country?.short_code?.toUpperCase() || '';
          const countryName = country?.text || '';
          const city = feature.text || '';

          return {
            place_name: feature.place_name,
            center: feature.center,
            country_code: countryCode,
            country_name: countryName,
            city: city,
          };
        });
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(true);
        updateDropdownPosition();
      }
    } catch (err) {
      console.error('Error searching location:', err);
    }
  };

  const handleSelectLocation = async (suggestion: { place_name: string; center: [number, number]; country_code: string; country_name: string; city: string }) => {
    setLocationSearch(suggestion.place_name);
    setShowLocationSuggestions(false);
    setIsUpdatingLocation(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      const [lng, lat] = suggestion.center;

      // Use city if available, otherwise use the first part of place_name
      const cityName = suggestion.city || suggestion.place_name.split(',')[0].trim();

      const result = await updateLocation({
        city: cityName,
        country_code: suggestion.country_code || null,
        country_name: suggestion.country_name || null,
        latitude: lat,
        longitude: lng,
      });

      if (result) {
        showToast('Location updated successfully', 'success');
        setCity(cityName);
        setCountryCode(suggestion.country_code || '');
        await loadProfile();
      } else {
        showToast('Failed to update location', 'error');
      }
    } catch (err) {
      console.error('Error updating location:', err);
      showToast('Failed to update location', 'error');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleConnectSpotify = async () => {
    if (!profile?.id) {
      showToast('User profile not loaded', 'error');
      return;
    }

    try {
      const authUrl = await getSpotifyAuthUrl(profile.id);
      window.location.href = authUrl;
    } catch (err) {
      console.error('Error getting Spotify auth URL:', err);
      showToast('Failed to connect to Spotify. Please try again.', 'error');
    }
  };

  const handleDisconnectSpotify = async () => {
    if (!confirm('Are you sure you want to disconnect your Spotify account? You will lose access to Spotify features.')) {
      return;
    }

    setIsDisconnectingSpotify(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      await disconnectSpotify();
      showToast('Spotify account disconnected successfully', 'success');
      await loadSpotifyConnection();
    } catch (err) {
      showToast('Failed to disconnect Spotify account', 'error');
    } finally {
      setIsDisconnectingSpotify(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      const result = await updatePassword(newPassword);

      if (result.success) {
        showToast('Password updated successfully', 'success');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err) {
      showToast('Failed to update password', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveAllChanges = async () => {
    setIsSavingChanges(true);
    showToast('', 'error');
    showToast('', 'success');

    try {
      const promises = [];

      // Update full name if changed
      if (fullName !== (profile?.full_name || '')) {
        promises.push(updateFullName(fullName.trim()));
      }

      // Update display name if changed
      if (displayName !== (profile?.display_name || '')) {
        promises.push(updateDisplayName(displayName.trim()));
      }

      // Update timezone if changed
      if (timezone !== (profile?.timezone || 'Europe/London')) {
        promises.push(updateTimezone(timezone));
      }

      // Update important dates if changed
      if (anniversaryDate !== (profile?.anniversary_date || '') || birthdayDate !== (profile?.birthday_date || '')) {
        promises.push(updateImportantDates({
          anniversary_date: anniversaryDate || null,
          birthday_date: birthdayDate || null,
        }));
      }

      // Update password if entered
      if (password.trim()) {
        if (password.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          setIsSavingChanges(false);
          return;
        }
        promises.push(updatePassword(password));
      }

      await Promise.all(promises);

      showToast('Changes saved successfully', 'success');
      setPassword(''); // Clear password field after saving
      await loadProfile();
    } catch (err) {
      showToast('Failed to save some changes', 'error');
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('Please type DELETE to confirm', 'error');
      return;
    }

    setIsDeletingAccount(true);
    showToast('', 'error');

    try {
      // Delete user account via Supabase Auth
      const { error } = await supabase.auth.admin.deleteUser(
        (await supabase.auth.getUser()).data.user?.id || ''
      );

      if (error) {
        // Try using the regular delete method
        const { error: deleteError } = await supabase.rpc('delete_user_account');

        if (deleteError) {
          showToast('Failed to delete account. Please contact support.', 'error');
          setIsDeletingAccount(false);
          return;
        }
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      showToast('Failed to delete account. Please try again.', 'error');
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center mb-6">
          <Heart className="w-6 h-6 text-blue-400 mr-2" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Settings</h1>
        </div>

        <div className="space-y-4">
          {/* Profile Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 overflow-visible">
            <div className="flex gap-6">
              {/* Left: Profile Icon */}
              <div className="flex-shrink-0 relative">
                <button
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-24 h-24 bg-gray-900/50 border-2 border-gray-600 rounded-xl text-white hover:bg-gray-800 transition text-5xl flex items-center justify-center"
                >
                  {selectedEmoji || '😊'}
                </button>
              </div>

              {/* Right: Two Column Layout */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Location
                    </label>
                    <div className="relative">
                      <input
                        ref={locationInputRef}
                        type="text"
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value);
                          searchLocation(e.target.value);
                        }}
                        onFocus={() => {
                          if (locationSuggestions.length > 0) {
                            setShowLocationSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowLocationSuggestions(false), 200);
                        }}
                        placeholder="Search city (e.g., London, UK)"
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                      />

                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-600 rounded-md shadow-2xl max-h-60 overflow-y-auto">
                          {locationSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                handleSelectLocation(suggestion);
                                setShowLocationSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0"
                            >
                              {suggestion.place_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Email
                    </label>
                    <div className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-gray-400 text-sm">
                      {profile?.email}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {/* Display Name & Birthday in same row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your display name"
                      />
                    </div>

                    {/* Birthday Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Birthday
                      </label>
                      <input
                        type="date"
                        value={birthdayDate}
                        onChange={(e) => setBirthdayDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Time Zone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <optgroup label="Common Timezones">
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Athens">Athens (GMT+2)</option>
                          <option value="Europe/Paris">Paris (GMT+1)</option>
                          <option value="Europe/Berlin">Berlin (GMT+1)</option>
                          <option value="America/New_York">New York (EST)</option>
                          <option value="America/Los_Angeles">Los Angeles (PST)</option>
                          <option value="America/Chicago">Chicago (CST)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Asia/Dubai">Dubai (GST)</option>
                          <option value="Australia/Sydney">Sydney (AEDT)</option>
                        </optgroup>
                        <optgroup label="Europe">
                          <option value="Europe/Amsterdam">Amsterdam</option>
                          <option value="Europe/Brussels">Brussels</option>
                          <option value="Europe/Copenhagen">Copenhagen</option>
                          <option value="Europe/Dublin">Dublin</option>
                          <option value="Europe/Helsinki">Helsinki</option>
                          <option value="Europe/Istanbul">Istanbul</option>
                          <option value="Europe/Lisbon">Lisbon</option>
                          <option value="Europe/Madrid">Madrid</option>
                          <option value="Europe/Moscow">Moscow</option>
                          <option value="Europe/Oslo">Oslo</option>
                          <option value="Europe/Prague">Prague</option>
                          <option value="Europe/Rome">Rome</option>
                          <option value="Europe/Stockholm">Stockholm</option>
                          <option value="Europe/Vienna">Vienna</option>
                          <option value="Europe/Warsaw">Warsaw</option>
                          <option value="Europe/Zurich">Zurich</option>
                        </optgroup>
                        <optgroup label="Americas">
                          <option value="America/Toronto">Toronto</option>
                          <option value="America/Vancouver">Vancouver</option>
                          <option value="America/Mexico_City">Mexico City</option>
                          <option value="America/Sao_Paulo">São Paulo</option>
                          <option value="America/Buenos_Aires">Buenos Aires</option>
                        </optgroup>
                        <optgroup label="Asia">
                          <option value="Asia/Shanghai">Shanghai</option>
                          <option value="Asia/Hong_Kong">Hong Kong</option>
                          <option value="Asia/Singapore">Singapore</option>
                          <option value="Asia/Seoul">Seoul</option>
                          <option value="Asia/Bangkok">Bangkok</option>
                          <option value="Asia/Kolkata">Kolkata</option>
                        </optgroup>
                        <optgroup label="Pacific">
                          <option value="Pacific/Auckland">Auckland</option>
                          <option value="Pacific/Fiji">Fiji</option>
                        </optgroup>
                      </select>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Password
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value="••••••••"
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm cursor-default"
                      />
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition whitespace-nowrap"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-md text-sm font-medium transition"
              >
                Delete Account
              </button>
              <button
                onClick={handleSaveAllChanges}
                disabled={!hasUnsavedChanges || isSavingChanges}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingChanges ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </div>

          {/* Linked Accounts Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-bold text-white mb-4">Linked Accounts</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Partner Account Card */}
              <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Linked with</h3>
                {partner ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                      <p className="text-green-400 font-medium text-sm mb-1">
                        {partner.display_name || partner.email}
                      </p>
                      <p className="text-gray-400 text-xs">{partner.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowInviteCode(!showInviteCode)}
                        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-xs font-medium transition"
                      >
                        View code
                      </button>
                      <button
                        onClick={handleUnlinkPartner}
                        disabled={isUnlinking}
                        className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md text-xs font-medium transition disabled:opacity-50"
                      >
                        {isUnlinking ? 'Unlinking...' : 'Unlink'}
                      </button>
                    </div>
                    {showInviteCode && (
                      <div className="p-2 bg-gray-800 border border-gray-700 rounded">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white font-mono text-xs">
                            {profile?.invite_code}
                          </span>
                          <button
                            onClick={handleCopyInviteCode}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Anniversary Date - Only show when linked */}
                    <div className="pt-3 border-t border-gray-700/50">
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Anniversary
                      </label>
                      <input
                        type="date"
                        value={anniversaryDate}
                        onChange={(e) => setAnniversaryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Shown on Vision page</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-xs mb-2">Enter partner's invite code:</p>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.trim())}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="8-char code"
                      maxLength={8}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowInviteCode(!showInviteCode)}
                        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-xs font-medium transition"
                      >
                        View code
                      </button>
                      <button
                        onClick={handleLinkPartner}
                        disabled={isLinking || !inviteCode.trim()}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition disabled:opacity-50"
                      >
                        {isLinking ? 'Linking...' : 'Link'}
                      </button>
                    </div>
                    {showInviteCode && (
                      <div className="p-2 bg-gray-800 border border-gray-700 rounded">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white font-mono text-xs">
                            {profile?.invite_code}
                          </span>
                          <button
                            onClick={handleCopyInviteCode}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Spotify Card */}
              <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  <Music className="w-3.5 h-3.5 inline mr-1" />
                  Spotify
                </h3>
                {spotifyConnection.connected ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                      <p className="text-green-400 font-medium text-sm mb-1">Connected</p>
                      <p className="text-gray-400 text-xs">
                        {spotifyConnection.display_name || 'Spotify User'}
                      </p>
                    </div>
                    <button
                      onClick={handleDisconnectSpotify}
                      disabled={isDisconnectingSpotify}
                      className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md text-xs font-medium transition disabled:opacity-50"
                    >
                      {isDisconnectingSpotify ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-xs">Connect to unlock music features</p>
                    <button
                      onClick={handleConnectSpotify}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition"
                    >
                      Connect Spotify
                    </button>
                  </div>
                )}
              </div>

              {/* Google Photos Card */}
              <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Google Photos
                </h3>
                <div className="space-y-3">
                  <p className="text-gray-400 text-xs">Upload photos from Google</p>
                  <button
                    onClick={() => showToast('Google Photos integration coming soon!', 'error')}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition"
                  >
                    Connect Google
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteConfirmText('');
            }}
          >
            <div
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-red-500/50"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-red-400 mb-4">Delete Account</h3>

              <div className="space-y-4">
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-md">
                  <p className="text-sm text-red-300 font-medium mb-2">⚠️ Warning: This action is irreversible!</p>
                  <p className="text-xs text-gray-300">
                    You will lose access to your account and all of your saved data. This cannot be undone.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Type <span className="font-mono text-red-400">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Type DELETE to confirm"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText('');
                      showToast('', 'error');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount || deleteConfirmText !== 'DELETE'}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
            onClick={() => {
              setShowPasswordModal(false);
              setNewPassword('');
              setConfirmPassword('');
            }}
          >
            <div
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Change Password</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      showToast('', 'error');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <>
            {/* Backdrop for mobile */}
            <div className="fixed inset-0 bg-black/50 z-[9998] md:hidden" onClick={() => setShowEmojiPicker(false)} />

            <div
              ref={emojiPickerRef}
              className="fixed z-[9999] shadow-2xl rounded-xl overflow-hidden border border-gray-600"
              style={{
                top: `${emojiPickerPosition.top}px`,
                left: `${emojiPickerPosition.left}px`,
              }}
            >
              <EmojiPicker
                onEmojiClick={(emojiData: EmojiClickData) => {
                  handleUpdateEmoji(emojiData.emoji);
                  setShowEmojiPicker(false);
                }}
                width={350}
                height={450}
                theme={Theme.DARK}
                searchPlaceHolder="Search emoji..."
                previewConfig={{ showPreview: false }}
              />
            </div>
          </>
        )}
      </div>

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
