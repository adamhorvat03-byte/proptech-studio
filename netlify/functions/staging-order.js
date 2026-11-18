const nodemailer = require('nodemailer');

const RECIPIENT = process.env.GMAIL_USER || 'adam.horvat03@gmail.com';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const clean = (v, max = 500) => String(v || '').trim().slice(0, max);

function parseBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';
  return JSON.parse(raw || '{}');
}

function extractBase64(item) {
  if (!item) return null;
  const rawStr = typeof item === 'string'
    ? item
    : (item.base64 || item.data || item.content || '');
  if (!rawStr) return null;
  // Odstránime prípadný data URL prefix (napr. "data:image/jpeg;base64,")
  const cleaned = String(rawStr).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
  return cleaned || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metóda nie je povolená (Method Not Allowed).' }),
    };
  }

  let data;
  try {
    data = parseBody(event);
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Neplatný formát JSON dát v požiadavke.' }),
    };
  }

  // Honeypot ochrana proti spam robotom
  if (data.website_url_hp) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  const agentName = clean(data.agentName || data.name || data.agency, 160);
  const email = clean(data.email, 160);
  const roomType = clean(data.roomType, 100) || 'Obývačka';
  const style = clean(data.style, 100) || 'Škandinávsky';
  const mode = clean(data.mode, 140) || 'Zariadiť prázdnu miestnosť';
  const notes = clean(data.notes, 1500) || 'Bez špeciálnej poznámky';
  const selectedPlan = clean(data.plan, 120) || 'Štandardná objednávka';

  if (!agentName || !email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Prosím, vyplňte meno makléra / názov realitnej kancelárie a e-mail.',
      }),
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Zadajte prosím platnú e-mailovú adresu.' }),
    };
  }

  const rawImages = Array.isArray(data.images)
    ? data.images.slice(0, 4)
    : Array.isArray(data.photos)
    ? data.photos.slice(0, 4)
    : [];

  const attachments = [];
  rawImages.forEach((imgItem, idx) => {
    const base64Data = extractBase64(imgItem);
    if (base64Data) {
      attachments.push({
        filename: `izba-${idx + 1}.jpg`,
        content: base64Data,
        encoding: 'base64',
        contentType: 'image/jpeg',
      });
    }
  });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Chýbajú premenné prostredia GMAIL_USER alebo GMAIL_APP_PASSWORD');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'E-mailový server nie je nakonfigurovaný (chýbajú GMAIL_USER / GMAIL_APP_PASSWORD).',
      }),
    };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const dateFormatted = new Date().toLocaleString('sk-SK', {
    timeZone: 'Europe/Bratislava',
  });

  const row = (label, value) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;color:#475569;width:38%;vertical-align:top;font-weight:600;font-size:14px">${label}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:15px">${value}</td>
    </tr>`;

  const html = `
  <div style="background:#F8FAFC;padding:28px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.06)">
      <div style="background:#0F172A;color:#FFFFFF;padding:24px 28px;border-bottom:4px solid #D97706">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#FBBF24;font-weight:700;margin-bottom:6px">PropTech Studio • AI Virtual Staging</div>
        <h1 style="margin:0;font-size:21px;font-weight:700;color:#FFFFFF">Nová objednávka AI Staging – ${escapeHtml(agentName)}</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#94A3B8">Prijaté: ${escapeHtml(dateFormatted)}</p>
      </div>

      <table style="width:100%;border-collapse:collapse">
        ${row('Maklér / Realitná kancelária', `<strong>${escapeHtml(agentName)}</strong>`)}
        ${row('E-mail pre doručenie', `<a href="mailto:${escapeHtml(email)}" style="color:#D97706;font-weight:600;text-decoration:none">${escapeHtml(email)}</a>`)}
        ${row('Zvolený balík / tarifa', escapeHtml(selectedPlan))}
        ${row('Typ miestnosti', `<span style="background:#F1F5F9;padding:3px 8px;border-radius:4px;font-weight:600">${escapeHtml(roomType)}</span>`)}
        ${row('Štýl zariadenia', `<span style="background:#FEF3C7;color:#92400E;padding:3px 8px;border-radius:4px;font-weight:700">${escapeHtml(style)}</span>`)}
        ${row('Režim úpravy', escapeHtml(mode))}
        ${row('Poznámka makléra', `<div style="white-space:pre-wrap;line-height:1.5">${escapeHtml(notes)}</div>`)}
        ${row('Priložené fotografie', `<strong>${attachments.length} ks</strong> (skomprimované v prílohe ako <code>izba-1.jpg</code> atď.)`)}
      </table>

      <div style="background:#F8FAFC;padding:18px 28px;color:#334155;font-size:13px;border-top:1px solid #E2E8F0">
        <strong>Tip na rýchle vybavenie:</strong> Stiahnite priložené fotky <code>izba-1.jpg</code>..., spracujte ich a odpovedzte priamo na tento e-mail (Reply-To je nastavené na <strong>${escapeHtml(email)}</strong>).
      </div>
    </div>
  </div>`;

  const text = [
    `Nová objednávka AI Staging – ${agentName}`,
    `================================================`,
    `Maklér / Realitná kancelária: ${agentName}`,
    `E-mail pre doručenie: ${email}`,
    `Zvolený balík: ${selectedPlan}`,
    `Typ miestnosti: ${roomType}`,
    `Štýl zariadenia: ${style}`,
    `Režim úpravy: ${mode}`,
    `Poznámka k úprave: ${notes}`,
    `Počet priložených fotiek: ${attachments.length}`,
    `Čas prijatia: ${dateFormatted}`,
  ].join('\n');

  try {
    await transporter.sendMail({
      from: `"PropTech Studio – AI Staging" <${process.env.GMAIL_USER}>`,
      to: RECIPIENT,
      replyTo: email,
      subject: `Nová objednávka AI Staging – ${agentName}`,
      text,
      html,
      attachments,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Objednávka bola úspešne odoslaná.',
        attachmentsCount: attachments.length,
      }),
    };
  } catch (err) {
    console.error('Chyba pri odosielaní AI Staging objednávky:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Odoslanie e-mailu zlyhalo. Skontrolujte nastavenia SMTP alebo skúste znova.',
      }),
    };
  }
};
