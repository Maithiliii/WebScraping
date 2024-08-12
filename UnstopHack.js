const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = 3000;

// Function to fetch hackathon details from the Unstop page
async function fetchHackathons() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://unstop.com/hackathons?filters=,all,all,all&types=teamsize,payment,eligible,oppstatus', { waitUntil: 'networkidle2' });

    // Scrape data
    const hackathons = await page.evaluate(() => {
        const data = [];
        document.querySelectorAll('app-competition-listing').forEach(job => {
            const titleElement = job.querySelector('h2.double-wrap');
            const collegeNameElement = job.querySelector('p');
            const daysLeftElement = job.querySelector('div.seperate_box.align-center.ng-star-inserted');
            const prizeElement = job.querySelector('div.seperate_box.align-center.prize.ng-star-inserted');
            const locationsElement = job.querySelectorAll('div.all_box_wrapper div.location > div');

            const title = titleElement ? titleElement.textContent.trim() : 'N/A';
            const collegeName = collegeNameElement ? collegeNameElement.textContent.trim() : 'N/A';
            const daysLeft = daysLeftElement ? daysLeftElement.textContent.trim().split(' ')[0] + ' days left' : 'N/A';
            const cashPrize = prizeElement ? prizeElement.textContent.trim().replace('🏆', '').trim() : 'N/A';
            const locations = Array.from(locationsElement).map(loc => loc.textContent.trim()).join(', ');

            data.push({ title, collegeName, daysLeft, cashPrize, locations });
        });
        return data;
    });

    await browser.close();
    return hackathons;
}

// Route to serve the HTML content
app.get('/', async (req, res) => {
    try {
        const hackathons = await fetchHackathons();
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Scraped Hackathon Data</title>
                <style>
                    .hackathon-card {
                        border: 1px solid #ddd;
                        padding: 15px;
                        margin: 15px;
                        border-radius: 5px;
                        width: 300px;
                        display: inline-block;
                        vertical-align: top;
                        text-align: left;
                    }
                    .hackathon-title {
                        font-size: 1.5em;
                        color: #333;
                    }
                    .hackathon-college, .hackathon-cash-prize, .hackathon-location {
                        margin-top: 5px;
                        font-size: 1em;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        background-color: #f4f4f4;
                        padding: 20px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <h1>Scraped Hackathon Data</h1>
                <div id="hackathon-container">
                    ${hackathons.length ? hackathons.map(hackathon => `
                    <div class="hackathon-card">
                        <h2 class="hackathon-title">${hackathon.title}</h2>
                        <p class="hackathon-college">College Name: ${hackathon.collegeName}</p>
                        <p class="hackathon-cash-prize">Cash Prize Worth: ${hackathon.cashPrize}</p>
                        <p class="hackathon-location">Location: ${hackathon.locations}</p>
                    </div>
                    `).join('') : '<p>No hackathons found.</p>'}
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send('Error generating the HTML page.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
