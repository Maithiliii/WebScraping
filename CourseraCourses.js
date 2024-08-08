const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Middleware to parse URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// Function to fetch course details from a single page
async function fetchCoursesFromPage(pageNumber) {
  const url = `https://www.coursera.org/courses?page=${pageNumber}&index=prod_all_products_term_optimization`;
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    let courses = [];
    $('div.css-1evtm7z').each((index, element) => {
      const course_title = $(element).find('h3.cds-CommonCard-title.css-6ecy9b').text().trim();
      const course_organization = $(element).find('p.cds-ProductCard-partnerNames.css-vac8rf').text().trim();
      const course_URL = "https://www.coursera.org" + $(element).find('a.cds-119.cds-113.cds-115.cds-CommonCard-titleLink.css-si869u.cds-142').attr('href');
      const skills = $(element).find('div.cds-CommonCard-bodyContent').text().trim().replace("Skills you'll gain: ", "");
      const course_image_URL = $(element).find('div.cds-CommonCard-previewImage img').attr('src');
      const course_Certificate_type = $(element).find('div.cds-CommonCard-metadata p.css-vac8rf').text().trim();

      courses.push({
        course_title,
        course_URL,
        course_organization,
        skills,
        course_image_URL,
        course_Certificate_type
      });
    });

    return courses;
  } catch (error) {
    console.error('Error fetching course details:', error);
    return [];
  }
}

// Function to fetch courses from multiple pages
async function fetchAllCourses(totalPages) {
  let allCourses = [];
  for (let page = 1; page <= totalPages; page++) {
    console.log(`Fetching page ${page}`);
    const courses = await fetchCoursesFromPage(page);
    allCourses = allCourses.concat(courses);
  }
  return allCourses;
}

// Function to generate HTML content based on filtered courses
async function generateHTML(titleFilter) {
  const totalPages = 10; // Number of pages to scrape
  const courses = await fetchAllCourses(totalPages);

  const filteredCourses = courses.filter(course =>
    course.course_title.toLowerCase().includes(titleFilter.toLowerCase())
  );

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scraped Course Data</title>
        <style>
            .course-card {
                border: 1px solid #ddd;
                padding: 15px;
                margin: 15px;
                border-radius: 5px;
                width: 300px;
                display: inline-block;
                vertical-align: top;
                text-align: left;
            }
            .course-title {
                font-size: 1.5em;
                color: #333;
            }
            .course-organization, .course-certificate-type, .skills {
                margin-top: 5px;
                font-size: 1em;
            }
            .course-image {
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
        <h1>Scraped Course Data</h1>
        <form method="get" action="/">
            <label for="title">Enter Course Title:</label>
            <input type="text" id="title" name="title" required>
            <button type="submit">Search</button>
        </form>
        <div id="course-container">
            ${filteredCourses.length ? filteredCourses.map(course => `
            <div class="course-card">
                <img src="${course.course_image_URL}" alt="Course Image" class="course-image">
                <h2 class="course-title">${course.course_title}</h2>
                <p class="course-organization">Organization: ${course.course_organization}</p>
                <p class="course-certificate-type">Certificate Type: ${course.course_Certificate_type}</p>
                <p class="skills">Skills: ${course.skills}</p>
                <a href="${course.course_URL}" target="_blank">Course Link</a>
            </div>
            `).join('') : '<p>No courses found.</p>'}
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

