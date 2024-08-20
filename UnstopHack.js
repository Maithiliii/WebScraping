const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Middleware to parse URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// Function to fetch hackathons from a single page
async function fetchHackathonsFromPage(pageNumber) {
  const url = `https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=${pageNumber}`;
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    console.error('Error fetching hackathon details:', error);
    return { data: { data: [] } };
  }
}

// Function to parse and print hackathon details
function parseHackathons(hackathons) {
  return hackathons.map(hackathon => {
    const title = hackathon.title || 'N/A';
    const collegeName = hackathon.organisation ? hackathon.organisation.name : 'N/A';
    const seoUrl = hackathon.seo_url || 'N/A';
    const logoUrl = hackathon.logoUrl2 || '';

    // Extract days left from remain_days field
    const daysLeft = hackathon.regnRequirements ? hackathon.regnRequirements.remain_days : 'N/A';

    return `
      <div class="hackathon-card">
        <img src="${logoUrl}" alt="Logo" class="hackathon-logo">
        <h2 class="hackathon-title">${title}</h2>
        <p class="hackathon-college">College: ${collegeName}</p>
        <p class="hackathon-seo-url">More Info: <a href="${seoUrl}" target="_blank">${seoUrl}</a></p>
        <p class="hackathon-days-left">Days Left: ${daysLeft}</p>
      </div>
    `;
  }).join('');
}

// Function to fetch hackathons from multiple pages
async function fetchAllHackathons(totalPages) {
  let allHackathons = [];
  for (let page = 1; page <= totalPages; page++) {
    console.log(`Fetching page ${page}`);
    const data = await fetchHackathonsFromPage(page);
    allHackathons = allHackathons.concat(data.data.data);
  }
  return allHackathons;
}

// Function to generate HTML content based on filtered hackathons
async function generateHTML(titleFilter) {
  const totalPages = 5; // Number of pages to scrape
  const hackathons = await fetchAllHackathons(totalPages);

  console.log('Total hackathons fetched:', hackathons.length);

  // Filter for live hackathons and by title, and ensure Days Left is not 'Ended'
  const filteredHackathons = hackathons.filter(hackathon => {
    const isLive = hackathon.status === 'LIVE';
    const daysLeft = hackathon.regnRequirements ? hackathon.regnRequirements.remain_days : 'N/A';
    const matchesTitle = hackathon.title.toLowerCase().includes(titleFilter.toLowerCase());
    console.log(`Hackathon '${hackathon.title}' - Status: ${hackathon.status}, Days Left: ${daysLeft}, Matches Title: ${matchesTitle}`);
    return isLive && matchesTitle && daysLeft.toLowerCase() !== 'ended';
  });

  console.log('Filtered hackathons:', filteredHackathons.length);

  return `
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
            .hackathon-college, .hackathon-seo-url, .hackathon-days-left {
                margin-top: 5px;
                font-size: 1em;
            }
            .hackathon-logo {
                max-width: 100%;
                height: auto;
                object-fit: contain;
                display: block;
                margin: 0 auto;
                max-height: 100px;
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
        <form method="get" action="/">
            <label for="title">Enter Hackathon Title:</label>
            <input type="text" id="title" name="title" required>
            <button type="submit">Search</button>
        </form>
        <div id="hackathon-container">
            ${filteredHackathons.length ? parseHackathons(filteredHackathons) : '<p>No hackathons found.</p>'}
        </div>
    </body>
    </html>
  `;
}

// Route to serve the HTML content
app.get('/', async (req, res) => {
  const titleFilter = req.query.title || ''; // Get title from query parameter
  try {
    const htmlContent = await generateHTML(titleFilter);
    res.send(htmlContent);
  } catch (error) {
    res.status(500).send('Error generating the HTML page.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
