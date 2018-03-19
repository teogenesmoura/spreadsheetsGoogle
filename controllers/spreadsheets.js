var {google} = require('googleapis');
var ChartjsNode = require('chartjs-node');
var fileName = 'testImage.png';
var pathOfFile = __dirname + '/' + fileName;
/**
* Contacts the Google API and generates a token for our application
*/
exports.authenticate = function(client,req,res) {
  var code = req.query.code;
  client.getToken(code, (err, tokens) => {
    if (err) {
      console.error('Error getting oAuth tokens:');
      throw err;
    }
    client.credentials = tokens;
    listCollectives(client)
    .then(collectives => {
      return generateCharts(collectives)
    })
    .then(() => {
      res.sendFile(pathOfFile);
    });
  });
}
/**
 * Returns data from a given spreadsheeet in JSON format
 * @params auth -
 * @return 
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */
var listCollectives = function(auth) {
  var collectivesPromise = new Promise(function(resolve, reject) {
    var sheets = google.sheets('v4');
    sheets.spreadsheets.values.get({
      auth: auth,
      spreadsheetId: '1yesZHlR3Mo0qpuH7VTFB8_zyl6p_H-b1khh-wlB3O_Q',
      range: 'A:S'
    }, (err, res) => {
      if (err) {
        console.error('The API returned an error.');
        reject(err);
      }
      var rows = res.data.values;
      if (rows.length === 0) {
        console.log('No data found.');
      } else {
        resolve(rows);
      }
    });
  });
  return collectivesPromise;
}

var generateCharts = function(rows) {
  var chartNode = new ChartjsNode(600, 600);
  var data = [rows[2][8], rows[2][9], rows[2][10], rows[2][11]];
  var label = rows[0][16]; // INSTAGRAM
  var labels = [
          rows[1][8], // Tweets
          rows[1][9], // Seguindo
          rows[1][10], // Seguidores
          rows[1][11], // Curtidas
        ];
  var label = rows[0][16]; //INSTAGRAM
  var config = {
      type: 'pie',
      data: {
        datasets: [{
          data: data,
          backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f","#e8c3b9"],
          label: label 
        }],
        labels: labels
      },
      options: {
        responsive: true
      }
    };
  return chartNode.drawChart(config)
  .then(() => {
    // chart is created
    // get image as png buffer
    return chartNode.getImageBuffer('image/png');
  })
  .then(buffer => {
    Array.isArray(buffer) // => true
    // as a stream
    return chartNode.getImageStream('image/png');
  })
  .then(streamResult => {
    // using the length property you can do things like
    // directly upload the image to s3 by using the
    // stream and length properties
    streamResult.stream // => Stream object
    streamResult.length // => Integer length of stream
    // write to a file
    return chartNode.writeImageToFile('image/png', pathOfFile);
  });
}