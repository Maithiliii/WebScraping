const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const app = express();
const port = 3000;

// Function to fetch internship details from Internshala for a specific page
async function fetchInternships(pageNumber) {
  const url = `https://internshala.com/internships/page-${pageNumber}`;
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    let internships = [];
    $('div.individual_internship').each((index, element) => {
      const title = $(element).find('h3').text().trim() || 'N/A';
      const company = $(element).find('p.company-name').text().trim() || 'N/A';
      const location = $(element).find('div.row-1-item.locations').text().trim() || 'N/A';
      let stipend = $(element).find('span.stipend').text().trim() || 'N/A';
      stipend = stipend.replace('?', 'INR');
      const link = $(element).attr('data-href') ? "https://internshala.com" + $(element).attr('data-href') : 'N/A';

      // Check for logo URL
      let logo = $(element).find('div.internship_logo img').attr('src') || 'N/A';
      
      // Handle relative URL case
      if (logo && !logo.startsWith('http')) {
        logo = "https://internshala.com" + logo;
      }

      internships.push({
        Title: title,
        Company: company,
        Location: location,
        Stipend: stipend,
        Link: link,
        Logo: logo  // Add logo URL to the data
      });
    });

    return internships;
  } catch (error) {
    console.error('Error fetching internship details:', error);
    return [];
  }
}

// Function to fetch internships from multiple pages (up to a fixed number of pages)
async function fetchAllInternships(numPages) {
  let allInternships = [];

  for (let page = 1; page <= numPages; page++) {
    console.log(`Fetching page ${page}`);
    const internships = await fetchInternships(page);
    if (internships.length === 0) {
      break; // Stop if no internships are found on a page
    }
    allInternships = allInternships.concat(internships);
  }

  return allInternships;
}

// Function to generate HTML content based on filtered internships
async function generateHTML(titleFilter) {
  const internships = await fetchAllInternships(10); // Fetch internships from 10 pages
  const filteredInternships = internships.filter(internship =>
    internship.Title.toLowerCase().includes(titleFilter.toLowerCase())
  );

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scraped Internship Data</title>
        <style>
            .internship-card {
                border: 1px solid #ddd;
                padding: 15px;
                margin: 15px;
                border-radius: 5px;
                width: 300px;
                display: inline-block;
                vertical-align: top;
                text-align: left;
            }
            .internship-title {
                font-size: 1.5em;
                color: #333;
            }
            .internship-company, .internship-location, .internship-stipend {
                margin-top: 5px;
                font-size: 1em;
            }
            .internship-logo {
                margin-bottom: 10px;
            }
            .internship-logo img {
                max-width: 100px; /* Adjust as needed */
                height: auto;
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
        <h1>Scraped Internship Data</h1>
        <form method="get" action="/">
            <label for="title">Enter Internship Title:</label>
            <input type="text" id="title" name="title" required>
            <button type="submit">Search</button>
        </form>
        <div id="internship-container">
            ${filteredInternships.length ? filteredInternships.map(internship => `
            <div class="internship-card">
                <div class="internship-logo">
                    <img src="${internship.Logo}" alt="${internship.Company} Logo">
                </div>
                <h2 class="internship-title">${internship.Title}</h2>
                <p class="internship-company">Company: ${internship.Company}</p>
                <p class="internship-location">Location: ${internship.Location}</p>
                <p class="internship-stipend">Stipend: ${internship.Stipend}</p>
                <a href="${internship.Link}" target="_blank">More Info</a>
            </div>
            `).join('') : '<p>No internships found.</p>'}
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
