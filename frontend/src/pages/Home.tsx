import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { Alert, CreateAlertReq, UpdateAlertReq } from '../types/alert';
import { fetchAlerts, createAlert, updateAlert, deleteAlert, toggleAlert } from '../services/api';
import { Navbar } from '../components/Navbar';
import { DashboardCards } from '../components/DashboardCards';
import { AlertForm } from '../components/AlertForm';
import { AlertsList } from '../components/AlertsList';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/loader';
import { DeleteModal } from '../components/DeleteModal';
import type { User } from '../types/user';

interface Props {
  user: User;
  onLogout: () => void;
}

export const Home = ({ user, onLogout }: Props) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const navigate = useNavigate();

  const isConfigured = !!(user.apify_token && user.telegram_chat_id);

  const getErrorMessage = useCallback((fallback: string, error: unknown) => {
    if (!axios.isAxiosError(error)) return fallback;

    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;

    return fallback;
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (error) {
      toast.error(getErrorMessage('Failed to fetch alerts', error));
    } finally {
      setLoading(false);
    }
  }, [getErrorMessage]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleCreate = async (payload: CreateAlertReq) => {
    setFormLoading(true);
    try {
      const newAlert = await createAlert(payload);
      setAlerts((prev) => [newAlert, ...prev]);
      if (!newAlert.active) {
        toast('Alert created but paused — configure Apify token & Telegram in Settings to activate.', {
          icon: '⚠️',
          duration: 5000,
        });
      } else if (newAlert.currentPrice == null) {
        toast.success('Alert created. First price check will retry in the background.');
      } else {
        toast.success('Alert created and price fetched.');
      }
    } catch (error) {
      toast.error(getErrorMessage('Failed to create alert', error));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalId) return;
    try {
      await deleteAlert(deleteModalId);
      setAlerts((prev) => prev.filter((a) => a.id !== deleteModalId));
      toast.success('Alert deleted successfully!');
    } catch (error) {
      toast.error(getErrorMessage('Failed to delete alert', error));
    } finally {
      setDeleteModalId(null);
    }
  };

  const handleUpdate = async (payload: UpdateAlertReq) => {
    if (!editingAlert) return;

    setEditLoading(true);
    try {
      const updatedAlert = await updateAlert(editingAlert.id, payload);
      setAlerts((prev) => prev.map((alert) => (
        alert.id === updatedAlert.id ? updatedAlert : alert
      )));
      setEditingAlert(null);
      toast.success('Alert updated successfully.');
    } catch (error) {
      toast.error(getErrorMessage('Failed to update alert', error));
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    // Check if trying to enable but settings not configured
    const targetAlert = alerts.find((a) => a.id === id);
    if (targetAlert && !targetAlert.active && !isConfigured) {
      toast(
        (t) => (
          <span className="flex items-center gap-2 text-sm">
            <span>Configure Apify token & Telegram first.</span>
            <button
              onClick={() => { toast.dismiss(t.id); navigate('/settings'); }}
              className="font-bold text-indigo-600 hover:text-indigo-800 underline whitespace-nowrap"
            >
              Go to Settings
            </button>
          </span>
        ),
        { icon: '⚙️', duration: 5000 }
      );
      return;
    }

    // Optimistic update
    setAlerts((prev) => prev.map((alert) => (
      alert.id === id ? { ...alert, active: !alert.active } : alert
    )));
    try {
      const updatedAlert = await toggleAlert(id);
      setAlerts((prev) => prev.map((alert) => (
        alert.id === id ? updatedAlert : alert
      )));
      if (updatedAlert.active) {
        toast.success('Alert resumed.');
      } else {
        toast.success('Alert paused.');
      }
    } catch (error) {
      // Revert on error
      toast.error(getErrorMessage('Failed to toggle alert', error));
      setAlerts((prev) => prev.map((alert) => (
        alert.id === id ? { ...alert, active: !alert.active } : alert
      )));
    }
  };

  const activeCount = alerts.filter((alert) => alert.active && !alert.notified).length;
  const triggeredCount = alerts.filter((alert) => alert.notified).length;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar user={user} onLogout={onLogout} />
      
      {/* Hero / Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Track Prices, Save Money.
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl">
            Set up automated price tracking for your favorite products and get notified the moment they drop to your target price.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <DashboardCards total={alerts.length} active={activeCount} triggered={triggeredCount} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="sticky top-24">
              <AlertForm onSubmit={handleCreate} isLoading={formLoading} />
            </div>
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Active Trackers</h2>
              <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-xs font-semibold">
                {alerts.length} Items
              </span>
            </div>
            
            {loading ? (
              <Loader />
            ) : alerts.length === 0 ? (
              <EmptyState />
            ) : (
              <AlertsList alerts={alerts} onDeleteClick={setDeleteModalId} onEditClick={setEditingAlert} onToggle={handleToggle} />
            )}
          </div>
        </div>
      </main>

      <DeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={handleDelete}
      />

      {editingAlert ? (
        <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="fixed inset-0 bg-gray-900/60 transition-opacity" onClick={() => setEditingAlert(null)} />
            <div className="relative w-full max-w-xl transform transition-all animate-fade-in">
              <AlertForm
                initialAlert={editingAlert}
                onSubmit={handleUpdate}
                isLoading={editLoading}
                title="Edit Price Alert"
                submitLabel="Save Changes"
                onCancel={() => setEditingAlert(null)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
