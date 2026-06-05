import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  CheckCircle2, 
  Key, 
  Link as LinkIcon, 
  Loader2, 
  MessageCircle, 
  ArrowRight,
  ExternalLink,
  XCircle
} from 'lucide-react';
import type { User } from '../types/user';
import { updateSettings, getTelegramLinkToken, fetchMe, verifyApifyToken } from '../services/api';

interface Props {
  user: User;
  onComplete: (user: User) => void;
}

export const Onboarding = ({ user, onComplete }: Props) => {
  const [apifyToken, setApifyToken] = useState('');
  const [linking, setLinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifyingApify, setVerifyingApify] = useState(false);
  const [apifyValid, setApifyValid] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(user);

  // Poll for user updates in case they connected telegram in another tab
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const freshUser = await fetchMe();
        setCurrentUser(freshUser);
      } catch {
        // ignore
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectTelegram = async () => {
    setLinking(true);
    try {
      const { bot_url } = await getTelegramLinkToken();
      window.open(bot_url, '_blank');
      toast.success('Opened Telegram! Click start to connect.');
    } catch {
      toast.error('Failed to get connection link.');
    } finally {
      setLinking(false);
    }
  };

  const handleVerifyApify = async () => {
    if (!apifyToken.trim()) return;
    setVerifyingApify(true);
    setApifyValid(null);
    try {
      const { valid } = await verifyApifyToken(apifyToken);
      setApifyValid(valid);
      if (valid) {
        toast.success('Apify token verified!');
      } else {
        toast.error('Invalid Apify token.');
      }
    } catch {
      toast.error('Could not verify token.');
      setApifyValid(false);
    } finally {
      setVerifyingApify(false);
    }
  };

  const handleFinish = async () => {
    if (apifyToken && apifyValid === false) {
      toast.error('Please provide a valid Apify token or skip it.');
      return;
    }
    setSaving(true);
    try {
      if (apifyToken && apifyValid) {
        const updatedUser = await updateSettings({
          apify_token: apifyToken,
        });
        onComplete(updatedUser);
      } else {
        onComplete(currentUser);
      }
      toast.success('Onboarding complete!');
    } catch {
      toast.error('Failed to save Apify token.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-md overflow-y-auto">
      <div className="relative max-w-xl w-full bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl p-8 sm:p-10 my-8 animate-fade-in">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
            Welcome, {currentUser.username}!
          </h1>
          <p className="text-gray-500">
            Let's get your account set up so you can start tracking prices.
          </p>
        </div>

        <div className="space-y-8">
          
          {/* Step 1: Telegram */}
          <div className="bg-gray-50/50 border border-gray-200 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-1">
                {currentUser.telegram_chat_id ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">1</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#0088cc]" />
                  Connect Telegram
                </h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  We need this to send you instant price drop alerts directly to your phone.
                </p>
                
                {currentUser.telegram_chat_id ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected Successfully!
                  </div>
                ) : (
                  <button
                    onClick={handleConnectTelegram}
                    disabled={linking}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0088cc] text-white text-sm font-semibold hover:bg-[#0077b3] transition-colors shadow-sm shadow-[#0088cc]/20 focus:ring-2 focus:ring-offset-2 focus:ring-[#0088cc] outline-none disabled:opacity-70"
                  >
                    {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                    Connect Telegram
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Apify */}
          <div className="bg-gray-50/50 border border-gray-200 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-1">
                {apifyToken || currentUser.apify_token ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">2</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-gray-500" />
                  Add Apify Token <span className="text-sm font-normal text-gray-400">(Recommended)</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Apify helps bypass bot protection on major e-commerce sites like Amazon. Without it, some websites might block our scrapers.
                </p>

                <div className="relative mb-3">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={apifyToken}
                    onChange={(e) => {
                      setApifyToken(e.target.value);
                      setApifyValid(null);
                    }}
                    className={`w-full pl-11 pr-24 py-3 rounded-xl border text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 outline-none ${
                      apifyValid === true 
                        ? 'bg-green-50/50 border-green-300' 
                        : apifyValid === false 
                        ? 'bg-red-50/50 border-red-300'
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder="apify_api_..."
                  />
                  <div className="absolute inset-y-0 right-1.5 flex items-center">
                    {apifyValid === true ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : apifyValid === false ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">
                        <XCircle className="w-3.5 h-3.5" />
                        Invalid
                      </span>
                    ) : apifyToken.trim() ? (
                      <button
                        onClick={handleVerifyApify}
                        disabled={verifyingApify}
                        className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {verifyingApify ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Verify
                      </button>
                    ) : null}
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-600 space-y-2">
                  <p className="font-semibold text-gray-800">How to get your free token:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Sign up for a free account at <a href="https://console.apify.com/sign-up" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">console.apify.com <ExternalLink className="w-3 h-3"/></a></li>
                    <li>Navigate to <strong>Settings</strong> &rarr; <strong>Integrations</strong></li>
                    <li>Copy your <strong>Personal API token</strong> and paste it above.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={() => onComplete(currentUser)}
            disabled={saving}
            className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 outline-none disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};