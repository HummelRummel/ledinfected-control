# HummelRummel LED control

The HummelRummel LED control is used to send commands and show the state of the HummelArduino that are connected to the
LEDs and control them.

TBD

## System setup

## LED control backend

The backend is implemented as an RestAPI that can be used to query the config of the connected arduinos and configure
them. The HummelRummel LED control backend can be run on a raspberry PI or a normal PC.

### RESTapi endpoint

#### GET /api

#### GET /api/arduino

#### GET /api/arduino/:ArduinoId

#### POST /api/arduino/:ArduinoId/set_id

```json
{
  "id": 4
}
```

#### POST /api/arduino/:ArduinoId/:StripeId/setup

```json
{
  "led_pin": 5,
  "stripe_type": 1,
  "virtual_len": 30,
  "sub_stripes": [
    {
      "index": 0,
      "num_leds": 30,
      "offset": 0,
      "radial_pos": 0
    },
    {
      "index": 1,
      "num_leds": 0,
      "offset": 0,
      "radial_pos": 0
    },
    {
      "index": 2,
      "num_leds": 0,
      "offset": 0,
      "radial_pos": 0
    },
    {
      "index": 3,
      "num_leds": 0,
      "offset": 0,
      "radial_pos": 0
    }
  ]
}
```

#### POST /api/arduino/:ArduinoId/:StripeId/setup/save

```json
```

#### POST /api/arduino/:ArduinoId/:StripeId/config

```json
{
  "brightness": 255,
  "movement_speed": 1,
  "speed_correction": 1
}
```

#### POST /api/arduino/:ArduinoId/:StripeId/config/save

```json
```

#### POST /api/arduino/:ArduinoId/:StripeId/palette

```json
{
  "palette": [
    {
      "index": 1,
      "h": 40,
      "s": 100,
      "v": 255
    },
    {
      "index": 2,
      "h": 40,
      "s": 100,
      "v": 255
    },
    {
      "index": 3,
      "h": 40,
      "s": 100,
      "v": 255
    },
    {
      "index": 4,
      "h": 40,
      "s": 100,
      "v": 255
    },
    {
      "index": 5,
      "h": 80,
      "s": 100,
      "v": 255
    },
    {
      "index": 6,
      "h": 80,
      "s": 100,
      "v": 255
    },
    {
      "index": 7,
      "h": 80,
      "s": 100,
      "v": 255
    },
    {
      "index": 8,
      "h": 120,
      "s": 100,
      "v": 255
    },
    {
      "index": 9,
      "h": 120,
      "s": 255,
      "v": 255
    },
    {
      "index": 10,
      "h": 120,
      "s": 255,
      "v": 255
    },
    {
      "index": 11,
      "h": 255,
      "s": 255,
      "v": 255
    },
    {
      "index": 12,
      "h": 255,
      "s": 255,
      "v": 255
    },
    {
      "index": 13,
      "h": 255,
      "s": 255,
      "v": 255
    },
    {
      "index": 14,
      "h": 255,
      "s": 255,
      "v": 255
    },
    {
      "index": 15,
      "h": 255,
      "s": 255,
      "v": 255
    },
    {
      "index": 16,
      "h": 255,
      "s": 255,
      "v": 255
    }
  ]
}
```

#### POST /api/arduino/:ArduinoId/:StripeId/palette/save

```json
```

#### GET /api/abstract

#### GET /api/abstract/:AbstractId

#### POST /api/abstract/:AbstractId/setup

```json
{
  "position": {
    "x": 400,
    "y": 400
  }
}
```

#### POST /api/abstract/:AbstractId/setup/save

```json
```

#### POST /api/abstract/:AbstractId/stripe/:StripeId/setup

```json
{
  "arduino_id": 4,
  "arduino_stripe_id": 0,
  "name": "radial stripe 1"
}
```

#### POST /api/abstract/:AbstractId/stripe/:StripeId/setup/save

```json
```

#### POST /api/abstract/:AbstractId/stripe/:StripeId/config

```json
```
#### POST /api/abstract/:AbstractId/stripe/:StripeId/config/save

```json
```

#### POST /api/abstract/:AbstractId/stripe/:StripeId/palette

```json
```
#### POST /api/abstract/:AbstractId/stripe/:StripeId/palette/save

```json
```

## LED control frontend

The UI is implemented as a WebApp and interacts with the restAPI of the backend.

The use-cases for the UI are:

- **local control:** Used to control flowers locally, at home or at a party
- **remote control:** Used to control the flower remotely, e.g. in a live stream

The app should be usable via phone and desktop. This requires that it is usable with different resolutions.

#### Resolutions needed to be supported:

- 480x640
- 750x1334 or 720x1280
- 1080x1920

In addition to the different resolutions of the images to reduce bandwidth the images are scaled to fit the different
screen sizes.

The Interface should ideally be usable on landscape and portait mode (phone needs portrait mode, but desktop is usually
landscape).

The WepApp consists of two different views, the overview and the detail view. The overview shows a flower field, with
bubble bees flying around. Clicking at one of the flowers opens the detail view of the clicked flower. The detail view
is used to actually control the flowers.

### Structure of the overview view

### Structure of the detail view

```
------------------------
|    SelectionArea     |
|                      |
|                      |
|                      |
|                      |
|                      |
|-----         --------|
|LED |         |Pattern|
------------------------
|Ctrl|          |Preset|
|-----          -------|
|                      |
|                      |
|                      |
|                      |
|    ParameterArea     |
------------------------

The Selection area can be changed between the LED and the Pattern tabs, and the ParameterArea between the Ctrl and Preset tabs.

#### LED selection area

The LED selection area shows the setup of the LEDs and can be customized for each installation, by providing custom images with defined ImageMaps.
The clickable areas defined in the ImageMap

#### Pattern selection area

The Pattern selection area shows the 16 Patterns of the select LEDs, and can be used
#### Ctrl parameter area

#### Preset parameter area

### Notes

- Create ImageMaps: https://www.image-map.net

```



