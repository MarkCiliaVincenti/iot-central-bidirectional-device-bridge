import anyTest, { TestInterface } from 'ava';
import { v4 } from 'uuid';
import { DeviceCredentials, DeviceTemplate } from './utility/publicAPI';
import { setup, TestContext } from './utility/setup';
import * as util from 'util';
import * as fs from 'fs';
import DeviceClient from './utility/device';
import { sleep, makeString } from './utility/helpers';
import got from 'got/dist/source';

const test = anyTest as TestInterface<{
    ctx: TestContext;
    device: DeviceClient;
    template: DeviceTemplate;
}>;

test.before(async t => {
    t.context.ctx = await setup(t);

    var deviceTemplate = JSON.parse(
        await util.promisify(fs.readFile)(
            './data/deviceTemplates/basic.json',
            'utf-8'
        )
    );

    t.context.template = deviceTemplate;

    await t.context.ctx.publicAPI.createDeviceTemplate(t, deviceTemplate);

    var device = await t.context.ctx.publicAPI.createDevice(t, {
        id: v4(),
        displayName: 'Basic Telemetry Device',
        instanceOf: deviceTemplate.id,
        simulated: false,
    });

    let creds: DeviceCredentials | undefined;
    for (let i = 0; i < 5; i += 1) {
        creds = await t.context.ctx.publicAPI.getDeviceCredentials(
            t,
            device.id
        );
        if (creds.symmetricKey) {
            // Sometimes the credentials have no symmetric key. This is
            // generally just a race condition.
            t.log(`Received device credentials for device ${device.id}`);
            break;
        }

        t.log(
            `Received device credentials response with no symmetric key. Retrying...`
        );
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (!creds || !creds.symmetricKey) {
        t.fail('invalid credentials');
        return;
    }

    t.context.device = await DeviceClient.create(
        device.id,
        creds.idScope,
        creds.symmetricKey.primaryKey
    );
});

test.afterEach(async t => {
    // Make sure there are no lingering echos
    await t.context.ctx.deviceBridgAPI.deleteEcho(t, t.context.device.id);
    // Allow for all subs to finish deleting ect
    await sleep(3000);
});

test.after(async t => {
    await t.context.ctx.publicAPI.deleteDevice(t, t.context.device.id);
});

test.serial('Test device command callback', async t => {
    // Create subscription to Azure Function
    const callbackUrl = `${t.context.ctx.callbackUrl}&deviceId=${t.context.device.id}`;
    await t.context.ctx.deviceBridgAPI.createCMDSubscription(
        t,
        t.context.device.id,
        callbackUrl
    );
    await sleep(5000);
    // Ensure get works
    var response = await t.context.ctx.deviceBridgAPI.getCMDSubscription(
        t,
        t.context.device.id
    );
    t.is(response.body.callbackUrl, callbackUrl);
    t.is(response.body.status, 'Running');
    await t.context.ctx.publicAPI.executeCommand(t, t.context.device.id, 'cmd');
    var cmdInvocationValue = await t.context.ctx.deviceBridgAPI.getEcho(
        t,
        t.context.device.id
    );
    var cmdInvocationValueBody = JSON.parse(cmdInvocationValue.body);
    t.is('cmd', cmdInvocationValueBody.methodName);
    t.is('DirectMethodInvocation', cmdInvocationValueBody.eventType);
    t.is(t.context.device.id, cmdInvocationValueBody.deviceId);
    await t.context.ctx.deviceBridgAPI.deleteCMDSubscription(
        t,
        t.context.device.id
    );
});

test.serial('Test C2D callback', async t => {
    // Create subscription to Azure Function
    const callbackUrl = `${t.context.ctx.callbackUrl}&deviceId=${t.context.device.id}`;
    await t.context.ctx.deviceBridgAPI.createC2DSubscription(
        t,
        t.context.device.id,
        callbackUrl
    );
    await sleep(5000);
    // Ensure get works
    var response = await t.context.ctx.deviceBridgAPI.getC2DSubscription(
        t,
        t.context.device.id
    );
    t.is(response.body.callbackUrl, callbackUrl);
    t.is(response.body.status, 'Running');
    await t.context.ctx.publicAPI.executeCommand(t, t.context.device.id, 'c2d');
    var cmdInvocationValue = await t.context.ctx.deviceBridgAPI.getEcho(
        t,
        t.context.device.id
    );
    var cmdInvocationValueBody = JSON.parse(
        (cmdInvocationValue.body as string).replace('@', '{}')
    );
    t.is('c2d', cmdInvocationValueBody.properties['method-name']);
    t.is('C2DMessage', cmdInvocationValueBody.eventType);
    t.is(t.context.device.id, cmdInvocationValueBody.deviceId);
    await t.context.ctx.deviceBridgAPI.deleteC2DSubscription(
        t,
        t.context.device.id
    );
});

test.serial('Test device connection status callback and get', async t => {
    // Get connection status
    var initialConnectionStatus = await t.context.ctx.deviceBridgAPI.getConnectionStatus(
        t,
        t.context.device.id
    );
    t.is('Disabled', initialConnectionStatus.body.status);

    // Create subscription to Azure Function
    const callbackUrl = `${t.context.ctx.callbackUrl}&deviceId=${t.context.device.id}`;
    await t.context.ctx.deviceBridgAPI.createConnectionStatusSubscription(
        t,
        t.context.device.id,
        callbackUrl
    );
    await sleep(3000);
    // Ensure get works
    var response = await t.context.ctx.deviceBridgAPI.getConnectionStatusSubscription(
        t,
        t.context.device.id
    );
    t.is(callbackUrl, response.body.callbackUrl);

    // Ensure connection created event when a sub created
    await t.context.ctx.deviceBridgAPI.createCMDSubscription(
        t,
        t.context.device.id,
        callbackUrl
    );
    await sleep(3000);
    var invocationValue = await t.context.ctx.deviceBridgAPI.getEcho(
        t,
        t.context.device.id
    );
    var invocationValueBody = JSON.parse(invocationValue.body);
    t.is(invocationValueBody.status, 'Connected');
    t.is(invocationValueBody.eventType, 'ConnectionStatusChange');
    t.is(invocationValueBody.deviceId, t.context.device.id);

    var connectionStatus = await t.context.ctx.deviceBridgAPI.getConnectionStatus(
        t,
        t.context.device.id
    );
    t.is('Connected', connectionStatus.body.status);

    // Ensure connection deleted event when a sub deleted
    await t.context.ctx.deviceBridgAPI.deleteCMDSubscription(
        t,
        t.context.device.id
    );
    await sleep(2000);
    var invocationValue = await t.context.ctx.deviceBridgAPI.getEcho(
        t,
        t.context.device.id
    );
    var invocationValueBody = JSON.parse(invocationValue.body);
    t.is(invocationValueBody.status, 'Disabled');
    t.is(invocationValueBody.eventType, 'ConnectionStatusChange');
    t.is(invocationValueBody.deviceId, t.context.device.id);
});

test.serial('Test device desired property update callback', async t => {
    // Create subscription to Azure Function
    const callbackUrl = `${t.context.ctx.callbackUrl}&deviceId=${t.context.device.id}`;
    await t.context.ctx.deviceBridgAPI.createDesiredPropertySubscription(
        t,
        t.context.device.id,
        callbackUrl
    );
    await sleep(5000);

    // Ensure get works
    var response = await t.context.ctx.deviceBridgAPI.getDesiredPropertySubscription(
        t,
        t.context.device.id
    );
    t.is(response.body.callbackUrl, callbackUrl);
    t.is(response.body.status, 'Running');
    var propTestValue = makeString(10);
    await t.context.ctx.publicAPI.setProperties(t, t.context.device.id, {
        rwProp: propTestValue,
    });
    await sleep(3000);
    var invocationValue = await t.context.ctx.deviceBridgAPI.getEcho(
        t,
        t.context.device.id
    );
    var invocationValueBody = JSON.parse(invocationValue.body);
    t.is(invocationValueBody.desiredProperties.rwProp, propTestValue);
    t.is(invocationValueBody.eventType, 'DesiredPropertyUpdate');
    t.is(invocationValueBody.deviceId, t.context.device.id);

    // Ensure connection deleted event when a sub deleted
    await t.context.ctx.deviceBridgAPI.deleteDesiredPropertySubscription(
        t,
        t.context.device.id
    );
    await sleep(2000);
    var invocationValue = await t.context.ctx.deviceBridgAPI.getEcho(
        t,
        t.context.device.id
    );
    var invocationValueBody = JSON.parse(invocationValue.body);
    t.is(invocationValueBody.status, 'Disabled');
    t.is(invocationValueBody.eventType, 'ConnectionStatusChange');
    t.is(invocationValueBody.deviceId, t.context.device.id);
});

test.serial('Test device to cloud messaging', async t => {
    const temperatureValue = Math.round(Math.random() * 1000);
    await t.context.ctx.deviceBridgAPI.sendTelemetry(t, t.context.device.id, {
        data: { temperature: temperatureValue },
    });

    var attempts = 5;
    var telemetryResult = await t.context.ctx.publicAPI.getLatestDeviceTelemetry(
        t,
        t.context.device.id,
        'temperature'
    );
    // Multiple attempts as it may take time for telemetry to come through
    for (var i = 0; i < attempts; i++) {
        if (telemetryResult != {} && telemetryResult.value != undefined) {
            break;
        }
        await sleep(2000);
        telemetryResult = await t.context.ctx.publicAPI.getLatestDeviceTelemetry(
            t,
            t.context.device.id,
            'temperature'
        );
    }
    t.is(String(telemetryResult.value), String(temperatureValue));
});

test.serial('Test reported properties and twin', async t => {
    var reportedPropertiesBody = {
        patch: {
            rwProp: makeString(10),
        },
    };

    await t.context.ctx.deviceBridgAPI.sendReportedProperty(
        t,
        t.context.device.id,
        reportedPropertiesBody
    );
    await sleep(3000);
    var attempts = 5;
    var propertiesResult = await t.context.ctx.publicAPI.getProperties(
        t,
        t.context.device.id
    );
    // Multiple attempts as it may take time for property changes to come through
    for (var i = 0; i < attempts; i++) {
        if (propertiesResult != {} && propertiesResult.rwProp != undefined) {
            break;
        }
        propertiesResult = await t.context.ctx.publicAPI.getProperties(
            t,
            t.context.device.id
        );
    }

    t.is(String(propertiesResult.rwProp), reportedPropertiesBody.patch.rwProp);

    // Assert that twin reports the property
    var twinResult = await t.context.ctx.deviceBridgAPI.getTwin(
        t,
        t.context.device.id
    );
    t.is(
        reportedPropertiesBody.patch.rwProp,
        twinResult.twin.properties.reported.rwProp
    );
});

test.serial('Test device provisoning endpoint', async t => {
    var result = await t.context.ctx.deviceBridgAPI.registerDevice(
        t,
        'registrationDevice',
        { modelId: t.context.template.id }
    );
    t.is(200, result.statusCode);
});

test.serial('Test health endpoint', async t => {
    var result = await t.context.ctx.deviceBridgAPI.getHealth(t);
    t.is('Healthy', result);
});

test.serial('Test auth', async t => {
    var urls = await t.context.ctx.deviceBridgAPI.getUrlFuncs();
    const headers = {
        'x-api-key': t.context.ctx.deviceBridgeKey,
        'content-type': 'application/json',
    };

    for (const [_, url] of Object.entries(urls)) {
        // Test get, auth
        await got<any>(url(), { headers })
            .then(async result => {
                t.assert(
                    result.statusCode == 200,
                    `Status code was ${
                        result.statusCode
                    } instead of 200 for url: ${url()}`
                );
            })
            .catch((reason: any) => {
                // Assert has a 404 or 405 if failed
                t.assert(
                    (reason.message as string).indexOf('404') > 0 ||
                        (reason.message as string).indexOf('405') > 0,
                    reason.message
                );
            });
        // Test get, no auth
        await got<any>(url())
            .then(async result => {
                t.fail();
            })
            .catch((reason: any) => {
                // Assert has a 401 or 405 if failed
                t.assert(
                    (reason.message as string).indexOf('401') > 0 ||
                        (reason.message as string).indexOf('405') > 0,
                    reason.message
                );
            });

        // Test post, auth
        await got
            .post<any>(url(), { headers })
            .then(async result => {
                t.assert(
                    result.statusCode == 200,
                    `Status code was ${
                        result.statusCode
                    } instead of 200 for url: ${url()}`
                );
            })
            .catch((reason: any) => {
                // Assert has a 400, 404 or 405 if failed
                // 400 is okay as auth comes before 400 is triggered, we are just testing auth
                t.assert(
                    (reason.message as string).indexOf('404') > 0 ||
                        (reason.message as string).indexOf('405') > 0 ||
                        (reason.message as string).indexOf('400') > 0,
                    reason.message
                );
            });
        // Test post, no auth
        await got
            .post<any>(url())
            .then(async result => {
                t.fail();
            })
            .catch((reason: any) => {
                // Assert has a 401 or 405 if failed
                t.assert(
                    (reason.message as string).indexOf('401') > 0 ||
                        (reason.message as string).indexOf('405') > 0,
                    reason.message
                );
            });

        // Test put, auth
        await got
            .put<any>(url(), { headers })
            .then(async result => {
                t.assert(
                    result.statusCode == 200,
                    `Status code was ${
                        result.statusCode
                    } instead of 200 for url: ${url()}`
                );
            })
            .catch((reason: any) => {
                // Assert has a 400, 404 or 405 if failed
                // 400 is okay as auth comes before 400 is triggered, we are just testing auth
                t.assert(
                    (reason.message as string).indexOf('404') > 0 ||
                        (reason.message as string).indexOf('405') > 0 ||
                        (reason.message as string).indexOf('400') > 0,
                    reason.message
                );
            });
        // Test put, no auth
        await got
            .put<any>(url())
            .then(async result => {
                t.fail();
            })
            .catch((reason: any) => {
                // Assert has a 401 or 405 if failed
                t.assert(
                    (reason.message as string).indexOf('401') > 0 ||
                        (reason.message as string).indexOf('405') > 0,
                    reason.message
                );
            });

        // Test delete, auth
        await got
            .delete<any>(url(), { headers })
            .then(async result => {
                t.assert(
                    result.statusCode == 200 || result.statusCode == 204,
                    `Status code was ${
                        result.statusCode
                    } instead of 200 for url: ${url()}`
                );
            })
            .catch((reason: any) => {
                // Assert has a 400, 404 or 405 if failed
                // 400 is okay as auth comes before 400 is triggered, we are just testing auth
                t.assert(
                    (reason.message as string).indexOf('404') > 0 ||
                        (reason.message as string).indexOf('405') > 0 ||
                        (reason.message as string).indexOf('400') > 0,
                    reason.message
                );
            });
        // Test delete, no auth
        await got
            .delete<any>(url())
            .then(async result => {
                t.fail();
            })
            .catch((reason: any) => {
                // Assert has a 401 or 405 if failed
                t.assert(
                    (reason.message as string).indexOf('401') > 0 ||
                        (reason.message as string).indexOf('405') > 0,
                    reason.message
                );
            });
    }
});

test.serial('Test restart', async t => {
    // Create subscription to Azure Function
    const callbackUrl = `${t.context.ctx.callbackUrl}&deviceId=${t.context.device.id}`;
    await t.context.ctx.deviceBridgAPI.createConnectionStatusSubscription(
        t,
        t.context.device.id,
        callbackUrl
    );
    await sleep(3000);
    // Ensure get works
    var response = await t.context.ctx.deviceBridgAPI.getConnectionStatusSubscription(
        t,
        t.context.device.id
    );
    t.is(callbackUrl, response.body.callbackUrl);
    await t.context.ctx.deviceBridgAPI.createCMDSubscription(
        t,
        t.context.device.id,
        callbackUrl
    );
    await sleep(10000);
    // Delete echo for conection status
    await t.context.ctx.deviceBridgAPI.deleteEcho(t, t.context.device.id);
    // Restart container
    await got.post<{ [name: string]: string }>(t.context.ctx.restartApiUrl, {
        json: {
            request: {},
        },
        responseType: 'json',
        headers: {
            Authorization: 'Bearer ' + t.context.ctx.restartBearerToken,
        },
    });

    var attempts = 12;
    for (var i = 0; i < attempts; i++) {
        var invocationValue = await t.context.ctx.deviceBridgAPI.getEcho(
            t,
            t.context.device.id
        );
        if (invocationValue.statusCode == 204) {
            await sleep(3000);
            continue;
        }
        var invocationValueBody = JSON.parse(invocationValue.body);
        if(invocationValueBody.status == "Disabled"){
            await sleep(3000);
            continue;
        }
        t.is(invocationValueBody.status, 'Connected');
        t.is(invocationValueBody.eventType, 'ConnectionStatusChange');
        t.is(invocationValueBody.deviceId, t.context.device.id);
        t.context.ctx.deviceBridgAPI.deleteCMDSubscription(
            t,
            t.context.device.id
        );
        t.context.ctx.deviceBridgAPI.deleteConnectionStatusSubscription(
            t,
            t.context.device.id
        );
        return;
    }
    t.fail();
});
