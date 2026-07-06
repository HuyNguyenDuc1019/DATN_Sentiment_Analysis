import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import AdminSettingsHeader from '../../components/admin/settings/AdminSettingsHeader';
import AdminSettingsSkeleton from '../../components/admin/settings/AdminSettingsSkeleton';
import AiLogicCard from '../../components/admin/settings/AiLogicCard';
import DataLimitCard from '../../components/admin/settings/DataLimitCard';
import CrisisAlertCard from '../../components/admin/settings/CrisisAlertCard';
import AspectDictionaryCard from '../../components/admin/settings/AspectDictionaryCard';

import {
  DEFAULT_SETTINGS,
  buildSettingsPayload,
  isSettingsDirty,
  normalizeImportedSettings,
  normalizeSettingsForUi,
} from '../../utils/admin/settingsUtils';

import {
  fetchAdminSettings,
  getAdminId,
  saveAdminSettings,
} from '../../services/admin/settingsService';

export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newAspectName, setNewAspectName] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);

        const adminId = await getAdminId();
        const data = await fetchAdminSettings(adminId);

        if (data) {
          const fetchedData = normalizeSettingsForUi(data);
          setSettings(fetchedData);
          setOriginalSettings(fetchedData);
        }
      } catch (error) {
        console.error('Lỗi tải settings:', error);
        toast.error('Không thể tải cấu hình hiện tại từ máy chủ.', {
          id: 'admin-settings-load-error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const isDirty = isSettingsDirty(settings, originalSettings);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: type === 'checkbox'
        ? checked
        : ['ai_threshold', 'max_upload_size_free', 'data_retention_days'].includes(name)
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleAspectKeywordsChange = (aspectName, textValue) => {
    setSettings((current) => ({
      ...current,
      aspect_dictionary: {
        ...current.aspect_dictionary,
        [aspectName]: textValue,
      },
    }));
  };

  const handleAddAspect = (event) => {
    event.preventDefault();

    const nameClean = newAspectName.trim();

    if (!nameClean) {
      toast.error('Tên khía cạnh không được trống.');
      return;
    }

    if (settings.aspect_dictionary[nameClean]) {
      toast.error('Khía cạnh này đã tồn tại rồi.');
      return;
    }

    setSettings((current) => ({
      ...current,
      aspect_dictionary: {
        ...current.aspect_dictionary,
        [nameClean]: '',
      },
    }));

    setNewAspectName('');
  };

  const handleRemoveAspect = (aspectName) => {
    setSettings((current) => {
      const updatedDict = { ...current.aspect_dictionary };
      delete updatedDict[aspectName];

      return {
        ...current,
        aspect_dictionary: updatedDict,
      };
    });
  };

  const handleResetDefaults = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định gốc? Các thay đổi chưa lưu sẽ bị xóa bỏ.')) {
      setSettings(DEFAULT_SETTINGS);
      toast.success('Đã tải lại cấu hình mặc định. Vui lòng bấm Lưu để áp dụng!');
    }
  };

  const handleExportConfig = () => {
    try {
      const dataStr = JSON.stringify(settings, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `almotion-config-${new Date().toISOString().slice(0, 10)}.json`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Đã xuất file cấu hình thành công!');
    } catch (error) {
      console.error('Lỗi xuất file:', error);
      toast.error('Không thể xuất cấu hình.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      try {
        const importedData = JSON.parse(readerEvent.target.result);
        const normalized = normalizeImportedSettings(importedData);

        setSettings((current) => ({
          ...current,
          ...normalized,
        }));

        toast.success('Đã nhập cấu hình! Vui lòng kiểm tra lại và bấm Lưu để áp dụng.');
        event.target.value = null;
      } catch (error) {
        console.error('Lỗi đọc file JSON:', error);
        toast.error(error.message || 'File JSON không hợp lệ hoặc bị hỏng.');
      }
    };

    reader.readAsText(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (settings.ai_threshold < 0 || settings.ai_threshold > 1) {
      toast.error('Ngưỡng tự tin AI phải nằm trong khoảng 0.0 - 1.0');
      return;
    }

    try {
      setIsSaving(true);

      const adminId = await getAdminId();
      const { payload, savedSettings } = buildSettingsPayload(settings);

      await saveAdminSettings({
        adminId,
        payload,
      });

      setSettings(savedSettings);
      setOriginalSettings(savedSettings);

      toast.success('Lưu cấu hình hệ thống thành công!');
    } catch (error) {
      console.error('Lỗi lưu settings:', error);
      toast.error('Có lỗi xảy ra khi lưu thay đổi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <AdminSettingsSkeleton />;
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl animate-in fade-in duration-500 font-sans">
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleImportFile}
        className="hidden"
      />

      <AdminSettingsHeader
        isDirty={isDirty}
        isSaving={isSaving}
        onImportClick={handleImportClick}
        onExportConfig={handleExportConfig}
        onResetDefaults={handleResetDefaults}
        onSubmit={handleSubmit}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AiLogicCard
          settings={settings}
          onChange={handleChange}
        />

        <DataLimitCard
          settings={settings}
          onChange={handleChange}
        />

        <CrisisAlertCard
          settings={settings}
          onChange={handleChange}
        />

        <AspectDictionaryCard
          settings={settings}
          newAspectName={newAspectName}
          onNewAspectNameChange={setNewAspectName}
          onAddAspect={handleAddAspect}
          onAspectKeywordsChange={handleAspectKeywordsChange}
          onRemoveAspect={handleRemoveAspect}
        />
      </form>
    </div>
  );
}
