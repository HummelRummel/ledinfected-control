package main

import (
	"fmt"
	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/mqtt"
	"net/http"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/hummelapi"
)

type (
	apiServer struct {
		customSerialDev string

		mqttCore  *mqtt.Core
		Arduinos  []*hummelapi.LEDInfectedArduino  `json:"arduinos"`
		Abstracts []*hummelapi.LEDInfectedAbstract `json:"abstracts"`
		Presets   []*hummelapi.LEDInfectedPreset   `json:"presets"`
		Acts      []*hummelapi.LEDInfectedAct      `json:"acts"`
		LiveAct   *hummelapi.LEDInfectedAct        `json:"live_act"`

		engine *gin.Engine
		stop_  chan struct{}
	}
)

func newApiServer(customSerialDev string) (*apiServer, error) {
	mqttCore, err := mqtt.NewCore("tcp://localhost:1883")
	if err != nil {
		return nil, err
	}

	o := &apiServer{
		mqttCore:        mqttCore,
		customSerialDev: customSerialDev,
		Presets:         hummelapi.GetAllPresets(),

		engine: gin.Default(),
		stop_:  make(chan struct{}),
	}

	abstracts, err := hummelapi.GetAllLEDInfectedAbstracts("./configs", o.getPreset, mqttCore)
	if err != nil {
		return nil, err
	}
	o.Abstracts = abstracts

	o.Acts = hummelapi.GetAllActs(o.getAllAbstracts)

	return o, nil
}

func (o *apiServer) run() {
	wg := sync.WaitGroup{}

	o.registerRestAPIEndpoints()
	o.registerWebEndpoints()

	wg.Add(1)
	go func() {
		defer wg.Done()
		topics := []string{"ledinfected/all/#"}
		for _, a := range o.Abstracts {
			topics = append(topics, fmt.Sprintf("ledinfected/%s/#", a.AbstractID))
		}
		o.mqttCore.Run("ledinfected", topics, o.mqttUpdateStatus)
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		o.arduinoConnectionHandler()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		o.engine.Run(":8080")
	}()

	wg.Wait()
}

func (o *apiServer) mqttUpdateStatus() {
	for _, a := range o.Abstracts {
		if err := a.MQTTUpdateStatus(); err != nil {
			fmt.Printf("ERROR: failed to update mqtt status topic for abstract %s", a.AbstractID)
		}
	}
}

func (o *apiServer) registerRestAPIEndpoints() {
	o.engine.GET("/api", o.getAllCallback)
	o.engine.POST("/api/sync", o.syncCallback)
	o.engine.GET("/api/arduino", o.getAllArduinosCallback)
	o.engine.GET("/api/arduino/:ArduinoId", o.getArduinoByIDCallback)
	o.engine.POST("/api/arduino/:ArduinoId/set_id", o.setArduinoIDCallback)
	o.engine.POST("/api/arduino/:ArduinoId/set_bpm", o.setArduinoBPMCallback)
	o.engine.POST("/api/arduino/:ArduinoId/stripe/:StripeId/setup", o.setArduinoStripeSetupCallback)
	//o.engine.POST("/api/arduino/:ArduinoId/stripe/:StripeId/setup/save", o.saveArduinoStripeSetupCallback)
	o.engine.POST("/api/arduino/:ArduinoId/stripe/:StripeId/config", o.setArduinoStripeConfigCallback)
	o.engine.POST("/api/arduino/:ArduinoId/stripe/:StripeId/palette", o.setArduinoStripePaletteConfigCallback)
	o.engine.POST("/api/arduino/:ArduinoId/stripe/:StripeId/save", o.saveArduinoStripeConfigCallback)
	o.engine.GET("/api/abstract", o.getAllAbstractsCallback)
	o.engine.GET("/api/abstract/:AbstractId", o.getAbstractByIDCallback)
	o.engine.POST("/api/abstract/:AbstractId/setup", o.setAbstractSetupCallback)
	o.engine.POST("/api/abstract/:AbstractId/setup/save", o.saveAbstractCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/config", o.setAbstractStripeConfigMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/palette", o.setAbstractStripePaletteMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/config-brightness", o.setAbstractStripeConfigBrightnessMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/config-speed", o.setAbstractStripeConfigSpeedMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/config-stretch", o.setAbstractStripeConfigStretchMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/config-overlay", o.setAbstractStripeConfigOverlayMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/save", o.setAbstractStripeSaveMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/preset/:PresetId", o.setAbstractPresetMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:StripeId/setup", o.setAbstractStripeSetupCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:StripeId/setup/save", o.saveAbstractCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:StripeId/config", o.setAbstractStripeConfigByIDCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:StripeId/config/save", o.saveAbstractStripeCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:StripeId/palette", o.setAbstractStripePaletteByIDCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:StripeId/palette/save", o.saveAbstractStripeCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:StripeId/preset/:PresetId", o.setAbstractPresetCallback)
	o.engine.GET("/api/preset", o.getAllPresetsCallback)
	o.engine.POST("/api/preset", o.updatePresetCallback)
	o.engine.PATCH("/api/preset", o.updatePresetCallback)
	o.engine.GET("/api/act", o.getAllActsCallback)
	o.engine.POST("/api/act", o.updateActCallback)
	o.engine.GET("/api/act/:ActId", o.getActCallback)
	//	o.engine.POST("/api/act/new", o.newActCallback)
	o.engine.GET("/api/act/:ActId/status", o.getActStatusCallback)
	o.engine.POST("/api/act/:ActId/start", o.startActCallback)
	o.engine.POST("/api/act/:ActId/stop", o.stopActCallback)
	o.engine.POST("/api/act/:ActId/pause", o.pauseActCallback)
	o.engine.POST("/api/act/:ActId/resume", o.resumeActCallback)
	o.engine.POST("/api/act/:ActId/brightness", o.setActBrightnessCallback)
	o.engine.GET("/api/act/:ActId/trigger", o.getAllActTriggersCallback)
	o.engine.GET("/api/act/:ActId/trigger/:TriggerId", o.getActTriggerCallback)
	o.engine.POST("/api/act/:ActId/trigger/:TriggerId/trigger", o.triggerActTriggerCallback)
	o.engine.POST("/api/act/:ActId/update_scene", o.postActUpdateSceneCallback)
	o.engine.POST("/api/act/:ActId/scene/:SceneId/jump", o.postJumpToScene)
	//o.engine.GET("/api/act/:ActId/scene", o.getAllScenesCallback)
	//o.engine.GET("/api/act/:ActId/scene/:SceneId", o.getSceneCallback)
	//o.engine.GET("/api/act/:ActId/scene/:SceneId/status", o.getSceneStatusCallback)
	//o.engine.GET("/api/act/:ActId/scene/:SceneId/effect", o.getAllSceneEffectsCallback)
	//o.engine.POST("/api/act/:ActId/scene/:SceneId/effect", o.newSceneEffectsCallback)
	//o.engine.GET("/api/act/:ActId/scene/:SceneId/effect/:EffectId", o.getSceneEffectCallback)
	//o.engine.PATCH("/api/act/:ActId/scene/:SceneId/effect/:EffectId", o.patchSceneEffectCallback)
	//o.engine.DELETE("/api/act/:ActId/scene/:SceneId/effect/:EffectId", o.deleteSceneEffectCallback)
	////o.engine.POST("/api/act/:ActId/scene/:SceneId/start", o.startSceneCallback)
	////o.engine.POST("/api/act/:ActId/scene/:SceneId/next", o.nextSceneCallback)
	//o.engine.GET("/api/act/:ActId/scene/:SceneId/effect", o.getAllSceneEffectsCallback)
	//
	//o.engine.GET("/api/act/:ActId/scene/:SceneId/trigger", o.getAllSceneTriggersCallback)
	//o.engine.GET("/api/act/:ActId/scene/:SceneId/trigger/:TriggerId", o.getSceneTriggerCallback)
	//o.engine.POST("/api/act/:ActId/scene/:SceneId/trigger/:TriggerId/trigger", o.triggerSceneTriggerCallback)
}

func (o *apiServer) registerWebEndpoints() {
	o.engine.Static("/assets", "./assets")
	o.engine.StaticFile("/", "./html/index.html")
	o.engine.StaticFile("/act", "./html/act/static/index.html")
	o.engine.Static("/act/static", "./html/act/static")
}

func (o *apiServer) getAllCallback(c *gin.Context) {
	o.updateTimer()
	c.JSON(http.StatusOK, o)
	return
}

func (o *apiServer) stop() {
	close(o.stop_)
}

func (o *apiServer) arduinoConnectionHandler() {
	ticker := time.NewTicker(time.Second)

	for {
		select {
		case <-ticker.C:
			var matches []string
			if o.customSerialDev != "" {
				matches = []string{o.customSerialDev}
			} else {
				var err error
				matches, err = filepath.Glob(serialGlobPath)

				if err != nil {
					time.Sleep(time.Second * 10)
					continue

				}
			}

			for _, devFile := range matches {
				alreadyAdded := false
				for _, arduino := range o.Arduinos {
					if arduino.GetDevFile() == devFile {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					fmt.Printf("trying to connect arduino connected via dev-file %s\n", devFile)
					arduino, err := hummelapi.NewLEDInfectedArduino(devFile, o.mqttCore)
					if err != nil {
						fmt.Printf("xfailed to get arduino: %s\n", err)
					} else {
						for _, a := range o.Abstracts {
							if err := a.UpdateArduino(arduino); err != nil {
								fmt.Printf("failed to set arduino in abstract %s: %s\n", a.AbstractID, err)
							}
						}
						for _, a := range o.Acts {
							if err := a.UpdateArduino(arduino); err != nil {
								fmt.Printf("failed to set arduino in act %string: %s\n", a.ActID, err)
							}
						}
						o.Arduinos = append(o.Arduinos, arduino)
					}
				}
			}
			// fixme bad way to do it will recreate slices all the time
			var ardus []*hummelapi.LEDInfectedArduino

			for _, arduino := range o.Arduinos {
				found := false
				for _, devFile := range matches {
					if arduino.GetDevFile() == devFile {
						found = true
						break
					}
				}
				if !found {
					fmt.Printf("trying to remove arduino connected via dev-file %s\n", arduino.GetDevFile())
					for _, a := range o.Abstracts {
						a.ResetArduino(arduino)
					}
					arduino.Close()
				} else {
					ardus = append(ardus, arduino)
				}
			}
			o.Arduinos = ardus
		case <-o.stop_:
			return
		}
	}
}

func (o *apiServer) getAllAbstracts() []*hummelapi.LEDInfectedAbstract {
	return o.Abstracts
}

func (o *apiServer) setLiveAct(act *hummelapi.LEDInfectedAct) {
	o.LiveAct = act
}

func (o *apiServer) updateTimer() {
	for _, a := range o.Acts {
		a.UpdateTimer()
	}
}

func jsonError(err error) string {
	return fmt.Sprintf("{\"error\": \"%s\"}", err)
}
