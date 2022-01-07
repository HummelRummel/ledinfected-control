# HummelRummel LED control

The HummelRummel LED control is used to send commands and show the state of the HummelArduino that are connected to the LEDs and control them.

TBD
## System setup


## LED control backend

The backend is implemented as an RestAPI that can be used to query the config of the connected arduinos and configure them.
The HummelRummel LED control backend can be run on a raspberry PI or a normal PC.

TBD

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

In addition to the different resolutions of the images to reduce bandwidth the images are scaled to fit the different screen sizes.

The Interface should ideally be usable on landscape and portait mode (phone needs portrait mode, but desktop is usually landscape).

The WepApp consists of two different views, the overview and the detail view.
The overview shows a flower field, with bubble bees flying around. Clicking at one of the flowers opens the detail view of the clicked flower.
The detail view is used to actually control the flowers.

#### Structure of the detail view

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
|    ParameterArea     |
|                      |
| ParameterBumbleBees  |
|                      |
|                      |
|                      |
|                      |
------------------------

### Notes

- Create ImageMaps: https://www.image-map.net

```



