import { useState } from 'react';
import { Loader, Eye, EyeOff } from 'lucide-react';
import { signIn, signUp } from '../lib/authService';
import { linkPartnerAccount } from '../lib/partnerService';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onLogin: () => void;
}

// Profile icon options with emojis
const PROFILE_ICONS = ['🦊', '🐱', '🐼', '🐨', '🦁', '🐯'];

export default function LoginPage({ onLogin }: LoginPageProps) {
  // Step management
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState(1); // 1 or 2

  // Step 1: Account fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: Profile fields
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [profileEmoji, setProfileEmoji] = useState('');
  const [partnerCode, setPartnerCode] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle Step 1 -> Step 2 transition
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation for Step 1
    if (password.length < 18) {
      setError('Password must be at least 18 characters');
      return;
    }

    // Move to step 2
    setSignUpStep(2);
  };

  // Handle final sign up submission (Step 2)
  const handleSignUpComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!profileEmoji) {
      setError('Please select a profile icon');
      return;
    }

    setIsLoading(true);

    try {
      // Create the auth account
      await signUp(email, password);

      // Get the user ID
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User creation failed');
      }

      // Create profile with all signup data in one operation
      const inviteCode = Math.random().toString(36).substring(2, 10);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email || email,
          invite_code: inviteCode,
          timezone: 'Europe/London',
          display_name: displayName || null,
          profile_emoji: profileEmoji || null,
          birthday_date: birthday || null,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw profileError;
      }

      // Link partner if code provided
      if (partnerCode) {
        const result = await linkPartnerAccount(partnerCode);
        if (!result.success) {
          console.warn('Partner link failed:', result.message);
        }
      }

      setSuccessMessage('Account created! Please check your email to verify your account, then sign in.');

      // Reset form
      setIsSignUp(false);
      setSignUpStep(1);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setBirthday('');
      setProfileEmoji('');
      setPartnerCode('');
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password);
      onLogin();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/images/YuMeLogoTag.png"
            alt="YuMe Logo"
            className="mx-auto w-32 h-auto mb-3"
          />
        </div>

        {/* Card Container */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-gray-700/50">

          {/* Sign In Form */}
          {!isSignUp && (
            <div className="transition-all duration-500 ease-in-out">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
                <p className="text-gray-400 text-sm">Sign in to your shared space</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Min. 6 characters"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-300 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm">
                    {successMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Enter YuMe'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setSignUpStep(1);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-sm text-gray-400 hover:text-blue-400 transition"
                >
                  Don't have an account? <span className="font-medium">Sign Up</span>
                </button>
              </div>
            </div>
          )}

          {/* Sign Up - Step 1: Account Creation */}
          {isSignUp && signUpStep === 1 && (
            <div className="animate-slide-in-from-right">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">Create your account</h2>
                <p className="text-gray-400 text-sm">Start your shared journey</p>
              </div>

              <form onSubmit={handleStep1Next} className="space-y-5">
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Min. 18 characters"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-300 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Next Step
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setSignUpStep(1);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-sm text-gray-400 hover:text-blue-400 transition"
                >
                  Already have an account? <span className="font-medium">Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* Sign Up - Step 2: Personalization */}
          {isSignUp && signUpStep === 2 && (
            <div className="animate-slide-in-from-right">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white mb-2">Complete your profile</h2>
                <p className="text-gray-400 text-sm">Tell us a bit about yourself</p>
              </div>

              <form onSubmit={handleSignUpComplete} className="space-y-5">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="What do you want to be called?"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="birthday" className="block text-sm font-medium text-gray-300 mb-2">
                    Birthday
                  </label>
                  <input
                    id="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Choose your profile icon
                  </label>
                  <div className="flex gap-3 justify-center">
                    {PROFILE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setProfileEmoji(icon)}
                        className={`w-14 h-14 flex items-center justify-center text-2xl rounded-lg bg-gray-900/50 border-2 transition-all transform hover:scale-110 ${
                          profileEmoji === icon
                            ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/25'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                        disabled={isLoading}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="partnerCode" className="block text-sm font-medium text-gray-300 mb-2">
                    Partner Link Code <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    id="partnerCode"
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter partner's invite code"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSignUpStep(1);
                      setError('');
                    }}
                    className="w-1/3 bg-gray-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                    disabled={isLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create My Space'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
