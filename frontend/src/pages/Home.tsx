import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Alert, CreateAlertReq } from '../types/alert';
import { fetchAlerts, createAlert, deleteAlert } from '../services/api';
import { Navbar } from '../components/Navbar';
import { DashboardCards } from '../components/DashboardCards';
import { AlertForm } from '../components/AlertForm';
import { AlertsList } from '../components/AlertsList';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/loader';
import { DeleteModal } from '../components/DeleteModal';

export const Home = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch {
      toast.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleCreate = async (payload: CreateAlertReq) => {
    setFormLoading(true);
    try {
      const newAlert = await createAlert(payload);
      setAlerts((prev) => [newAlert, ...prev]);
      toast.success('Alert created successfully!');
    } catch {
      toast.error('Failed to create alert');
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
    } catch {
      toast.error('Failed to delete alert');
    } finally {
      setDeleteModalId(null);
    }
  };

  const activeCount = alerts.filter((alert) => !alert.notified).length;
  const triggeredCount = alerts.filter((alert) => alert.notified).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <DashboardCards total={alerts.length} active={activeCount} triggered={triggeredCount} />
        <AlertForm onSubmit={handleCreate} isLoading={formLoading} />
        
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Your Alerts</h2>
        </div>
        
        {loading ? (
          <Loader />
        ) : alerts.length === 0 ? (
          <EmptyState />
        ) : (
          <AlertsList alerts={alerts} onDeleteClick={setDeleteModalId} />
        )}
      </main>

      <DeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};
