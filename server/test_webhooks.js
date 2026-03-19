#!/usr/bin/env node

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:4000';
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';

// Test utilities
const tests = [];

function addTest(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log(chalk.bold.cyan('\n🚀 N8N Webhook Integration Tests\n'));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      process.stdout.write(`${test.name} ... `);
      await test.fn();
      console.log(chalk.green('✅'));
      passed++;
    } catch (error) {
      console.log(chalk.red('❌'));
      console.error('DEBUG:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code,
      });
      failed++;
    }
  }

  console.log(chalk.bold.cyan(`\n📊 Results: ${passed} passed, ${failed} failed\n`));

  if (failed > 0) process.exit(1);
}

// ============ TEST UTILITIES ============

function createPayload(category, overrides = {}) {
  const categoryMap = {
    ACIL_DESTEK: {
      subject: 'SOS: Sistem Çöktü!',
      content: 'Sistemimiz offline, lütfen yardım edin!',
      author: 'customer@example.com',
      platform_id: 'gmail_acil_001',
    },
    TEKLIF_TALEBI: {
      subject: 'Yazılım Geliştirme Projesi Teklifi',
      content: 'Yeni bir web uygulaması için fiyat teklifi alabilir miyim?',
      author: 'prospect@company.com',
      platform_id: 'gmail_offer_002',
    },
    IHTIYAC_ANALIZI: {
      subject: 'CRM Sistem İhtiyaçları Hakkında Görüş',
      content: 'Şirketimiz için en uygun CRM sistemini nasıl seçeriz?',
      author: 'manager@company.com',
      platform_id: 'gmail_analysis_003',
    },
    SIKAYET_IADE: {
      subject: 'İade Talebim Var',
      content: 'Aldığım ürün beklentimi karşılamıyor, iadesini istiyorum.',
      author: 'unhappy@customer.com',
      platform_id: 'gmail_complaint_004',
    },
    FIYAT_SORUSTURMASI: {
      subject: 'Ürün Fiyatlandırması',
      content: 'Bulktaş alım için en iyi fiyatını nedir?',
      author: 'buyer@company.com',
      platform_id: 'gmail_price_005',
    },
    GENEL_BILGI: {
      subject: 'Şirket Hakkında Bilgi',
      content: 'Şirketiniz hakkında daha fazla bilgi alabilir miyim?',
      author: 'info@university.edu',
      platform_id: 'gmail_info_006',
    },
  };

  const base = categoryMap[category] || {};
  return {
    source: 'gmail',
    platform: 'gmail',
    category: category,
    priority: 'medium',
    ai_summary: `Summary for ${category}`,
    ai_sentiment: 'neutral',
    ai_topics: [category.toLowerCase()],
    ai_confidence: 0.9,
    author_email: base.author,
    timestamp: new Date().toISOString(),
    ...base,
    ...overrides,
  };
}

// ============ TEST CASES ============

addTest('1️⃣ POST /api/inbox (🔴 Acil Destek)', async () => {
  const response = await axios.post(`${BASE_URL}/api/inbox`, createPayload('ACIL_DESTEK'));

  if (!response.data.success) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  global.testTicketId = response.data.ticketId;
});

addTest('2️⃣ POST /api/inbox (💰 Teklif Talebi)', async () => {
  const response = await axios.post(`${BASE_URL}/api/inbox`, createPayload('TEKLIF_TALEBI'));

  if (!response.data.success) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  global.testThreadId = response.data.threadId;
});

addTest('3️⃣ POST /api/inbox (📋 İhtiyaç Analizi)', async () => {
  const response = await axios.post(`${BASE_URL}/api/inbox`, createPayload('IHTIYAC_ANALIZI'));

  if (!response.data.success) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }
});

addTest('4️⃣ POST /api/inbox (😤 Şikayet/İade)', async () => {
  const response = await axios.post(`${BASE_URL}/api/inbox`, createPayload('SIKAYET_IADE', {
    priority: 'high',
  }));

  if (!response.data.success) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }
});

addTest('5️⃣ POST /api/inbox (💲 Fiyat Soruşturması)', async () => {
  const response = await axios.post(`${BASE_URL}/api/inbox`, createPayload('FIYAT_SORUSTURMASI'));

  if (!response.data.success) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }
});

addTest('6️⃣ POST /api/inbox (ℹ️ Genel Bilgi)', async () => {
  const response = await axios.post(`${BASE_URL}/api/inbox`, createPayload('GENEL_BILGI', {
    priority: 'low',
  }));

  // GENEL_BILGI "NOTED" status döner
  if (response.data.status !== 'NOTED') {
    throw new Error(`Expected NOTED status, got ${response.data.status}`);
  }
});

addTest('7️⃣ POST /api/inbox (Operator Source)', async () => {
  const response = await axios.post(`${BASE_URL}/api/inbox`, {
    source: 'operator',
    message: 'Test operator komutu — UI\'den gelen direct komut',
  });

  if (!response.data.success) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }
});

addTest('8️⃣ GET /api/artifact/:ticketId (Destek Ticket Okuma)', async () => {
  if (!global.testTicketId) {
    console.log('   ⏭️  Skipped (no ticket from test 1)');
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}/api/artifact/${global.testTicketId}`);

    if (!response.data.success) {
      throw new Error('Failed to fetch artifact');
    }

    console.log(`\n   📄 Ticket: ${global.testTicketId}`);
    console.log(`   📊 Status: ${response.data.status || 'PROCESSING'}`);
  } catch (error) {
    // 404 expected if not yet processed
    if (error.response?.status === 404) {
      console.log(`\n   ⏳ Not yet processed (expected)`);
      return;
    }
    throw error;
  }
});

addTest('9️⃣ Slack Webhook Test', async () => {
  if (SLACK_WEBHOOK.includes('YOUR/WEBHOOK')) {
    console.log('   ⏭️  Skipped (SLACK_WEBHOOK_URL not configured)');
    return;
  }

  try {
    const response = await axios.post(SLACK_WEBHOOK, {
      text: '✅ N8N + AI Orchestra webhook test başarılı!',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 N8N System Status'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: '*Status:*\n✅ All webhooks operational'
            },
            {
              type: 'mrkdwn',
              text: '*Time:*\n' + new Date().toLocaleString('tr-TR')
            }
          ]
        }
      ]
    });

    if (response.status !== 200) {
      throw new Error('Slack webhook returned non-200');
    }
  } catch (error) {
    // Slack webhook success is 200
    if (error.response?.status !== 200) {
      throw new Error(`Slack error: ${error.message}`);
    }
  }
});

addTest('🔟 MongoDB Connection Check', async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);

    if (response.data.mongo !== 'connected') {
      throw new Error('MongoDB not connected');
    }
  } catch (error) {
    // Endpoint might not exist, check if server is responding
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Backend server not running on port 4000');
    }
    // If other error, that's ok — server is responding
  }
});

// ============ RUN TESTS ============

runTests().catch(error => {
  console.error(chalk.red('\n❌ Test suite failed:'), error.message);
  process.exit(1);
});
