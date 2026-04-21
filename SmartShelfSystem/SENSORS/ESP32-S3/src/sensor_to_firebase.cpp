#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h> // REQUIRED FOR FIREBASE HTTPS

const char* ssid = "DITO_KA 2.4";
const char* password = "16089339";

// Your exact Firebase Database URL + the exact node we want to update (.json is required for REST API)
const String FIREBASE_URL = "https://gui-hosting-default-rtdb.firebaseio.com/devices/sensors.json?auth=76nLJDuGhomPzXwn0tdPDwUSORpnTKKd2H04ei6g";

Adafruit_SHT4x sht4 = Adafruit_SHT4x();
const int I2C_SDA_PIN = 8;
const int I2C_SCL_PIN = 9;
const int mq3_tray1_pin = 1;
const int mq135_tray1_pin = 2;

void setup() {
  Serial.begin(115200);
  delay(2000); 
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 100000);
  sht4.begin(&Wire);
  sht4.setPrecision(SHT4X_HIGH_PRECISION);
  sht4.setHeater(SHT4X_NO_HEATER);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    sensors_event_t humidity, temp;
    float t_val = 0.0, h_val = 0.0;
    
    if (sht4.getEvent(&humidity, &temp)) {
      t_val = temp.temperature;
      h_val = humidity.relative_humidity;
    }

    int mq3Value = analogRead(mq3_tray1_pin);
    int mq135Value = analogRead(mq135_tray1_pin);

    // Example of how the ESP32 string will look:
    String jsonPayload = "{";
    jsonPayload += "\"sht40\": {";
    jsonPayload += "\"temperature\": " + String(t_val) + ",";
    jsonPayload += "\"humidity\": " + String(h_val);
    jsonPayload += "},";
    jsonPayload += "\"mqseries\": {";
    jsonPayload += "\"tray1_mq3_ppm\": " + String(mq3Value) + ",";
    jsonPayload += "\"tray1_mq135_ppm\": " + String(mq135Value);
    jsonPayload += "}";
    jsonPayload += "}";

    Serial.println("Sending Payload: " + jsonPayload);

    // Connect to Firebase using secure WiFi
    WiFiClientSecure client;
    client.setInsecure(); // Bypasses SSL certificate validation for DIY IoT
    
    HTTPClient https;
    https.begin(client, FIREBASE_URL);
    https.addHeader("Content-Type", "application/json");
    
    // Use PATCH to update the values without deleting the whole database
    int httpResponseCode = https.PATCH(jsonPayload); 
    
    if (httpResponseCode > 0) {
      Serial.println("Firebase Updated! Code: " + String(httpResponseCode));
    } else {
      Serial.println("Error connecting to Firebase: " + String(httpResponseCode));
    }
    
    https.end();
  }
  
  delay(10000); // Wait 10 seconds before updating the cloud again
}