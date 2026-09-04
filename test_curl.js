const fs = require('fs');
const crypto = require('crypto');
const http = require('http');

const keyPath = process.env.PIMS_JWT_PRIVATE_KEY_PATH || '/root/pims_keys/pims_jwt_private.pem';

let privateKey;
try {
  privateKey = fs.readFileSync(keyPath, 'utf8');
} catch (e) {
  console.error('Không tìm thấy file RSA Private Key tại:', keyPath);
  process.exit(1);
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateJwt() {
  const header = { alg: 'RS256', typ: 'JWT', kid: 'pims-rsa-2026-01' };
  const payload = {
    iss: 'pims',
    aud: 'daewoo-gw-api',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('SHA256');
  signer.update(signingInput);
  const signature = base64UrlEncode(signer.sign(privateKey));

  return `${signingInput}.${signature}`;
}

const token = generateJwt();

console.log('\n======================================================');
console.log('TOKEN JWT RS256 CỦA BẠN (CÓ HIỆU LỰC 1 GIỜ):');
console.log(token);
console.log('======================================================\n');

const endpoints = [
  'dashboard_pd_overview_1q.jsp',
  'dashboard_pd_costbudget_1q.jsp',
  'dashboard_pd_progress_1q.jsp',
  'dashboard_pd_sales_1q.jsp',
  'dashboard_pd_cashflow_1q.jsp',
  'dashboard_pd_outsourcing_1q.jsp',
  'dashboard_pd_milestones_1q.jsp',
const http = require('http');

console.log('--- CÁC CÂU LỆNH CURL ĐỂ BẠN COPY VÀ TEST THỦ CÔNG (TOMCAT LOCAL) ---');
endpoints.forEach(ep => {
  console.log(`curl -i -X GET "http://127.0.0.1:8087/jsp/Common/dashboard/${ep}" -H "Authorization: Bearer ${token}"`);
});
console.log('------------------------------------------------------\n');

console.log('ĐANG TỰ ĐỘNG CHẠY TEST CALL LẦN LƯỢT TỪNG API VÀO TOMCAT (http://127.0.0.1:8087)...\n');

async function testSequentially() {
  for (const ep of endpoints) {
    await new Promise((resolve) => {
      const startTime = Date.now();
      const req = http.request('http://127.0.0.1:8087/jsp/Common/dashboard/' + ep, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const duration = Date.now() - startTime;
          console.log(`[HTTP ${res.statusCode}] ${ep} - ${duration}ms - Data: ${data.length} bytes`);
          resolve();
        });
      });

      req.on('error', err => {
        const duration = Date.now() - startTime;
        console.error(`[ERROR] ${ep} - ${duration}ms - ${err.message}`);
        resolve();
      });

      req.end();
    });
  }
  console.log('\n==== HOÀN THÀNH TEST DỮ LIỆU ====\n');
}

testSequentially();
