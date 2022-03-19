package main

import (
	"fmt"
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

		nodeID     string
		nodeAreaID string

		Arduinos  []*hummelapi.LEDInfectedArduino  `json:"arduinos"`
		Abstracts []*hummelapi.LEDInfectedAbstract `json:"abstracts"`
		Presets   []*hummelapi.LEDInfectedPreset   `json:"presets"`

		engine *gin.Engine
		stop_  chan struct{}
	}
)

func newApiServer(customSerialDev string) (*apiServer, error) {
	abstracts, err := hummelapi.GetAllLEDInfectedAbstracts("./configs")
	if err != nil {
		return nil, err
	}

	o := &apiServer{
		customSerialDev: customSerialDev,
		Abstracts:       abstracts,
		Presets:         hummelapi.GetAllPresets(),

		engine: gin.Default(),
		stop_:  make(chan struct{}),
	}

	return o, nil
}

func (o *apiServer) run() {
	wg := sync.WaitGroup{}

	o.registerRestAPIEndpoints()
	o.registerWebEndpoints()

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

func (o *apiServer) registerRestAPIEndpoints() {
	o.engine.GET("/api", o.getAllCallback)
	o.engine.POST("/api/sync", o.syncCallback)
	o.engine.GET("/api/arduino", o.getAllArduinosCallback)
	o.engine.GET("/api/arduino/:ArduinoId", o.getArduinoByIDCallback)
	o.engine.POST("/api/arduino/:ArduinoId/set_id", o.setArduinoIDCallback)
	o.engine.POST("/api/arduino/:ArduinoId/stripe/:ArduinoStripeId/setup", o.setArduinoStripeSetupCallback)
	//o.engine.POST("/api/arduino/:ArduinoId/stripe/:StripeId/setup/save", o.saveArduinoStripeSetupCallback)
	o.engine.POST("/api/arduino/:ArduinoId/stripe/:ArduinoStripeId/config", o.setArduinoStripeConfigCallback)
	o.engine.POST("/api/arduino/:ArduinoId/stripe/:ArduinoStripeId/palette", o.setArduinoStripePaletteConfigCallback)
	o.engine.POST("/api/arduino/:ArduinoId/stripe/:ArduinoStripeId/save", o.saveArduinoStripeConfigCallback)
	o.engine.GET("/api/abstract", o.getAllAbstractsCallback)
	o.engine.GET("/api/abstract/:AbstractId", o.getAbstractByIDCallback)
	o.engine.POST("/api/abstract/:AbstractId/setup", o.setAbstractSetupCallback)
	o.engine.POST("/api/abstract/:AbstractId/setup/save", o.saveAbstractCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/config", o.setAbstractStripeConfigMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripes/palette", o.setAbstractStripePaletteMultiCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:AbstractStripeId/setup", o.setAbstractStripeSetupCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:AbstractStripeId/setup/save", o.saveAbstractCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:AbstractStripeId/config", o.setAbstractStripeConfigByIDCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:AbstractStripeId/config/save", o.saveAbstractStripeCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:AbstractStripeId/palette", o.setAbstractStripePaletteByIDCallback)
	o.engine.POST("/api/abstract/:AbstractId/stripe/:AbstractStripeId/palette/save", o.saveAbstractStripeCallback)
	o.engine.GET("/api/presets", o.getAllPresetsCallback)
	o.engine.POST("/api/presets", o.setPresetCallback)

	o.engine.GET("/api/v2", o.getAllCallback)
	o.engine.GET("/api/v2/arduino", o.getAllArduinosCallback)
	o.engine.GET("/api/v2/arduino/:ArduinoId", o.getArduinoByIDCallback)
	o.engine.GET("/api/v2/arduino/:ArduinoId/setup", o.getArduinoSetupCallback)
	o.engine.PATCH("/api/v2/arduino/:ArduinoId/setup", o.setArduinoSetupCallback)
	o.engine.GET("/api/v2/arduino/:ArduinoId/stripe", o.getAllArduinoStripesCallback)
	o.engine.GET("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId", o.getArduinoStripeByIDCallback)
	o.engine.GET("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId/setup", o.getArduinoStripeSetupCallback)
	o.engine.PATCH("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId/setup", o.setArduinoStripeSetupCallback)
	o.engine.GET("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId/config", o.getArduinoStripeConfigCallback)
	o.engine.PATCH("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId/config", o.setArduinoStripeConfigCallback)
	o.engine.PUT("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId/config/save", o.saveArduinoStripeConfigCallback)
	o.engine.GET("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId/palette", o.getArduinoStripePaletteCallback)
	o.engine.PATCH("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId/palette", o.setArduinoStripePaletteCallback)
	o.engine.PUT("/api/v2/arduino/:ArduinoId/stripe/:ArduinoStripeId/palette/save", o.saveArduinoStripePaletteCallback)

	o.engine.GET("/api/v2/abstract", o.getAllAbstractsCallback)
	o.engine.GET("/api/v2/abstract/:AbstractId", o.getAbstractByIDCallback)
	o.engine.GET("/api/v2/abstract/:AbstractId/setup", o.getAbstractSetupCallback)
	o.engine.PATCH("/api/v2/abstract/:AbstractId/setup", o.setAbstractSetupCallback)
	o.engine.PUT("/api/v2/abstract/:AbstractId/setup/save", o.saveAbstractSetupCallback)
	o.engine.GET("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId", o.getAllAbstractStripesCallback)
	o.engine.GET("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/setup", o.getAbstractStripeSetupCallback)
	o.engine.PATCH("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/setup", o.setAbstractStripeSetupCallback)
	o.engine.PUT("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/setup/save", o.setAbstractStripeSetupCallback)
	o.engine.GET("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/config", o.getAbstractStripeConfigByIDCallback)
	o.engine.PATCH("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/config", o.setAbstractStripeConfigByIDCallback)
	o.engine.PUT("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/config/save", o.saveAbstractStripeCallback)
	o.engine.GET("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/palette", o.getAbstractStripePaletteByIDCallback)
	o.engine.PATCH("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/palette", o.setAbstractStripePaletteByIDCallback)
	o.engine.PUT("/api/v2/abstract/:AbstractId/stripe/:AbstractStripeId/palette/save", o.saveAbstractStripeCallback)

	o.engine.PATCH("/api/v2/abstract/:AbstractId/stripes/config", o.setAbstractStripeConfigMultiCallback)
	o.engine.PATCH("/api/v2/abstract/:AbstractId/stripes/palette", o.setAbstractStripePaletteMultiCallback)

	o.engine.GET("/api/v2/area", o.getAllAreasCallback)
	o.engine.GET("/api/v2/area/:AreaId", o.getAreaByIDCallback)
	o.engine.GET("/api/v2/area/:AreaId/abstract", o.getAllAbstractsCallback)
	o.engine.GET("/api/v2/area/:AreaId/abstract/:AbstractId", o.getAbstractByIDCallback)
}

func (o *apiServer) registerWebEndpoints() {
	o.engine.Static("/assets", "./assets")
	o.engine.StaticFile("/", "./html/index.html")
}

func (o *apiServer) getAllCallback(c *gin.Context) {
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
					arduino, err := hummelapi.NewLEDInfectedArduino(devFile)
					if err != nil {
						fmt.Printf("xfailed to get arduino: %s\n", err)
					} else {
						for _, a := range o.Abstracts {
							if err := a.UpdateArduino(arduino); err != nil {
								fmt.Printf("failed to set arduino in abstract %d: %s\n", a.AbstractID, err)
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
