var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , twilio = require('twilio')
  , fullcontact = require("fullcontact-api")(process.env.FULLCONTACT_API_KEY);

server.listen(3000);

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: '1234567890QWERTY'}));

app.get('/', function(req, res) {
  if(req.session.clientName) {
    res.redirect('/client');
  }
  else {
    res.render('index.ejs');
  }
});

function clientRoute(req, res) {
  var capability = new twilio.Capability(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
  );
  if(!req.session.clientName) {
    req.session.clientName = req.body.name;
  }
  capability.allowClientIncoming(req.session.clientName);
  capability.allowClientOutgoing(process.env.TWILIO_APP_SID);
  res.render('client.ejs', {
      token: capability.generate(),
      phone_number: process.env.TWILIO_PHONE_NUMBER
  });
}

app.post('/client', clientRoute);
app.get('/client', clientRoute);

io.sockets.on('connection', function(socket) {
  console.log('socket.io connected');
  socket.on('incoming', function(caller) {
    fullcontact.person.findByPhone(caller, "US", function(err, person) {
      var details = {
        number: caller,
        name: person.contactInfo.fullName,
        photo: person.photos[0].url
      }
      socket.emit('foundPerson', details);
    });
  });
});

app.post('/incoming', function(req, res) {

  var resp = new twilio.TwimlResponse();

  resp.dial(function() {
    this.client(req.body.clientName);
  });
  res.set('Content-Type', 'text/xml');
  res.send(resp.toString());

});