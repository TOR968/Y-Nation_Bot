const axios = require('axios');
const fs = require('fs').promises;

function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function getRandomDomain() {
    try {
        const vowels = 'aeiou';
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        const keyword = 
            consonants[Math.floor(Math.random() * consonants.length)] + 
            vowels[Math.floor(Math.random() * vowels.length)];

        console.log("🚀 ~ getRandomDomain ~ keyword:", keyword)
        const response = await axios.get(`https://generator.email/search.php?key=${keyword}`, {
            headers: {
                'accept': '/',
                'accept-language': 'en-US,en;q=0.9',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const domains = response.data.filter(domain => 
            [...domain].every(char => char.charCodeAt(0) < 128)
        );

        if (domains.length > 0) {
            return domains[Math.floor(Math.random() * domains.length)];
        }
        return null;
    } catch (error) {
        console.error('Error getting domain:', error.message);
        return null;
    }
}

async function generateEmail() {
    const domain = await getRandomDomain();
    if (!domain) {
        throw new Error('Could not get valid domain');
    }

    const username = generateRandomString(10);
    const email = `${username}@${domain}`;

    await fs.appendFile('emails.txt', `https://generator.email/${email}\n`);

    return email;
}

module.exports = generateEmail;