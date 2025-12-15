import pg from 'pg';
const { Client } = pg;

let client = null;

const db = {
  connect: async (config) => {
    try {
      if (client) {
        await client.end();
      }

      client = new Client({
        user: config.user,
        host: config.host,
        database: config.database,
        password: config.password,
        port: config.port,
      });

      await client.connect();
      return { success: true };
    } catch (error) {
      console.error('Database connection error:', error);
      return { success: false, error: error.message };
    }
  },

  query: async (text, params) => {
    try {
      if (!client) {
        throw new Error('Database not connected');
      }
      console.log('📊 Executing query:', text);
      console.log('📊 With params:', params);
      
      // استخدام الصيغة الصحيحة لـ pg
      const res = await client.query({
        text: text,
        values: params || []
      });
      
      console.log('✅ Query successful, rows:', res.rows.length);
      return { success: true, data: res.rows };
    } catch (error) {
      console.error('❌ Database query error:', error);
      console.error('❌ Query was:', text);
      console.error('❌ Params were:', params);
      return { success: false, error: error.message };
    }
  },

  disconnect: async () => {
    try {
      if (client) {
        await client.end();
        client = null;
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  isConnected: () => {
    return client !== null;
  }
};

export default db;
