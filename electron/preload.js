import { contextBridge, ipcRenderer } from 'electron';

// تعريض واجهة آمنة للتطبيق
contextBridge.exposeInMainWorld('electronAPI', {
  // الحصول على إصدار التطبيق
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  
  // إرسال رسالة إلى العملية الرئيسية
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  
  // استقبال رسالة من العملية الرئيسية
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, data) => callback(data));
  },
  
  // إزالة المستمع
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // استدعاء دالة في العملية الرئيسية والانتظار للنتيجة
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
});

// يمكن إضافة المزيد من الواجهات هنا حسب الحاجة

