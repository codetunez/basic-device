import { Mqtt, clientFromConnectionString } from 'azure-iot-device-mqtt';
import { Client } from 'azure-iot-device';
import { ModuleClient, SharedAccessSignature } from 'azure-iot-device';
import { anHourFromNow, ConnectionString } from 'azure-iot-common';
import { Mqtt as MqttDps } from 'azure-iot-provisioning-device-mqtt';
import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key';
import { ProvisioningDeviceClient } from 'azure-iot-provisioning-device';
import * as Crypto from 'crypto';

// Only required when connecting in sas or conn connection modes
const deviceConnString = '';

// Only required when connecting is dps connection mode
const dps = {
    dpsScopeId: '',
    deviceId: '',
    sasKey: '',
    rootKey: false,
    dpsPayload: {}
};

// Only required when needing to add options to the connection client
const options = {};

async function connect(connectType: string) {

    let client = null;

    switch (connectType) {
        case 'module':
            const IOTEDGE_WORKLOADURI = process.env.IOTEDGE_WORKLOADURI;
            const IOTEDGE_DEVICEID = process.env.IOTEDGE_DEVICEID;
            const IOTEDGE_MODULEID = process.env.IOTEDGE_MODULEID;
            const IOTEDGE_MODULEGENERATIONID = process.env.IOTEDGE_MODULEGENERATIONID;
            const IOTEDGE_IOTHUBHOSTNAME = process.env.IOTEDGE_IOTHUBHOSTNAME;
            const IOTEDGE_AUTHSCHEME = process.env.IOTEDGE_AUTHSCHEM;

            if (!IOTEDGE_WORKLOADURI || !IOTEDGE_DEVICEID || !IOTEDGE_MODULEID || !IOTEDGE_MODULEGENERATIONID || !IOTEDGE_IOTHUBHOSTNAME || !IOTEDGE_AUTHSCHEME) { console.error('Not a module'); return; }
            client = await ModuleClient.fromEnvironment(Mqtt);
            break;
        case 'dps':
            const transformedSasKey = dps.rootKey ? computeDerivedSymmetricKey(dps.sasKey, dps.deviceId) : dps.sasKey;
            const provisioningSecurityClient = new SymmetricKeySecurityClient(dps.deviceId, dps.sasKey);
            const provisioningClient = ProvisioningDeviceClient.create('global.azure-devices-provisioning.net', dps.dpsScopeId, new MqttDps(), provisioningSecurityClient);

            provisioningClient.setProvisioningPayload(dps.dpsPayload);
            provisioningClient.register((err: any, result) => {
                if (err) { console.error(err); return; }
                const sas: any = SharedAccessSignature.create(result.assignedHub, result.deviceId, transformedSasKey, anHourFromNow());
                client = Client.fromSharedAccessSignature(sas, Mqtt);
                client.setOptions(options);
            });
            break;
        case 'sas':
            const cn = ConnectionString.parse(deviceConnString);
            const sas: any = SharedAccessSignature.create(cn.HostName, cn.DeviceId, cn.SharedAccessKey, anHourFromNow());

            client = Client.fromSharedAccessSignature(sas, Mqtt);
            client.setOptions(options);
            break;
        case 'conn': {
            client = clientFromConnectionString(deviceConnString);
            client.setOptions(options);
            break;
        }
    }

    mainRunloop(client);
}

async function mainRunloop(client) {
    console.log('Starting device');
    await client.open();
    const twin = await client.getTwin();

    twin.on('properties.desired', (delta: any) => {
        console.log('Received payload: ' + JSON.stringify(delta));
    });

    setInterval(() => {
        const payload = { "randomTelemetry": Math.floor(Math.random() * 100) };
        client.sendEvent(JSON.stringify(payload));
        console.log('Sending telemetry payload: ' + JSON.stringify(payload));
    }, 15000);

    setInterval(() => {
        const payload = { "randomProperty": Math.floor(Math.random() * 100) };
        twin.properties.reported.update(payload, () => {
            console.log('Sending reported payload: ' + JSON.stringify(payload));
        });
    }, 60000);
};

function computeDerivedSymmetricKey(masterKey, regId) {
    return Crypto.createHmac('SHA256', Buffer.from(masterKey, 'base64'))
        .update(regId, 'utf8')
        .digest('base64');
}

connect('module'); // Device connection options: conn|dps|module|sas
