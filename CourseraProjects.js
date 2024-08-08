const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Middleware to parse URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// Function to fetch project details from a single page
async function fetchProjectsFromPage(pageNumber) {
  const url = `https://www.coursera.org/courses?productTypeDescription=Projects&productTypeDescription=Guided%20Projects&sortBy=BEST_MATCH&index=prod_all_products_term_optimization&page=${pageNumber}`;
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    let projects = [];
    $('div.css-1evtm7z').each((index, element) => {
      const project_title = $(element).find('h3.cds-CommonCard-title.css-6ecy9b').text().trim();
      const project_organization = $(element).find('p.cds-ProductCard-partnerNames.css-vac8rf').text().trim();
      const project_URL = "https://www.coursera.org" + $(element).find('a.cds-119.cds-113.cds-115.cds-CommonCard-titleLink.css-si869u.cds-142').attr('href');
      const skills = $(element).find('div.cds-CommonCard-bodyContent').text().trim().replace("Skills you'll gain: ", "");
      const project_image_URL = $(element).find('div.cds-CommonCard-previewImage img').attr('src');
      const project_Certificate_type = $(element).find('div.cds-CommonCard-metadata p.css-vac8rf').text().trim();

      projects.push({
        project_title,
        project_URL,
        project_organization,
        skills,
        project_image_URL,
        project_Certificate_type
      });
    });

    return projects;
  } catch (error) {
    console.error('Error fetching project details:', error);
    return [];
  }
}

// Function to fetch projects from multiple pages
async function fetchAllProjects(totalPages) {
  let allProjects = [];
  for (let page = 1; page <= totalPages; page++) {
    console.log(`Fetching page ${page}`);
    const projects = await fetchProjectsFromPage(page);
    allProjects = allProjects.concat(projects);
  }
  return allProjects;
}

// Function to generate HTML content based on filtered projects
async function generateHTML(titleFilter) {
  const totalPages = 10; // Number of pages to scrape
  const projects = await fetchAllProjects(totalPages);

  const filteredProjects = projects.filter(project =>
    project.project_title.toLowerCase().includes(titleFilter.toLowerCase())
  );

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scraped Project Data</title>
        <style>
            .project-card {
                border: 1px solid #ddd;
                padding: 15px;
                margin: 15px;
                border-radius: 5px;
                width: 300px;
                display: inline-block;
                vertical-align: top;
                text-align: left;
            }
            .project-title {
                font-size: 1.5em;
                color: #333;
            }
            .project-organization, .project-certificate-type, .skills {
                margin-top: 5px;
                font-size: 1em;
            }
            .project-image {
                max-width: 100%;
                height: auto;
                object-fit: contain;
                display: block;
                margin: 0 auto;
                max-height: 200px;
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
        <h1>Scraped Project Data</h1>
        <form method="get" action="/">
            <label for="title">Enter Project Title:</label>
            <input type="text" id="title" name="title" required>
            <button type="submit">Search</button>
        </form>
        <div id="project-container">
            ${filteredProjects.length ? filteredProjects.map(project => `
            <div class="project-card">
                <img src="${project.project_image_URL}" alt="Project Image" class="project-image">
                <h2 class="project-title">${project.project_title}</h2>
                <p class="project-organization">Organization: ${project.project_organization}</p>
                <p class="project-certificate-type">Certificate Type: ${project.project_Certificate_type}</p>
                <p class="skills">Skills: ${project.skills}</p>
                <a href="${project.project_URL}" target="_blank">Project Link</a>
            </div>
            `).join('') : '<p>No projects found.</p>'}
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
