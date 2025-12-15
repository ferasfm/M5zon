// services/DatabaseService.ts

// تعريف الواجهة للنافذة (Window Interface) للوصول إلى API الخاص بـ Electron
declare global {
    interface Window {
        electron: {
            database: {
                connect: (config: any) => Promise<{ success: boolean; error?: string }>;
                query: (sql: string, params?: any[]) => Promise<{ success: boolean; data?: any[]; error?: string }>;
                disconnect: () => Promise<{ success: boolean; error?: string }>;
                isConnected: () => Promise<boolean>;
            };
        };
    }
}

// واجهة الاستجابة الموحدة
export interface DbResponse<T> {
    data: T[] | null;
    error: { message: string } | null;
}

// باني الاستعلامات (Query Builder) لمحاكاة Supabase
class QueryBuilder<T> {
    private tableName: string;
    private queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    private selectColumns: string = '*';
    private whereConditions: { column: string; operator: string; value: any }[] = [];
    private insertData: any = null;
    private updateData: any = null;
    private orderBy: string = '';
    private limitCount: number | null = null;

    constructor(tableName: string) {
        this.tableName = tableName;
        this.queryType = 'SELECT';
    }

    select(columns: string = '*') {
        // إذا كان هناك insert/update/delete، لا نغير queryType
        // select() بعد insert/update/delete يعني فقط تحديد الأعمدة المُرجعة
        if (this.queryType === 'SELECT') {
            this.selectColumns = columns;
        } else {
            // للعمليات الأخرى، select() يحدد فقط الأعمدة المُرجعة في RETURNING
            this.selectColumns = columns;
        }
        return this;
    }

    insert(data: any) {
        this.queryType = 'INSERT';
        this.insertData = data;
        return this;
    }

    update(data: any) {
        this.queryType = 'UPDATE';
        this.updateData = data;
        return this;
    }

    delete() {
        this.queryType = 'DELETE';
        return this;
    }

    eq(column: string, value: any) {
        this.whereConditions.push({ column, operator: '=', value });
        return this;
    }

    in(column: string, values: any[]) {
        this.whereConditions.push({ column, operator: 'IN', value: values });
        return this;
    }

    order(column: string, { ascending = true } = {}) {
        this.orderBy = `ORDER BY ${column} ${ascending ? 'ASC' : 'DESC'}`;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    // تنفيذ الاستعلام - يجب أن يكون thenable
    then<TResult1 = DbResponse<T>, TResult2 = never>(
        onfulfilled?: ((value: DbResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    // دالة التنفيذ الفعلية
    private async execute(): Promise<DbResponse<T>> {
        try {
            const { sql, params } = this.buildSql();
            console.log('🔍 Executing SQL:', sql);
            console.log('📊 Parameters:', params);

            if (!window.electron?.database) {
                console.error('❌ window.electron.database is not available!');
                return { data: null, error: { message: 'Database connection not available' } };
            }

            const result = await window.electron.database.query(sql, params);

            if (result.success) {
                console.log('✅ Query successful, rows:', result.data?.length || 0);
                return { data: result.data as T[], error: null };
            } else {
                console.error('❌ Query failed:', result.error);
                return { data: null, error: { message: result.error || 'Unknown DB Error' } };
            }
        } catch (error: any) {
            console.error('❌ Exception in execute:', error);
            return { data: null, error: { message: error.message } };
        }
    }

    // بناء جملة SQL
    private buildSql(): { sql: string; params: any[] } {
        let sql = '';
        let params: any[] = [];
        let paramCounter = 1;

        try {
            switch (this.queryType) {
                case 'SELECT':
                    sql = `SELECT ${this.selectColumns} FROM ${this.tableName}`;
                    break;

                case 'INSERT':
                    const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
                    if (items.length === 0) throw new Error('No data to insert');

                    const keys = Object.keys(items[0]);

                    const valuesPlaceholder = items.map(() => {
                        const placeholders = keys.map(() => `$${paramCounter++}`).join(', ');
                        return `(${placeholders})`;
                    }).join(', ');

                    items.forEach(item => {
                        keys.forEach(key => params.push(item[key]));
                    });

                    const returningColumns = this.selectColumns || '*';
                    sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES ${valuesPlaceholder} RETURNING ${returningColumns}`;
                    break;

                case 'UPDATE':
                    const updateKeys = Object.keys(this.updateData);
                    const setClause = updateKeys.map(key => `${key} = $${paramCounter++}`).join(', ');
                    updateKeys.forEach(key => params.push(this.updateData[key]));

                    sql = `UPDATE ${this.tableName} SET ${setClause}`;
                    break;

                case 'DELETE':
                    sql = `DELETE FROM ${this.tableName}`;
                    break;
            }

            if (this.whereConditions.length > 0) {
                const whereClauses = this.whereConditions.map(cond => {
                    if (cond.operator === 'IN') {
                        const placeholders = cond.value.map(() => `$${paramCounter++}`).join(', ');
                        cond.value.forEach((v: any) => params.push(v));
                        return `${cond.column} IN (${placeholders})`;
                    } else {
                        params.push(cond.value);
                        return `${cond.column} ${cond.operator} $${paramCounter++}`;
                    }
                });
                sql += ` WHERE ${whereClauses.join(' AND ')}`;
            }

            if (this.queryType === 'UPDATE' || this.queryType === 'DELETE') {
                sql += ' RETURNING *';
            }

            if (this.orderBy) {
                sql += ` ${this.orderBy}`;
            }

            if (this.limitCount !== null) {
                sql += ` LIMIT ${this.limitCount}`;
            }

            console.log('🔨 Built SQL:', sql);
            console.log('🔨 Built params:', params);

            return { sql, params };
        } catch (error: any) {
            console.error('❌ Error building SQL:', error);
            throw error;
        }
    }
}

// المحول المحلي
export const localDb = {
    from: (tableName: string) => new QueryBuilder(tableName),

    // دوال مساعدة للاتصال
    connect: async (config: any) => {
        console.log('🔌 Connecting to database...', config);
        return await window.electron.database.connect(config);
    },
    disconnect: async () => {
        console.log('🔌 Disconnecting from database...');
        return await window.electron.database.disconnect();
    },
    isConnected: async () => {
        return await window.electron.database.isConnected();
    }
};
