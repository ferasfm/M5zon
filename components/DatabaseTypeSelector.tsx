// components/DatabaseTypeSelector.tsx - اختيار نوع قاعدة البيانات

import React, { useState } from 'react';
import { Icons } from './icons';
import { Button } from './ui/Button';

export interface DatabaseOption {
  id: string;
  name: string;
  type: 'cloud' | 'local';
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  pricing: 'free' | 'freemium' | 'paid';
  difficulty: 'easy' | 'medium' | 'hard';
  defaultPort?: number;
  connectionTemplate: any;
}

const databaseOptions: DatabaseOption[] = [
  // قواعد البيانات السحابية
  {
    id: 'supabase',
    name: 'Supabase',
    type: 'cloud',
    description: 'PostgreSQL مُدار مع ميزات Real-time',
    icon: Icons.Database,
    features: ['Real-time', 'Authentication', 'Storage', 'Edge Functions'],
    pricing: 'freemium',
    difficulty: 'easy',
    connectionTemplate: {
      host: 'your-project.supabase.co',
      port: 443,
      database: 'postgres',
      ssl: true
    }
  },
  {
    id: 'firebase',
    name: 'Firebase Firestore',
    type: 'cloud',
    description: 'NoSQL من Google مع مزامنة فورية',
    icon: Icons.Zap,
    features: ['NoSQL', 'Offline Support', 'Real-time', 'Authentication'],
    pricing: 'freemium',
    difficulty: 'easy',
    connectionTemplate: {
      projectId: 'your-project-id',
      apiKey: 'your-api-key'
    }
  },
  {
    id: 'planetscale',
    name: 'PlanetScale',
    type: 'cloud',
    description: 'MySQL Serverless مع Branching',
    icon: Icons.Database,
    features: ['MySQL', 'Branching', 'Serverless', 'Auto-scaling'],
    pricing: 'freemium',
    difficulty: 'medium',
    connectionTemplate: {
      host: 'your-db.planetscale.sh',
      port: 3306,
      database: 'your-database',
      ssl: true
    }
  },
  {
    id: 'neon',
    name: 'Neon',
    type: 'cloud',
    description: 'PostgreSQL Serverless مع Auto-scaling',
    icon: Icons.Zap,
    features: ['PostgreSQL', 'Serverless', 'Branching', 'Auto-pause'],
    pricing: 'freemium',
    difficulty: 'easy',
    connectionTemplate: {
      host: 'your-endpoint.neon.tech',
      port: 5432,
      database: 'neondb',
      ssl: true
    }
  },
  {
    id: 'mongodb-atlas',
    name: 'MongoDB Atlas',
    type: 'cloud',
    description: 'MongoDB مُدار مع clusters عالمية',
    icon: Icons.Database,
    features: ['NoSQL', 'Global Clusters', 'Full-text Search', 'Analytics'],
    pricing: 'freemium',
    difficulty: 'medium',
    connectionTemplate: {
      connectionString: 'mongodb+srv://username:password@cluster.mongodb.net/database'
    }
  },

  // خوادم محلية
  {
    id: 'postgresql-local',
    name: 'PostgreSQL محلي',
    type: 'local',
    description: 'PostgreSQL مثبت على الخادم المحلي',
    icon: Icons.Database,
    features: ['SQL', 'JSON Support', 'Extensions', 'ACID'],
    pricing: 'free',
    difficulty: 'medium',
    defaultPort: 5432,
    connectionTemplate: {
      host: 'localhost',
      port: 5432,
      database: 'inventory_db',
      ssl: false
    }
  },
  {
    id: 'mysql-local',
    name: 'MySQL محلي',
    type: 'local',
    description: 'MySQL مثبت على الخادم المحلي',
    icon: Icons.Database,
    features: ['SQL', 'High Performance', 'Replication', 'Partitioning'],
    pricing: 'free',
    difficulty: 'medium',
    defaultPort: 3306,
    connectionTemplate: {
      host: 'localhost',
      port: 3306,
      database: 'inventory_db',
      ssl: false
    }
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    type: 'local',
    description: 'قاعدة بيانات في ملف واحد - لا تحتاج خادم',
    icon: Icons.FileText,
    features: ['File-based', 'No Server', 'Lightweight', 'ACID'],
    pricing: 'free',
    difficulty: 'easy',
    connectionTemplate: {
      filePath: './database/inventory.db'
    }
  },
  {
    id: 'sqlserver-express',
    name: 'SQL Server Express',
    type: 'local',
    description: 'SQL Server مجاني من Microsoft',
    icon: Icons.Database,
    features: ['SQL Server', 'Management Studio', 'T-SQL', 'Integration'],
    pricing: 'free',
    difficulty: 'hard',
    defaultPort: 1433,
    connectionTemplate: {
      host: 'localhost',
      port: 1433,
      database: 'InventoryDB',
      ssl: false,
      trustServerCertificate: true
    }
  },
  {
    id: 'mariadb-local',
    name: 'MariaDB محلي',
    type: 'local',
    description: 'بديل MySQL مفتوح المصدر بالكامل',
    icon: Icons.Database,
    features: ['MySQL Compatible', 'Enhanced Performance', 'Storage Engines', 'Clustering'],
    pricing: 'free',
    difficulty: 'medium',
    defaultPort: 3306,
    connectionTemplate: {
      host: 'localhost',
      port: 3306,
      database: 'inventory_db',
      ssl: false
    }
  }
];

interface DatabaseTypeSelectorProps {
  onSelect: (option: DatabaseOption) => void;
  selectedType?: 'cloud' | 'local' | null;
}

const DatabaseTypeSelector: React.FC<DatabaseTypeSelectorProps> = ({
  onSelect,
  selectedType
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const filteredOptions = databaseOptions.filter(option => option.type === activeTab);

  const getPricingColor = (pricing: string) => {
    switch (pricing) {
      case 'free': return 'text-green-600 bg-green-100';
      case 'freemium': return 'text-blue-600 bg-blue-100';
      case 'paid': return 'text-amber-600 bg-amber-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'سهل';
      case 'medium': return 'متوسط';
      case 'hard': return 'صعب';
      default: return 'غير محدد';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* عنوان */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Icons.Database className="h-5 w-5 text-primary" />
          اختيار نوع قاعدة البيانات
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          اختر نوع قاعدة البيانات التي تريد الاتصال بها
        </p>
      </div>

      {/* تبويبات */}
      <div className="border-b border-slate-200">
        <nav className="flex px-6" aria-label="Tabs">
          {[
            { id: 'cloud', name: 'سحابية', icon: Icons.Cloud, count: databaseOptions.filter(o => o.type === 'cloud').length },
            { id: 'local', name: 'محلية', icon: Icons.Database, count: databaseOptions.filter(o => o.type === 'local').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* محتوى التبويبات */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOptions.map((option) => (
            <div
              key={option.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedOption === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
                }`}
              onClick={() => setSelectedOption(option.id)}
            >
              {/* رأس البطاقة */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <option.icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{option.name}</h4>
                    <p className="text-sm text-slate-600">{option.description}</p>
                  </div>
                </div>
                {selectedOption === option.id && (
                  <Icons.CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>

              {/* المعلومات */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">التسعير:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPricingColor(option.pricing)}`}>
                    {option.pricing === 'free' ? 'مجاني' :
                      option.pricing === 'freemium' ? 'مجاني محدود' : 'مدفوع'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">صعوبة الإعداد:</span>
                  <span className={`font-medium ${getDifficultyColor(option.difficulty)}`}>
                    {getDifficultyText(option.difficulty)}
                  </span>
                </div>
                {option.defaultPort && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">المنفذ الافتراضي:</span>
                    <span className="font-mono text-slate-900">{option.defaultPort}</span>
                  </div>
                )}
              </div>

              {/* الميزات */}
              <div className="mb-3">
                <div className="text-xs text-slate-600 mb-2">الميزات:</div>
                <div className="flex flex-wrap gap-1">
                  {option.features.slice(0, 3).map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                  {option.features.length > 3 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                      +{option.features.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* زر الاختيار */}
              {selectedOption === option.id && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(option);
                  }}
                >
                  اختيار هذه القاعدة
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* معلومات إضافية */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Icons.Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">نصائح الاختيار:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>للمبتدئين:</strong> اختر Supabase أو SQLite</li>
                <li>• <strong>للمشاريع الصغيرة:</strong> SQLite أو Firebase</li>
                <li>• <strong>للمشاريع الكبيرة:</strong> PostgreSQL أو MySQL محلي</li>
                <li>• <strong>للعمل بدون إنترنت:</strong> أي خيار محلي</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTypeSelector;