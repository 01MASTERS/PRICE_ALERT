import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import type { Alert, CreateAlertReq, UpdateAlertReq } from '../types/alert';
import { fetchAlerts, createAlert, updateAlert, deleteAlert } from '../services/api';
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
  const [editLoading, setEditLoading] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

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
      if (newAlert.currentPrice == null) {
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
          <AlertsList alerts={alerts} onDeleteClick={setDeleteModalId} onEditClick={setEditingAlert} />
        )}
      </main>

      <DeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={handleDelete}
      />

      {editingAlert ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setEditingAlert(null)} />
            <div className="relative w-full max-w-3xl">
              <AlertForm
                initialAlert={editingAlert}
                onSubmit={handleUpdate}
                isLoading={editLoading}
                title="Edit Alert"
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
