#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// WiFi credentials
const char* ssid = "DITO_KA 2.4";
const char* password = "16089339";

// Firebase
const String FIREBASE_URL = "https://gui-hosting-default-rtdb.firebaseio.com/devices/sensors.json?auth=76nLJDuGhomPzXwn0tdPDwUSORpnTKKd2H04ei6g";

// Google Sheets via Apps Script
const char* googleScriptUrl = "https://script.google.com/macros/s/AKfycbzzAU03s4A4DNS6_DcAdjOP2pm1FIfy_mktpzvpLb9BRANx4StdkEC7k-5eVo3j2_HG/exec";

Adafruit_SHT4x sht4 = Adafruit_SHT4x();
const int I2C_SDA_PIN = 8;
const int I2C_SCL_PIN = 9;
const int mq3Pin = 1;
const int mq135Pin = 2;

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("\n*** SmartShelf ESP32 System Starting ***");

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  bool i2c_status = Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 100000);
  if (!i2c_status) {
    Serial.println("I2C Initialization Failed");
  } else {
    Serial.println("I2C Bus Started");
  }

  if (!sht4.begin(&Wire)) {
    Serial.println("SHT40 sensor not found at expected address");
  } else {
    Serial.println("SHT40 sensor detected");
    sht4.setPrecision(SHT4X_HIGH_PRECISION);
    sht4.setHeater(SHT4X_NO_HEATER);
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    sensors_event_t humidity, temp;
    float t_val = 0.0, h_val = 0.0;
    String tempStr = "ERR";
    String humStr = "ERR";

    if (sht4.getEvent(&humidity, &temp)) {
      t_val = temp.temperature;
      h_val = humidity.relative_humidity;
      tempStr = String(t_val);
      humStr = String(h_val);
    }

    int mq3Value = analogRead(mq3Pin);
    int mq135Value = analogRead(mq135Pin);

    // --- 1. Send to Firebase ---
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

    Serial.println("Sending Payload to Firebase: " + jsonPayload);

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient https;
    https.begin(client, FIREBASE_URL);
    https.addHeader("Content-Type", "application/json");
    int httpResponseCode = https.PATCH(jsonPayload);
    if (httpResponseCode > 0) {
      Serial.println("Firebase Updated! Code: " + String(httpResponseCode));
    } else {
      Serial.println("Error connecting to Firebase: " + String(httpResponseCode));
    }
    https.end();

    // --- 3. Send to Google Sheets ---
    WiFiClientSecure secureClient;
    secureClient.setInsecure();
    HTTPClient httpGoogle;
    String googleUrl = String(googleScriptUrl) + "?temp=" + tempStr + "&hum=" + humStr + "&mq3=" + String(mq3Value) + "&mq135=" + String(mq135Value);
    httpGoogle.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    httpGoogle.begin(secureClient, googleUrl);
    int httpCodeGoogle = httpGoogle.GET();
    if (httpCodeGoogle > 0) {
      Serial.print("Google Sheets HTTP Response code: ");
      Serial.println(httpCodeGoogle);
    } else {
      Serial.print("Google Sheets Error code: ");
      Serial.println(httpCodeGoogle);
    }
    httpGoogle.end();

  } else {
    Serial.println("WiFi Disconnected");
  }

  delay(60000); // Wait 60 seconds before next update
}