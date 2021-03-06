# BPM-AppleHealth
##Custom code for ESP8266 microcontroller running Espruino http://www.espruino.com/EspruinoESP8266 firmware.

This code reads Omron M6 blood pressure monitor data from serial port (UART) and once a measurement is complete expose the data in JSON format via a web-server. Apple Shortcut can be used to access the web-server, retrive JSON and store data in Apple HealthKit
