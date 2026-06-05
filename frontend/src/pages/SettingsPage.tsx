import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageCircle, 
  Key, 
  Loader2, 
  LogOut, 
  Trash2, 
  User as UserIcon,
  Settings,
  Link,
  Unlink,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  XCircle,
  Pencil
} from 'lucide-react';
import type { User } from '../types/user';
import { deleteAccount, updateSettings, getTelegramLinkToken, disconnectTelegram, fetchMe, verifyApifyToken } from '../services/api';

interface Props {
  user: User;
  onUserChange: (user: User) => void;
  onLogout: () => void;
}

export const SettingsPage = ({ user, onUserChange, onLogout }: Props) => {
  const [apifyToken, setApifyToken] = useState(user.apify_token || '');
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [awaitingLink, setAwaitingLink] = useState(false);
  const [showApifyGuide, setShowApifyGuide] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [verifyingApify, setVerifyingApify] = useState(false);
  const [apifyValid, setApifyValid] = useState<boolean | null>(user.apify_token ? true : null);
  const [isEditingApify, setIsEditingApify] = useState(!user.apify_token);
  const prevChatIdRef = useRef(user.telegram_chat_id);
  const navigate = useNavigate();

  // Poll for user updates ONLY while awaiting a Telegram link
  useEffect(() => {
    if (!awaitingLink) return;

    const interval = setInterval(async () => {
      try {
        const freshUser = await fetchMe();
        if (freshUser.telegram_chat_id !== user.telegram_chat_id) {
          if (!prevChatIdRef.current && freshUser.telegram_chat_id) {
            toast.success('🎉 Telegram connected successfully!', { duration: 5000 });
            setAwaitingLink(false);
            window.focus();
          }
          prevChatIdRef.current = freshUser.telegram_chat_id;
          onUserChange(freshUser);
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [awaitingLink, user.telegram_chat_id, onUserChange]);

  // Keep the ref in sync when user prop changes externally
  useEffect(() => {
    prevChatIdRef.current = user.telegram_chat_id;
  }, [user.telegram_chat_id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (apifyToken && apifyValid === false) {
      toast.error('Please provide a valid Apify token.');
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await updateSettings({
        apify_token: apifyToken || null,
      });
      onUserChange({ ...user, apify_token: updatedUser.apify_token });
      toast.success('Settings saved successfully.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
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

  const handleRemoveApify = async () => {
    if (!window.confirm('Are you sure you want to remove your Apify token?')) return;
    setSaving(true);
    try {
      await updateSettings({
        apify_token: null,
      });
      onUserChange({ ...user, apify_token: null });
      setApifyToken('');
      setApifyValid(null);
      setIsEditingApify(true);
      toast.success('Apify token removed.');
    } catch {
      toast.error('Failed to remove token.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectTelegram = async () => {
    setLinking(true);
    try {
      const { bot_url } = await getTelegramLinkToken();
      window.open(bot_url, '_blank');
      setAwaitingLink(true);
    } catch {
      toast.error('Failed to get connection link.');
    } finally {
      setLinking(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    setDisconnecting(true);
    try {
      const updatedUser = await disconnectTelegram();
      onUserChange(updatedUser);
      toast.success('Telegram disconnected.');
    } catch {
      toast.error('Failed to disconnect Telegram.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone and will erase all alerts.')) return;
    await deleteAccount();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate('/')} 
          className="group flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to dashboard
        </button>

        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-xl overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-8 border-b border-gray-100 bg-white/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Settings className="w-6 h-6 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Account Settings</h1>
            </div>
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500 ml-1">
              <UserIcon className="w-4 h-4" />
              <span className="font-medium text-gray-700">{user.username}</span>
            </div>
          </div>

          <div className="p-8 space-y-10">
            {/* Telegram Section */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#0088cc]" />
                Telegram Notifications
              </h2>
              
              <div className="bg-gray-50/50 border border-gray-200 rounded-2xl p-5 sm:p-6">
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                  <div className="flex gap-3.5 items-start">
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`p-2.5 rounded-xl ${user.telegram_chat_id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      {user.telegram_chat_id && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-gray-900">Telegram Bot</span>
                        {user.telegram_chat_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </span>
                        ) : awaitingLink ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Waiting...
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200/50">
                            Not connected
                          </span>
                        )}
                      </div>
                      
                      {user.telegram_chat_id ? (
                        <div className="space-y-1 mt-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Chat ID:</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(user.telegram_chat_id!);
                                toast.success('Copied to clipboard!');
                              }}
                              className="font-mono text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md transition-colors"
                            >
                              {user.telegram_chat_id}
                            </button>
                          </div>
                          {user.telegram_connected_at && (
                            <p className="text-xs text-gray-400">
                              Connected {new Date(user.telegram_connected_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : !awaitingLink && (
                        <p className="text-sm text-gray-500 mt-0.5 max-w-sm">
                          Connect to receive instant price drop alerts on your phone.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {user.telegram_chat_id ? (
                    <button
                      onClick={handleDisconnectTelegram}
                      disabled={disconnecting}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors focus:ring-2 focus:ring-red-500/20 outline-none disabled:opacity-70 w-full sm:w-auto justify-center"
                    >
                      {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectTelegram}
                      disabled={linking || awaitingLink}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 outline-none disabled:opacity-70 whitespace-nowrap w-full sm:w-auto justify-center"
                    >
                      {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                      {awaitingLink ? 'Waiting…' : 'Connect Telegram'}
                    </button>
                  )}
                </div>

                {/* Awaiting link – step-by-step instructions */}
                {awaitingLink && !user.telegram_chat_id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Complete these steps in the Telegram tab:</p>
                    <ol className="text-sm text-gray-600 space-y-2 ml-1">
                      <li className="flex items-start gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                        <span>On the Telegram page, click <strong>"OPEN IN WEB"</strong> (or "Send Message" if you have the app installed)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                        <span>Press the <strong>"Start"</strong> button inside the chat</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                        <span>You'll see a confirmation message — then come back here ✅</span>
                      </li>
                    </ol>
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-amber-800">
                      <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span><strong>Tip:</strong> The "START BOT" button on the Telegram preview page only works if you have the Telegram desktop app installed. Use <strong>"OPEN IN WEB"</strong> instead to open it in Telegram Web.</span>
                    </div>
                    <button
                      onClick={() => setAwaitingLink(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Other Settings Form */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Advanced Settings
              </h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Apify Token
                  </label>
                  {!isEditingApify && user.apify_token ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-green-200 bg-green-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Token Active</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            apify_api_{'•'.repeat(8)}{user.apify_token.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingApify(true)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Update token"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveApify}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove token"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={apifyToken}
                        onChange={(event) => {
                          setApifyToken(event.target.value);
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
                      <div className="absolute inset-y-0 right-1.5 flex items-center gap-1.5">
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
                            type="button"
                            onClick={handleVerifyApify}
                            disabled={verifyingApify}
                            className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {verifyingApify ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Verify
                          </button>
                        ) : null}
                        {user.apify_token && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingApify(false);
                              setApifyToken(user.apify_token || '');
                              setApifyValid(true);
                            }}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1.5 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500 ml-1">Optional. Provides higher success rates for scraping specific sites.</p>

                  {/* Collapsible guide */}
                  <button
                    type="button"
                    onClick={() => setShowApifyGuide(!showApifyGuide)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showApifyGuide ? 'rotate-180' : ''}`} />
                    How to get your Apify Token
                  </button>

                  {showApifyGuide && (
                    <div className="mt-3 bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-2.5 animate-in">
                      <ol className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                          <span>Go to <a href="https://console.apify.com/sign-up" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800 font-medium">apify.com</a> and create a free account (or sign in)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                          <span>Navigate to <strong>Settings → API & Integrations</strong> in the left sidebar</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                          <span>Copy your <strong>Personal API Token</strong> (starts with <code className="bg-white/80 px-1.5 py-0.5 rounded text-xs font-mono">apify_api_</code>)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                          <span>Paste it in the field above and click <strong>Save</strong></span>
                        </li>
                      </ol>
                      <div className="flex items-start gap-2 bg-white/60 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
                        <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>The free plan includes enough usage for personal price tracking. No credit card required.</span>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={saving} 
                  className="w-full flex justify-center items-center py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transition-all duration-200"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Saving changes...
                    </>
                  ) : (
                    'Save advanced settings'
                  )}
                </button>
              </form>
            </section>
          </div>

          {/* Account Actions / Danger Zone */}
          <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button 
              onClick={onLogout} 
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
            
            <button 
              onClick={handleDeleteAccount} 
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete account
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};