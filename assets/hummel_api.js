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

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
        const that = this;

        this.connection = new ConnectionAPI();
        this.ledInfected = new LEDInfectedList();
        this.overview = new Overview();
        this.controls = new Controls();

        function callback() {
            console.log("act old callback")
            that.controls.actView.show()
        }

        this.overview.actButton.addEventListener("click", callback);

        function actCtrlcallback() {
            console.log("act ctrl callback")
            that.controls.actCtrlView.show()
        }

        this.overview.showActControlViewBtn.addEventListener("click", actCtrlcallback);
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
        return await fetch(this.baseEP + ep).then(function (response) {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response;
        }).then(async function (response) {
            if (response.status == 200) {
                const jsonResponse = await response.json();
                return jsonResponse
            }
        }).catch(function (error) {
            return null;
        });
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
//   - this.abstractList List of registers abstracts
//   - this.arduinoList  List of online arduinos
//   - this.presetList   List of available presets
/////////////////////////////////////////////////////////////////////////////////////////////
class LEDInfectedList {
    constructor() {
        this.abstractList = new AbstractList();
        this.arduinoList = new ArduinoList();
        this.presetList = new PresetList();
        this.actList = new ActList();
    }

    async init() {
        const that = this;

        // MOA TBD setup a callback timer, to update the list
        function callback() {
            that.listUpdateCallback();
            app.controls.actView.refreshAct();
        }

        // do the initial update
        that.listUpdateCallback();

        setInterval(callback, 10000)
    }

    async listUpdateCallback() {
        const globalConfig = await app.connection.get("");
        if (globalConfig == null) {
            this.isOnline = false;
            app.overview.onlineState.innerHTML = "OFFLINE"
            return;
        }
        this.isOnline = true;
        app.overview.onlineState.innerHTML = "ONLINE"

        this.abstractList.updateAll(globalConfig.abstracts);
        this.arduinoList.updateAll(globalConfig.arduinos);
        this.presetList.updateAll(globalConfig.presets);
        this.actList.updateAll(globalConfig.acts);
        this.liveAct = globalConfig.live_act;

        if (this.liveAct != null) {
            app.overview.actButton.innerHTML = "Live Act - " + this.liveAct.act_id + "(" + this.liveAct.status.active_scene.scene_id + ")";
        } else {
            app.overview.actButton.innerHTML = "Live Act - None active";
        }
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
//   app.ledinfected.abstractList
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractList {
    constructor() {
        this.objects = [];
    }

    updateAll(abstractConfigList) {
        let old = this.objects;
        this.objects = [];
        for (let i = 0; i < abstractConfigList.length; i++) {
            let found = false;
            for (let j = 0; j < old.length; j++) {
                if (old[j].config.abstract_id == abstractConfigList[i].abstract_id) {
                    // already exists just update it
                    old[j].updateConfig(abstractConfigList[i]);
                    this.objects.push(old[j]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.objects.push(new AbstractObject(abstractConfigList[i]))
            }
        }
    }

    getAbstract(abstractID) {
        for (let i = 0; i < this.objects.length; i++) {
            if (this.objects[i].id == abstractID) {
                return this.objects[i];
            }
        }
    }

    async sendAbstractSpeed(abstract_id, stripe_ids, value) {
        if (stripe_ids.length == 0) {
            alert("no stripes selected")
            return;
        }

        let obj = new Object();
        obj.apiPath = "/abstract/" + abstract_id + "/stripes/config-speed";

        obj.config = new Object();
        obj.config.stripe_ids = stripe_ids;
        obj.config.speed = parseInt(value);

        await app.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }

    async sendAbstractStretch(abstract_id, stripe_ids, value) {
        if (stripe_ids.length == 0) {
            alert("no stripes selected")
            return;
        }

        let obj = new Object();
        obj.apiPath = "/abstract/" + abstract_id + "/stripes/config-stretch";

        obj.config = new Object();
        obj.config.stripe_ids = stripe_ids;
        obj.config.stretch = parseInt(value);

        await app.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }

    async sendAbstractOverlay(abstract_id, stripe_ids, value) {
        if (stripe_ids.length == 0) {
            alert("no stripes selected")
            return;
        }

        let obj = new Object();
        obj.apiPath = "/abstract/" + abstract_id + "/stripes/config-overlay";

        obj.config = new Object();
        obj.config.stripe_ids = stripe_ids;
        obj.config.overlay = parseInt(value);

        await app.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// AbstractObject
// Object to an abstract
//
// Accessible via
//   app.ledinfected.abstractList.objects[]
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractObject {
    constructor(config) {
        this.config = config;
        this.id = config.abstract_id;

        this.overviewObject = new AbstractOverviewObject(this, config);
        this.controlObject = new AbstractControlObject(this, config);

        app.overview.addAbstract(this.overviewObject.getElementID(), this.overviewObject.getHTML());
    }

    updateConfig(newConfig) {
        for (let i = 0; i < newConfig.stripes.length; i++) {
            for (let j = 0; j < this.config.stripes.length; j++) {
                if ((newConfig.stripes[i].setup.arduino_id == this.config.stripes[j].setup.arduino_id) &&
                    (newConfig.stripes[i].setup.arduino_stripe_id == this.config.stripes[j].setup.arduino_stripe_id)) {
                    this.config.stripes[j].config = newConfig.stripes[i].config;
                    break;
                }
            }
        }

        // prepare copy to compare with stripped arduino
        let newCopy = JSON.parse(JSON.stringify(newConfig));
        for (let i = 0; i < newCopy.stripes.length; i++) {
            newCopy.stripes[i].config = null;
        }
        let curCopy = JSON.parse(JSON.stringify(this.config));
        for (let i = 0; i < curCopy.stripes.length; i++) {
            curCopy.stripes[i].config = null;
        }
        if (JSON.stringify(newCopy) === JSON.stringify(curCopy)) {
            // nothing changed
            return
        }

        this.config = newConfig;
        // config changed, reload the page to be sure everything is setup correctly
        // should only happen in case an abstract is reconfigured
        location.reload();
    }

    setBrightness(value) {
        let brightness = parseInt(value);
        let data = new Object();
        data.brightness = brightness;
        data.stripe_ids = [];
        for (let i = 0; i < this.config.stripes.length; i++) {
            data.stripe_ids.push(this.config.stripes[i].stripe_id);
        }
        app.connection.post("/abstract/" + this.id + "/stripes/config-brightness", JSON.stringify(data));
    }

    getSelectedStripes() {
        return this.controlObject.getSelectedStripes()
    }

    removeObject() {
        app.overview.removeAbstract(this.overviewObject.getElementID());
    }

    getEffectAbstractSelectViewPort(preselectedStripeIDs) {

    }
}

/////////////////////////////////////////////////////////////////////////////////////////////
// AbstractOverviewObject
// Contains the element shown in the overview
//
// Accessible via
//   app.ledinfected.abstractList.objects[x].overviewObject
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
//   app.ledinfected.abstractList.objects[x].controlObject
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
//   app.ledinfected.abstractList.objects[x].stripes
/////////////////////////////////////////////////////////////////////////////////////////////
class AbstractControlStripeObject {
    constructor(parent, abstractConfig, areaMap) {
        this.parent = parent;
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
//   app.ledinfected.abstractList.objects[x].stripeViewMax
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
//   app.ledinfected.arduinoList
/////////////////////////////////////////////////////////////////////////////////////////////
class ArduinoList {
    constructor() {
        this.objects = [];
    }

    updateAll(arduinoConfigList) {
        this.objects = [];
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
//   app.ledinfected.presetList
/////////////////////////////////////////////////////////////////////////////////////////////
class PresetList {
    constructor() {
        this.objects = [];
    }

    updateAll(presetConfigList) {
        let old = this.objects;
        this.objects = [];
        for (let i = 0; i < presetConfigList.length; i++) {
            let found = false;
            for (let j = 0; j < old.length; j++) {
                if (old[j].config.preset_id == presetConfigList[i].preset_id) {
                    old[j].updateConfig(presetConfigList[i]);
                    this.objects.push(old[j]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.objects.push(new PresetObject(presetConfigList[i]))
            }
        }
    }

    getPresetByID(preset_id) {
        for (let i = 0; i < this.objects.length; i++) {
            if (this.objects[i].id == preset_id) {
                return this.objects[i];
            }
        }
        return null;
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
        this.id = config.preset_id;
        const that = this;
        this.loadButton = document.createElement("button")
        this.loadButton.classList.add("preset_button", "preset_theme")
        this.loadButton.innerHTML = this.config.abstract_id + " - " + this.config.preset_id + "(" + this.config.name + ")";
        this.loadButton.addEventListener('click', function () {
            that.loadCallback(that.config);
        });
    }

    updateConfig(newConfig) {
        if (newConfig != null) {
            this.config = newConfig;
        }
    }

    linkLoadButton(loadCallback) {
        this.loadCallback = loadCallback;
        return this.loadButton;
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////
// ActList
// List of act objects reported by the LEDinfected-controld
//
// Accessible via
//   app.ledinfected.actList
/////////////////////////////////////////////////////////////////////////////////////////////
class ActList {
    constructor() {
        this.objects = [];
    }

    updateAll(actConfigList) {
        let old = this.objects;
        this.objects = [];
        for (let i = 0; i < actConfigList.length; i++) {
            let found = false;
            for (let j = 0; j < old.length; j++) {
                if (old[j].config.act_id == actConfigList[i].act_id) {
                    old[j].updateConfig(actConfigList[i]);
                    this.objects.push(old[j]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.objects.push(new ActObject(actConfigList[i]))
            }
        }
    }

}

/////////////////////////////////////////////////////////////////////////////////////////////
// ActObject
// Object to a act
//
// Accessible via
//   app.ledinfected.actList.objects[]
/////////////////////////////////////////////////////////////////////////////////////////////
class ActObject {
    constructor(config) {
        this.config = config;
        this.id = config.act_id;
        this.scenes = [];

        const that = this;
        this.actSelectButton = document.createElement("button")
        this.actSelectButton.classList.add("act_button", "act_theme")
        this.updateState();
        this.actSelectButton.addEventListener('click', function () {
            app.controls.actView.selectAct(that);
            //that.loadCallback(that.config);
        });

        if (this.config.scenes != null) {
            for (let i = 0; i < this.config.scenes.length; i++) {
                this.scenes.push(new ActSceneObject(this, this.config.scenes[i]));
            }
        }
    }

    setBrightness(value) {
        let brightness = parseInt(value);
        let data = new Object();
        data.brightness = brightness;
        app.connection.post("/act/" + this.id + "/brightness", JSON.stringify(data));
    }

    getScene(sceneID) {
        if (this.scenes != null) {
            for (let i = 0; i < this.scenes.length; i++) {
                if(this.scenes[i].id == sceneID) {
                    return this.scenes[i];
                }
            }
        }
    }
    updateState() {
        this.actSelectButton.innerHTML = this.config.act_id + " - " + this.config.status.state + "(" + this.config.description + ")";
    }

    updateConfig(newConfig) {
        if (newConfig != null) {
            this.config = newConfig;
            if (newConfig.scenes != null) {
                for (let i = 0; i < newConfig.scenes.length; i++) {
                    let found = false
                    for (let j = 0; j < this.scenes.length; j++) {
                        if (newConfig.scenes[i].scene_id == this.scenes[j].id) {
                            this.scenes[j].updateConfig(newConfig.scenes[i]);
                            found = true
                        }
                    }
                    if (found != true) {
                        this.scenes.push(newConfig.scenes[i])
                    }
                }
            }
        }
        this.updateState();
    }

    getButtonHTMLElement() {
        return this.actSelectButton;
    }

    getActiveScene() {
        if (this.config.status.active_scene == null) {
            return null
        }
        for (let i = 0; i < this.scenes.length; i++) {
            if (this.scenes[i].id == this.config.status.active_scene.scene_id) {
                return this.scenes[i];
            }
        }
        return null
    }

    getScenesHTMLElement() {
        let base = document.createElement("div");
        for (let i = 0; i < this.scenes.length; i++) {
            base.appendChild(this.scenes[i].getScenesViewHTMLElement());
        }
        return base;
    }

    getActiveSceneHTMLElement() {
        let activeScene = this.getActiveScene();
        if (activeScene == null) {
            return document.createElement("div")
        }

        return activeScene.getActiveSceneHTMLElement();
    }
}

class ActSceneObject {
    constructor(parent, config) {
        this.parent = parent;
        this.config = config;
        this.id = this.config.scene_id;
        const that = this;

        this.effects = [];
        for (let i = 0; i < this.config.effects.length; i++) {
            this.effects.push(new ActSceneEffectObject(this.config.effects[i]));
        }
        this.transitions = [];
        for (let i = 0; i < this.config.transitions.length; i++) {
            if (this.config.transitions[i].trigger.timeout_s == null) {
                this.transitions.push(new ActSceneTransitionObject(this.parent, this.config.transitions[i]));
            }
        }
        for (let i = 0; i < this.config.transitions.length; i++) {
            if (this.config.transitions[i].trigger.timeout_s != null) {
                this.transitions.push(new ActSceneTransitionObject(this.parent, this.config.transitions[i]));
            }
        }

        this.scenesViewElement = document.createElement("div");
        this.scenesViewElement.classList.add("flex_row");
        this.scenesViewLabel = document.createElement("div");
        this.scenesViewLabel.classList.add("act_theme");
        this.scenesViewLabel.innerHTML = this.config.scene_id;
        this.scenesViewElement.appendChild(this.scenesViewLabel);
        this.scenesViewEditButton = document.createElement("button");
        this.scenesViewEditButton.classList.add("act_theme", "act_button");
        this.scenesViewEditButton.style.marginLeft = "auto";
        this.scenesViewEditButton.style.paddingLeft = "16px";
        this.scenesViewEditButton.style.paddingRight = "16px";
        this.scenesViewEditButton.innerHTML = "Edit";
        this.scenesViewEditButton.addEventListener("click", function () {
            if (app.controls.actView.sceneEditViewSceneID.innerHTML != "") {
                app.controls.actView.sceneEditViewDiscard.click();
            }
            that.loadSceneEdit()
        })
        this.scenesViewElement.appendChild(this.scenesViewEditButton);

        this.scenesViewApplyButton = document.createElement("button");
        this.scenesViewApplyButton.classList.add("act_theme", "act_button");
        this.scenesViewApplyButton.style.paddingLeft = "16px";
        this.scenesViewApplyButton.style.paddingRight = "16px";
        this.scenesViewApplyButton.innerHTML = "Apply";
        this.scenesViewApplyButton.addEventListener("click", function () {
            that.applyEffect()
        })
        this.scenesViewElement.appendChild(this.scenesViewApplyButton);

        this.scenesViewJumpButton = document.createElement("button");
        this.scenesViewJumpButton.classList.add("act_theme", "act_button");
        this.scenesViewJumpButton.style.paddingLeft = "16px";
        this.scenesViewJumpButton.style.paddingRight = "16px";
        this.scenesViewJumpButton.innerHTML = "Jump";
        this.scenesViewJumpButton.addEventListener("click", function () {
            app.connection.post("/act/" + that.parent.id + "/scene/" + that.id + "/jump")
        })
        this.scenesViewElement.appendChild(this.scenesViewJumpButton);

        if (this.parent.config.status.active_scene != null) {
            this.scenesViewEditButton.disabled = true;
        } else {
            this.scenesViewEditButton.disabled = false;
        }

    }

    loadSceneEdit() {
        const that = this;
        app.controls.actView.sceneEditViewSceneID.value = this.id;
        app.controls.actView.sceneEditViewSceneDescription.value = this.config.description;
        app.controls.actView.sceneEditViewEffects.innerHTML = "";
        for (let i = 0; i < this.effects.length; i++) {
            app.controls.actView.sceneEditViewEffects.appendChild(this.effects[i].getSceneEditEffectHTMLElements());
        }
        app.controls.actView.sceneEditViewTransitions.innerHTML = "";
        for (let i = 0; i < this.transitions.length; i++) {
            app.controls.actView.sceneEditViewTransitions.appendChild(this.transitions[i].getSceneEditTransitionHTMLElements());
        }

        function applySceneEffectsCallback() {
            for (let i = 0; i < that.effects.length; i++) {
                that.effects[i].applyEffect();
            }
        }

        function ApplyPendingSceneEffectsCallback() {
            let newScene = app.controls.actCtrlView.getEditScene()
            for (let i = 0; i < that.effects.length; i++) {
                this.effects[i].applyPendingEffect();
            }
            console.log("MOA TBD apply pending")
            closeEdit();
        }


        // function saveEffectCallback() {
        //     let newScene = getEditScene();
        //
        //     // push scene to restAPI
        //     closeEdit();
        // }

        function closeEdit() {
            //app.controls.actView.hideSceneDetail();
            //app.controls.actView.sceneEditViewSceneID.innerHTML = "";
            app.controls.actView.sceneEditViewSceneDescription.innerHTML = "";
            //app.controls.actView.sceneEditViewApply.removeEventListener('click', applySceneEffectsCallback);
            //app.controls.actView.sceneEditViewSave.removeEventListener('click', saveEffectCallback);
            //app.controls.actView.sceneEditViewDiscard.removeEventListener('click', closeEdit);
            console.log("MOA close edit");
        }

        // app.controls.actView.sceneEditViewApply.addEventListener('click', applySceneEffectsCallback);
        // app.controls.actView.sceneEditViewSave.addEventListener('click', saveEffectCallback);
        // app.controls.actView.sceneEditViewDiscard.addEventListener("click", closeEdit);
        app.controls.actView.showSceneDetail();
        console.log("SHOW DETAIL", this.id);
    }

    async applyEffect() {
        for (let i = 0; i < this.effects.length; i++) {
            await this.effects[i].applyEffect();
        }
    }

    updateConfig(config) {
        this.config = config;
        for (let i = 0; i < this.config.effects.length; i++) {
            for (let j = 0; j < this.effects.length; j++) {
                // if (this.effects[j].isIt(this.config.effects[i]) == true) {
                //     this.effects[j].updateConfig(this.config.effects[i]);
                // }
            }
        }
        for (let i = 0; i < this.config.transitions.length; i++) {
            for (let j = 0; j < this.transitions.length; j++) {
                if (this.transitions[j].isIt(this.config.transitions[i]) == true) {
                    this.transitions[j].updateConfig(this.config.transitions[i]);
                }
            }
        }
        if (this.parent.config.status.active_scene != null) {
            this.scenesViewEditButton.disabled = true;
        } else {
            this.scenesViewEditButton.disabled = false;
        }
    }

    getScenesViewHTMLElement() {
        return this.scenesViewElement;
    }

    getActiveSceneHTMLElement() {
        let activeSceneElement = document.createElement("div");
        for (let i = 0; i < this.transitions.length; i++) {
            if (this.transitions[i].config.trigger.act_trigger_id != "next") {
                activeSceneElement.appendChild(this.transitions[i].getActiveSceneTransitionHTMLElement())
            }
        }
        return activeSceneElement;
    }
}

class ActSceneEffectObject {
    constructor(config) {
        const that = this;
        this.config = config;
        if (this.config == null) {
            this.config = new Object;
            this.config.effect_type = "";
            this.config.preset_id = "";
            this.config.abstract_id = "";
            this.config.effect_value = 0;
            this.config.stripe_ids = [];
        }

        this.sceneEditView = document.createElement("div");
        this.sceneEditView.classList.add("flex_row");

        this.sceneEditViewAbstractID = document.createElement("select");
        this.sceneEditViewAbstractID.style.width = "100px";
        for (let i = 0; i < app.ledInfected.abstractList.objects.length; i++) {
            let option = document.createElement("option");
            option.value = app.ledInfected.abstractList.objects[i].id;
            option.innerHTML = app.ledInfected.abstractList.objects[i].id;
            this.sceneEditViewAbstractID.appendChild(option);
        }
        this.sceneEditViewAbstractID.classList.add("scene_effect_edit_abstract_id", "act_dropdown", "act_theme");
        this.sceneEditViewAbstractID.value = this.config.abstract_id;
        this.sceneEditView.appendChild(this.sceneEditViewAbstractID);

        function updateStripesOptions() {
            let abstract = app.ledInfected.abstractList.getAbstract(that.sceneEditViewAbstractID.value);
            that.sceneEditViewStripeIDs.innerHTML = "";
            if (abstract != null) {
                console.log(abstract);
                for (let i = 0; i < abstract.config.stripes.length; i++) {
                    let option = document.createElement("option");
                    option.value = abstract.config.stripes[i].stripe_id;
                    option.innerHTML = abstract.config.stripes[i].stripe_id;
                    option.selected = true;
                    that.sceneEditViewStripeIDs.appendChild(option);
                }
            }
        }

        this.sceneEditViewAbstractID.addEventListener("change", updateStripesOptions)

        this.sceneEditViewStripeIDs = document.createElement("select");
        this.sceneEditViewStripeIDs.multiple = true;
        this.sceneEditViewStripeIDs.classList.add("scene_effect_edit_stipe_ids", "act_dropdown", "act_theme");
        this.sceneEditViewStripeIDs.style.height = "48px";
        this.sceneEditViewStripeIDs.style.width = "100px";
        updateStripesOptions();
        let abstract = app.ledInfected.abstractList.getAbstract(that.config.abstract_id);
        if (abstract != null) {
            for (let i = 0; i < this.sceneEditViewStripeIDs.options.length; i++) {
                this.sceneEditViewStripeIDs.options[i].selected = this.config.stripe_ids.indexOf(this.sceneEditViewStripeIDs.options[i].value) >= 0;
            }
        }
        this.sceneEditView.appendChild(this.sceneEditViewStripeIDs);


        this.sceneEditViewEffectType = document.createElement("select");
        let optionEntries = ["preset", "speed", "stretch", "overlay"];
        for (let i = 0; i < optionEntries.length; i++) {
            let option = document.createElement("option");
            option.value = optionEntries[i];
            option.innerHTML = optionEntries[i];
            this.sceneEditViewEffectType.appendChild(option);
        }
        this.sceneEditViewEffectType.classList.add("scene_effect_edit_effect_type", "act_dropdown", "act_theme");
        this.sceneEditViewEffectType.style.width = "50px";
        if (this.config.effect_type == "") {
            this.sceneEditViewEffectType.value = "preset";
        } else {
            this.sceneEditViewEffectType.value = this.config.effect_type;
        }
        this.sceneEditView.appendChild(this.sceneEditViewEffectType);
        this.sceneEditViewEffectType.addEventListener("change", function () {
            that.updateEffectTypeView();
        })


        this.sceneEditViewPresetID = document.createElement("select");
        for (let i = 0; i < app.ledInfected.presetList.objects.length; i++) {
            let option = document.createElement("option");
            option.value = app.ledInfected.presetList.objects[i].id;
            option.innerHTML = app.ledInfected.presetList.objects[i].id + " (" + app.ledInfected.presetList.objects[i].config.abstract_id + ")";
            this.sceneEditViewPresetID.appendChild(option);
        }
        this.sceneEditViewPresetID.classList.add("scene_effect_edit_preset_id", "act_dropdown", "act_theme");
        this.sceneEditViewPresetID.style.width = "100px";
        this.sceneEditViewPresetID.value = this.config.preset_id;
        this.sceneEditView.appendChild(this.sceneEditViewPresetID);

        this.sceneEditViewEffectSpeedSelect = document.createElement("select");

        function appendSpeedOption(value, label) {
            let option = document.createElement("option");
            option.value = value;
            option.innerHTML = label;
            that.sceneEditViewEffectSpeedSelect.appendChild(option);
        }

        appendSpeedOption(0, "STOP");
        appendSpeedOption(-16, "BPM / 16");
        appendSpeedOption(-8, "BPM / 8");
        appendSpeedOption(-4, "BPM / 4");
        appendSpeedOption(-2, "BPM / 2");
        appendSpeedOption(1, "BPM * 1");
        appendSpeedOption(2, "BPM * 2");
        appendSpeedOption(4, "BPM * 4");
        appendSpeedOption(8, "BPM * 8");
        appendSpeedOption(16, "BPM * 16");
        this.sceneEditViewEffectSpeedSelect.classList.add("scene_effect_edit_effect_speed", "act_dropdown", "act_theme");
        this.sceneEditViewEffectSpeedSelect.style.width = "100px";
        if (this.config.effect_type == "speed") {
            this.sceneEditViewEffectSpeedSelect.value = this.config.effect_value;
        } else {
            this.sceneEditViewEffectSpeedSelect.value = 1;
        }
        this.sceneEditView.appendChild(this.sceneEditViewEffectSpeedSelect);


        this.sceneEditViewEffectStretchSelect = document.createElement("select");

        function appendStretchOption(value, label) {
            let option = document.createElement("option");
            option.value = value;
            option.innerHTML = label;
            that.sceneEditViewEffectStretchSelect.appendChild(option);
        }

        appendStretchOption(0, "FLAT");
        appendStretchOption(-4, "4 Stretch");
        appendStretchOption(-2, "2 Stretch");
        appendStretchOption(-1, "1 Stretch");
        appendStretchOption(1, "1 Stretch");
        appendStretchOption(2, "1/2 Stretch");
        appendStretchOption(4, "1/4 Stretch");
        this.sceneEditViewEffectStretchSelect.classList.add("scene_effect_edit_effect_stretch", "act_dropdown", "act_theme");
        this.sceneEditViewEffectStretchSelect.style.width = "100px";
        if (this.config.effect_type == "stretch") {
            this.sceneEditViewEffectStretchSelect.value = this.config.effect_value;
        } else {
            this.sceneEditViewEffectStretchSelect.value = 1;
        }
        this.sceneEditView.appendChild(this.sceneEditViewEffectStretchSelect);

        this.sceneEditViewEffectOverlayValue = document.createElement("input");
        this.sceneEditViewEffectOverlayValue.setAttribute("type", "number");
        this.sceneEditViewEffectOverlayValue.classList.add("scene_effect_edit_effect_overlay", "act_theme");
        this.sceneEditViewEffectOverlayValue.style.width = "100px";
        this.sceneEditViewEffectOverlayValue.min = 0;
        this.sceneEditViewEffectOverlayValue.max = 255;
        if (this.config.effect_type == "overlay") {
            this.sceneEditViewEffectOverlayValue.value = this.config.effect_value;
        } else {
            this.sceneEditViewEffectOverlayValue.value = 0;
        }
        this.sceneEditView.appendChild(this.sceneEditViewEffectOverlayValue);

        this.updateEffectTypeView();

        // this.sceneEditViewStripeIDs = document.createElement("div");
        // this.sceneEditViewStripeIDs.classList.add("act_theme");
        // this.sceneEditViewStripeIDs.innerHTML = this.config.stripe_ids;
        // this.sceneEditView.appendChild(this.sceneEditViewStripeIDs);

        this.sceneEditEffectRemoveBtn = document.createElement("button");
        this.sceneEditEffectRemoveBtn.classList.add("act_button", "act_theme", "margin_left_auto");
        this.sceneEditEffectRemoveBtn.style.width = "48px";
        this.sceneEditEffectRemoveBtn.innerHTML = "-";

        function removeMe() {
            that.sceneEditEffectRemoveBtn.parentElement.remove();
        }

        this.sceneEditEffectRemoveBtn.addEventListener("click", removeMe);
        this.sceneEditView.appendChild(this.sceneEditEffectRemoveBtn);

    }

    updateEffectTypeView() {
        let effectType = this.sceneEditViewEffectType.value;
        console.log(effectType);
        if (effectType == "preset") {
            this.sceneEditViewEffectStretchSelect.setAttribute("hidden", true);
            this.sceneEditViewEffectSpeedSelect.setAttribute("hidden", true);
            this.sceneEditViewEffectOverlayValue.setAttribute("hidden", true);

            this.sceneEditViewPresetID.removeAttribute("hidden");
        } else if (effectType == "speed") {
            this.sceneEditViewPresetID.setAttribute("hidden", true);
            this.sceneEditViewEffectStretchSelect.setAttribute("hidden", true);
            this.sceneEditViewEffectOverlayValue.setAttribute("hidden", true);

            this.sceneEditViewEffectSpeedSelect.removeAttribute("hidden");
        } else if (effectType == "stretch") {
            this.sceneEditViewPresetID.setAttribute("hidden", true);
            this.sceneEditViewEffectSpeedSelect.setAttribute("hidden", true);
            this.sceneEditViewEffectOverlayValue.setAttribute("hidden", true);

            this.sceneEditViewEffectStretchSelect.removeAttribute("hidden");
        } else if (effectType == "overlay") {
            this.sceneEditViewPresetID.setAttribute("hidden", true);
            this.sceneEditViewEffectStretchSelect.setAttribute("hidden", true);
            this.sceneEditViewEffectSpeedSelect.setAttribute("hidden", true);

            this.sceneEditViewEffectOverlayValue.removeAttribute("hidden");
            this.sceneEditViewEffectOverlayValue.min = 0;
            this.sceneEditViewEffectOverlayValue.max = 255;
        }
    }

    updateConfig(config) {
        this.config = config;
    }

    async applyEffect() {
        if (this.config.effect_type == "preset") {
            const preset = app.ledInfected.presetList.getPresetByID(this.config.preset_id);
            if (preset == null) {
                alert("preset not found: " + this.config.preset_id);
                return;
            }
            if (preset.config.config != null) {
                await sendAbstractConfig(this.config.abstract_id, this.config.stripe_ids, preset.config.config);
            }
            console.log(preset.config)
            if (preset.config.palette != null) {
                await sendAbstractPalette(this.config.abstract_id, this.config.stripe_ids, preset.config.palette);
            }
        } else if (this.config.effect_type == "speed") {
            await app.ledInfected.abstractList.sendAbstractSpeed(this.config.abstract_id, this.config.stripe_ids, this.config.effect_value);
        } else if (this.config.effect_type == "stretch") {
            await app.ledInfected.abstractList.sendAbstractStretch(this.config.abstract_id, this.config.stripe_ids, this.config.effect_value);
        } else if (this.config.effect_type == "overlay") {
            await app.ledInfected.abstractList.sendAbstractOverlay(this.config.abstract_id, this.config.stripe_ids, this.config.effect_value);
        }
    }

    applyPendingEffect() {

    }

    getSceneEditEffectHTMLElements() {
        return this.sceneEditView;
    }
}

class ActSceneTransitionObject {
    constructor(act, config) {
        this.act = act;
        this.config = config;
        if (this.config == null) {
            this.config = new Object();
            this.config.scene_id = "";
            this.config.trigger = new Object();
            this.config.trigger.act_trigger_id = "next";
        }
        const that = this;

        this.activeSceneTransitionElement = document.createElement("div");
        this.activeSceneTransitionElement.classList.add("flex_row");

        this.activeSceneTransitionButton = document.createElement("button");
        this.activeSceneTransitionButton.classList.add("act_button", "act_theme", "act_trigger_button");
        if (this.config.trigger.act_trigger_id != null) {
            this.activeSceneTransitionElement.addEventListener("click", async function () {
                let resp = await app.connection.post("/act/" + that.act.id + "/trigger/" + that.config.trigger.act_trigger_id + "/trigger");
                await sleep(300);
                await app.ledInfected.listUpdateCallback();
                app.controls.actView.refreshAct();
            })
        }
        this.activeSceneTransitionElement.appendChild(this.activeSceneTransitionButton);

        this.activeSceneTransitionScene = document.createElement("div");
        this.activeSceneTransitionScene.classList.add("act_theme");
        this.activeSceneTransitionScene.innerHTML = this.config.scene_id;
        this.activeSceneTransitionElement.appendChild(this.activeSceneTransitionScene);

        this.sceneEditTransitionElement = document.createElement("div");
        this.sceneEditTransitionElement.classList.add("flex_row");

        this.sceneEditTransitionSceneID = document.createElement("select");
        for (let i = 0; i < this.act.config.scenes.length; i++) {
            let option = document.createElement("option");
            option.value = this.act.config.scenes[i].scene_id;
            option.innerHTML = this.act.config.scenes[i].scene_id;
            this.sceneEditTransitionSceneID.appendChild(option);
        }
        this.sceneEditTransitionSceneID.classList.add("scene_transition_edit_scene_id", "act_dropdown", "act_theme");
        this.sceneEditTransitionSceneID.value = this.config.scene_id;
        this.sceneEditTransitionSceneID.style.width = "200px";
        this.sceneEditTransitionElement.appendChild(this.sceneEditTransitionSceneID);

        this.sceneEditTransitionTriggerType = document.createElement("input");
        this.sceneEditTransitionTriggerType.setAttribute("type", "checkbox");
        this.sceneEditTransitionTriggerType.classList.add("scene_transition_edit_trigger_type", "act_checkbox", "margin_left_auto");

        this.sceneEditTransitionElement.appendChild(this.sceneEditTransitionTriggerType);
        this.sceneEditTransitionTriggerType.addEventListener("click", function () {
            that.updateTrigger();
        });
        this.sceneEditTransitionTriggerTimeout = document.createElement("input");
        this.sceneEditTransitionTriggerTimeout.setAttribute("type", "number");
        this.sceneEditTransitionTriggerTimeout.classList.add("scene_transition_edit_trigger_timeout_s", "act_dropdown", "act_theme");
        this.sceneEditTransitionTriggerTimeout.style.width = "50px";
        this.sceneEditTransitionTriggerTimeout.min = 1;
        this.sceneEditTransitionTriggerTimeout.value = 1;
        this.sceneEditTransitionElement.appendChild(this.sceneEditTransitionTriggerTimeout);
        this.sceneEditTransitionTriggerTimeoutMax = document.createElement("input");
        this.sceneEditTransitionTriggerTimeoutMax.setAttribute("type", "number");
        this.sceneEditTransitionTriggerTimeoutMax.classList.add("scene_transition_edit_trigger_timeout_max_s", "act_dropdown", "act_theme");
        this.sceneEditTransitionTriggerTimeoutMax.style.width = "50px";
        this.sceneEditTransitionTriggerTimeoutMax.min = 0;
        this.sceneEditTransitionTriggerTimeoutMax.value = 0;
        this.sceneEditTransitionElement.appendChild(this.sceneEditTransitionTriggerTimeoutMax);

        this.sceneEditTransitionTriggerActTriggerID = document.createElement("select");
        for (let i = 0; i < this.act.config.triggers.length; i++) {
            let option = document.createElement("option");
            option.value = this.act.config.triggers[i].act_trigger_id;
            option.innerHTML = this.act.config.triggers[i].act_trigger_id;
            this.sceneEditTransitionTriggerActTriggerID.appendChild(option);
        }
        this.sceneEditTransitionTriggerActTriggerID.classList.add("scene_transition_edit_trigger_act_trigger_id", "act_dropdown", "act_theme");
        this.sceneEditTransitionTriggerActTriggerID.style.width = "100px";
        this.sceneEditTransitionElement.appendChild(this.sceneEditTransitionTriggerActTriggerID);
        this.sceneEditTransitionEditSceneBtn = document.createElement("button");
        this.sceneEditTransitionEditSceneBtn.classList.add("act_button", "act_theme");
        this.sceneEditTransitionEditSceneBtn.style.width = "48px";
        this.sceneEditTransitionEditSceneBtn.innerHTML = "->";
        async function editTransitionScene() {
            console.log(that.act);
            let scene = that.act.getScene(that.sceneEditTransitionSceneID.value);
            console.log(scene);
            if (scene != null) {
                // apply effect
                await scene.applyEffect();

                // load scene
                scene.loadSceneEdit();
            }
        }
        this.sceneEditTransitionEditSceneBtn.addEventListener("click", editTransitionScene);
        this.sceneEditTransitionElement.appendChild(this.sceneEditTransitionEditSceneBtn);

        this.sceneEditTransitionTriggerRemoveBtn = document.createElement("button");
        this.sceneEditTransitionTriggerRemoveBtn.classList.add("act_button", "act_theme");
        this.sceneEditTransitionTriggerRemoveBtn.style.width = "48px";
        this.sceneEditTransitionTriggerRemoveBtn.innerHTML = "-";

        function removeMe() {
            that.sceneEditTransitionTriggerRemoveBtn.parentElement.remove();
        }

        this.sceneEditTransitionTriggerRemoveBtn.addEventListener("click", removeMe);
        this.sceneEditTransitionElement.appendChild(this.sceneEditTransitionTriggerRemoveBtn);

        if (this.config.trigger.timeout_s != null) {
            this.sceneEditTransitionTriggerType.setAttribute("checked", true);
            this.sceneEditTransitionTriggerTimeout.value = this.config.trigger.timeout_s;
            if (this.config.trigger.timeout_max_s != null) {
                this.sceneEditTransitionTriggerTimeoutMax.value = this.config.trigger.timeout_max_s;
            } else {
                this.sceneEditTransitionTriggerTimeoutMax.value = 0;
            }
        } else {
            this.sceneEditTransitionTriggerType.removeAttribute("checked");
            this.sceneEditTransitionTriggerActTriggerID.value = this.config.trigger.act_trigger_id;
        }
        this.updateTrigger();
    }

    updateTrigger() {
        if (this.sceneEditTransitionTriggerType.checked == true) {
            this.sceneEditTransitionTriggerActTriggerID.setAttribute("hidden", true);
            this.sceneEditTransitionTriggerTimeout.removeAttribute("hidden");
            this.sceneEditTransitionTriggerTimeoutMax.removeAttribute("hidden");
        } else {
            this.sceneEditTransitionTriggerTimeout.setAttribute("hidden", true);
            this.sceneEditTransitionTriggerTimeoutMax.setAttribute("hidden", true);
            this.sceneEditTransitionTriggerActTriggerID.removeAttribute("hidden");
        }
    }

    isIt(config) {
        if (config.trigger.act_trigger_id != null) {
            if (config.trigger.act_trigger_id == this.config.trigger.act_trigger_id) {
                return true;
            }
            return false;
        }
        return true;
    }

    updateConfig(config) {
        if (this.config.trigger.act_trigger_id == null) {
            this.config.trigger.remaining_s = config.trigger.remaining_s;
        }
    }

    getActiveSceneTransitionHTMLElement() {
        if (this.config.trigger.act_trigger_id == null) {
            let timeout = this.config.trigger.timeout_s;
            if (this.config.trigger.remaining_s != null) {
                timeout = this.config.trigger.remaining_s;
            }
            this.activeSceneTransitionButton.innerHTML = timeout + " sec";
        } else {
            this.activeSceneTransitionButton.innerHTML = this.config.trigger.act_trigger_id;
        }

        return this.activeSceneTransitionElement;
    }

    getSceneEditTransitionHTMLElements() {
        return this.sceneEditTransitionElement;
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
        const that = this;
        this.viewPort = document.createElement("div");
        this.viewPort.classList.add("class_overview_viewport");
        this.actButton = document.createElement("button");
        this.actButton.classList.add("show_act_control_button", "act_button", "act_theme");
        this.actButton.style.left = "0px";
        this.actButton.style.top = "0px";
        this.actButton.style.paddingLeft = "16px";
        this.actButton.style.paddingRight = "16px";
        this.actButton.style.position = "absolute";
        this.actButton.style.zIndex = 3;
        this.actButton.innerHTML = "Live Act";
        this.viewPort.appendChild(this.actButton);
        this.showActControlViewBtn = document.createElement("button");
        this.showActControlViewBtn.classList.add("show_act_control_button", "act_button", "act_theme");
        this.showActControlViewBtn.style.left = "0px";
        this.showActControlViewBtn.style.top = "48px";
        this.showActControlViewBtn.style.paddingLeft = "16px";
        this.showActControlViewBtn.style.paddingRight = "16px";
        this.showActControlViewBtn.style.position = "absolute";
        this.showActControlViewBtn.style.zIndex = 3;
        this.showActControlViewBtn.innerHTML = "Live Act New";
        this.viewPort.appendChild(this.showActControlViewBtn);

        this.onlineState = document.createElement("div");
        this.onlineState.classList.add("act_button", "act_theme");
        this.onlineState.style.right = "0px";
        this.onlineState.style.top = "0px";
        this.onlineState.style.paddingLeft = "16px";
        this.onlineState.style.paddingRight = "16px";
        this.onlineState.style.position = "absolute";
        this.onlineState.style.zIndex = 3;
        this.onlineState.innerHTML = "WAITING";
        this.viewPort.appendChild(this.onlineState);

        this.currentBPM = document.createElement("input");
        this.currentBPM.classList.add("act_button", "act_theme");
        this.currentBPM.setAttribute("type", "number");
        this.currentBPM.min = "4";
        this.currentBPM.max = "200";
        this.currentBPM.value = "120";
        this.currentBPM.style.right = "0px";
        this.currentBPM.style.top = "48px";
        this.currentBPM.style.paddingLeft = "16px";
        this.currentBPM.style.paddingRight = "16px";
        this.currentBPM.style.position = "absolute";
        this.currentBPM.style.zIndex = 3;
        this.viewPort.appendChild(this.currentBPM);
        this.currentBPM.addEventListener("click", function () {
            app.controls.actView.actBPM.value = that.currentBPM.value;
            that.updateBPM();
        })
        // Execute a function when the user presses a key on the keyboard
        this.currentBPM.addEventListener("keypress", function (event) {
            // If the user presses the "Enter" key on the keyboard
            if (event.key === "Enter") {
                // Cancel the default action, if needed
                event.preventDefault();
                app.controls.actView.actBPM.value = that.currentBPM.value;
                that.updateBPM();
            }
        });

        document.body.appendChild(this.viewPort);

        this.addWindAnimation();
    }

    updateBPM() {
        let bpmData = new Object();
        bpmData.bpm = parseInt(this.currentBPM.value);
        console.log(bpmData);
        for (let i = 0; i < app.ledInfected.arduinoList.objects.length; i++) {
            console.log(app.ledInfected.arduinoList.objects[i])
            app.connection.post("/arduino/" + app.ledInfected.arduinoList.objects[i].config.global.arduino_id + "/set_bpm", JSON.stringify(bpmData));
        }
    }

    initHummeln() {
        //createHummel(this.viewPort);
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
            alert("addAbstract: already found an overview element with the id " + elementID);
        }
    }

    removeAbstract(elementID) {
        let el = this.viewPort.getElementsByClassName(elementID);
        if (el.length == 1) {
            this.viewPort.removeChild(el);
        } else {
            alert("removeAbstract: could not find an overview element with the id " + elementID);
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

        this.actView = new ActView();

        this.actCtrlView = new ActCtrlView();
    }

    showAbstract(abstractID) {
        let abstract = app.ledInfected.abstractList.getAbstract(abstractID);
        if (abstract == null) {
            alert("showAbstract: abstract " + abstractID + "not found");
            return
        }
        this.controlStripes[0].showAbstract(abstract);
    }
}


class PresetSelect {
    constructor(parent) {
        this.parent = parent;
        const that = this;

        this.presetsContainer = this.parent.viewPort.getElementsByClassName("presets_container")[0];
        this.inputButtonSave = this.parent.viewPort.getElementsByClassName("preset_input_button_save")[0];
        this.inputButtonSave.addEventListener('click', function () {
            that.savePreset().then(r => console.log(`Received response: ${r}`))
        });
        this.inputPresetID = this.parent.viewPort.getElementsByClassName("preset_input_preset_id")[0];
        this.inputName = this.parent.viewPort.getElementsByClassName("preset_input_name")[0];
        this.inputIncludeConfig = this.parent.viewPort.getElementsByClassName("preset_input_include_config")[0];
        this.inputIncludePalette = this.parent.viewPort.getElementsByClassName("preset_input_include_palette")[0];
    }

    showPresets() {
        // fixme find a better way to clear the clildren
        this.presetsContainer.innerHTML = "";

        const that = this;

        function loadPresetCallback(preset) {
            that.parent.loadPresetSelectButtonCallback(preset);
            that.inputPresetID.value = preset.preset_id;
            that.inputName.value = preset.name;
            that.inputIncludeConfig.checked = preset.config != null;
            that.inputIncludePalette.checked = preset.palette != null;
        }

        for (let i = 0; i < app.ledInfected.presetList.objects.length; i++) {
            this.presetsContainer.appendChild(app.ledInfected.presetList.objects[i].linkLoadButton(loadPresetCallback))
        }
    }

    async savePreset() {
        if (this.inputPresetID.value != "") {
            let preset = new Object();
            preset.preset_id = this.inputPresetID.value;
            preset.name = this.inputName.value;
            preset.abstract_id = this.parent.linkedAbstract.id
            if (this.inputIncludeConfig.checked == true) {
                preset.config = this.parent.getCurrentConfig()
            }
            if (this.inputIncludePalette.checked == true) {
                preset.palette = this.parent.getCurrentPalette()
            }
            this.parent.savePresetSelectButtonCallback(preset);
        }
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////
// ActCtrlView
// It contains the control interface for acts
//
// Accessible via
//   app.controls
/////////////////////////////////////////////////////////////////////////////////////////////
class ActCtrlView {
    constructor() {
        this.initViewPort();
        this.initElements();

        document.body.appendChild(this.viewPort);
    }

    initViewPort() {
        let htmlTemplate = document.body.getElementsByClassName("act_view_template")[0];
        this.viewPort = htmlTemplate.cloneNode(true);
        this.viewPort.classList.remove("act_view_template", "template");
        this.viewPort.classList.add("act_ctrl_view")
        this.viewPort.style.display = "none";
    }

    initElements() {
        const that = this;
        // the canvas for the stripe svg
        this.actSelectContainer = this.viewPort.getElementsByClassName('act_select_container')[0];
    }

    show() {
        // this.actSelectContainer.innerHTML = "";
        // for (let i = 0; i < app.ledInfected.actList.objects.length; i++) {
        //     if (app.ledInfected.liveAct != null) {
        //         if (app.ledInfected.liveAct.act_id == app.ledInfected.actList.objects[i].config.act_id) {
        //             this.selectAct(app.ledInfected.actList.objects[i])
        //
        //         }
        //     }
        //     this.actSelectContainer.appendChild(app.ledInfected.actList.objects[i].getButtonHTMLElement());
        // }
        // //   this.refreshAct()
        //
        // this.viewPort.style.animation = "fadeInEffect 1s";
        // this.viewPort.style.display = "block";
    }

    selectAct(act) {
        // this.linkedAct = act;
        // this.setAutoUpdate(1);
        //
        // this.refreshAct();
    }

    refreshAct() {
        // this.liveSceneDiv.innerHTML = "";
        // this.scenesView.innerHTML = "";
        //
        // if (this.linkedAct == null) {
        //     this.selectedActActionButtonStart.disabled = true;
        //     this.selectedActActionButtonStop.disabled = true;
        //     this.selectedActActionButtonPause.disabled = true;
        //     this.selectedActActionButtonResume.disabled = true;
        //     this.selectedActActionButtonNextScene.disabled = true;
        //     this.editActBtn.disabled = true;
        //     return
        // }
        // switch (this.linkedAct.config.status.state) {
        //     case "NOT_LIVE":
        //         this.selectedActActionButtonStart.disabled = false;
        //         this.selectedActActionButtonStop.disabled = true;
        //         this.selectedActActionButtonPause.disabled = true;
        //         this.selectedActActionButtonResume.disabled = true;
        //         this.selectedActActionButtonNextScene.disabled = true;
        //         this.editActBtn.disabled = false;
        //         break;
        //     case "RUNNING":
        //         this.selectedActActionButtonStart.disabled = true;
        //         this.selectedActActionButtonStop.disabled = false;
        //         this.selectedActActionButtonPause.disabled = false;
        //         this.selectedActActionButtonResume.disabled = true;
        //         this.selectedActActionButtonNextScene.disabled = false;
        //         this.editActBtn.disabled = true;
        //         break;
        //     case "PAUSED":
        //         this.selectedActActionButtonStart.disabled = true;
        //         this.selectedActActionButtonStop.disabled = false;
        //         this.selectedActActionButtonPause.disabled = true;
        //         this.selectedActActionButtonResume.disabled = false;
        //         this.selectedActActionButtonNextScene.disabled = true;
        //         this.editActBtn.disabled = true;
        //         break;
        // }
        //
        // this.selectedActHeader.innerHTML = this.linkedAct.config.act_id + " (" + this.linkedAct.config.description + ")";
        // this.selectedActStatusState.innerHTML = this.linkedAct.config.status.state;
        // if (this.linkedAct.config.status.active_scene != null) {
        //     this.selectedActStatusActiveSceneID.innerHTML = this.linkedAct.config.status.active_scene.scene_id;
        // } else {
        //     this.selectedActStatusActiveSceneID.innerHTML = "none";
        // }
        //
        // this.scenesView.appendChild(this.linkedAct.getScenesHTMLElement());
        // this.liveSceneDiv.appendChild(this.linkedAct.getActiveSceneHTMLElement());
    }


    setAutoUpdate(timeout) {
        // this.resetAutoUpdate();
        //
        // this.ticker = setInterval(async function () {
        //     await app.ledInfected.listUpdateCallback();
        //     app.controls.actView.refreshAct();
        // }, timeout * 1000);
    }

    resetAutoUpdate() {
        // if (this.ticker != null) {
        //     clearInterval(this.ticker);
        //     this.ticker = null;
        // }
    }

    hide() {
        // this.viewPort.style.animation = "fadeOutEffect 1s";
        // let that = this;
        // // this is to hide and remove the stripe object it after the fade out
        // setTimeout(function () {
        //     that.viewPort.style.display = "none";
        // }, 900);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////
// ActView
// It contains the control interface for acts
//
// Accessible via
//   app.controls
/////////////////////////////////////////////////////////////////////////////////////////////
class ActView {
    constructor() {
        this.initViewPort();
        this.initElements();
        const that = this;
        // window.addEventListener("DOMContentLoaded", () => {
        //     slist(that.viewPort.getElementById("sortlist"));
        // });
        document.body.appendChild(this.viewPort);
    }

    initViewPort() {
        let htmlTemplate = document.body.getElementsByClassName("act_view_template2")[0];
        this.viewPort = htmlTemplate.cloneNode(true);
        this.viewPort.classList.remove("act_view_template");
        this.viewPort.classList.add("actView")
        this.viewPort.style.display = "none";
    }

    initElements() {
        const that = this;
        // the canvas for the stripe svg
        this.actSelectContainer = this.viewPort.getElementsByClassName('act_select_container')[0];

        this.selectedActHeader = this.viewPort.getElementsByClassName('act_view_header')[0];

        this.selectedActStatusState = this.viewPort.getElementsByClassName('act_view_status_state')[0];
        this.selectedActStatusActiveSceneID = this.viewPort.getElementsByClassName('act_view_status_active_scene_id')[0];

        this.actBPM = this.viewPort.getElementsByClassName('act_bpm_select')[0];
        this.actBPM.addEventListener('click', function () {
            app.overview.currentBPM.value = that.actBPM.value;
            app.overview.updateBPM();
        });
        // Execute a function when the user presses a key on the keyboard
        this.actBPM.addEventListener("keypress", function (event) {
            // If the user presses the "Enter" key on the keyboard
            if (event.key === "Enter") {
                // Cancel the default action, if needed
                event.preventDefault();
                app.overview.currentBPM.value = that.actBPM.value;
                app.overview.updateBPM();
            }
        });

        this.actBrightness = this.viewPort.getElementsByClassName('act_brightness_select')[0];
        this.actBrightness.addEventListener('input', function () {
            if (that.linkedAct != null) {
                that.linkedAct.setBrightness(that.actBrightness.value)
            }
            // for (let i = 0; app.ledInfected.abstractList.objects.length; i++) {
            //     app.ledInfected.abstractList.objects[i].setBrightness(that.actBrightness.value)
            // }
        });

        this.selectedActActionButtonStart = this.viewPort.getElementsByClassName('act_view_action_start')[0];
        this.selectedActActionButtonStart.addEventListener('click', async function () {
            if (that.linkedAct == null) {
                alert("No Act selected");
                return
            }
            if (app.ledInfected.liveAct != null) {
                if (app.ledInfected.liveAct.act_id != that.linkedAct.id) {
                    let confirmAction = confirm("Act '" + app.ledInfected.liveAct.act_id + "' is already live. Interrupt it and start act '" + that.linkedAct.id + "'?");
                    if (confirmAction) {
                        await app.connection.post("/act/" + app.ledInfected.liveAct.act_id + "/stop");
                    } else {
                        return;
                    }
                }
            }
            await app.connection.post("/act/" + that.linkedAct.id + "/start");
            await app.ledInfected.listUpdateCallback();
            that.refreshAct();
        });
        this.selectedActActionButtonStop = this.viewPort.getElementsByClassName('act_view_action_stop')[0];
        this.selectedActActionButtonStop.addEventListener('click', async function () {
            if (that.linkedAct == null) {
                alert("No Act selected");
                return
            }
            let resp = await app.connection.post("/act/" + that.linkedAct.id + "/stop")
            await app.ledInfected.listUpdateCallback();
            that.refreshAct();
        });
        this.selectedActActionButtonPause = this.viewPort.getElementsByClassName('act_view_action_pause')[0];
        this.selectedActActionButtonPause.addEventListener('click', async function () {
            if (that.linkedAct == null) {
                alert("No Act selected");
                return
            }
            let resp = await app.connection.post("/act/" + that.linkedAct.id + "/pause")
            await app.ledInfected.listUpdateCallback();
            that.refreshAct();
        });
        this.selectedActActionButtonResume = this.viewPort.getElementsByClassName('act_view_action_resume')[0];
        this.selectedActActionButtonResume.addEventListener('click', async function () {
            if (that.linkedAct == null) {
                alert("No Act selected");
                return
            }
            let resp = await app.connection.post("/act/" + that.linkedAct.id + "/resume")
            await app.ledInfected.listUpdateCallback();
            that.refreshAct();
        });
        this.selectedActActionButtonNextScene = this.viewPort.getElementsByClassName('act_view_action_next_scene')[0];
        this.selectedActActionButtonNextScene.addEventListener('click', async function () {
            if (that.linkedAct == null) {
                alert("No Act selected");
                return
            }
            let resp = await app.connection.post("/act/" + that.linkedAct.id + "/trigger/next/trigger");
            await sleep(300);
            await app.ledInfected.listUpdateCallback();
            that.refreshAct();
        });

        this.liveSceneDiv = this.viewPort.getElementsByClassName('act_view_live_scene')[0];
        this.scenesView = this.viewPort.getElementsByClassName('act_view_scenes')[0];

        this.sceneEditView = this.viewPort.getElementsByClassName('act_view_edit_scene')[0];

        this.sceneEditViewSceneID = this.viewPort.getElementsByClassName('act_view_edit_scene_scene_id')[0];
        this.sceneEditViewSceneDescription = this.viewPort.getElementsByClassName('act_view_edit_scene_scene_description')[0];
        this.sceneEditViewEffects = this.viewPort.getElementsByClassName('act_view_edit_scene_effects')[0];
        this.sceneEditViewEffectAddButton = this.viewPort.getElementsByClassName('act_view_edit_scene_effect_add')[0];

        function addEffect() {
            // this is not correct, need to cleanup
            let effect = new ActSceneEffectObject(null);

            app.controls.actView.sceneEditViewEffects.appendChild(effect.getSceneEditEffectHTMLElements());
        }

        this.sceneEditViewEffectAddButton.addEventListener("click", addEffect);

        this.sceneEditViewTransitions = this.viewPort.getElementsByClassName('act_view_edit_scene_transitions')[0];
        this.sceneEditViewTransitionAddButton = this.viewPort.getElementsByClassName('act_view_edit_scene_transition_add')[0];

        function addTransition() {
            // this is not correct, need to cleanup
            let transition = new ActSceneTransitionObject(that.linkedAct, null);

            app.controls.actView.sceneEditViewTransitions.appendChild(transition.getSceneEditTransitionHTMLElements());
        }

        this.sceneEditViewTransitionAddButton.addEventListener("click", addTransition);
        this.sceneEditViewApply = this.viewPort.getElementsByClassName('act_view_edit_scene_apply')[0];
        this.sceneEditViewApply.addEventListener('click', function () {
            that.applyEditScene();
        });

        this.sceneEditViewSave = this.viewPort.getElementsByClassName('act_view_edit_scene_save')[0];
        this.sceneEditViewSave.addEventListener('click', function () {
            that.saveEditScene();
        });
        this.sceneEditViewDiscard = this.viewPort.getElementsByClassName('act_view_edit_scene_discard')[0];
        this.sceneEditViewDiscard.addEventListener("click", function () {
        });

        this.refreshButton = this.viewPort.getElementsByClassName('act_view_refresh_button')[0];
        this.refreshButton.addEventListener('click', async function () {
            await app.ledInfected.listUpdateCallback();
            that.refreshAct();
        });

        this.editActBtn = this.viewPort.getElementsByClassName("act_view_edit_act")[0];
        this.editActBtn.addEventListener('click', function () {
            if (that.linkedAct == null) {
                alert("No Act selected");
                return;
            }
            window.location.href = "/act?act_id=" + that.linkedAct.id;
        });

        this.closeBtn = this.viewPort.getElementsByClassName("live_act_close_btn")[0];
        this.closeBtn.style = "margin-left: auto;"
        this.closeBtn.addEventListener('click', function () {
            that.resetAutoUpdate();
            that.hide();
        });
    }

    applyEditScene() {
        let sceneConfig = this.getEditScene();
        let sceneObject = new ActSceneObject(this.linkedAct, sceneConfig);
        sceneObject.applyEffect()
        console.log(sceneConfig)
    }

    async saveEditScene() {
        let sceneConfig = this.getEditScene();

        await app.connection.post("/act/" + this.linkedAct.id + "/update_scene", JSON.stringify(sceneConfig));

        let actConfig = await app.connection.get("/act/" + this.linkedAct.id);
        for (let i = 0; i < app.ledInfected.actList.objects.length; i++) {
            if (app.ledInfected.actList.objects[i].id == actConfig.act_id) {
                let updatedAct = new ActObject(actConfig);
                app.ledInfected.actList.objects[i] = updatedAct;
                app.controls.actView.selectAct(updatedAct);
            }
        }
    }

    getEditScene() {
        let sceneConfig = new Object();
        sceneConfig.scene_id = this.sceneEditViewSceneID.value;
        sceneConfig.description = this.sceneEditViewSceneDescription.value;

        sceneConfig.effects = [];
        let effectsHTML = this.sceneEditViewEffects.children
        for (let i = 0; i < effectsHTML.length; i++) {
            let newEffect = new Object();
            newEffect.abstract_id = effectsHTML[i].getElementsByClassName("scene_effect_edit_abstract_id")[0].value;

            let stripeIDs = effectsHTML[i].getElementsByClassName("scene_effect_edit_stipe_ids")[0]
            newEffect.stripe_ids = [];
            for (var option of stripeIDs.options) {
                if (option.selected) {
                    newEffect.stripe_ids.push(option.value)
                }
            }

            newEffect.effect_type = effectsHTML[i].getElementsByClassName("scene_effect_edit_effect_type")[0].value;

            if (newEffect.effect_type == "preset") {
                newEffect.preset_id = effectsHTML[i].getElementsByClassName("scene_effect_edit_preset_id")[0].value;
            } else if (newEffect.effect_type == "speed") {
                newEffect.effect_value = parseInt(effectsHTML[i].getElementsByClassName("scene_effect_edit_effect_speed")[0].value);
            } else if (newEffect.effect_type == "stretch") {
                newEffect.effect_value = parseInt(effectsHTML[i].getElementsByClassName("scene_effect_edit_effect_stretch")[0].value);
            } else if (newEffect.effect_type == "overlay") {
                newEffect.effect_value = parseInt(effectsHTML[i].getElementsByClassName("scene_effect_edit_effect_overlay")[0].value);
            }
            sceneConfig.effects.push(newEffect);
        }

        sceneConfig.transitions = [];
        let transitionsHTML = this.sceneEditViewTransitions.children
        for (let i = 0; i < transitionsHTML.length; i++) {
            let newTransition = new Object();
            newTransition.scene_id = transitionsHTML[i].getElementsByClassName("scene_transition_edit_scene_id")[0].value;

            newTransition.trigger = new Object();
            if (transitionsHTML[i].getElementsByClassName("scene_transition_edit_trigger_type")[0].checked == true) {
                newTransition.trigger.timeout_s = parseInt(transitionsHTML[i].getElementsByClassName("scene_transition_edit_trigger_timeout_s")[0].value);
                newTransition.trigger.timeout_max_s = parseInt(transitionsHTML[i].getElementsByClassName("scene_transition_edit_trigger_timeout_max_s")[0].value);
            } else {
                newTransition.trigger.act_trigger_id = transitionsHTML[i].getElementsByClassName("scene_transition_edit_trigger_act_trigger_id")[0].value;
            }
            sceneConfig.transitions.push(newTransition);
        }
        return sceneConfig
    }

    hideSceneDetail() {
        this.sceneEditView.setAttribute("hidden", true);
    }

    showSceneDetail() {
        this.sceneEditView.removeAttribute("hidden");
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
            function () {
                el.value = resetValue;
                that.sendConfig();
                that.resetTimer = null;
            }, timeout);
    }

    show() {
        this.actSelectContainer.innerHTML = "";
        for (let i = 0; i < app.ledInfected.actList.objects.length; i++) {
            if (app.ledInfected.liveAct != null) {
                if (app.ledInfected.liveAct.act_id == app.ledInfected.actList.objects[i].config.act_id) {
                    this.selectAct(app.ledInfected.actList.objects[i])

                }
            }
            this.actSelectContainer.appendChild(app.ledInfected.actList.objects[i].getButtonHTMLElement());
        }

        // update the bpm
        this.actBPM.value = app.overview.currentBPM.value;

        this.refreshAct()

        this.viewPort.style.animation = "fadeInEffect 1s";
        this.viewPort.style.display = "block";
    }

    selectAct(act) {
        this.linkedAct = act;
        this.setAutoUpdate(1);

        this.refreshAct();
    }

    refreshAct() {
        this.liveSceneDiv.innerHTML = "";
        this.scenesView.innerHTML = "";

        if (this.linkedAct == null) {
            this.selectedActActionButtonStart.disabled = true;
            this.selectedActActionButtonStop.disabled = true;
            this.selectedActActionButtonPause.disabled = true;
            this.selectedActActionButtonResume.disabled = true;
            this.selectedActActionButtonNextScene.disabled = true;
            this.editActBtn.disabled = true;
            return
        }
        switch (this.linkedAct.config.status.state) {
            case "NOT_LIVE":
                this.selectedActActionButtonStart.disabled = false;
                this.selectedActActionButtonStop.disabled = true;
                this.selectedActActionButtonPause.disabled = true;
                this.selectedActActionButtonResume.disabled = true;
                this.selectedActActionButtonNextScene.disabled = true;
                this.editActBtn.disabled = false;
                break;
            case "RUNNING":
                this.selectedActActionButtonStart.disabled = true;
                this.selectedActActionButtonStop.disabled = false;
                this.selectedActActionButtonPause.disabled = false;
                this.selectedActActionButtonResume.disabled = true;
                this.selectedActActionButtonNextScene.disabled = false;
                this.editActBtn.disabled = true;
                break;
            case "PAUSED":
                this.selectedActActionButtonStart.disabled = true;
                this.selectedActActionButtonStop.disabled = false;
                this.selectedActActionButtonPause.disabled = true;
                this.selectedActActionButtonResume.disabled = false;
                this.selectedActActionButtonNextScene.disabled = true;
                this.editActBtn.disabled = true;
                break;
        }

        this.selectedActHeader.innerHTML = this.linkedAct.config.act_id + " (" + this.linkedAct.config.description + ")";
        this.selectedActStatusState.innerHTML = this.linkedAct.config.status.state;
        if (this.linkedAct.config.status.active_scene != null) {
            this.selectedActStatusActiveSceneID.innerHTML = this.linkedAct.config.status.active_scene.scene_id;
        } else {
            this.selectedActStatusActiveSceneID.innerHTML = "none";
        }

        this.scenesView.appendChild(this.linkedAct.getScenesHTMLElement());
        this.liveSceneDiv.appendChild(this.linkedAct.getActiveSceneHTMLElement());
    }

    setAutoUpdate(timeout) {
        this.resetAutoUpdate();

        this.ticker = setInterval(async function () {
            await app.ledInfected.listUpdateCallback();
            app.controls.actView.refreshAct();
        }, timeout * 1000);
    }

    resetAutoUpdate() {
        if (this.ticker != null) {
            clearInterval(this.ticker);
            this.ticker = null;
        }
    }

    hide() {
        this.viewPort.style.animation = "fadeOutEffect 1s";
        let that = this;
        // this is to hide and remove the stripe object it after the fade out
        setTimeout(function () {
            that.viewPort.style.display = "none";
        }, 900);
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

        this.presetSelect = new PresetSelect(this);

        document.body.appendChild(this.viewPort);
    }

    initViewPort() {
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
        this.stripeStretchDiv = this.viewPort.getElementsByClassName("parameter_ctrl_stripe_stretch_div")[0];

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

        // // MOA meier fixme: this is just temporary
        // this.presetViewPort = this.viewPort.getElementsByClassName("preset_select_viewport")[0];
        // this.presetViewPort.style.display = "none";

        this.loadPresetBtn = this.viewPort.getElementsByClassName("show_load_preset_btn")[0];
        // MOA meier fixme: overlay disabled for now, it makes more bad then good
        this.loadPresetBtn.style.display = "none";
        // this.loadPresetBtn.addEventListener('click', function () {
        //     that.showLoadPreset();
        // });
        this.savePresetBtn = this.viewPort.getElementsByClassName("show_save_preset_btn")[0];
        this.savePresetBtn.addEventListener('click', function () {
            that.saveConfig();
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

        this.closeBtn = this.viewPort.getElementsByClassName("controls_close_btn")[0];
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
            function () {
                el.value = resetValue;
                that.sendConfig();
                that.resetTimer = null;
            }, timeout);
    }

    showAbstract(abstract) {
        this.linkedAbstract = abstract;

        this.presetSelect.showPresets();

        // show the stripe in the view
        // let svg = this.linkedAbstract.stripeView.getSVGElement()
        // let svgMin = this.linkedAbstract.stripeView.getSVGMinElement()
        // MOA meier fixme: Simplify UI for now
        // if (this.linkedAbstract.config.stripes.length == 1) {
        //     this.stripesSelectCanvasMax.style.display = "none";
        //     this.stripesSelectCanvasMin.style.display = "block";
        // } else {
        this.stripesSelectCanvasMax.style.display = "block";
        this.stripesSelectCanvasMin.style.display = "none";
        // }
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

    loadPresetByPresetID(presetID) {
        for (let i = 0; i < app.ledInfected.presetList.objects.length; i++) {
            if (app.ledInfected.presetList.objects[i].config.preset_id == presetID) {
                this.loadPresetSelectButtonCallback(app.ledInfected.presetList.objects[i].config)
                return
            }
        }
        alert("preset not found")
    }

    // MOA fixme preset
    loadPresetSelectButtonCallback(preset) {
        let config = Object();
        if (preset.config != null) {
            config.config = preset.config;
        }
        if (preset.palette != null) {
            config.palette = preset.palette;
        }
        this.applyConfig(config);
        // set the config in the UI and send it to all selected arduinos
        if (preset.config != null) {
            this.sendConfig();
        }
        if (preset.palette != null) {
            this.sendPattern();
        }
    }

    // MOA fixme preset
    savePresetSelectButtonCallback(preset) {
        let obj = new Object();
        obj.config = preset;

        obj.apiPath = "/preset";

        app.connection.post(obj.apiPath, JSON.stringify(obj.config));
    }

    applyConfig(newConfig) {
        this.stripeOverlayDiv.style.display = "none";
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
        sendAbstractPalette(this.linkedAbstract.id, selectedStripes, this.getCurrentPalette());
    }

    sendConfig() {
        let selectedStripes = this.linkedAbstract.getSelectedStripes();
        sendAbstractConfig(this.linkedAbstract.id, selectedStripes, this.getCurrentConfig());
    }

    saveConfig() {
        let selectedStripes = this.linkedAbstract.getSelectedStripes();

        if (selectedStripes.length == 0) {
            alert("no stripes selected")
            return;
        }

        let obj = new Object();
        obj.apiPath = "/abstract/" + this.linkedAbstract.id + "/stripes/save";

        obj.config = new Object();
        obj.config.stripe_ids = selectedStripes;

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
        // MOA meier fixme: this is only for temporary better usability
        this.toggleSvgEl.style.display = "none";
        this.toggleSvgEl.addEventListener('click', function () {
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
            // MOA meier fixme: this is only for temporary better usability
            canvasMax.style.display = "none";
            canvasMin.style.display = "block";

            // register the basic toggle callback
            this.toggleSvgEl = this.parent.viewPort.getElementsByClassName('toggle_pattern_canvas_btn')[0];
            // MOA meier fixme: this is only for temporary better usability
            this.toggleSvgEl.style.display = "none";
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
            // let segMode = (segment % 4);
            // if ( segMode == 0) {
            //     this.parent.segments_l0[segment + 1].state = this.state;
            //     this.parent.segments_l0[segment + 2].state = this.state;
            //     this.parent.segments_l0[segment + 3].state = this.state;
            // } else if ( segMode == 1) {
            //     this.parent.segments_l0[segment - 1].state = this.state;
            //     this.parent.segments_l0[segment + 1].state = this.state;
            //     this.parent.segments_l0[segment + 2].state = this.state;
            // } else if ( segMode == 2) {
            //     this.parent.segments_l0[segment - 2].state = this.state;
            //     this.parent.segments_l0[segment - 1].state = this.state;
            //     this.parent.segments_l0[segment + 1].state = this.state;
            // } else {
            //     this.parent.segments_l0[segment - 3].state = this.state;
            //     this.parent.segments_l0[segment - 2].state = this.state;
            //     this.parent.segments_l0[segment - 1].state = this.state;
            // }
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

    getColor(index) {
        for (let i = 0; i < this.palette.palette.length; i++) {
            if (index == this.palette.palette[i].index) {
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

function sendAbstractPalette(abstract_id, stripe_ids, palette) {
    if (stripe_ids.length == 0) {
        alert("no stripes selected")
        return;
    }

    let obj = new Object();
    obj.config = new Object();

    obj.apiPath = "/abstract/" + abstract_id + "/stripes/palette";
    obj.config.stripe_ids = stripe_ids;
    if (palette.palette == null) {
        obh.config.palette = new Object();
        obj.config.palette.palette = palette;
    } else {
        obj.config.palette = palette;
    }

    app.connection.post(obj.apiPath, JSON.stringify(obj.config));
}

async function sendAbstractConfig(abstract_id, stripe_ids, config) {
    if (stripe_ids.length == 0) {
        alert("no stripes selected")
        return;
    }

    let obj = new Object();
    obj.apiPath = "/abstract/" + abstract_id + "/stripes/config";

    obj.config = new Object();
    obj.config.stripe_ids = stripe_ids;
    obj.config.config = config;

    await app.connection.post(obj.apiPath, JSON.stringify(obj.config));
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

            hummel.speed = maxSpeed;
        } else if (hummel.posX > maxX) {
            hummel.direction = getRandomInt(225, 315);

            hummel.speed = maxSpeed;
        } else if (hummel.posY < minY) {
            hummel.direction = getRandomInt(135, 225);
            hummel.speed = maxSpeed;
        } else if (hummel.posY > maxY) {
            hummel.direction = getRandomInt(-45, 45);

            hummel.speed = maxSpeed;
        } else {
            let seed = getRandomInt(0, 1000)
            if (seed == 0) {
                let oldSpeed = hummel.Speed;
                hummel.speed = getRandomInt(0, 100);
            } else if (seed == 1) {
                hummel.direction = getRandomInt(0, 360);
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
            } else if ((seed > 100) && (seed < 200)) {
                hummel.direction += getRandomInt(-2, 2);
            }
        }

        hummel.direction += getRandomInt(-1, 1);

        if (hummel.loopEnd > 0) {
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

        hummel.elements.hummel.style.left = hummel.posX + "px";
        hummel.elements.hummel.style.top = hummel.posY + "px";
        hummel.elements.hummel.style.transform = "rotate(" + (hummel.direction - 45) + "deg)"
    }
}

function createHummel(parentElement) {
    new Hummel("123", parentElement)
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

function slist(target) {
    // (A) SET CSS + GET ALL LIST ITEMS
    target.classList.add("slist");
    let items = target.getElementsByTagName("li"), current = null;

    // (B) MAKE ITEMS DRAGGABLE + SORTABLE
    for (let i of items) {
        // (B1) ATTACH DRAGGABLE
        i.draggable = true;

        // (B2) DRAG START - YELLOW HIGHLIGHT DROPZONES
        i.ondragstart = (ev) => {
            current = i;
            for (let it of items) {
                if (it != current) {
                    it.classList.add("hint");
                }
            }
        };

        // (B3) DRAG ENTER - RED HIGHLIGHT DROPZONE
        i.ondragenter = (ev) => {
            if (i != current) {
                i.classList.add("active");
            }
        };

        // (B4) DRAG LEAVE - REMOVE RED HIGHLIGHT
        i.ondragleave = () => {
            i.classList.remove("active");
        };

        // (B5) DRAG END - REMOVE ALL HIGHLIGHTS
        i.ondragend = () => {
            for (let it of items) {
                it.classList.remove("hint");
                it.classList.remove("active");
            }
        };

        // (B6) DRAG OVER - PREVENT THE DEFAULT "DROP", SO WE CAN DO OUR OWN
        i.ondragover = (evt) => {
            evt.preventDefault();
        };

        // (B7) ON DROP - DO SOMETHING
        i.ondrop = (evt) => {
            evt.preventDefault();
            if (i != current) {
                let currentpos = 0, droppedpos = 0;
                for (let it = 0; it < items.length; it++) {
                    if (current == items[it]) {
                        currentpos = it;
                    }
                    if (i == items[it]) {
                        droppedpos = it;
                    }
                }
                if (currentpos < droppedpos) {
                    i.parentNode.insertBefore(current, i.nextSibling);
                } else {
                    i.parentNode.insertBefore(current, i);
                }
            }
        };
    }
}