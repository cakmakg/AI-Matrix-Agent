import 'dotenv/config';
import { runGeneralWorkflow } from './src/graph/runner.js';
import mongoose from 'mongoose';

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB);
    console.log('MongoDB Connected. Running test for RFP_RESPONSE...');
    
    const tenantConfig = { clientId: 'default', plan: 'pro' };
    await runGeneralWorkflow('RFP_RESPONSE: Hizmet Surecleri 2026', 'c542c3d0-test-1234', tenantConfig, null);
    
    console.log('Workflow Finished!');
    process.exit(0);
  } catch (err) {
    console.error('WORKFLOW CRASHED:', err);
    process.exit(1);
  }
}
test();
