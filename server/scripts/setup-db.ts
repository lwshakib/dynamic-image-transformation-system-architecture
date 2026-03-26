import fs from 'fs';
import path from 'path';
import { postgresService } from '../src/services/postgres.service';

async function run() {
    console.log("Setting up PostgreSQL database...");
    
    try {
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log("Executing schema.sql...");
        await postgresService.query(schema);
        
        console.log("Database Setup complete.");
    } catch (error: any) {
        console.error("Fatal error during Database setup:", error.message);
        process.exit(1);
    } finally {
        await postgresService.close();
    }
}

run();
