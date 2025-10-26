// utils/performanceOptimizer.ts - أدوات تحسين الأداء والذاكرة

export interface PerformanceMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cacheSize: number;
  activeConnections: number;
  responseTime: number;
  lastOptimization: Date;
}

export interface OptimizationConfig {
  maxMemoryUsage: number; // بالبايت
  maxCacheSize: number;
  cleanupInterval: number; // بالمللي ثانية
  compressionThreshold: number; // بالبايت
  enableLazyLoading: boolean;
  enableCaching: boolean;
}

export class PerformanceOptimizer {
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private cache: Map<string, { data: any; timestamp: number; size: number }> = new Map();
  private memoryWatchers: ((usage: number) => void)[] = [];

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      cleanupInterval: 60000, // دقيقة واحدة
      compressionThreshold: 1024 * 1024, // 1MB
      enableLazyLoading: true,
      enableCaching: true,
      ...config
    };

    this.metrics = {
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      cacheSize: 0,
      activeConnections: 0,
      responseTime: 0,
      lastOptimization: new Date()
    };

    this.initialize();
  }

  // تهيئة محسن الأداء
  private initialize(): void {
    // بدء مراقبة الذاكرة
    this.startMemoryMonitoring();
    
    // بدء التنظيف الدوري
    this.startPeriodicCleanup();
    
    console.log('تم تهيئة محسن الأداء');
  }

  // بدء مراقبة الذاكرة
  private startMemoryMonitoring(): void {
    const updateMetrics = () => {
      this.updateMemoryMetrics();
      
      // التحقق من تجاوز حد الذاكرة
      if (this.metrics.memoryUsage.percentage > 80) {
        this.performEmergencyCleanup();
      }
    };

    // تحديث المقاييس كل 10 ثوان
    setInterval(updateMetrics, 10000);
    updateMetrics(); // تحديث فوري
  }

  // تحديث مقاييس الذاكرة
  private updateMemoryMetrics(): void {
    try {
      // حساب استخدام التخزين المحلي
      let localStorageSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageSize += new Blob([key + value]).size;
          }
        }
      }

      // حساب حجم التخزين المؤقت
      let cacheSize = 0;
      for (const [key, value] of this.cache) {
        cacheSize += value.size + new Blob([key]).size;
      }

      this.metrics.memoryUsage = {
        used: localStorageSize + cacheSize,
        total: this.config.maxMemoryUsage,
        percentage: ((localStorageSize + cacheSize) / this.config.maxMemoryUsage) * 100
      };

      this.metrics.cacheSize = cacheSize;

      // إشعار المراقبين
      this.notifyMemoryWatchers(this.metrics.memoryUsage.percentage);

    } catch (error) {
      console.error('فشل تحديث مقاييس الذاكرة:', error);
    }
  }

  // بدء التنظيف الدوري
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performRoutineCleanup();
    }, this.config.cleanupInterval);
  }

  // تنظيف روتيني
  private performRoutineCleanup(): void {
    try {
      // تنظيف التخزين المؤقت المنتهي الصلاحية
      this.cleanupExpiredCache();
      
      // ضغط البيانات الكبيرة
      this.compressLargeData();
      
      // تنظيف البيانات المؤقتة
      this.cleanupTemporaryData();
      
      // تحديث وقت آخر تحسين
      this.metrics.lastOptimization = new Date();
      
      console.log('تم تنفيذ التنظيف الروتيني');
      
    } catch (error) {
      console.error('فشل التنظيف الروتيني:', error);
    }
  }

  // تنظيف طارئ
  private performEmergencyCleanup(): void {
    console.warn('تنفيذ تنظيف طارئ - استخدام الذاكرة مرتفع');
    
    try {
      // مسح نصف التخزين المؤقت
      this.clearCachePercentage(50);
      
      // مسح البيانات المؤقتة القديمة
      this.cleanupOldTemporaryData(24); // أقدم من 24 ساعة
      
      // ضغط جميع البيانات الكبيرة
      this.compressAllLargeData();
      
      console.log('تم تنفيذ التنظيف الطارئ');
      
    } catch (error) {
      console.error('فشل التنظيف الطارئ:', error);
    }
  }

  // تنظيف التخزين المؤقت المنتهي الصلاحية
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 دقيقة
    
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  // مسح نسبة من التخزين المؤقت
  private clearCachePercentage(percentage: number): void {
    const totalEntries = this.cache.size;
    const entriesToRemove = Math.floor((totalEntries * percentage) / 100);
    
    // ترتيب حسب الوقت (الأقدم أولاً)
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
      this.cache.delete(sortedEntries[i][0]);
    }
  }

  // ضغط البيانات الكبيرة
  private compressLargeData(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.includes('_compressed')) {
        const value = localStorage.getItem(key);
        if (value && value.length > this.config.compressionThreshold) {
          try {
            const compressed = this.compressString(value);
            if (compressed.length < value.length * 0.8) { // ضغط بنسبة 20% على الأقل
              localStorage.setItem(`${key}_compressed`, compressed);
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.error(`فشل ضغط البيانات للمفتاح ${key}:`, error);
          }
        }
      }
    }
  }

  // ضغط جميع البيانات الكبيرة
  private compressAllLargeData(): void {
    const keysToCompress: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.includes('_compressed')) {
        const value = localStorage.getItem(key);
        if (value && value.length > 1024) { // أكبر من 1KB
          keysToCompress.push(key);
        }
      }
    }
    
    keysToCompress.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const compressed = this.compressString(value);
          localStorage.setItem(`${key}_compressed`, compressed);
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error(`فشل ضغط البيانات للمفتاح ${key}:`, error);
      }
    });
  }

  // تنظيف البيانات المؤقتة
  private cleanupTemporaryData(): void {
    const tempKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('temp_') || key.startsWith('cache_') || key.includes('_temp'))) {
        tempKeys.push(key);
      }
    }
    
    tempKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // تنظيف البيانات المؤقتة القديمة
  private cleanupOldTemporaryData(hoursOld: number): void {
    const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('_timestamp_')) {
        try {
          const timestampStr = key.split('_timestamp_')[1];
          const timestamp = parseInt(timestampStr);
          
          if (timestamp < cutoffTime) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // تجاهل الأخطاء في تحليل الوقت
        }
      }
    }
  }

  // ضغط النص
  private compressString(str: string): string {
    try {
      // ضغط بسيط باستخدام Base64
      return btoa(str);
    } catch (error) {
      console.error('فشل ضغط النص:', error);
      return str;
    }
  }

  // فك ضغط النص
  private decompressString(compressed: string): string {
    try {
      return atob(compressed);
    } catch (error) {
      console.error('فشل فك ضغط النص:', error);
      return compressed;
    }
  }

  // إضافة إلى التخزين المؤقت
  addToCache(key: string, data: any, ttl: number = 30 * 60 * 1000): void {
    if (!this.config.enableCaching) return;

    try {
      const serialized = JSON.stringify(data);
      const size = new Blob([serialized]).size;
      
      // التحقق من حجم التخزين المؤقت
      if (this.metrics.cacheSize + size > this.config.maxCacheSize) {
        this.clearCachePercentage(25); // مسح 25% من التخزين المؤقت
      }
      
      this.cache.set(key, {
        data: serialized,
        timestamp: Date.now(),
        size
      });
      
      // تحديد مهلة انتهاء الصلاحية
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
      
    } catch (error) {
      console.error('فشل إضافة البيانات للتخزين المؤقت:', error);
    }
  }

  // الحصول من التخزين المؤقت
  getFromCache<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    try {
      const cached = this.cache.get(key);
      if (cached) {
        return JSON.parse(cached.data) as T;
      }
      return null;
    } catch (error) {
      console.error('فشل الحصول على البيانات من التخزين المؤقت:', error);
      return null;
    }
  }

  // مسح التخزين المؤقت
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // تحسين الاستعلامات
  optimizeQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey: string,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        // محاولة الحصول من التخزين المؤقت أولاً
        const cached = this.getFromCache<T>(cacheKey);
        if (cached) {
          resolve(cached);
          return;
        }

        // تنفيذ الاستعلام
        const startTime = Date.now();
        const result = await queryFn();
        const responseTime = Date.now() - startTime;

        // تحديث مقياس وقت الاستجابة
        this.metrics.responseTime = responseTime;

        // حفظ في التخزين المؤقت
        this.addToCache(cacheKey, result, ttl);

        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // تحميل كسول للبيانات
  lazyLoad<T>(
    loader: () => Promise<T>,
    placeholder?: T
  ): Promise<T> {
    if (!this.config.enableLazyLoading) {
      return loader();
    }

    return new Promise((resolve, reject) => {
      // إرجاع البيانات المؤقتة فوراً إن وجدت
      if (placeholder) {
        resolve(placeholder);
      }

      // تحميل البيانات الفعلية في الخلفية
      setTimeout(async () => {
        try {
          const result = await loader();
          resolve(result);
        } catch (error) {
          if (!placeholder) {
            reject(error);
          }
        }
      }, 0);
    });
  }

  // تجميع العمليات
  batchOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 5
  ): Promise<T[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const results: T[] = [];
        
        for (let i = 0; i < operations.length; i += batchSize) {
          const batch = operations.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch.map(op => op()));
          results.push(...batchResults);
          
          // فترة راحة قصيرة بين الدفعات
          if (i + batchSize < operations.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
  }

  // تحسين الصور والملفات
  optimizeAsset(data: string, type: 'image' | 'json' | 'text'): string {
    try {
      switch (type) {
        case 'json':
          // ضغط JSON بإزالة المسافات
          const parsed = JSON.parse(data);
          return JSON.stringify(parsed);
        
        case 'text':
          // ضغط النص بإزالة المسافات الزائدة
          return data.replace(/\s+/g, ' ').trim();
        
        case 'image':
          // للصور، يمكن تطبيق ضغط أو تحسين حسب الحاجة
          return data;
        
        default:
          return data;
      }
    } catch (error) {
      console.error('فشل تحسين الأصل:', error);
      return data;
    }
  }

  // الحصول على مقاييس الأداء
  getMetrics(): PerformanceMetrics {
    this.updateMemoryMetrics();
    return { ...this.metrics };
  }

  // تحديث إعدادات التحسين
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // إعادة تشغيل التنظيف الدوري إذا تغيرت الفترة
    if (newConfig.cleanupInterval && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.startPeriodicCleanup();
    }
  }

  // تسجيل مراقب الذاكرة
  onMemoryUsage(callback: (usage: number) => void): void {
    this.memoryWatchers.push(callback);
  }

  // إشعار مراقبي الذاكرة
  private notifyMemoryWatchers(usage: number): void {
    this.memoryWatchers.forEach(callback => {
      try {
        callback(usage);
      } catch (error) {
        console.error('خطأ في مراقب الذاكرة:', error);
      }
    });
  }

  // تحليل الأداء
  analyzePerformance(): {
    recommendations: string[];
    issues: string[];
    score: number;
  } {
    const recommendations: string[] = [];
    const issues: string[] = [];
    let score = 100;

    // تحليل استخدام الذاكرة
    if (this.metrics.memoryUsage.percentage > 80) {
      issues.push('استخدام الذاكرة مرتفع جداً');
      recommendations.push('قم بتنظيف البيانات غير المستخدمة');
      score -= 20;
    } else if (this.metrics.memoryUsage.percentage > 60) {
      recommendations.push('راقب استخدام الذاكرة');
      score -= 10;
    }

    // تحليل حجم التخزين المؤقت
    if (this.metrics.cacheSize > this.config.maxCacheSize * 0.8) {
      issues.push('التخزين المؤقت ممتلئ تقريباً');
      recommendations.push('قم بتنظيف التخزين المؤقت');
      score -= 15;
    }

    // تحليل وقت الاستجابة
    if (this.metrics.responseTime > 2000) {
      issues.push('وقت الاستجابة بطيء');
      recommendations.push('فعّل التخزين المؤقت للاستعلامات');
      score -= 15;
    }

    // تحليل عدد الاتصالات
    if (this.metrics.activeConnections > 10) {
      issues.push('عدد كبير من الاتصالات النشطة');
      recommendations.push('أغلق الاتصالات غير المستخدمة');
      score -= 10;
    }

    return {
      recommendations,
      issues,
      score: Math.max(0, score)
    };
  }

  // تنظيف الموارد
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.cache.clear();
    this.memoryWatchers = [];
    
    console.log('تم تنظيف محسن الأداء');
  }
}