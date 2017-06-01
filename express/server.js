var express = require('express');
var app = express();
var port = 3000;

app.use(express.static('../demo'));

app.listen(port, function () {
  console.log("Server is listening on part " + port);
});
