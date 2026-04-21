#include <Arduino.h>
#include <AccelStepper.h>

const int motorPin1 = 16;
const int motorPin2 = 17;
const int motorPin3 = 18;
const int motorPin4 = 19;

AccelStepper myStepper(AccelStepper::HALF4WIRE, motorPin1, motorPin3, motorPin2, motorPin4);

float targetSpeed = 400.0; 
float targetAcceleration = 200.0;
const int stepsPerRevolution = 4096;

void setup() {
  Serial.begin(115200);
  
  myStepper.setMaxSpeed(1000.0);
  myStepper.setSpeed(targetSpeed);
  myStepper.setAcceleration(targetAcceleration);
  
  Serial.println("Booting SmartShelf in Manual Mode...");
  Serial.println("System Ready. Waiting for START command from Python...");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim(); 

    if (command == "START") {
      Serial.println("Start command received. Beginning scan...");
      
      myStepper.setCurrentPosition(0);

      // Stop 1
      myStepper.runToNewPosition(0);
      delay(500); 
      Serial.println("TRIGGER_CAMERA_1");
      delay(500); 

      // Stop 2
      myStepper.runToNewPosition(1365);
      delay(500);
      Serial.println("TRIGGER_CAMERA_2");
      delay(500);

      // Stop 3
      myStepper.runToNewPosition(2730);
      delay(500);
      Serial.println("TRIGGER_CAMERA_3");
      delay(500);
        
      Serial.println("Scanning Complete."); 
      Serial.println("Ready for next fruit.");
    }
  }
}