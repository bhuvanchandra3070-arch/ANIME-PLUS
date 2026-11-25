const https = require("https");
const { URLSearchParams } = require("url");

function postJson(url, headers, body) {
    return new Promise((resolve, reject) => {
        const request = https.request(url, { method: "POST", headers }, (response) => {
            let responseBody = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => { responseBody += chunk; });
            response.on("end", () => {
                if (response.statusCode >= 200 && response.statusCode < 300) return resolve(responseBody);
                reject(new Error(`Delivery provider returned HTTP ${response.statusCode}`));
            });
        });
        request.setTimeout(15000, () => request.destroy(new Error("Delivery provider timed out")));
        request.on("error", reject);
        request.write(body);
        request.end();
    });
}

async function sendEmailOtp(email, code) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error("Email OTP delivery is not configured");

    await postJson("https://api.resend.com/emails", {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    }, JSON.stringify({
        from,
        to: [email],
        subject: "Your ANIME.PLUS sign-in code",
        text: `Your ANIME.PLUS verification code is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this message.`
    }));
}

async function sendPhoneOtp(phone, code) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !from) throw new Error("SMS OTP delivery is not configured");

    const body = new URLSearchParams({
        To: phone,
        From: from,
        Body: `Your ANIME.PLUS verification code is ${code}. It expires in 10 minutes.`
    }).toString();
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    await postJson(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body)
    }, body);
}

async function deliverOtp({ target, code, type }) {
    if (type === "email") return sendEmailOtp(target, code);
    return sendPhoneOtp(target, code);
}

function isOtpDeliveryConfigured({ type }) {
    if (type === "email") return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
}

module.exports = { deliverOtp, isOtpDeliveryConfigured };
