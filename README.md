# basic-device

This codebase can be used as a starter for creating a simulated device to connect on an Azure IoT Hub. It contains a base implement for sending telemetry and sending/receiving a twin and connection options. After cloning this repo ...

## Install the node packages
```
npm ci
```

## Update code

Line 99;
```
connect('conn');
```
Select on of the following options
- module; Use this device as an Edge module. No other code change required
- dps; Use DPS to connect with SaS. Update *dps* in the code
- sas; Use a device connection string and sas token. Update *deviceConnString* in the code
- conn; Use a device connection string. Update *deviceConnString* in the code

## Build the code
```
npm run build
```

## Run the device
```
npm run start
```

## Dependencies
Install these packages before building this repo
```
npm i typescript -g
```