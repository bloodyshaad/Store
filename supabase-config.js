// Supabase configuration and database utilities
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://dctbhhtwwbppumcrolna.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGJoaHR3d2JwcHVtY3JvbG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY2MzQsImV4cCI6MjA2NTc1MjYzNH0.Cu_lSuGLD3iaJl5oaEbapxrzbeTeKMpwmUYmfjBOUkc';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Database initialization - Create tables if they don't exist
async function initializeDatabase() {
    try {
        console.log('Initializing Supabase database...');
        
        // Note: In Supabase, tables are typically created via the dashboard or SQL editor
        // This function can be used to verify tables exist or create them programmatically
        
        // Check if tables exist by trying to select from them
        const tables = [
            'store_owners',
            'stores', 
            'items',
            'customers',
            'transactions',
            'transaction_items',
            'returns',
            'return_items'
        ];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
                
            if (error && error.code === 'PGRST116') {
                console.log(`Table ${table} does not exist. Please create it in Supabase dashboard.`);
            } else if (error) {
                console.log(`Error checking table ${table}:`, error.message);
            } else {
                console.log(`✅ Table ${table} exists`);
            }
        }
        
        console.log('Database initialization completed');
        return true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        return false;
    }
}

// Helper function to handle Supabase errors
function handleSupabaseError(error, operation) {
    console.error(`Supabase error during ${operation}:`, error);
    
    if (error.code === 'PGRST116') {
        return { error: 'Table not found. Please check database setup.' };
    } else if (error.code === '23505') {
        return { error: 'Duplicate entry. This record already exists.' };
    } else if (error.code === '23503') {
        return { error: 'Foreign key constraint violation.' };
    } else {
        return { error: error.message || 'Database operation failed' };
    }
}

// Generic database operations
const db = {
    // Select operations
    async select(table, columns = '*', conditions = {}) {
        try {
            let query = supabase.from(table).select(columns);
            
            // Apply conditions
            Object.entries(conditions).forEach(([key, value]) => {
                if (key === 'limit') {
                    query = query.limit(value);
                } else if (key === 'order') {
                    query = query.order(value.column, { ascending: value.ascending || false });
                } else if (key === 'range') {
                    query = query.range(value.from, value.to);
                } else {
                    query = query.eq(key, value);
                }
            });
            
            const { data, error } = await query;
            
            if (error) {
                return handleSupabaseError(error, `select from ${table}`);
            }
            
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, `select from ${table}`);
        }
    },

    // Insert operations
    async insert(table, data) {
        try {
            const { data: result, error } = await supabase
                .from(table)
                .insert(data)
                .select();
            
            if (error) {
                return handleSupabaseError(error, `insert into ${table}`);
            }
            
            return { data: result, error: null };
        } catch (error) {
            return handleSupabaseError(error, `insert into ${table}`);
        }
    },

    // Update operations
    async update(table, data, conditions) {
        try {
            let query = supabase.from(table).update(data);
            
            // Apply conditions
            Object.entries(conditions).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
            
            const { data: result, error } = await query.select();
            
            if (error) {
                return handleSupabaseError(error, `update ${table}`);
            }
            
            return { data: result, error: null };
        } catch (error) {
            return handleSupabaseError(error, `update ${table}`);
        }
    },

    // Delete operations
    async delete(table, conditions) {
        try {
            let query = supabase.from(table).delete();
            
            // Apply conditions
            Object.entries(conditions).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
            
            const { data, error } = await query;
            
            if (error) {
                return handleSupabaseError(error, `delete from ${table}`);
            }
            
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, `delete from ${table}`);
        }
    }
};

module.exports = {
    supabase,
    db,
    initializeDatabase,
    handleSupabaseError
};