var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , twilio = require('twilio')
  , fullcontact = require("fullcontact-api")(process.env.FULLCONTACT_API_KEY);

server.listen(3000);

app.use(express.bodyParser());

app.get('/', function(req, res) {
  res.render('index.ejs');
});

app.post('/client', function(req, res) {
  var capability = new twilio.Capability(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
  );

  capability.allowClientIncoming(req.body.name);
  capability.allowClientOutgoing(process.env.TWILIO_APP_SID);
  res.render('client.ejs', {
      token: capability.generate(),
      phone_number: process.env.TWILIO_PHONE_NUMBER
  });
});
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
    this.client('screenpopdemo');
  });
  res.set('Content-Type', 'text/xml');
  res.send(resp.toString());

});
// io.sockets.on('connection', function(socket) {
//   console.log('socket.io connected');
//   socket.on('register', function(data) {
//     var code = speakeasy.totp({key: 'abc123'});
//     users.get(data.phone_number, function (geterr, doc, key) {
//       if (geterr) {
//         createUser(data.phone_number, code, socket);
//       }
//       else if (checkVerified(socket, doc.verified, data.phone_number) == false) {
//         socket.emit('update', {message: "You have already requested a verification code for that number!"});
//         socket.emit('code_generated');
//       }
//     });

//   });

//   socket.on('verify', function(data) {
//     users.get(data.phone_number, function (geterr, doc, key) {
//       if (geterr) {
//         socket.emit('reset');
//         socket.emit('update', {message: "You have not requested a verification code for " + data.phone_number + " yet!"});
//       }
//       else if (checkVerified(socket, doc.verified, data.phone_number) == false && doc.code == parseInt(data.code)) {
//         socket.emit('verified');
//         socket.emit('update', {message: "You have successfully verified " + data.phone_number + "!"});
//         users.save(data.phone_number, {code: parseInt(data.code), verified: true}, function (saverr) { if (saverr) { throw saverr; }});
//       }
//       else {
//         socket.emit('update', {message: "Invalid verification code!"});
//       }
//     });

//   });
// });

