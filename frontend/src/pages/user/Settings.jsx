import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import UpgradeModal from '../../components/common/UpgradeModal';

import SettingsTabs from '../../components/user/settings/SettingsTabs';
import AiSettingsTab from '../../components/user/settings/AiSettingsTab';
import NotificationsTab from '../../components/user/settings/NotificationsTab';
import BillingTab from '../../components/user/settings/BillingTab';
import DataSettingsTab from '../../components/user/settings/DataSettingsTab';
import DatasetDeleteModal from '../../components/user/settings/DatasetDeleteModal';
import ClearDataModal from '../../components/user/settings/ClearDataModal';
import SaveSettingsBar from '../../components/user/settings/SaveSettingsBar';

import {
  fetchUserDatasets,
  deleteUserDataset,
  clearUserData,
  fetchUserSettings,
  saveUserSettings,
} from '../../services/user/settingsService';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('ai');

  const { user, profile, userProfile, refreshUserProfile } = useAuth();

  const currentProfile = userProfile || profile;
  const userId = user?.id;
  const isVip = currentProfile?.tier === 'vip';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const [threshold, setThreshold] = useState(50);
  const [stopWords, setStopWords] = useState('');

  const [alertEmail, setAlertEmail] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const [retentionDays, setRetentionDays] = useState(7);
  const [feedbackConfidenceThreshold, setFeedbackConfidenceThreshold] = useState(70);

  const [datasets, setDatasets] = useState([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [deletingDatasetId, setDeletingDatasetId] = useState(null);
  const [datasetToDelete, setDatasetToDelete] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const data = await fetchUserSettings(userId);

        if (data) {
          setThreshold(Number(data.custom_threshold ?? 50));
          setStopWords(data.custom_sensitive_words ?? '');
          setAlertEmail(Boolean(data.alert_email ?? false));
          setWeeklyReport(Boolean(data.weekly_report ?? true));

          const nextRetentionDays = Number(data.retention_days || (isVip ? 30 : 7));
          setRetentionDays(isVip ? nextRetentionDays : 7);

          setFeedbackConfidenceThreshold(
            Math.min(
              95,
              Math.max(30, Number(data.feedback_confidence_threshold ?? 70)),
            ),
          );
        }
      } catch (error) {
        toast.error(error.message || 'Lỗi khi tải cấu hình hệ thống!');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [userId, isVip]);

  useEffect(() => {
    if (!isVip && retentionDays !== 7) {
      setRetentionDays(7);
    }
  }, [isVip, retentionDays]);

  const loadUserDatasets = async () => {
    if (!userId) return;

    try {
      setIsLoadingDatasets(true);

      const data = await fetchUserDatasets(userId);
      setDatasets(data);
    } catch (error) {
      toast.error(error.message || 'Không thể tải danh sách dữ liệu.');
      console.error(error);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'data' && userId) {
      loadUserDatasets();
    }
  }, [activeTab, userId]);

  const handleSaveSettings = async () => {
    if (!userId) {
      toast.error('Vui lòng đăng nhập trước khi lưu cấu hình.');
      return;
    }

    try {
      setIsSaving(true);

      await saveUserSettings({
        user_id: userId,
        custom_threshold: Number(threshold),
        custom_sensitive_words: stopWords,
        alert_email: Boolean(alertEmail),
        weekly_report: Boolean(weeklyReport),
        retention_days: isVip ? Number(retentionDays) : 7,
        feedback_confidence_threshold: Number(feedbackConfidenceThreshold),
      });

      toast.success('Đã lưu cấu hình thành công!');
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra khi lưu cấu hình.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenClearConfirm = () => {
    if (!userId) {
      toast.error('Vui lòng đăng nhập trước khi xóa dữ liệu.');
      return;
    }

    setIsClearConfirmOpen(true);
  };

  const handleConfirmClearAllData = async () => {
    if (!userId) {
      toast.error('Vui lòng đăng nhập trước khi xóa dữ liệu.');
      setIsClearConfirmOpen(false);
      return;
    }

    try {
      setIsClearing(true);

      const result = await clearUserData(userId);

      if (result && Number(result.deleted_count || 0) === 0) {
        toast.error('Không tìm thấy dữ liệu để xóa.');
        return;
      }

      toast.success('Đã xóa toàn bộ dữ liệu thành công.');
      setIsClearConfirmOpen(false);

      await loadUserDatasets();
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa dữ liệu.');
      console.error(error);
    } finally {
      setIsClearing(false);
    }
  };

  const getDatasetKey = (dataset) => {
    return (
      dataset?.source_url ||
      dataset?.dataset_name ||
      dataset?.dataset_id ||
      dataset?.id ||
      ''
    );
  };

  const handleOpenDeleteDataset = (dataset) => {
    const datasetKey = getDatasetKey(dataset);

    if (!datasetKey) {
      toast.error('Không tìm thấy mã dữ liệu cần xóa.');
      return;
    }

    setDatasetToDelete(dataset);
  };

  const handleConfirmDeleteDataset = async () => {
    if (!userId || !datasetToDelete) return;

    const datasetKey = getDatasetKey(datasetToDelete);

    if (!datasetKey) {
      toast.error('Không tìm thấy mã dữ liệu cần xóa.');
      return;
    }

    try {
      setDeletingDatasetId(datasetKey);

      const result = await deleteUserDataset({
        userId,
        datasetId: datasetKey,
      });

      if (result && Number(result.deleted_count || 0) === 0) {
        toast.error('Không tìm thấy dữ liệu cần xóa.');
        return;
      }

      toast.success('Đã xóa dữ liệu đã chọn.');
      setDatasetToDelete(null);

      setDatasets((current) =>
        current.filter((item) => getDatasetKey(item) !== datasetKey),
      );

      await loadUserDatasets();
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa dữ liệu.');
      console.error(error);
    } finally {
      setDeletingDatasetId(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-slate-400">Đang tải cấu hình hệ thống...</div>;
  }

  return (
    <>
      <div className="p-8 h-full flex flex-col font-sans animate-in fade-in duration-500 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">
            Cài đặt hệ thống
          </h1>
          <p className="text-slate-400 text-sm">
            Quản lý cấu hình trí tuệ nhân tạo, thông báo và tài nguyên của bạn.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1">
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 min-h-[500px] h-full flex flex-col">
              {activeTab === 'ai' && (
                <AiSettingsTab
                  isVip={isVip}
                  threshold={threshold}
                  setThreshold={setThreshold}
                  stopWords={stopWords}
                  setStopWords={setStopWords}
                  onUpgrade={() => setIsUpgradeModalOpen(true)}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsTab
                  isVip={isVip}
                  alertEmail={alertEmail}
                  setAlertEmail={setAlertEmail}
                  weeklyReport={weeklyReport}
                  setWeeklyReport={setWeeklyReport}
                  onUpgrade={() => setIsUpgradeModalOpen(true)}
                />
              )}

              {activeTab === 'billing' && (
  <BillingTab
    isVip={isVip}
    profile={currentProfile}
    vipStartedAt={currentProfile?.vip_started_at}
    vipExpiresAt={currentProfile?.vip_expires_at}
    onUpgrade={() => setIsUpgradeModalOpen(true)}
  />
)}
              {activeTab === 'data' && (
                <DataSettingsTab
                  isVip={isVip}
                  retentionDays={retentionDays}
                  setRetentionDays={setRetentionDays}
                  feedbackConfidenceThreshold={feedbackConfidenceThreshold}
                  setFeedbackConfidenceThreshold={setFeedbackConfidenceThreshold}
                  datasets={datasets}
                  isLoadingDatasets={isLoadingDatasets}
                  deletingDatasetId={deletingDatasetId}
                  onRefreshDatasets={loadUserDatasets}
                  onOpenDeleteDataset={handleOpenDeleteDataset}
                  onOpenClearConfirm={handleOpenClearConfirm}
                  isClearing={isClearing}
                />
              )}

              {(activeTab === 'ai' || activeTab === 'notifications' || activeTab === 'data') && (
                <SaveSettingsBar
                  isSaving={isSaving}
                  disabled={!userId}
                  onSave={handleSaveSettings}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <DatasetDeleteModal
        dataset={datasetToDelete}
        deletingDatasetId={deletingDatasetId}
        onCancel={() => setDatasetToDelete(null)}
        onConfirm={handleConfirmDeleteDataset}
      />

      <ClearDataModal
        isOpen={isClearConfirmOpen}
        isClearing={isClearing}
        onCancel={() => setIsClearConfirmOpen(false)}
        onConfirm={handleConfirmClearAllData}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </>
  );
}