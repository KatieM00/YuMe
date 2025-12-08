import { useState, useEffect } from 'react';
import { Heart, Copy, Check, UserPlus, X, Loader, User, Globe } from 'lucide-react';
import {
  getCurrentUserProfile,
  getPartnerInfo,
  linkPartnerAccount,
  unlinkPartnerAccount,
  updateDisplayName,
  updateTimezone,
  type UserProfile,
  type PartnerInfo,
} from '../lib/partnerService';

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('Europe/London');
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
      setDisplayName(userProfile?.display_name || '');
      setTimezone(userProfile?.timezone || 'Europe/London');

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

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pt-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Heart className="w-8 h-8 text-blue-400 mr-3" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">Settings</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Your Profile</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-400">
                  {profile?.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                  <button
                    onClick={handleUpdateDisplayName}
                    disabled={isUpdatingName || displayName === profile?.display_name}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingName ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  Your Timezone
                </label>
                <div className="flex space-x-2">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingTimezone ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  This will be shown on the dashboard alongside your partner's timezone
                </p>
              </div>
            </div>
          </div>

          {/* Partner Linking Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <UserPlus className="w-6 h-6 mr-2" />
              Partner Account
            </h2>

            {partner ? (
              /* Partner Linked */
              <div className="space-y-4">
                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400 font-medium mb-1">Partner Linked</p>
                      <p className="text-gray-300">
                        <User className="w-4 h-4 inline mr-2" />
                        {partner.display_name || partner.email}
                      </p>
                      <p className="text-gray-500 text-sm">{partner.email}</p>
                    </div>
                    <button
                      onClick={handleUnlinkPartner}
                      disabled={isUnlinking}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition border border-red-500/30 disabled:opacity-50"
                    >
                      {isUnlinking ? 'Unlinking...' : 'Unlink'}
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  <p>✓ You are sharing all your YuMe data with your partner</p>
                  <p>✓ You can see each other's memories, messages, and more</p>
                </div>
              </div>
            ) : (
              /* No Partner */
              <div className="space-y-6">
                {/* Your Invite Code */}
                <div>
                  <p className="text-gray-300 mb-3">Share this code with your partner:</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white font-mono text-lg">
                      {profile?.invite_code}
                    </div>
                    <button
                      onClick={handleCopyInviteCode}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center space-x-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
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
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-800 text-gray-400">OR</span>
                  </div>
                </div>

                {/* Enter Partner's Code */}
                <div>
                  <p className="text-gray-300 mb-3">Enter your partner's invite code:</p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.trim())}
                      className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Enter 8-character code"
                      maxLength={8}
                    />
                    <button
                      onClick={handleLinkPartner}
                      disabled={isLinking || !inviteCode.trim()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isLinking ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Linking...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5" />
                          <span>Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-400 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="font-medium text-blue-400 mb-2">How Partner Linking Works:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Each account starts with their own private data</li>
                    <li>Once linked, you'll share all memories and content</li>
                    <li>Both partners can create, view, and edit shared content</li>
                    <li>You can unlink at any time</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
