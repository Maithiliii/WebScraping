const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const bodyParser = require('body-parser');
const xlsx = require('xlsx');
const app = express();
const port = 3000;

// Middleware to parse URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// Load trusted companies from Excel
const workbook = xlsx.readFile('All_Company_Names.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const companyNames = xlsx.utils.sheet_to_json(sheet, { header: 1 }).flat();

function isTrustedCompany(company) {
  return companyNames.some(trustedName => company.includes(trustedName));
}

// Function to fetch job listings from LinkedIn
async function fetchJobsFromLinkedIn(keywordFilter) {
  const queryOptions = {
    keyword: keywordFilter
  };

  const query = new Query(queryOptions);
  let allJobs = [];
  let resultCount = 1;
  let start = 0;
  let pageCount = 0; // Initialize page counter
  const maxPages = 10; // Limit to 10 pages

  while (resultCount > 0 && pageCount < maxPages) {
    pageCount++; // Increment page counter
    try {
      const { data } = await axios.get(query.url(start));
      const $ = cheerio.load(data);
      const jobs = $("li");

      resultCount = jobs.length;
      console.log("Fetched ", jobs.length, " jobs from page", pageCount);

      const parsedJobs = parseJobList(data);
      allJobs.push(...parsedJobs);

      start += 25;

      // Limit the number of jobs if a limit is set
      if (query.limit && allJobs.length > query.limit) {
        allJobs = allJobs.slice(0, query.limit);
        break;
      }
    } catch (error) {
      console.error('Error fetching job data:', error);
      break;
    }
  }

  console.log("Total pages scraped:", pageCount); // Print total pages scraped
  return allJobs;
}

// Function to parse job listings from HTML
function parseJobList(jobData) {
  const $ = cheerio.load(jobData);
  const jobs = $("li");

  return jobs.map((index, element) => {
    const job = $(element);
    const position = job.find(".base-search-card__title").text().trim() || "";
    const company = job.find(".base-search-card__subtitle").text().trim() || "";
    const location = job.find(".job-search-card__location").text().trim() || "";
    const date = job.find("time").attr("datetime") || "";
    const salaryElement = job.find(".job-search-card__salary-info");
    const salary = salaryElement.length ? salaryElement.text().trim().replace(/\n/g, "").replace(/ /g, "") : "Not specified";
    const jobUrl = job.find(".base-card__full-link").attr("href") || "";
    const companyLogo = job.find(".artdeco-entity-image").attr("data-delayed-url") || "";
    const agoTime = job.find(".job-search-card__listdate").text().trim() || "";

    const trustedText = isTrustedCompany(company) ? "Trusted" : "";

    return {
      position,
      company,
      companyLogo,
      location,
      date,
      agoTime,
      salary,
      jobUrl,
      trustedText,
    };
  }).get();
}

// Query object constructor
function Query(queryObj) {
  this.host = queryObj.host || "www.linkedin.com";
  this.keyword = queryObj.keyword?.trim().replace(" ", "+") || "";
  this.location = queryObj.location?.trim().replace(" ", "+") || "";
  this.dateSincePosted = queryObj.dateSincePosted || "";
  this.jobType = queryObj.jobType || "";
  this.remoteFilter = queryObj.remoteFilter || "";
  this.salary = queryObj.salary || "";
  this.experienceLevel = queryObj.experienceLevel || "";
  this.sortBy = queryObj.sortBy || "";
  this.limit = Number(queryObj.limit) || 0;
}

// Helper functions for Query
Query.prototype.getDateSincePosted = function () {
  const dateRange = {
    "past month": "r2592000",
    "past week": "r604800",
    "24hr": "r86400",
  };
  return dateRange[this.dateSincePosted.toLowerCase()] ?? "";
};

Query.prototype.getExperienceLevel = function () {
  const experienceRange = {
    internship: "1",
    "entry level": "2",
    associate: "3",
    senior: "4",
    director: "5",
    executive: "6",
  };
  return experienceRange[this.experienceLevel.toLowerCase()] ?? "";
};

Query.prototype.getJobType = function () {
  const jobTypeRange = {
    "full time": "F",
    "full-time": "F",
    "part time": "P",
    "part-time": "P",
    contract: "C",
    temporary: "T",
    volunteer: "V",
    internship: "I",
  };
  return jobTypeRange[this.jobType.toLowerCase()] ?? "";
};

Query.prototype.getRemoteFilter = function () {
  const remoteFilterRange = {
    "on-site": "1",
    "on site": "1",
    remote: "2",
    hybrid: "3",
  };
  return remoteFilterRange[this.remoteFilter.toLowerCase()] ?? "";
};

Query.prototype.getSalary = function () {
  const salaryRange = {
    40000: "1",
    60000: "2",
    80000: "3",
    100000: "4",
    120000: "5",
  };
  return salaryRange[this.salary.toLowerCase()] ?? "";
};

Query.prototype.url = function (start) {
  let query = `https://${this.host}/jobs-guest/jobs/api/seeMoreJobPostings/search?`;
  if (this.keyword !== "") query += `keywords=${this.keyword}`;
  if (this.location !== "") query += `&location=${this.location}`;
  if (this.getDateSincePosted() !== "")
    query += `&f_TPR=${this.getDateSincePosted()}`;
  if (this.getSalary() !== "") query += `&f_SB2=${this.getSalary()}`;
  if (this.getExperienceLevel() !== "")
    query += `&f_E=${this.getExperienceLevel()}`;
  if (this.getRemoteFilter() !== "") query += `&f_WT=${this.getRemoteFilter()}`;
  if (this.getJobType() !== "") query += `&f_JT=${this.getJobType()}`;
  query += `&start=${start}`;
  if (this.sortBy == "recent" || this.sortBy == "relevant") {
    let sortMethod = "R";
    if (this.sortBy == "recent") sortMethod = "DD";
    query += `&sortBy=${sortMethod}`;
  }
  return encodeURI(query);
};

// Function to generate HTML content based on filtered job listings
async function generateHTML(keywordFilter) {
  const jobs = await fetchJobsFromLinkedIn(keywordFilter);

  // Generate map markers for job locations
  const mapMarkers = jobs.map(job => job.location ? `L.marker([20.5937, 78.9629]).bindPopup('${job.company}<br>${job.location}').addTo(map);` : '').join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Listings and Map</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                background-color: #f4f4f4;
                padding: 20px;
                text-align: center;
            }
            .job-card {
                border: 1px solid #ddd;
                padding: 15px;
                margin: 15px;
                border-radius: 5px;
                width: 300px;
                display: inline-block;
                vertical-align: top;
                text-align: left;
            }
            .job-title {
                font-size: 1.5em;
                color: #333;
            }
            .job-company, .job-location, .job-date, .job-salary {
                margin-top: 5px;
                font-size: 1em;
            }
            .company-logo {
                width: 50px;
                height: 50px;
                object-fit: contain;
                margin-right: 10px;
            }
            .badge-trusted {
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: green;
                color: white;
                font-weight: bold;
                padding: 5px 10px;
                border-radius: 5px;
                text-transform: uppercase;
            }
            .job-card-container {
                position: relative;
                display: inline-block;
            }
            #map {
                height: 500px;
                margin: 20px auto;
                width: 90%;
            }
        </style>
    </head>
    <body>
        <h1>Search Job Listings</h1>
        <form action="/filter" method="POST">
            <label for="keyword">Search Keyword:</label>
            <input type="text" id="keyword" name="keyword" required>
            <button type="submit">Search</button>
        </form>

        <div id="map"></div>

        <div id="job-listings">
            ${jobs.map(job => `
                <div class="job-card-container">
                    <div class="job-card">
                        <div class="job-title">${job.position}</div>
                        <div class="job-company">
                            ${job.companyLogo ? `<img src="${job.companyLogo}" alt="Company Logo" class="company-logo">` : ''}
                            ${job.company}
                            ${job.trustedText ? '<span class="badge-trusted">Trusted</span>' : ''}
                        </div>
                        <div class="job-location">Location: ${job.location}</div>
                        <div class="job-date">Posted: ${job.agoTime}</div>
                        <div class="job-salary">Salary: ${job.salary}</div>
                        <a href="${job.jobUrl}" target="_blank">View Job</a>
                    </div>
                </div>
            `).join('')}
        </div>

        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const map = L.map('map').setView([20.5937, 78.9629], 5); // Center on India
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                ${mapMarkers} // Add all map markers here
            });
        </script>
    </body>
    </html>
  `;
}

// Define the root URL (/) route to show the search form
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to the Job Listings Portal</h1>
    <form action="/filter" method="POST">
      <label for="keyword">Search Keyword:</label>
      <input type="text" id="keyword" name="keyword" required>
      <button type="submit">Search</button>
    </form>
  `);
});

// Define the /filter endpoint for handling keyword search
app.post('/filter', async (req, res) => {
  const keywordFilter = req.body.keyword;
  const htmlContent = await generateHTML(keywordFilter);
  res.send(htmlContent);
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
