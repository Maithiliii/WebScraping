const linkedIn = require("./index");

const queryOptions = {
  keyword: "Senior engineer",
  location: "India",
  dateSincePosted: "past Week",
  jobType: "full time",
  remoteFilter: "remote",
  salary: "100000",
  experienceLevel: "entry level",
  limit: "10",
  sortBy: "recent",
};

linkedIn.query(queryOptions).then((response) => {
  console.log(response); // An array of Job objects
});
