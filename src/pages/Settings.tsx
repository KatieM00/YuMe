import { useState, useEffect } from 'react';
import { Heart, Copy, Check, UserPlus, Loader, User, Globe, Music, MapPin } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import {
  getCurrentUserProfile,
  getPartnerInfo,
  linkPartnerAccount,
  unlinkPartnerAccount,
  updateDisplayName,
  updateTimezone,
  updateProfileEmoji,
  updateLocation,
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
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('Europe/London');
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
    loadSpotifyConnection();
  }, []);

  useEffect(() => {
    // Check for Spotify connection status from URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify_connected') === 'true') {
      setSuccess('Spotify account connected successfully!');
      loadSpotifyConnection();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('spotify_error')) {
      setError(`Failed to connect Spotify: ${params.get('spotify_error')}`);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
      setDisplayName(userProfile?.display_name || '');
      setTimezone(userProfile?.timezone || 'Europe/London');
      setSelectedEmoji(userProfile?.profile_emoji || null);
      setCity(userProfile?.city || '');
      setCountryCode(userProfile?.country_code || '');

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

  const handleLinkPartner = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsLinking(true);
    setError('');
    setSuccess('');

    try {
      const result = await linkPartnerAccount(inviteCode.trim());

      if (result.success) {
        setSuccess(result.message);
        setInviteCode('');
        await loadProfile();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to link partner account');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkPartner = async () => {
    if (!confirm('Are you sure you want to unlink your partner? You will no longer share data.')) {
      return;
    }

    setIsUnlinking(true);
    setError('');
    setSuccess('');

    try {
      const result = await unlinkPartnerAccount();

      if (result.success) {
        setSuccess(result.message);
        setPartner(null);
        await loadProfile();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to unlink partner account');
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setIsUpdatingName(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateDisplayName(displayName.trim());

      if (result) {
        setSuccess('Display name updated successfully');
        await loadProfile();
      } else {
        setError('Failed to update display name');
      }
    } catch (err) {
      setError('Failed to update display name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmoji = async (emoji: string | null) => {
    setIsUpdatingEmoji(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateProfileEmoji(emoji);

      if (result) {
        setSelectedEmoji(emoji);
        setSuccess(emoji ? 'Profile emoji updated successfully' : 'Profile emoji removed');
        await loadProfile();
        setShowEmojiPicker(false);
      } else {
        setError('Failed to update profile emoji');
      }
    } catch (err) {
      setError('Failed to update profile emoji');
    } finally {
      setIsUpdatingEmoji(false);
    }
  };

  const handleUpdateTimezone = async () => {
    setIsUpdatingTimezone(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateTimezone(timezone);

      if (result) {
        setSuccess('Timezone updated successfully');
        await loadProfile();
      } else {
        setError('Failed to update timezone');
      }
    } catch (err) {
      setError('Failed to update timezone');
    } finally {
      setIsUpdatingTimezone(false);
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
      }
    } catch (err) {
      console.error('Error searching location:', err);
    }
  };

  const handleSelectLocation = async (suggestion: { place_name: string; center: [number, number]; country_code: string; country_name: string; city: string }) => {
    setLocationSearch(suggestion.place_name);
    setShowLocationSuggestions(false);
    setIsUpdatingLocation(true);
    setError('');
    setSuccess('');

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
        setSuccess('Location updated successfully');
        setCity(cityName);
        setCountryCode(suggestion.country_code || '');
        await loadProfile();
      } else {
        setError('Failed to update location');
      }
    } catch (err) {
      console.error('Error updating location:', err);
      setError('Failed to update location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleConnectSpotify = async () => {
    if (!profile?.id) {
      setError('User profile not loaded');
      return;
    }

    try {
      const authUrl = await getSpotifyAuthUrl(profile.id);
      window.location.href = authUrl;
    } catch (err) {
      console.error('Error getting Spotify auth URL:', err);
      setError('Failed to connect to Spotify. Please try again.');
    }
  };

  const handleDisconnectSpotify = async () => {
    if (!confirm('Are you sure you want to disconnect your Spotify account? You will lose access to Spotify features.')) {
      return;
    }

    setIsDisconnectingSpotify(true);
    setError('');
    setSuccess('');

    try {
      await disconnectSpotify();
      setSuccess('Spotify account disconnected successfully');
      await loadSpotifyConnection();
    } catch (err) {
      setError('Failed to disconnect Spotify account');
    } finally {
      setIsDisconnectingSpotify(false);
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Heart className="w-6 h-6 text-blue-400 mr-2" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Settings</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Profile Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700 overflow-visible">
            <h2 className="text-base font-bold text-white mb-3">Your Profile</h2>

            <div className="space-y-3 overflow-visible">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Email
                </label>
                <div className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-gray-400 text-sm">
                  {profile?.email}
                </div>
              </div>

              <div>
                <div className="flex flex-col md:flex-row md:items-start md:space-x-4 space-y-3 md:space-y-0">
                  {/* Display Name */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Display Name
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full md:max-w-[250px] px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your name"
                      />
                      <button
                        onClick={handleUpdateDisplayName}
                        disabled={isUpdatingName || displayName === profile?.display_name}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isUpdatingName ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {/* Profile Icon */}
                  <div className="flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Profile Icon
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white hover:bg-gray-800 transition text-2xl min-w-[60px]"
                      >
                        {selectedEmoji || '😊'}
                      </button>
                      {selectedEmoji && (
                        <button
                          onClick={() => handleUpdateEmoji(null)}
                          disabled={isUpdatingEmoji}
                          className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md text-xs font-medium transition disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {showEmojiPicker && (
                  <div className="mt-3">
                    <EmojiPicker
                      onEmojiClick={(emojiData: EmojiClickData) => {
                        handleUpdateEmoji(emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      width="100%"
                      height={400}
                      theme={Theme.DARK}
                      searchPlaceHolder="Search emoji..."
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>

              <div className="overflow-visible">
                <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0 overflow-visible">
                  {/* Timezone */}
                  <div className="flex-1 overflow-visible">
                    <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center">
                      <Globe className="w-3.5 h-3.5 mr-1.5" />
                      Timezone
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full md:max-w-[220px] px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <button
                        onClick={handleUpdateTimezone}
                        disabled={isUpdatingTimezone || timezone === profile?.timezone}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isUpdatingTimezone ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex-1 overflow-visible">
                    <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      Location
                    </label>
                    <div className="relative overflow-visible">
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value);
                          searchLocation(e.target.value);
                        }}
                        onFocus={() => locationSuggestions.length > 0 && setShowLocationSuggestions(true)}
                        onBlur={() => {
                          // Delay to allow click on suggestion
                          setTimeout(() => setShowLocationSuggestions(false), 200);
                        }}
                        placeholder="Search city (e.g., London, UK)"
                        className="w-full md:max-w-[250px] px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                      />

                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div
                          className="fixed z-[9999] mt-1 bg-gray-900 border border-gray-600 rounded-md shadow-2xl max-h-60 overflow-y-auto"
                          style={{
                            width: '250px',
                            top: '440px', // Adjust this if needed
                            left: '50%',
                            transform: 'translateX(-50%)'
                          }}
                        >
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

                      {isUpdatingLocation && (
                        <p className="mt-1.5 text-xs text-blue-400">
                          Updating...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {(city && countryCode) && (
                  <p className="mt-2 text-xs text-gray-400">
                    Current location: {city}, {countryCode}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Partner Linking Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <h2 className="text-base font-bold text-white mb-3 flex items-center">
              <UserPlus className="w-4 h-4 mr-1.5" />
              Partner Account
            </h2>

            {partner ? (
              /* Partner Linked */
              <div className="space-y-3">
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400 font-medium mb-0.5 text-sm">Partner Linked</p>
                      <p className="text-gray-300 text-sm">
                        <User className="w-3.5 h-3.5 inline mr-1.5" />
                        {partner.display_name || partner.email}
                      </p>
                      <p className="text-gray-500 text-xs">{partner.email}</p>
                    </div>
                    <button
                      onClick={handleUnlinkPartner}
                      disabled={isUnlinking}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md text-xs font-medium transition border border-red-500/30 disabled:opacity-50"
                    >
                      {isUnlinking ? 'Unlinking...' : 'Unlink'}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  <p>✓ You are sharing all your YuMe data with your partner</p>
                  <p>✓ You can see each other's memories, messages, and more</p>
                </div>
              </div>
            ) : (
              /* No Partner */
              <div className="space-y-4">
                {/* Your Invite Code */}
                <div>
                  <p className="text-gray-300 mb-2 text-sm">Share this code with your partner:</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white font-mono text-base">
                      {profile?.invite_code}
                    </div>
                    <button
                      onClick={handleCopyInviteCode}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition flex items-center space-x-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-gray-800 text-gray-400">OR</span>
                  </div>
                </div>

                {/* Enter Partner's Code */}
                <div>
                  <p className="text-gray-300 mb-2 text-sm">Enter your partner's invite code:</p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.trim())}
                      className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Enter 8-character code"
                      maxLength={8}
                    />
                    <button
                      onClick={handleLinkPartner}
                      disabled={isLinking || !inviteCode.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                    >
                      {isLinking ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Linking...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-400 bg-blue-900/20 border border-blue-500/30 rounded-md p-3">
                  <p className="font-medium text-blue-400 mb-1.5">How Partner Linking Works:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Each account starts with their own private data</li>
                    <li>Once linked, you'll share all memories and content</li>
                    <li>Both partners can create, view, and edit shared content</li>
                    <li>You can unlink at any time</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Spotify Integration Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <h2 className="text-base font-bold text-white mb-3 flex items-center">
              <Music className="w-4 h-4 mr-1.5 text-green-500" />
              Spotify Integration
            </h2>

            {spotifyConnection.connected ? (
              /* Spotify Connected */
              <div className="space-y-3">
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {spotifyConnection.avatar_url && (
                        <img
                          src={spotifyConnection.avatar_url}
                          alt="Spotify Profile"
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="text-green-400 font-medium mb-0.5 text-sm">Spotify Connected</p>
                        <p className="text-gray-300 text-sm">
                          {spotifyConnection.display_name || 'Spotify User'}
                        </p>
                        {spotifyConnection.user_id && (
                          <p className="text-gray-500 text-xs">ID: {spotifyConnection.user_id}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectSpotify}
                      disabled={isDisconnectingSpotify}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md text-xs font-medium transition border border-red-500/30 disabled:opacity-50"
                    >
                      {isDisconnectingSpotify ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  <p>✓ Search and add tracks from your Spotify library</p>
                  <p>✓ View your Spotify playlists and recently played</p>
                  <p>✓ Get personalized music recommendations</p>
                  <p>✓ Create and sync playlists</p>
                </div>
              </div>
            ) : (
              /* Spotify Not Connected */
              <div className="space-y-3">
                <p className="text-gray-300 text-sm">
                  Connect your Spotify account to unlock music features in YuMe's Mixtape section.
                </p>

                <button
                  onClick={handleConnectSpotify}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition flex items-center justify-center space-x-1.5"
                >
                  <Music className="w-4 h-4" />
                  <span>Connect Spotify Account</span>
                </button>

                <div className="text-xs text-gray-400 bg-gray-900/50 border border-gray-700 rounded-md p-3">
                  <p className="font-medium text-gray-300 mb-1.5">What you can do with Spotify:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Search millions of tracks directly from Spotify</li>
                    <li>Import your existing Spotify playlists</li>
                    <li>View your recently played and top tracks</li>
                    <li>Get AI-powered music recommendations</li>
                    <li>Create shared playlists with your partner</li>
                  </ul>
                </div>

                <div className="text-xs text-gray-500 bg-blue-900/20 border border-blue-500/30 rounded-md p-2.5">
                  <p className="font-medium text-blue-400 mb-1">Privacy Notice:</p>
                  <p>
                    We only request access to view and manage your Spotify playlists and library.
                    We never share your data with third parties.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
