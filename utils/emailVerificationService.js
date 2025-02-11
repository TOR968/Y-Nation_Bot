const axios = require("axios");
const cheerio = require("cheerio");
const io = require("socket.io-client");

async function getVerificationCode(email) {
    try {
        const [username, domain] = email.split("@");

        const socket = io("https://generator.email", {
            transports: ["websocket"],
            path: "/socket.io",
        });

        socket.on("connect", () => {
            console.log("Socket connected");
            socket.emit("watch_for_my_email", email.toLowerCase());
        });

        const cookieJar = {
            embx: `[%22${email}%22]`,
            surl: `${domain}/${username}`,
            _ga: "GA1.1.random.timestamp",
            useridis: username,
        };

        const response = await axios.get(`https://generator.email/${domain}/${username}`, {
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "accept-language": "en-US,en;q=0.9",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                cookie: Object.entries(cookieJar)
                    .map(([key, value]) => `${key}=${value}`)
                    .join("; "),
            },
            withCredentials: true,
        });

        const $ = cheerio.load(response.data);

        const verificationTable = $('table[style*="background: rgba(0,0,0,.05)"][style*="border-radius: 4px"]');

        const firstCode = verificationTable.find('p[style*="text-align: right"]').text().trim();
        const secondCode = verificationTable.find('p[style*="text-align: left"]').text().trim();

        if (firstCode && secondCode) {
            const verificationCode = firstCode + secondCode;
            console.log("Verification code found:", verificationCode);
            socket.disconnect();
            return verificationCode;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                socket.disconnect();
                reject(new Error("Timeout waiting for verification code"));
            }, 30000);

            socket.on("new_email", (data) => {
                console.log("New email received:", data);
                clearTimeout(timeout);
                socket.disconnect();
                resolve(extractCodeFromEmail(data));
            });
        });
    } catch (error) {
        console.error("Error reading verification code:", error.message);
        return null;
    }
}

function extractCodeFromEmail(emailData) {
    const $ = cheerio.load(emailData.html);
    const verificationTable = $('table[style*="background: rgba(0,0,0,.05)"][style*="border-radius: 4px"]');
    const firstCode = verificationTable.find('p[style*="text-align: right"]').text().trim();
    const secondCode = verificationTable.find('p[style*="text-align: left"]').text().trim();

    if (firstCode && secondCode) {
        return firstCode + secondCode;
    }
    return null;
}

module.exports = getVerificationCode;
