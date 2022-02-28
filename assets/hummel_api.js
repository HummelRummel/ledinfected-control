/////////////////////////////////////////////////////////////////////////////////////////////
// Basic constants
/////////////////////////////////////////////////////////////////////////////////////////////

const baseRestAPIEndpoint = "/api"

// paths
const imageBasePath = "/assets/img"
const imageBasePathPattern = imageBasePath + "/pattern"
const imageBasePathAbstracts = imageBasePath
"/abstracts/"

// fixme this needs to be check if still needed, at least a rename is needed
const assetImgBaseDir = "/assets/img/abstracts/"

/////////////////////////////////////////////////////////////////////////////////////////////
// LEDInfectedApp
// It contains all the objects and is the global entry point
// It will call init on document load, to do all the async actions
//
// Accessible via
//   app
// Contains
//   - this.connection RestAPI connection to LEDinfected-controld
//   - this.deviceList Objects of all devices reported back by yhe LEDinfected-controld
//   - this.overview   Objects of the overview viewport
//   - this.controls   Objects of the control viewport
/////////////////////////////////////////////////////////////////////////////////////////////
class LEDInfectedApp {
    constructor() {
        this.connection = new ConnectionAPI();

        this.ledInfected = new LEDInfectedList();
        this.overview = new Overview();
        this.controls = new Controls();
    }

    async init() {
        this.overview.initHummeln();
        this.ledInfected.init(this.connection);
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// ConnectionAPI
// Simple wrappers for get and post calls
//
// Accessible via
//   app.connection
/////////////////////////////////////////////////////////////////////////////////////////////
class ConnectionAPI {
    constructor() {
        this.baseEP = baseRestAPIEndpoint;
    }

    async get(ep) {
        const response = await fetch(this.baseEP + ep);
        const jsonResponse = await response.json();
        return jsonResponse
    }

    async post(ep, jsonBody) {
        const response = await fetch(this.baseEP + ep, {
            method: 'POST',
            body: jsonBody,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const jsonResponse = await response.json(); //extract JSON from the http response
        return jsonResponse
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// LEDInfectedList
// List of LEDinfected objects reported by the LEDinfected-controld
//
// Accessible via
//   app.ledinfected
// Contains
//   - this.abstracts List of registers abstracts
//   - this.arduinos  List of online arduinos
//   - this.presets   List of available presets
/////////////////////////////////////////////////////////////////////////////////////////////
class LEDInfectedList {
    constructor() {
        this.abstract = new AbstractList();
        this.arduino = new ArduinoList();
        this.preset = new PresetList();
    }

    async init() {
        const globalConfig = await app.connection.get("");
        this.abstract.updateAll(globalConfig.abstracts);
        this.arduino.updateAll(globalConfig.arduinos);
        this.preset.updateAll(globalConfig.presets);

        // MOA TBD setup a callback timer, to update the list
    }

    syncMovement() {
        app.connection.post("/sync", "{}");
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// AbstractList
// List of abstracts objects reported by the LEDinfected-controld
//
// Accessible via
//   app.ledinfected.abstract
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractList {
    constructor() {
        this.objects = [];
    }

    updateAll(abstractConfigList) {
        for (let i = 0; i < abstractConfigList.length; i++) {
            this.objects.push(new AbstractObject(abstractConfigList[i]))
        }
    }

    getAbstract(abstractID) {
        for (let i = 0; i < this.objects.length; i++) {
            if (this.objects[i].id == abstractID) {
                return this.objects[i];
            }
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// AbstractObject
// Object to an abstract
//
// Accessible via
//   app.ledinfected.abstract.objects[]
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractObject {
    constructor(config) {
        this.config = config;
        this.id = config.abstract_id;

        this.overviewObject = new AbstractOverviewObject(this, config);
        this.controlObject = new AbstractControlObject(this, config);

        app.overview.addAbstract(this.overviewObject.getElementID(), this.overviewObject.getHTML());
    }

    getSelectedStripes() {
        return this.controlObject.getSelectedStripes()
    }

    removeObject() {
        app.overview.removeAbstract(this.overviewObject.getElementID());
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// AbstractOverviewObject
// Contains the element shown in the overview
//
// Accessible via
//   app.ledinfected.abstract.objects[x].overviewObject
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractOverviewObject {
    constructor(parent, config) {
        this.parent = parent;
        this.elementID = "overview_abstract_" + config.abstract_id;

        // static part
        this.abstractOverviewEl = document.createElement("div");
        this.abstractOverviewEl.classList.add('abstractBase', 'tooltip', this.elementID);
        this.abstractOverviewEl.addEventListener('click', function () {
            app.controls.showAbstract(config.abstract_id);
        })
        this.abstractOverviewEl.style.width = (config.info.image.overview.dimension.width + 40) + "px";
        this.abstractOverviewEl.style.height = (config.info.image.overview.dimension.height + 40) + "px";
        this.abstractOverviewEl.style.left = config.setup.position.x + "px";
        this.abstractOverviewEl.style.top = config.setup.position.y + "px";
        this.abstractOverviewEl.style.position = "absolute";
        this.abstractOverviewEl.style.zIndex = 2;
        const span = document.createElement("span");
        span.classList.add("tooltiptext");
        span.innerHTML = config.info.name;
        this.abstractOverviewEl.appendChild(span);

        // moving part
        this.abstractOverviewBodyEl = document.createElement("img");
        this.abstractOverviewBodyEl.setAttribute('src', config.info.image.image_base_path + "/overview.png");
        this.abstractOverviewBodyEl.style.width = config.info.image.overview.dimension.width + "px";
        this.abstractOverviewBodyEl.style.height = config.info.image.overview.dimension.height + "px";
        this.abstractOverviewBodyEl.style.left = "10px";
        this.abstractOverviewBodyEl.style.top = "10px";
        this.abstractOverviewBodyEl.style.animationName = "animation_wind";
        this.abstractOverviewBodyEl.style.animationDuration = "20s";
        this.abstractOverviewBodyEl.style.animationIterationCount = "infinite";
        this.abstractOverviewBodyEl.style.animationDirection = "alternate";
        this.abstractOverviewBodyEl.style.animationTimingFunction = "ease-in-out";
        this.abstractOverviewEl.appendChild(this.abstractOverviewBodyEl);
    }

    getElementID() {
        return this.elementID;
    }

    getHTML() {
        return this.abstractOverviewEl;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// AbstractControlObject
// Contains the control object if the elements used in the control view
//
// Accessible via
//   app.ledinfected.abstract.objects[x].controlObject
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractControlObject {
    constructor(parent, config) {
        this.parent = parent;

        this.stripes = [];
        for (let i = 0; i < config.info.image.stripe_view.img_map.length; i++) {
            this.stripes.push(new AbstractControlStripeObject(this, config, config.info.image.stripe_view.img_map[i]));
        }
        this.stripeViewPort = new AbstractStripeViewPortObject(this, this.stripes, config);
    }

    getSelectedStripes() {
        let stripe_ids = [];
        for (let i = 0; i < this.stripes.length; i++) {
            if (this.stripes[i].selected == true) {
                if (this.stripes[i].id == "all") {
                    continue;
                }
                stripe_ids.push(this.stripes[i].id);
            }
        }
        return stripe_ids;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// AbstractControlStripeObject
// Contains the stripe element used in the control view
//
// Accessible via
//   app.ledinfected.abstract.objects[x].stripes
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractControlStripeObject {
    constructor(parent, abstractConfig, areaMap) {
        this.parent = parent;
        console.log(areaMap);
        this.id = areaMap.stripe_id;
        // MOA fixme set the area map
        this.areaMapMax = areaMap.max_view;
        this.areaMapMin = areaMap.min_view;
        if (this.id == 'all') {
            this.selected = false;
        } else {
            this.selected = true;
        }
    }

    appendStateImageMax(that, parentHTML) {
        this.activeMax = that.appendPicture(parentHTML, this.id + "-selected");
        this.inactiveMax = that.appendPicture(parentHTML, this.id + "-notselected");
    }

    appendStateImageMin(that, parentHTML) {
        this.activeMin = that.appendPicture(parentHTML, this.id + "-selected-min");
        this.inactiveMin = that.appendPicture(parentHTML, this.id + "-notselected-min");
    }

    appendAreaMax(parentHTML) {
        let points = "";
        if (this.areaMapMax == "") {
            return
        }
        const areas = this.areaMapMax.split(",");
        for (let i = 0; i < areas.length / 2; i++) {
            if (points != "") {
                points += " ";
            }
            points += areas[i * 2] + "," + areas[(i * 2) + 1];
        }
        const area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        area.setAttribute('points', points);
        area.style.pointerEvents = "all";
        let that = this;
        area.addEventListener("click", function () {
            that.toggleState();
        });
        parentHTML.appendChild(area);
    }

    appendAreaMin(parentHTML) {
        let points = "";
        if (this.areaMapMin == "") {
            return
        }
        const areas = this.areaMapMin.split(",");
        for (let i = 0; i < areas.length / 2; i++) {
            if (points != "") {
                points += " ";
            }
            points += areas[i * 2] + "," + areas[(i * 2) + 1];
        }
        const area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        area.setAttribute('points', points);
        area.style.pointerEvents = "all";
        let that = this;
        area.addEventListener("click", function () {
            that.toggleState();
        });
        parentHTML.appendChild(area);
    }

    toggleState() {
        if (this.id != 'all') {
            this.setState(!this.selected);
        } else {
            let oneActive = false;
            for (let i = 0; i < this.parent.stripes.length; i++) {
                if (this.parent.stripes[i].id != 'all' && this.parent.stripes[i].selected == true) {
                    oneActive = true;
                }
            }
            for (let i = 0; i < this.parent.stripes.length; i++) {
                this.parent.stripes[i].setState(!oneActive)
            }
        }
        for (let i = 0; i < this.parent.stripes.length; i++) {
            this.parent.stripes[i].updateStateVisibility();
        }
    }

    setState(v) {
        this.selected = v;
    }

    setStateVisibility(s) {
        if (s == true) {
            this.activeMax.setAttribute("visibility", "visible");
            this.inactiveMax.setAttribute("visibility", "hidden");
            this.activeMin.setAttribute("visibility", "visible");
            this.inactiveMin.setAttribute("visibility", "hidden");
        } else {
            this.activeMax.setAttribute("visibility", "hidden");
            this.inactiveMax.setAttribute("visibility", "visible");
            this.activeMin.setAttribute("visibility", "hidden");
            this.inactiveMin.setAttribute("visibility", "visible");
        }
    }

    updateStateVisibility() {
        if (this.id != "all") {
            this.setStateVisibility(this.selected);
        } else {
            let oneActive = false;
            for (let i = 0; i < this.parent.stripes.length; i++) {
                if (this.parent.stripes[i].id != 'all' && this.parent.stripes[i].selected == true) {
                    oneActive = true;
                }
            }
            this.setStateVisibility(!oneActive);
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// AbstractStripeViewPortObject
// Abstract stripe view port
//
// Accessible via
//   app.ledinfected.abstract.objects[x].stripeViewMax
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractStripeViewPortObject {
    constructor(parent, stripes, abstractConfig) {
        this.parent = parent;
        this.image_base_path = abstractConfig.info.image.image_base_path
        this.svgMaxEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgMaxEl.setAttribute('width', '100%');
        this.svgMaxEl.setAttribute('height', '100%');
        this.svgMaxEl.setAttribute('viewBox', '0 0 480 480');

        this.svgMinEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgMinEl.setAttribute('width', '100%');
        this.svgMinEl.setAttribute('height', '100%');
        this.svgMinEl.setAttribute('viewBox', '0 0 480 32');

        for (let i = 0; i < stripes.length; i++) {
            stripes[i].appendAreaMax(this.svgMaxEl);
            stripes[i].appendAreaMin(this.svgMinEl);
        }
        this.appendPicture(this.svgMaxEl, "background");
        this.appendPicture(this.svgMinEl, "background-min");
        for (let i = 0; i < stripes.length; i++) {
            stripes[i].appendStateImageMax(this, this.svgMaxEl);
            stripes[i].appendStateImageMin(this, this.svgMinEl);
        }

        for (let i = 0; i < stripes.length; i++) {
            stripes[i].updateStateVisibility();
        }
    }

    appendPicture(parentHTML, name) {
        let newImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
        newImage.setAttribute('href', this.image_base_path + "/" + name + ".png");
        newImage.style.pointerEvents = "none";
        parentHTML.appendChild(newImage);
        return newImage
    }

    getSVGMax() {
        return this.svgMaxEl;
    }

    getSVGMin() {
        return this.svgMinEl;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// ArduinoList
// List of arduinos objects reported by the LEDinfected-controld
//
// Accessible via
//   app.ledinfected.arduino
/////////////////////////////////////////////////////////////////////////////////////////////
class ArduinoList {
    constructor() {
        this.objects = [];
    }

    updateAll(arduinoConfigList) {
        // MOA fixme remove old arduinos
        if (arduinoConfigList == null) {
            return
        }
        for (let i = 0; i < arduinoConfigList.length; i++) {
            this.objects.push(new ArduinoObject(arduinoConfigList[i]))
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// ArduinoObject
// Object to an arduino
//
// Accessible via
//   app.ledinfected.arduino.objects[]
/////////////////////////////////////////////////////////////////////////////////////////////
class ArduinoObject {
    constructor(config) {
        this.config = config;

    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// PresetList
// List of presets objects reported by the LEDinfected-controld
//
// Accessible via
//   app.ledinfected.preset
/////////////////////////////////////////////////////////////////////////////////////////////
class PresetList {
    constructor() {
        this.objects = [];
    }

    updateAll(presetConfigList) {
        for (let i = 0; i < presetConfigList.length; i++) {
            this.objects.push(new PresetObject(presetConfigList[i]))
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// PresetObject
// Object to a preset
//
// Accessible via
//   app.ledinfected.preset.objects[]
/////////////////////////////////////////////////////////////////////////////////////////////
class PresetObject {
    constructor(config) {
        this.config = config;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// Overview
// It contains all the objects of the overview viewport
//
// Accessible via
//   app.overview
/////////////////////////////////////////////////////////////////////////////////////////////
class Overview {
    constructor() {
        this.viewPort = document.createElement("div");
        this.viewPort.classList.add("class_overview_viewport");
        document.body.appendChild(this.viewPort);

        this.addWindAnimation();
    }

    initHummeln() {
        createHummel(this.viewPort);
    }

    addWindAnimation() {
        this.overviewWindAnimationStyle = document.createElement("style");
        this.overviewWindAnimationStyle.innerHTML += "\n"
        this.overviewWindAnimationStyle.innerHTML += "@keyframes animation_wind {\n";
        for (let n = 0; n < 11; ++n) {
            this.overviewWindAnimationStyle.innerHTML += randomTranslate(n * 10, 0, 40);
        }
        this.overviewWindAnimationStyle.innerHTML += "}\n";
        document.head.appendChild(this.overviewWindAnimationStyle);
    }

    addAbstract(elementID, newHTMLEl) {
        let el = this.viewPort.getElementsByClassName(elementID);
        if (el.length == 0) {
            this.viewPort.appendChild(newHTMLEl);
        } else {
            console.log("addAbstract: already found an overview element with the id " + elementID);
        }
    }

    removeAbstract(elementID) {
        let el = this.viewPort.getElementsByClassName(elementID);
        if (el.length == 1) {
            this.viewPort.removeChild(el);
        } else {
            console.log("removeAbstract: could not find an overview element with the id " + elementID);
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// Controls
// It contains all the objects of the controls viewport
//
// Accessible via
//   app.controls
/////////////////////////////////////////////////////////////////////////////////////////////
class Controls {
    constructor() {
        this.controlStripes = [];

        this.controlStripes.push(new ControlStripe());
    }

    showAbstract(abstractID) {
        let abstract = app.ledInfected.abstract.getAbstract(abstractID);
        if (abstract == null) {
            console.log("showAbstract: abstract " + abstractID + "not found");
            return
        }
        this.controlStripes[0].showAbstract(abstract);
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// ControlStripe
// It contains one stripe of the control view port
//
// Accessible via
//   app.controls
/////////////////////////////////////////////////////////////////////////////////////////////
class ControlStripe {
    constructor() {
        this.initViewPort();
        this.initElements();
        this.paletteSelect = new PaletteSelect(this, this.patternSelectCanvasMax, this.patternSelectCanvasMin);
        this.stripeSelect = new StripeSelect(this, this.stripesSelectCanvasMax, this.stripesSelectCanvasMin);
        document.body.appendChild(this.viewPort);
    }

    initViewPort() {
        console.log(document.body);
        let htmlTemplate = document.body.getElementsByClassName("control_view_template")[0];
        this.viewPort = htmlTemplate.cloneNode(true);
        this.viewPort.classList.remove("control_view_template");
        this.viewPort.classList.add("controlView")
        this.viewPort.style.display = "none";
    }

    initElements() {
        let that = this;
        // the canvas for the stripe svg
        this.stripesSelectCanvasMax = this.viewPort.getElementsByClassName('stripe_canvas_div')[0];
        this.stripesSelectCanvasMin = this.viewPort.getElementsByClassName('stripe_canvas_minimized_div')[0];
        this.stripesSelectCanvasMin.style.display = "none";

        this.patternSelectCanvasMax = this.viewPort.getElementsByClassName('pattern_canvas')[0];
        this.patternSelectCanvasMin = this.viewPort.getElementsByClassName('pattern_canvas_minimized')[0];
        this.patternSelectCanvasMin.style.display = "none";

        // ths element callbacks
        this.patternHue = this.viewPort.getElementsByClassName("parameter_ctrl_slider_pattern_hue")[0];
        this.patternHue.addEventListener('input', function () {
            that.updateParameterH(that.patternHue);
        });
        this.patternSaturation = this.viewPort.getElementsByClassName("parameter_ctrl_slider_pattern_saturation")[0];
        this.patternSaturation.addEventListener('input', function () {
            that.updateParameterS(that.patternSaturation);
        });
        this.patternBrightness = this.viewPort.getElementsByClassName("parameter_ctrl_slider_pattern_brightness")[0];
        this.patternBrightness.addEventListener('input', function () {
            that.updateParameterB(that.patternBrightness);
        });
        this.stripeBrightness = this.viewPort.getElementsByClassName("parameter_ctrl_slider_stripe_brightness")[0];
        this.stripeBrightness.addEventListener('input', function () {
            that.sendConfig();
//            that.setTimeout(that.stripeBrightness, 255, 2000);
        });
        this.stripeBrightness.addEventListener('mouseup', function () {
            that.clearTimeout();
        });
        this.stripeOverlayDiv = this.viewPort.getElementsByClassName("parameter_ctrl_stripe_overlay_div")[0];
        this.stripeOverlay = this.viewPort.getElementsByClassName("parameter_ctrl_slider_stripe_overlay")[0];
        this.stripeOverlay.addEventListener('input', function () {
            that.sendConfig();
//            that.setTimeout(that.stripeOverlay, 0, 2000);
        });
        this.stripeOverlay.addEventListener('mouseup', function () {
            that.clearTimeout();
        });

        this.stripeSpeed = this.viewPort.getElementsByClassName("parameter_ctrl_slider_stripe_speed")[0];
        this.stripeSpeed.addEventListener('input', function () {
            that.sendConfig();
//            that.setTimeout(that.stripeSpeed, 0, 2000);
        });
        this.stripeSpeed.addEventListener('mouseup', function () {
            that.clearTimeout();
        });
        this.stripeStretch = this.viewPort.getElementsByClassName("parameter_ctrl_slider_stripe_stretch")[0];
        this.stripeStretch.addEventListener('input', function () {
            that.sendConfig();
//            that.setTimeout(that.stripeStretch, 0, 2000);
        });
        this.stripeStretch.addEventListener('mouseup', function () {
            that.clearTimeout();
        });
        this.syncBtn = this.viewPort.getElementsByClassName("sync_btn")[0];
        this.syncBtn.addEventListener('click', function () {
            app.ledInfected.syncMovement();
        });
        this.loadPresetBtn = this.viewPort.getElementsByClassName("show_load_preset_btn")[0];
        this.loadPresetBtn.addEventListener('click', function () {
            that.showLoadPreset();
        });
        this.savePresetBtn = this.viewPort.getElementsByClassName("show_save_preset_btn")[0];
        this.savePresetBtn.addEventListener('click', function () {
            that.showSavePreset();
        });
        this.presetSelectConfirm = this.viewPort.getElementsByClassName("preset_select_confirm")[0];
        this.presetSelectPresetNameInput = this.viewPort.getElementsByClassName("preset_select_preset_name_input")[0];
        // this.presetSelectConfirm.addEventListener('click', function () {
        //     if (that.presetSelectPresetNameInput.value != "") {
        //         let preset = new Object();
        //         preset.name = that.presetSelectPresetNameInput.value;
        //         that.savePresetSelectButtonCallback(preset);
        //     }
        // });
        this.closeBtn = this.viewPort.getElementsByClassName("close_btn")[0];
        this.closeBtn.addEventListener('click', function () {
            that.hide();
        });
    }

    clearTimeout() {
        if (this.resetTimer != null) {
            // in your click function, call clearTimeout
            window.clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }

    setTimeout(el, resetValue, timeout) {
        let that = this;
        this.clearTimeout();

        this.resetTimer = window.setTimeout(
        function() {
            el.value = resetValue;
            that.sendConfig();
            that.resetTimer = null;
        }, timeout);
    }

    showAbstract(abstract) {
        this.linkedAbstract = abstract;

        // show the stripe in the view
        // let svg = this.linkedAbstract.stripeView.getSVGElement()
        // let svgMin = this.linkedAbstract.stripeView.getSVGMinElement()
        if (this.linkedAbstract.config.stripes.length == 1) {
            this.stripesSelectCanvasMax.style.display = "none";
            this.stripesSelectCanvasMin.style.display = "block";
        } else {
            this.stripesSelectCanvasMax.style.display = "block";
            this.stripesSelectCanvasMin.style.display = "none";
        }
        this.stripeSelect.linkAbstract(abstract);
        //     this.stripesSelectCanvasMax.appendChild(this.linkedAbstract.controlObject.stripeViewPort.getSVGMax());
        //     this.stripesSelectCanvasMin.appendChild(this.linkedAbstract.controlObject.stripeViewPort.getSVGMin());

        this.updateSelectedStripeConfig();

        this.viewPort.style.animation = "fadeInEffect 1s";
        this.viewPort.style.display = "block";
    }

    hide() {
        this.viewPort.style.animation = "fadeOutEffect 1s";
        let that = this;
        // this is to hide and remove the stripe object it after the fade out
        setTimeout(function () {
            that.viewPort.style.display = "none";

            that.stripeSelect.unlinkAbstract();

            that.linkedAbstract = null;
        }, 900);
    }

    // MOA fixme this should also check if the stripe os selected
    updateSelectedStripeConfig() {
        for (let i = 0; i < this.linkedAbstract.config.stripes.length; i++) {
            let config = this.linkedAbstract.config.stripes[i].config;
            if (config != null) {
                this.applyConfig(config);
                return
            }
        }
    }

    // MOA fixme preset
    showLoadPreset() {
        let localThis = this;
        this.presetSelect.updatePresets("load", function (preset) {
            localThis.loadPresetSelectButtonCallback(preset);
        })
    }

    // MOA fixme preset
    showSavePreset() {
        let localThis = this;
        this.presetSelect.updatePresets("save", function (preset) {
            localThis.savePresetSelectButtonCallback(preset);
        })
    }

    // MOA fixme preset
    loadPresetSelectButtonCallback(preset) {
        console.log("----LOAD PRESET-----");
        let config = Object();
        config.config = preset.config;
        config.palette = preset.palette;
        console.log(config);
        this.applyConfig(config);
        // set the config in the UI and send it to all selected arduinos
        this.sendConfig();
        this.sendPattern();
    }

    // MOA fixme preset
    savePresetSelectButtonCallback(preset) {
        console.log("----SAVE PRESET-----")
        let newPreset = new Object();
        newPreset.name = preset.name;
        newPreset.config = this.getCurrentConfig();
        newPreset.palette = this.getCurrentPalette();
        let obj = new Object();
        obj.config = newPreset;

        obj.apiPath = "/presets";

        console.log('---- SENDING PRESET ----')
        console.log(obj);
        console.log(JSON.stringify(obj.config));

        app.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }

    applyConfig(newConfig) {
        this.stripeOverlayDiv.style.display = "none";
        console.log(this.linkedAbstract)
        for (let i = 0; i < this.linkedAbstract.config.stripes.length; i++) {
            let config = this.linkedAbstract.config.stripes[i].config;
            if (config != null && config.setup.overlay_id > 1 && config.setup.overlay_id < 6) {
                this.stripeOverlayDiv.style.display = "block";
            }
        }

        if (newConfig != null) {
            if (newConfig.config != null) {
                if (newConfig.config.brightness == 255) {
                    newConfig.config.brightness = 256;
                }
                this.stripeBrightness.value = newConfig.config.brightness;
                this.stripeSpeed.value = newConfig.config.movement_speed;
                this.stripeSpeed.value = newConfig.config.movement_speed;
                this.stripeStretch.value = newConfig.config.stretch;
                if (newConfig.config.overlay_ratio == 255) {
                    newConfig.config.overlay_ratio = 256;
                }
                this.stripeOverlay.value = newConfig.config.overlay_ratio;
            }
            if (newConfig.palette != null) {
                this.setCurrentPatternPalette(newConfig.palette.palette);
            }
            return;
        }
    }

    updateParameterH(el) {
        let newValue = parseInt(el.value);
        for (let i = 0; i < this.paletteSelect.segments_l0.length; i++) {
            if (this.paletteSelect.segments_l0[i].state) {
                this.paletteSelect.segments_l0[i].setColorH(newValue);
            }
        }
        this.sendPattern();
    }

    updateParameterS(el) {
        let newValue = parseInt(el.value);
        for (let i = 0; i < this.paletteSelect.segments_l0.length; i++) {
            if (this.paletteSelect.segments_l0[i].state) {
                this.paletteSelect.segments_l0[i].setColorS(newValue);
            }
        }
        this.sendPattern();
    }

    updateParameterB(el) {
        let newValue = parseInt(el.value);
        for (let i = 0; i < this.paletteSelect.segments_l0.length; i++) {
            if (this.paletteSelect.segments_l0[i].state) {
                this.paletteSelect.segments_l0[i].setColorB(newValue);
            }
        }
        this.sendPattern();
    }

    getCurrentConfig() {
        let config = new Object();
        config.movement_speed = this.getCurrentStripeSpeed();
        config.brightness = this.getCurrentStripeBrightness();
        config.stretch = this.getCurrentStripeStretch();
        config.overlay_ratio = this.getCurrentStripeOverlay();
        return config;
    }

    getCurrentStripeSpeed() {
        return parseInt(this.stripeSpeed.value);
    }

    getCurrentStripeBrightness() {
        let brightness = parseInt(this.stripeBrightness.value);
        if (brightness > 255) {
            return 255;
        }
        return brightness;
    }

    getCurrentStripeOverlay() {
        let brightness = parseInt(this.stripeOverlay.value);
        if (brightness > 255) {
            return 255;
        }
        return brightness;
    }

    getCurrentStripeStretch() {
        return parseInt(this.stripeStretch.value);
    }

    getCurrentPalette() {
        let segments = this.paletteSelect.segments_l0;

        let palette = new Object();
        palette.palette = [];
        for (let i = 0; i < 16; i++) {
            let element = new Object();
            element.index = i + 1;
            element.h = segments[i].color.hue;
            ;
            if (element.h > 255) {
                element.h = 255;
            }
            element.s = segments[i].color.saturation;
            if (element.s > 255) {
                element.s = 255;
            }
            element.v = segments[i].color.brightness;
            if (element.v > 255) {
                element.v = 255;
            }
            palette.palette.push(element);
        }
        return palette;
    }

    setCurrentPatternPalette(palette) {
        console.log(palette);
        for (let i = 0; i < 16; i++) {
            let paletteIndex = palette[i].index - 1;
            if (palette[i].h == 255) {
                palette[i].h = 256;
            }
            this.paletteSelect.segments_l0[paletteIndex].color.hue = palette[i].h;
            if (palette[i].s == 255) {
                palette[i].s = 256;
            }
            this.paletteSelect.segments_l0[paletteIndex].color.saturation = palette[i].s;
            if (palette[i].v == 255) {
                palette[i].v = 256;
            }
            this.paletteSelect.segments_l0[paletteIndex].color.brightness = palette[i].v;
            this.paletteSelect.segments_l0[paletteIndex].updateColor();
        }
    }

    updateColor() {
        for (let i = 0; i < 16; i++) {
            this.paletteSelect.segments_l0[i].updateColor();
        }
    }

    sendPattern() {
        let selectedStripes = this.linkedAbstract.getSelectedStripes();

        if (selectedStripes.length == 0) {
            console.log("no stripes selected")
            return;
        }

        let obj = new Object();
        obj.config = new Object();

        obj.apiPath = "/abstract/" + this.linkedAbstract.id + "/stripes/palette";
        obj.config.stripe_ids = selectedStripes;
        obj.config.palette = this.getCurrentPalette();

        console.log('---- SENDING PATTERN ----')
        console.log(obj);
        console.log(JSON.stringify(obj.config));

        app.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }

    sendConfig() {
        let selectedStripes = this.linkedAbstract.getSelectedStripes();

        if (selectedStripes.length == 0) {
            console.log("no stripes selected")
            return;
        }

        let obj = new Object();
        obj.apiPath = "/abstract/" + this.linkedAbstract.id + "/stripes/config";

        obj.config = new Object();
        obj.config.stripe_ids = selectedStripes;
        obj.config.config = this.getCurrentConfig();

        console.log('---- SENDING CONFIG ----')
        console.log(obj);

        app.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// StripeSelect
/////////////////////////////////////////////////////////////////////////////////////////////
class StripeSelect {
    constructor(parent, canvasMax, canvasMin) {
        let that = this;
        this.parent = parent;

        this.toggleSvgEl = this.parent.viewPort.getElementsByClassName('toggle_stripe_canvas_btn')[0];
        this.toggleSvgEl.addEventListener('click', function () {
            console.log("toggle stripe")
            if (that.stripeSelectMax.svgParent.style.display === "none") {
                that.stripeSelectMax.svgParent.style.display = "block";
                that.stripeSelectMin.svgParent.style.display = "none";
            } else {
                that.stripeSelectMax.svgParent.style.display = "none";
                that.stripeSelectMin.svgParent.style.display = "block";
            }
        })

        this.stripeSelectMax = new StripeSelectViewport(this, canvasMax);
        this.stripeSelectMin = new StripeSelectViewport(this, canvasMin);
    }

    linkAbstract(abstract) {
        this.linkedAbstract = abstract;

        this.stripeSelectMax.linkAbstractView(abstract.controlObject.stripeViewPort.getSVGMax());
        this.stripeSelectMin.linkAbstractView(abstract.controlObject.stripeViewPort.getSVGMin());
    }

    unlinkAbstract() {
        this.stripeSelectMax.unlinkAbstractView();
        this.stripeSelectMax.unlinkAbstractView();
        this.linkedAbstract = null;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// StripeSelectViewport
/////////////////////////////////////////////////////////////////////////////////////////////
class StripeSelectViewport {
    constructor(parent, svgParent) {
        this.parent = parent;
        this.svgParent = svgParent;
    }

    linkAbstractView(newHTMLEl) {
        this.unlinkAbstractView();
        this.svgParent.appendChild(newHTMLEl);
    }

    unlinkAbstractView() {
        while (this.svgParent.firstChild) {
            this.svgParent.removeChild(this.svgParent.firstChild);
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// PaletteSelect
/////////////////////////////////////////////////////////////////////////////////////////////
class PaletteSelect {
    constructor(parent, canvasMax, canvasMin, minimal, palette) {
        let that = this;
        this.parent = parent;
        this.imageMap = new ImageMapPalette();
        if (minimal != true) {
            this.paletteSelectMax = new PaletteSelectViewport(this, canvasMax, "");
        }
        this.paletteSelectMin = new PaletteSelectViewport(this, canvasMin, "-min");

        if (minimal != true) {
            // register the basic toggle callback
            this.toggleSvgEl = this.parent.viewPort.getElementsByClassName('toggle_pattern_canvas_btn')[0];
            this.toggleSvgEl.addEventListener('click', function () {
                if (canvasMax.style.display !== "none") {
                    canvasMax.style.display = "none";
                    canvasMin.style.display = "block";
                } else {
                    canvasMin.style.display = "none";
                    canvasMax.style.display = "block";
                }
            })
        }

        // Create the segments and append areas to their viewports
        // To be able to show it in a minimal and maximized view, two view ports are defined
        this.segments_l0 = [];
        this.segments_l1 = [];
        this.segments_l2 = [];
        // first add the segment objects and the segment area
        for (let i = 0; i < 16; i++) {
            let id = "0_" + (i + 1).toString().padStart(2, '0');
            let segment = new PatternSegment(this, id);
            segment.appendState(!minimal);
            if (palette != null) {
                let color = palette.getColor(i);
                segment.appendColor(color.h, color.s, color.b);
            } else {
                segment.appendColor(255, 255, 255);
            }
            this.segments_l0.push(segment);

            if (minimal != true) {
                this.paletteSelectMax.appendArea(this.getAreaMax(id), true, segment);
            }
            this.paletteSelectMin.appendArea(this.getAreaMin(id), true, segment);
        }
        if (minimal != true) {
            for (let i = 0; i < 8; i++) {
                let id = "1_" + (i + 1).toString().padStart(2, '0');
                let segment = new PatternSegment(this, id);
                this.segments_l1.push(segment);

                this.paletteSelectMax.appendArea(this.getAreaMax(id), false, segment);
            }

            for (let i = 0; i < 4; i++) {
                let id = "2_" + (i + 1).toString().padStart(2, '0');
                let segment = new PatternSegment(this, id);
                this.segments_l2.push(segment);

                this.paletteSelectMax.appendArea(this.getAreaMax(id), false, segment);
            }
            this.segment_l3 = new PatternSegment(this, "3_01");
            this.paletteSelectMax.appendArea(this.getAreaMax("3_01"), false, this.segment_l3);
            this.paletteSelectMin.appendArea(this.getAreaMin("3_01"), false, this.segment_l3);
        }

        if (minimal != true) {
            // now add the background image
            this.paletteSelectMax.appendBackground();
        }
        this.paletteSelectMin.appendBackground();

        // and finally add the segment pictures
        for (let i = 0; i < this.segments_l0.length; i++) {
            if (minimal != true) {
                this.paletteSelectMax.appendStateImage(this.segments_l0[i]);
            }
            this.paletteSelectMin.appendStateImage(this.segments_l0[i]);
        }
        if (minimal != true) {
            for (let i = 0; i < this.segments_l1.length; i++) {
                this.paletteSelectMax.appendStateImage(this.segments_l1[i]);
            }
            for (let i = 0; i < this.segments_l2.length; i++) {
                this.paletteSelectMax.appendStateImage(this.segments_l2[i]);
            }

            this.paletteSelectMax.appendStateImage(this.segment_l3);
            this.paletteSelectMin.appendStateImage(this.segment_l3);
        }

        this.updateSelectedPaletteVisibility();
    }

    getFirstSelectedPatternColor() {
        for (let i = 0; i < 16; i++) {
            if (this.segments_l0[i].state) {
                return this.segments_l0[i].color;
            }
        }
        return null;
    }

    getSelectedPatternIndices() {
        let patternIndecies = [];

        this.images.segments_l0

        for (let i = 0; i < 16; i++) {
            if (this.segments_l0[i].state) {
                patternIndecies.push(i);
            }
        }
        return patternIndecies;
    }

    // MOA fixme area for min
    getAreaMax(id) {
        for (let i = 0; i < this.imageMap.map.length; i++) {
            if (this.imageMap.map[i].id == id) {
                return this.imageMap.map[i].area_max;
            }
        }
    }

    // MOA fixme area for min
    getAreaMin(id) {
        for (let i = 0; i < this.imageMap.map.length; i++) {
            if (this.imageMap.map[i].id == id) {
                return this.imageMap.map[i].area_min;
            }
        }
    }

    updateSelectedPaletteVisibility() {
        // and finally add the segment pictures
        for (let i = 0; i < this.segments_l0.length; i++) {
            this.segments_l0[i].updateColor();
            this.segments_l0[i].updateVisibility();
        }
        for (let i = 0; i < this.segments_l1.length; i++) {
            this.segments_l1[i].updateVisibility();
        }
        for (let i = 0; i < this.segments_l2.length; i++) {
            this.segments_l2[i].updateVisibility();
        }

        this.segment_l3.updateVisibility();
        // this.parent.colorChangeCallback();
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// PatternSegment
/////////////////////////////////////////////////////////////////////////////////////////////
class PatternSegment {
    constructor(parent, id) {
        this.parent = parent;
        this.id = id;
        this.selectedViewportElements = [];
        this.unselectedViewportElements = [];
        this.colorViewportElements = [];
    }

    appendState(s) {
        this.state = s;
    }

    appendColor(h, s, b) {
        this.color = new HSBColor(h, s, b);

        this.updateColor();
    }

    registerViewPortSelectedElement(element) {
        this.selectedViewportElements.push(element);
    }

    registerViewPortUnselectedElement(element) {
        this.unselectedViewportElements.push(element);
    }

    registerViewPortColorElement(element) {
        this.colorViewportElements.push(element);
    }

    setColorH(h) {
        if (this.color.hue != h) {
            this.color.hue = h;
            this.updateColor();
        }
    }

    setColorS(s) {
        if (this.color.saturation != s) {
            this.color.saturation = s;
            this.updateColor();
        }
    }

    setColorB(b) {
        if (this.color.brightness != b) {
            this.color.brightness = b;
            this.updateColor();
        }
    }

    updateColor() {
        if (this.color != null) {
            for (let i = 0; i < this.colorViewportElements.length; i++) {
                this.colorViewportElements[i].style.fill = this.color.getStyleColor();
            }
        }
    }

    toggleState() {
        let section = this.id.substring(0, 1);
        let segment = parseInt(this.id.substring(2, 4)) - 1;

        if (section === "0") {
            this.state = !this.state;
        } else if (section === "1") {
            if (this.parent.segments_l0[segment * 2].state || this.parent.segments_l0[segment * 2 + 1].state) {
                this.parent.segments_l0[segment * 2].state = false;
                this.parent.segments_l0[segment * 2 + 1].state = false;
            } else {
                this.parent.segments_l0[segment * 2].state = true;
                this.parent.segments_l0[segment * 2 + 1].state = true;
            }
        } else if (section === "2") {
            if (this.parent.segments_l0[segment * 4].state || this.parent.segments_l0[segment * 4 + 1].state || this.parent.segments_l0[segment * 4 + 2].state || this.parent.segments_l0[segment * 4 + 3].state) {
                this.parent.segments_l0[segment * 4].state = false;
                this.parent.segments_l0[segment * 4 + 1].state = false;
                this.parent.segments_l0[segment * 4 + 2].state = false;
                this.parent.segments_l0[segment * 4 + 3].state = false;
            } else {
                this.parent.segments_l0[segment * 4].state = true;
                this.parent.segments_l0[segment * 4 + 1].state = true;
                this.parent.segments_l0[segment * 4 + 2].state = true;
                this.parent.segments_l0[segment * 4 + 3].state = true;
            }
        } else {
            let oneActive = false;
            for (let i = 0; i < 16; i++) {
                if (this.parent.segments_l0[i].state) {
                    oneActive = true;
                }
            }
            for (let i = 0; i < 16; i++) {
                this.parent.segments_l0[i].state = !oneActive;
            }
        }
        this.parent.updateSelectedPaletteVisibility();
    }

    setVisibility(s) {
        if (s == true) {
            console.log(this.id + " - state: " + this.state);
            console.log(this.selectedViewportElements);
            for (let i = 0; i < this.selectedViewportElements.length; i++) {
                this.selectedViewportElements[i].setAttribute("visibility", "visible");
            }
            for (let i = 0; i < this.unselectedViewportElements.length; i++) {
                this.unselectedViewportElements[i].setAttribute("visibility", "hidden");
            }
        } else {
            for (let i = 0; i < this.selectedViewportElements.length; i++) {
                this.selectedViewportElements[i].setAttribute("visibility", "hidden");
            }
            for (let i = 0; i < this.unselectedViewportElements.length; i++) {
                this.unselectedViewportElements[i].setAttribute("visibility", "visible");
            }
        }
    }

    updateVisibility() {
        let section = this.id.substring(0, 1);
        let segment = parseInt(this.id.substring(2, 4)) - 1;
        if (section == "0") {
            this.setVisibility(this.state);
        } else if (section == "1") {
            if (this.parent.segments_l0[segment * 2].state || this.parent.segments_l0[segment * 2 + 1].state) {
                this.setVisibility(false);
            } else {
                this.setVisibility(true);
            }
        } else if (section == "2") {
            if (this.parent.segments_l0[segment * 4].state || this.parent.segments_l0[segment * 4 + 1].state || this.parent.segments_l0[segment * 4 + 2].state || this.parent.segments_l0[segment * 4 + 3].state) {
                this.setVisibility(false);
            } else {
                this.setVisibility(true);
            }
        } else {
            let oneActive = false;
            console.log(this.parent.segments_l0);
            for (let i = 0; i < 16; i++) {
                if (this.parent.segments_l0[i].state) {
                    oneActive = true;
                }
            }
            this.setVisibility(!oneActive);
        }
    }
}

class PaletteSelectViewport {
    constructor(parent, svgParent, imageMod) {
        this.parent = parent;
        this.imageMod = imageMod;
        this.svgParent = svgParent;
    }

    appendStateImage(linkedSegment) {
        this.active = this.appendPicture("active_" + linkedSegment.id + this.imageMod);
        this.active.style.pointerEvents = "none";
        linkedSegment.registerViewPortSelectedElement(this.active);
        this.inactive = this.appendPicture("inactive_" + linkedSegment.id + this.imageMod);
        this.inactive.style.pointerEvents = "none";
        linkedSegment.registerViewPortUnselectedElement(this.inactive);
    }

    appendArea(areaMap, colored, linkedSegment) {
        let points = "";
        if (areaMap != "") {
            let areas = areaMap.split(",");
            for (let i = 0; i < areas.length / 2; i++) {
                if (points != "") {
                    points += " ";
                }
                points += areas[i * 2] + "," + areas[(i * 2) + 1];
            }
            let area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            area.setAttribute('points', points);
            if (colored == false) {
                area.setAttribute('fill-opacity', 0.0);
            }
            area.style.pointerEvents = "all";
            area.addEventListener("click", function () {
                linkedSegment.toggleState()
            });
            linkedSegment.registerViewPortColorElement(area);

            this.svgParent.appendChild(area);
        }
    }

    appendBackground() {
        let background = this.appendPicture("background" + this.imageMod);
        background.style.pointerEvents = "none";
    }

    appendPicture(name) {
        let newImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
        newImage.setAttribute('href', imageBasePathPattern + "/" + name + ".png");
        this.svgParent.appendChild(newImage);
        return newImage
    }
}

class ImageMapPalette {
    constructor() {
        this.map = [];
        this.appendArea("0_01", "243,21,268,24,291,29,323,36,298,91,280,83,258,81,242,80", "23,8,58,6,59,22,22,25");
        this.appendArea("0_02", "322,38,347,50,367,62,394,85,354,124,332,110,318,101,304,91", "73,5,108,8,108,25,71,25");
        this.appendArea("0_03", "396,87,414,108,431,133,441,158,389,177,381,158,369,142,357,127", "120,7,154,9,154,24,119,27");
        this.appendArea("0_04", "391,183,444,161,452,184,456,210,461,239,403,238,399,208", "168,8,203,8,202,24,167,26");
        this.appendArea("0_05", "402,242,459,242,457,271,452,297,443,321,391,300,398,279,401,264", "215,10,251,7,250,28,215,27");
        this.appendArea("0_06", "390,303,440,323,432,347,416,370,397,393,355,352,379,323", "262,9,301,8,299,24,261,26");
        this.appendArea("0_07", "354,356,392,395,374,414,349,428,324,442,304,388,331,374", "311,8,347,8,347,25,312,25");
        this.appendArea("0_08", "302,390,320,441,297,452,273,458,241,458,242,401,273,398", "359,8,396,9,395,23,359,26");
        this.appendArea("0_09", "239,402,237,459,210,458,183,452,158,442,179,390,206,396", "22,40,58,40,57,57,21,56");
        this.appendArea("0_10", "179,388,154,442,114,421,85,397,128,355,147,374", "72,40,106,40,106,57,71,57");
        this.appendArea("0_11", "125,352,81,396,54,357,38,325,91,304,103,328", "120,40,154,40,153,57,118,58");
        this.appendArea("0_12", "21,241,81,239,83,271,94,301,35,323,24,283", "167,40,203,39,202,57,166,57");
        this.appendArea("0_13", "78,240,22,240,22,198,36,159,90,181,81,207", "214,40,250,41,250,58,214,57");
        this.appendArea("0_14", "39,153,57,117,84,85,125,126,103,151,92,178", "262,40,299,39,299,57,261,57");
        this.appendArea("0_15", "83,83,118,56,155,34,181,91,151,105,127,124", "311,38,348,40,347,59,309,58");
        this.appendArea("0_16", "162,38,199,21,237,19,239,80,209,81,183,88", "359,41,395,40,395,57,357,58");
        this.appendArea("1_01", "243,82,274,87,305,96,332,112,350,127,310,166,292,153,267,142,242,140");
        this.appendArea("1_02", "353,130,373,157,386,181,395,214,396,237,343,239,338,213,330,191,313,170");
        this.appendArea("1_03", "400,241,395,270,388,297,372,327,354,348,314,313,330,291,341,267,341,240");
        this.appendArea("1_04", "309,313,350,356,329,370,302,386,268,394,242,396,243,342,267,340,291,329");
        this.appendArea("1_05", "237,342,237,400,206,394,182,387,153,370,127,355,168,314,184,325,206,336");
        this.appendArea("1_06", "126,351,105,326,94,300,84,267,83,243,138,242,143,271,155,295,167,311");
        this.appendArea("1_07", "81,239,85,209,93,183,105,154,126,129,166,171,150,191,142,211,138,239");
        this.appendArea("1_08", "129,126,155,107,180,93,212,85,240,83,238,138,207,142,186,154,169,167");
        this.appendArea("2_01", "239,140,282,149,308,170,331,198,338,239,294,237,286,214,268,195,244,189");
        this.appendArea("2_02", "292,242,338,242,331,279,311,308,281,332,241,339,242,292,265,287,285,269");
        this.appendArea("2_03", "238,337,198,332,169,309,149,279,141,242,185,242,192,265,208,284,238,295");
        this.appendArea("2_04", "141,238,147,204,168,169,205,147,239,140,239,185,211,196,193,212,187,240");
        this.appendArea("3_01", "241,192,262,194,281,210,289,232,286,253,279,273,260,286,240,291,220,288,202,276,193,257,190,233,201,207,217,194", "404,7,423,5,422,61,403,61");
    }

    appendArea(id, areaMax, areaMin) {
        let newArea = new Object();
        newArea.id = id;
        newArea.area_max = areaMax;
        if (areaMin == null) {
            areaMin = "";
        }
        newArea.area_min = areaMin;
        this.map.push(newArea);
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// HSBColor
// It contains a HSB color
/////////////////////////////////////////////////////////////////////////////////////////////
class HSBColor {
    constructor(h, s, b) {
        this.hue = h;
        this.saturation = s;
        this.brightness = b;
    }

    getStyleColor() {
        let h = this.hue;
        if (h > 255) {
            h = 255;
        }
        let s = this.saturation;
        if (s > 255) {
            s = 255;
        }
        let b = this.brightness;
        if (b > 255) {
            b = 255;
        }
        return this.hsbToRgb(h, s, b);
    }

    hsbToRgb(h1, s1, v1) {
        let h = h1 / 255;
        let s = s1 / 255;
        let v = v1 / 255;
        let r, g, b;

        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0:
                r = v, g = t, b = p;
                break;
            case 1:
                r = q, g = v, b = p;
                break;
            case 2:
                r = p, g = v, b = t;
                break;
            case 3:
                r = p, g = q, b = v;
                break;
            case 4:
                r = t, g = p, b = v;
                break;
            case 5:
                r = v, g = p, b = q;
                break;
        }

        let rValue = parseInt(r * 255);
        let gValue = parseInt(g * 255);
        let bValue = parseInt(b * 255);
        return "#" + rValue.toString(16).padStart(2, "0") + gValue.toString(16).padStart(2, "0") + bValue.toString(16).padStart(2, "0");
    }
}

class Palette {
    constructor(palette) {
        this.palette = palette;
    }
    getColor(index){
        for (let i = 0; i < this.palette.palette.length; i++){
            if(index == this.palette.palette[i].index) {
                return this.palette.palette[i];
            }
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// And now after everything is coded let create the class
/////////////////////////////////////////////////////////////////////////////////////////////
let app = new LEDInfectedApp();
document.body.onload = function () {
    app.init();
};

/////////////////////////////////////////////////////////////////////////////////////////////
// helper functions
/////////////////////////////////////////////////////////////////////////////////////////////
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomTranslate(b, min, max) {
    return b + "% { transform: translate(" + getRandomInt(min, max) + "px, " + getRandomInt(min, max) + "px); }\n"
}


/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
// END, this is the END my find
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////


class Preset {
    constructor(parentHTML, name, config, palette, actionCallback) {
        let localThis = this;
        this.parentHTML = parentHTML;
        this.name = name;
        this.config = config;
        this.palette = palette;
        this.actionCallback = actionCallback;

        this.presetElement = document.createElement('button');
        this.presetElement.classList.add("preset_select_button")
        this.presetElement.innerHTML = this.name;
        this.presetElement.addEventListener('click', function () {
            localThis.actionCallback(localThis);
        });
        this.parentHTML.appendChild(this.presetElement);
    }

    clearFromList() {
        this.parentHTML.removeChild(this.presetElement);
    }
}

class PresetSelect {
    constructor(parentHTML) {
        this.parentHTML = parentHTML;
        this.presets = [];

        this.viewPort = this.parentHTML.getElementsByClassName("preset_select_viewport")[0];
        this.buttonPort = this.parentHTML.getElementsByClassName("preset_select_button_port")[0];
    }

    async updatePresets(interfaceType, actionCallback) {
        console.log(this.buttonPort)
        this.actionCallback = actionCallback;
        this.presetList = await overview.connection.get("/presets");
        for (let i = 0; i < this.presets.length; i++) {
            this.presets[i].clearFromList();
        }
        for (let i = 0; i < this.presetList.length; i++) {
            this.presets.push(new Preset(this.buttonPort, this.presetList[i].name, this.presetList[i].config, this.presetList[i].palette, this.actionCallback));
        }
        // MoA fixme hide the input box
    }
}


let hummeln = [];

const maxSpeed = 100;
const borderSizeLeftPercent = 2;
const borderSizeTopPercent = 2;
const hummelImageSize = 40;

class Hummel {
    constructor(hummelID, parentHTML) {
        let xPercent = getRandomInt(5, 95);
        let yPercent = getRandomInt(5, 95);
        let x = (parentHTML.offsetWidth / 100) * xPercent;
        let y = (parentHTML.offsetHeight / 100) * yPercent;

        this.hummelID = hummelID;
        this.parentHHMTL = parentHTML;
        this.elements = createHummelElements(parentHTML, hummelID);
        this.style = createHummelStyle(hummelID, xPercent, yPercent);
        this.startPosX = 0;
        this.startPosY = 0;
        this.posX = x;
        this.posY = y;
        this.speed = getRandomInt(0, maxSpeed);
        this.direction = getRandomInt(1, 360);
        this.loopEnd = 0;
        this.loopSpeed = 0;
        this.autoMove = true;
        this.imageSize = hummelImageSize;
        this.mouseDown = false;

        let that = this;
        this.elements.hummel.addEventListener('mousedown', function (el) {
            that.mouseDownCallback(el);
        });
    }

    mouseDownCallback(el) {
        let that = this;
        this.mouseDown = true;
        el.preventDefault();
        // get the starting position of the cursor
        this.startPosX = el.clientX;
        this.startPosY = el.clientY;

        let moveCallback = this.moveMouseCallback.bind(this);

        this.autoMove = false;
        document.addEventListener('mousemove', moveCallback);

        let mouseUpCallback = function () {
            that.mouseButtonIsDown = false;
            document.removeEventListener('mousemove', moveCallback);
            document.removeEventListener('mouseup', mouseUpCallback);
            that.autoMove = true;
        }
        document.addEventListener('mouseup', mouseUpCallback);
    }

    moveMouseCallback(e) {
        let hummel = this;

        // calculate the new position
        let newPosX = hummel.startPosX - e.clientX;
        let newPosY = hummel.startPosY - e.clientY;

        // with each move we also want to update the start X and Y
        hummel.startPosX = e.clientX;
        hummel.startPosY = e.clientY;
        console.log(hummel.hummelID + " mouse move: " + newPosX + "," + newPosY);

        // console.log(hummel.elements.hummel.style)
        // set the element's new position:
        hummel.posX = hummel.elements.hummel.offsetLeft - newPosX
        hummel.posY = hummel.elements.hummel.offsetTop - newPosY

        hummel.elements.hummel.style.left = hummel.posX + "px";
        hummel.elements.hummel.style.top = hummel.posY + "px";
    }

    automaticMovementAction() {
        let hummel = this;
        let screenHeight = hummel.parent.offsetHeight;
        let minY = (screenHeight / 100) * borderSizeTopPercent;
        let maxY = screenHeight - minY - hummel.imageSize;

        let screenWidth = hummel.parent.offsetWidth;
        let minX = (screenWidth / 100) * borderSizeLeftPercent;
        let maxX = screenWidth - minX - hummel.imageSize;

        if (hummel.posX < minX) {
            hummel.direction = getRandomInt(45, 135);
            //console.log("minX reached, new direction: "+ hummel.direction)

            hummel.speed = maxSpeed;
        } else if (hummel.posX > maxX) {
            hummel.direction = getRandomInt(225, 315);
            //console.log("maxX reached, new direction: "+ hummel.direction)

            hummel.speed = maxSpeed;
        } else if (hummel.posY < minY) {
            hummel.direction = getRandomInt(135, 225);
            //console.log("minY reached, new direction: "+ hummel.direction)
            hummel.speed = maxSpeed;
        } else if (hummel.posY > maxY) {
            hummel.direction = getRandomInt(-45, 45);
            //console.log("maxY reached, new direction: "+ hummel.direction)

            hummel.speed = maxSpeed;
        } else {
            let seed = getRandomInt(0, 1000)
            if (seed == 0) {
                let oldSpeed = hummel.Speed;
                hummel.speed = getRandomInt(0, 100);
                //console.log("change speed from "+oldSpeed+" to "+ hummel.speed)
            } else if (seed == 1) {
                hummel.direction = getRandomInt(0, 360);
                //console.log("change direction from "+ oldDirection +" to " + hummel.direction);
            } else if (seed == 2) {
                hummel.speed = 100;
                let loopValue = 360;
                if (getRandomInt(1, 2) == 1) {
                    hummel.direction += loopValue;
                } else {
                    hummel.direction -= loopValue;
                }
                hummel.loopSpeed = getRandomInt(3, 10);
                hummel.loopEnd = getRandomInt(1, 360);
                console.log(hummel.hummelID + ": do a loop with " + loopValue)
            } else if ((seed > 100) && (seed < 200)) {
                //console.log("direction correction")
                hummel.direction += getRandomInt(-2, 2);
            }
        }

        hummel.direction += getRandomInt(-1, 1);

        if (hummel.loopEnd > 0) {
            //console.log(hummel.hummelID + ": loop action")
            if (hummel.direction > hummel.loopEnd) {
                hummel.direction -= hummel.loopSpeed;
                if (hummel.direction < hummel.loopEnd) {
                    hummel.direction = hummel.loopEnd;
                }
            } else if (hummel.direction < hummel.loopEnd) {
                hummel.direction += hummel.loopSpeed;
                if (hummel.direction > hummel.loopEnd) {
                    hummel.direction = hummel.loopEnd;
                }
            }
            if (hummel.direction == hummel.loopEnd) {
                hummel.loopEnd = 0;
            }
        }

        if (hummel.speed > (maxSpeed / 2)) {
            hummel.speed -= maxSpeed / 20;
        } else if (hummel.speed < (maxSpeed / 2)) {
            hummel.speed += maxSpeed / 20;
        }

        // do the movement
        hummel.posX += (Math.cos((hummel.direction - 90) * (Math.PI / 180)) * (hummel.speed / 20));
        hummel.posY += (Math.sin((hummel.direction - 90) * (Math.PI / 180)) * (hummel.speed / 20));

        //  console.log(hummel.direction + ": "+ Math.cos((180 / Math.PI) * hummel.direction) + "/" + Math.sin((180 / Math.PI) * hummel.direction))

        hummel.elements.hummel.style.left = hummel.posX + "px";
        hummel.elements.hummel.style.top = hummel.posY + "px";
        hummel.elements.hummel.style.transform = "rotate(" + (hummel.direction - 45) + "deg)"
    }
}

function createHummel(parentElement) {
    // new Hummel("123", parentElement)
}


function createHummelElements(parentElement, hummelID) {
    const hummelEl = document.createElement("div");
    hummelEl.setAttribute('class', hummelID)

    parentElement.appendChild(hummelEl);

    const hummelBodyEl = document.createElement("img");
    hummelBodyEl.setAttribute('class', hummelID + '_body');
    hummelBodyEl.setAttribute('src', 'assets/img/hummel.gif');

    hummelEl.appendChild(hummelBodyEl);

    return {hummel: hummelEl, body: hummelBodyEl};
}

function createHummelStyle(hummelID, x, y) {
    const style = document.createElement("style");

    style.innerHTML = "\n"

    style.innerHTML += "\n"
    style.innerHTML += "." + hummelID + "{\n"
    style.innerHTML += "    width:50px;\n"
    style.innerHTML += "    height:50px;\n"
    style.innerHTML += "    left:" + x + "%;\n"
    style.innerHTML += "    top:" + y + "%;\n"
    style.innerHTML += "    position:absolute;\n"
//    style.innerHTML += "    background:#0000ff;\n"
    style.innerHTML += "    cursor:move;\n"
    style.innerHTML += "    z-index: 3;\n"
    style.innerHTML += "}\n"

    // add hummel body style
    style.innerHTML += "\n"
    style.innerHTML += "." + hummelID + "_body {\n"
    style.innerHTML += "    width:" + hummelImageSize + "px;\n"
    style.innerHTML += "    height:" + hummelImageSize + "px;\n"
    style.innerHTML += "    left:5px;\n"
    style.innerHTML += "    top:5px;\n"
//    style.innerHTML += "    z-index: 3;\n"
//    style.innerHTML += "    background:#ff0000;\n"
    style.innerHTML += "    animation-name: " + hummelID + "_floating;\n"
    style.innerHTML += "    animation-duration: 10s;\n"
    style.innerHTML += "    animation-iteration-count: infinite;\n"
    style.innerHTML += "    animation-direction: alternate;\n"
    style.innerHTML += "    animation-timing-function: ease-in-out;\n"
    //   style.innerHTML += "    box-shadow: 1px 1px 2px black, 0 0 25px blue, 0 0 5px darkblue;\n"
    style.innerHTML += "}\n"

    // add keyframes for individual hummel floating
    style.innerHTML += "\n"
    style.innerHTML += "@keyframes " + hummelID + "_floating {\n";
    for (n = 0; n < 11; ++n) {
        style.innerHTML += randomTranslate(n * 10, 0, 10);
    }
    style.innerHTML += "}\n";
    document.head.appendChild(style);
    return style;
}
