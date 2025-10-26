// hooks/useOfflineFirst.ts - Hook لاستخدام النظام الذكي للاتصال

import { useState, useEffect, useCallback } from 'react';
import { offlineFirstManager, ConnectionStatus } from '../services/OfflineFirstManager';
import { useSupabase } from '../contexts/SupabaseContext';
import { useNotification } from '../contexts/NotificationContext';

export const useOfflineFirst = () => {
  const { supabase } = useSupabase();
  const notification = useNotification();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    offlineFirstManager.getConnectionStatus()
  );

  useEffect(() => {
    // تهيئة النظام مع Supabase
    if (supabase) {
      offlineFirstManager.setSupabaseClient(supabase);
    }

    // الاشتراك في تحديثات الحالة
    offlineFirstManager.onStatusChange((status) => {
      setConnectionStatus(status);
      
      // إشعارات للمستخدم حسب تغيير الحالة
      if (status.mode === 'cloud' && connectionStatus.mode === 'offline') {
        notification?.addNotification('تم الاتصال بقاعدة البيانات السحابية', 'success');
      } else if (status.mode === 'offline' && connectionStatus.mode === 'cloud') {
        notification?.addNotification('انقطع الاتصال - العمل محلياً', 'warning');
      } else if (status.mode === 'syncing') {
        notification?.addNotification('جاري مزامنة البيانات...', 'info');
      }
    });
  }, [supabase, notification, connectionStatus.mode]);

  // حفظ البيانات (سحابية أو محلية حسب الحالة)
  const saveData = useCallback(async (table: string, data: any) => {
    try {
      if (connectionStatus.isCloudConnected && supabase) {
        // حفظ في السحابة مباشرة
        const { error } = await supabase.from(table).insert(data);
        if (error) throw error;
        
        notification?.addNotification('تم حفظ البيانات في السحابة', 'success');
        return { success: true, location: 'cloud' };
      } else {
        // حفظ محلياً
        offlineFirstManager.saveDataLocally(table, data);
        notification?.addNotification('تم حفظ البيانات محلياً', 'info');
        return { success: true, location: 'local' };
      }
    } catch (error) {
      console.error('فشل حفظ البيانات:', error);
      
      // في حالة فشل الحفظ في السحابة، احفظ محلياً
      if (connectionStatus.isCloudConnected) {
        offlineFirstManager.saveDataLocally(table, data);
        notification?.addNotification('فشل الحفظ في السحابة - تم الحفظ محلياً', 'warning');
        return { success: true, location: 'local' };
      }
      
      notification?.addNotification('فشل حفظ البيانات', 'error');
      return { success: false, location: 'none' };
    }
  }, [connectionStatus.isCloudConnected, supabase, notification]);

  // تحديث البيانات
  const updateData = useCallback(async (table: string, id: string, data: any) => {
    try {
      if (connectionStatus.isCloudConnected && supabase) {
        // تحديث في السحابة
        const { error } = await supabase.from(table).update(data).eq('id', id);
        if (error) throw error;
        
        notification?.addNotification('تم تحديث البيانات في السحابة', 'success');
        return { success: true, location: 'cloud' };
      } else {
        // حفظ التحديث محلياً
        offlineFirstManager.saveDataLocally(table, { ...data, id, _action: 'update' });
        notification?.addNotification('تم حفظ التحديث محلياً', 'info');
        return { success: true, location: 'local' };
      }
    } catch (error) {
      console.error('فشل تحديث البيانات:', error);
      
      // في حالة فشل التحديث في السحابة، احفظ محلياً
      if (connectionStatus.isCloudConnected) {
        offlineFirstManager.saveDataLocally(table, { ...data, id, _action: 'update' });
        notification?.addNotification('فشل التحديث في السحابة - تم الحفظ محلياً', 'warning');
        return { success: true, location: 'local' };
      }
      
      notification?.addNotification('فشل تحديث البيانات', 'error');
      return { success: false, location: 'none' };
    }
  }, [connectionStatus.isCloudConnected, supabase, notification]);

  // حذف البيانات
  const deleteData = useCallback(async (table: string, id: string) => {
    try {
      if (connectionStatus.isCloudConnected && supabase) {
        // حذف من السحابة
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        
        notification?.addNotification('تم حذف البيانات من السحابة', 'success');
        return { success: true, location: 'cloud' };
      } else {
        // حفظ عملية الحذف محلياً
        offlineFirstManager.saveDataLocally(table, { id, _action: 'delete' });
        notification?.addNotification('تم حفظ عملية الحذف محلياً', 'info');
        return { success: true, location: 'local' };
      }
    } catch (error) {
      console.error('فشل حذف البيانات:', error);
      
      // في حالة فشل الحذف في السحابة، احفظ محلياً
      if (connectionStatus.isCloudConnected) {
        offlineFirstManager.saveDataLocally(table, { id, _action: 'delete' });
        notification?.addNotification('فشل الحذف في السحابة - تم الحفظ محلياً', 'warning');
        return { success: true, location: 'local' };
      }
      
      notification?.addNotification('فشل حذف البيانات', 'error');
      return { success: false, location: 'none' };
    }
  }, [connectionStatus.isCloudConnected, supabase, notification]);

  // إجبار المزامنة
  const forceSync = useCallback(async () => {
    try {
      const success = await offlineFirstManager.forcSync();
      if (success) {
        notification?.addNotification('تم مزامنة البيانات بنجاح', 'success');
      } else {
        notification?.addNotification('فشل في المزامنة - تحقق من الاتصال', 'error');
      }
      return success;
    } catch (error) {
      console.error('فشل في المزامنة:', error);
      notification?.addNotification('حدث خطأ أثناء المزامنة', 'error');
      return false;
    }
  }, [notification]);

  return {
    connectionStatus,
    saveData,
    updateData,
    deleteData,
    forceSync,
    isOnline: connectionStatus.isOnline,
    isCloudConnected: connectionStatus.isCloudConnected,
    mode: connectionStatus.mode,
    pendingLocalData: connectionStatus.pendingLocalData
  };
};

export default useOfflineFirst;