const getConfig = async () => {
    const response = await fetch(window.location.origin + '/api/config');
    const configs = await response.json(); //extract JSON from the http response

    console.log("read configs:")
    console.log(configs)
    return configs;
}

function addStripe() {
    const stripes = document.getElementById("stripes");
    stripes.innerHTML = "Hello JavaScript";
}

async function updateFields() {
    configs = await getConfig();
    console.log("update field configs:")
    console.log(configs)
    if (configs == null) {
        console.log("no arduino found")
        arduinos = document.getElementById("hummel_arduinos");
        arduinos.innerHTML = "no arduinos found"
        return
    }
    for (var i = 0; i < configs.length; i++) {
        console.log("arduino found")
        console.log(configs[i])
        id = document.getElementById("arduino_id");
        console.log(id)
        id.innerHTML = configs[i].id
        console.log(id)
        devFile = document.getElementById("arduino_dev_file");
        console.log(devFile)
        devFile.innerHTML = configs[i].dev_file
        saveID = document.getElementById("arduino_id_save");
        btn = document.createElement("button")
        btn.innerHTML = "Save"
//        btn.onclick = sendData
        saveID.innerHTML = "";
        saveID.appendChild(btn);
        //       addArduino(configs[i])

        ledPin = document.getElementById("circle_led_pin");
        ledPinEl = document.createElement("input");
        ledPinEl.type = "number"
        ledPinEl.value = configs[i].circle.pin.led_pin
        ledPinEl.addEventListener('input', ledCirclePinUpdate);
        ledPin.innerHTML = ""
        ledPin.appendChild(ledPinEl)

        numLeds = document.getElementById("circle_num_leds");
        numLedsEl = document.createElement("input");
        numLedsEl.type = "number"
        numLedsEl.value = configs[i].circle.pin.num_leds
        numLeds.innerHTML = ""
        numLeds.appendChild(numLedsEl)
    }
}

function ledCirclePinUpdate(e) {
    sendHummelCommand("api/ado/255/circle/pin/led_pin", "led_pin", e.target.value)
}

function setupCallbacks() {
    console.log("setup callbacks")
    setupStripeHandler("1_radial1", palette1Stripe1Update, base1Stripe1Update)
    setupStripeHandler("1_radial2", palette1Stripe2Update, base1Stripe2Update)
    setupStripeHandler("1_radial3", palette1Stripe3Update, base1Stripe3Update)
    setupStripeHandler("1_radial4", palette1Stripe4Update, base1Stripe4Update)
    setupStripeHandler("2_radial1", palette2Stripe1Update, base2Stripe1Update)
    setupStripeHandler("2_radial2", palette2Stripe2Update, base2Stripe2Update)
    setupStripeHandler("2_radial3", palette2Stripe3Update, base2Stripe3Update)
    setupStripeHandler("2_radial4", palette2Stripe4Update, base2Stripe4Update)
    setupAllHandler(paletteAllUpdate, baseAllUpdate)
}

function setupAllHandler(paletteCallback, baseCallback) {
    for (let id = 1; id < 3; id++) {
        for (let stripCnt = 1; stripCnt < 5; stripCnt++) {
            stripeID = id+"_"+stripCnt
            for (let i = 1; i < 17; i++) {
                document.getElementById(stripeID + "_led" + i).addEventListener('input', paletteCallback);
            }
            document.getElementById(stripeID + "_speed").addEventListener('input', baseCallback);
            document.getElementById(stripeID + "_direction").addEventListener('input', baseCallback);
        }
    }
}

function setupStripeHandler(stripeID, paletteCallback, baseCallback) {
    for (let i = 1; i < 17; i++) {
        document.getElementById(stripeID+"_led"+i).addEventListener('input', paletteCallback);
    }
    document.getElementById(stripeID+"_speed").addEventListener('input', baseCallback);
    document.getElementById(stripeID+"_direction").addEventListener('input', baseCallback);
}

function palette1Stripe1Update(e) {
    paletteUpdate("1","radial1")
}
function palette1Stripe2Update(e) {
    paletteUpdate("1","radial2")
}
function palette1Stripe3Update(e) {
    paletteUpdate("1","radial3")
}
function palette1Stripe4Update(e) {
    paletteUpdate("1","radial4")
}
function palette2Stripe1Update(e) {
    paletteUpdate("2","radial1")
}
function palette2Stripe2Update(e) {
    paletteUpdate("2","radial2")
}
function palette2Stripe3Update(e) {
    paletteUpdate("2","radial3")
}
function palette2Stripe4Update(e) {
    paletteUpdate("2","radial4")
}

function base1Stripe1Update(e) {
    baseUpdate("1","radial1")
}
function base1Stripe2Update(e) {
    baseUpdate("1","radial2")
}
function base1Stripe3Update(e) {
    baseUpdate("1","radial3")
}
function base1Stripe4Update(e) {
    baseUpdate("1","radial4")
}
function base2Stripe1Update(e) {
    baseUpdate("2","radial1")
}
function base2Stripe2Update(e) {
    baseUpdate("2","radial2")
}
function base2Stripe3Update(e) {
    baseUpdate("2","radial3")
}
function base2Stripe4Update(e) {
    baseUpdate("2","radial4")
}

function paletteAllUpdate(e) {
    for (let id = 1; id < 3; id++) {
        for (let stripCnt = 1; stripCnt < 5; stripCnt++) {
            paletteUpdate(i,"radial"+stripCnt)
        }
    }
}

function baseAllUpdate(e) {
    for (let id = 1; id < 3; id++) {
        for (let stripCnt = 1; stripCnt < 5; stripCnt++) {
            baseUpdate(i,"radial"+stripCnt)
        }
    }
}

function paletteUpdate(id, stripe) {
    console.log("mark")
    jsonData = '{ "palette": [';
    for (let i = 1; i < 17; i++) {
        const rgb = w3color(document.getElementById(id+"_"+stripe+"_led"+i).value);
        const hsv = rgbToHsv(rgb.red, rgb.green, rgb.blue)
        jsonData += '{"id": '+i+', "h": '+Math.round(hsv.h)+', "s": '+Math.round(hsv.s)+', "v": '+Math.round(hsv.v)+'}'
        if ( i != 16 ) {
        jsonData += `,`
        }
    }
    jsonData += ']}';
    console.log(jsonData)
    sendHummelCommandPalette("api/ado/"+id+"/"+stripe+"/palette", jsonData)
}

function baseUpdate(id, stripe) {
    console.log("mark")
    const speed = document.getElementById(id+"_"+stripe+"_speed");
    const direction = document.getElementById(id+"_"+stripe+"_direction");
    jsonDataSpeed = '{ "movement_speed": ' + (speed.value == "" ? 0 : speed.value) +'}';
    jsonDataDirection = '{ "movement_direction": ' + (direction.value == "on" ? 1 : 0) +'}';
    console.log(jsonDataDirection)
    console.log(jsonDataSpeed)
    sendHummelCommandPalette("api/ado/"+id+"/"+stripe+"/base/movement/speed", jsonDataSpeed)
    sendHummelCommandPalette("api/ado/"+id+"/"+stripe+"/base/movement/direction", jsonDataDirection)
}


function addArduino(config) {
    const arduinos = document.getElementById("hummel_arduinos");
    const arduinoTemplate = document.getElementById("arduino_template");
    console.log(arduinoTemplate)
    // arduinoID = arduinoTemplate.getElementById("arduino_id")
    // arduinoDevFile = arduinoTemplate.getElementById("arduino_dev_file")
    arduino = document.createElement("div");
    addArduinoIdElement(arduino, config.id)
    arduinos.appendChild(arduinos, arduino)
}

function addArduinoIdElement(parent, arduinoId) {
    const e = document.getElementById("arduino_id");
    console.log(e)
    e.value = arduinoId;
}

function sendHummelCommand(api, fieldName, value) {
    console.log("sendHummelCommand");
    data = '{ "' + fieldName + '": ' + value + '}'
    var url = window.location.origin + "/" + api;
    fetch(url, {method: 'post', body: data, headers: {'content-type': 'JSON'}});
}

function sendHummelCommandPalette(api, jsonData) {
    console.log("sendHummelCommandPalette");
    var url = window.location.origin + "/" + api;
    fetch(url, {method: 'post', body: jsonData, headers: {'content-type': 'JSON'}});
}

// function addArduinoIdElement(parent, arduinoId) {
//     const e = document.getElementById("uint8_t_element");
//     console.log(e)
//     key = e.querySelector(`#key`)
//     console.log(key)
//     key = innerHTML= "ArduinoID";
//     e.querySelector(`#value`).value= arduinoId;
//     var clone = document.importNode(e.content, true);
//     parent.appendChild(clone)
// }

/**
 * @func hsl2hsv
 * @desc Return an HSV color from an HSL color
 * @param {Number} h - Hue Angle (0 - 255)
 * @param {Number} s - Saturation (0 - 1)
 * @param {Number} l - Lightness (0 - 1)
 * @return {ArrayHSV}
 * @example
 * hsl2hsv(0, 100, 50)
 * @link https://gist.github.com/defims/0ca2ef8832833186ed396a2f8a204117
 */
// function hsl2hsv(hslH, hslS, hslL) {
//     //  const hsv1 = (hslS * (hslL < 0.5 ? hslL : 1 - hslL) / 100);
//     //  const hsvS = hsv1 === 0 ? 0 : 2 * hsv1 / (hslL + hsv1);
//     //  const hsvV = hslL + hsv1;
//     // const fixedH = (hslH * 255) / 360
//     // const fixedS = (hsvS)
//     // const fixedV = (hsvV)
//     // return [ fixedH, fixedS, fixedV ];
//     const hsv1 = hslS * (hslL < 50 ? hslL : 100 - hslL) / 100;
//     const hsvS = hsv1 === 0 ? 0 : 2 * hsv1 / (hslL + hsv1) * 100;
//     const hsvV = hslL + hsv1;
//     return [ hslH, hsvS, hsvV ];
// }

function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return {h: h * 255 , s: s *  255, v: v  * 255 };
}

/**
 * @func hsv2hsl
 * @desc Return an HSL color from an HSV color
 * @param {Number} h - Hue Angle (0 - 360)
 * @param {Number} s - Saturation (0 - 100)
 * @param {Number} v - Value (0 - 100)
 * @return {ArrayHSL}
 * @example
 * hsv2hsl(0, 0, 0) // => [0, 100, 50]
 * @link https://gist.github.com/defims/0ca2ef8832833186ed396a2f8a204117
 */
function hsv2hsl(hsvH, hsvS, hsvV) {
    const hslL = (200 - hsvS) * hsvV / 100;
    const [ hslS, hslV ] = [
        hslL === 0 || hslL === 200 ? 0 : hsvS * hsvV / 100 / (hslL <= 100 ? hslL : 200 - hslL) * 100,
        hslL * 5 / 10
    ];

    const fixedH = (hsvH * 360) / 256
    const fixedS = (hslS * 100) / 256
    const fixedV = (hslV * 100) / 256
    return [ fixedH, fixedS, fixedV ];
}