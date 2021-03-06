var serin = "";
var bpm_state = "OFF";
var syst, dyast, pulse, measured = false;
var data_state = false;
var repl = "";

// Blinking
function blink(blink_type) {
  switch (blink_type) {
    case 0: //OFF
      clearInterval();
      setInterval(function() {
        digitalPulse(D2, 0, [1000,2000]);
      }, 3000);
      break;
    case 1: //ON
      clearInterval();
      digitalPulse(D2, 1, [10]);
      break;
    case 2: //INF
      clearInterval();
      setInterval(function() {
        digitalPulse(D2, 0, [100,100]);
      }, 200);
      break;
    case 3: //DEF
      clearInterval();
      setInterval(function() {
        digitalPulse(D2, 0, [700,300]);
      }, 1000);
      break;
    case 4: //Data obtained
      clearInterval();
      digitalPulse(D2, 0, [200,200,200,200,200,200]);
      break;
    default:
      clearInterval();
      setInterval(function() {
        digitalPulse(D2, 0, [200,200]);
      }, 400);
    }
}

// Return web-page
function onPageRequest(req, res) {
  var a = url.parse(req.url, true);
  if (measured == false) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    repl = {status: bpm_state};
    res.end(JSON.stringify(repl));
  } else {
    res.writeHead(200, {'Content-Type': 'application/json'});
    repl = {status: bpm_state, systolic: syst, diastolic: dyast, pulse: pulse, taken: measured};
    res.end(JSON.stringify(repl));
  }
}

// On cold boot
E.on('init', function() {
  console.log("Cold booted!");
});

// Connect to WiFi on startup
var wifi = require("Wifi");
if (wifi.getStatus().station != "connected") {
  wifi.setHostname("bpm-monitor");
  wifi.connect("!!!SSIDNAMEHERE!!!", {password:"!!!PASSWORDHERE!!!"}, function(e) {
    if (e) {
      E.setConsole("Serial1");
      console.log('Error during connect:', e);
      wifi.disconnect();
      blink(10); // Default off blink
    } else {
      E.setConsole(null); // Disable console
      console.log('Established connection to WiFi');
      wifi.setSNTP("192.168.30.1", 0);
      wifi.stopAP();
      wifi.save();
      require("http").createServer(onPageRequest).listen(80); // Create web-server
      blink(0); // Default off blink
    }
  });
} else {
  E.setConsole(null); // Disable console
  console.log('Already connected to WiFi');
  require("http").createServer(onPageRequest).listen(80);  // Create web-server
  blink(0); // Default off blink
}

// Serial data
Serial1.setup(9600);
Serial1.on('data', function (data) {
  serin += data;
  var idx = serin.indexOf("\r");
  while (idx >= 0) {
    var cmd = serin.substr(0, idx).trim(); // First cmd before /r
    if (data_state) {
      /* Parse data */
      syst = parseInt("0x" + cmd.substr(3,2)) * 2 + (parseInt("0x" + cmd.substr(5,2)) >> 7);
      dyast = parseInt("0x" + cmd.substr(7,2)) * 2 + (parseInt("0x" + cmd.substr(9,2)) >> 7);
      pulse = parseInt("0x" + cmd.substr(11,2));
      data_state = false; // End data state
      measured = new Date();
      console.log("Acquired data: " + syst + " " + dyast + " " + pulse + " " + measured);
      blink(4);
    } else {
      switch(cmd) {
        case "ON": //ON
          blink(1);
          bpm_state = "ON";
          data_state = false;
          break;
        case "OFF": //OFF
          blink(0);
          bpm_state = "OFF";
          data_state = false;
          break;
        case "CHK": //Checking
          bpm_state = "CHK";
          data_state = false;
          break;
        case "INF": //Inflating
          blink(2);
          bpm_state = "INF";
          data_state = false;
          break;
        case "DEF": //Deflating
          blink(3);
          bpm_state = "DEF";
          data_state = false;
          break;
        case "EXH": //Exhailing
          bpm_state = "EXH";
          data_state = true; // Start data state
          break;
        case "WAI": //Waiting
          blink(1);
          bpm_state = "WAI";
          data_state = false;
          break;
        default: //Unknown
          blink(10);
          bpm_state = "UNK";
          data_state = false;
          console.log("Unknown command: " + cmd);
      }
      console.log(bpm_state);
    }
    serin = serin.substr(idx + 1); // Cut first cmd
    idx = serin.indexOf("\r"); // Search next cmd
  }
});