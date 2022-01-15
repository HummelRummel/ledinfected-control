package main

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/nbmoa/led-control/cmd/led-control/hummelapi"
	"net/http"
	"path/filepath"
	"strconv"
	"sync"
	"time"
)

type (
	apiServer struct {
		arduinos        []*hummelapi.HummelArduino
		customSerialDev string

		knownObjects *hummelapi.KnownObjects
		engine       *gin.Engine
		stop_        chan struct{}
	}
)

func newApiServer(customSerialDev string) (*apiServer, error) {
	knownObjs, err := hummelapi.GetKnownObject()
	if err != nil {
		return nil, err
	}

	o := &apiServer{
		customSerialDev: customSerialDev,
		knownObjects:    knownObjs,

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
	o.engine.GET("/api", o.getAllConfigsCallback)
	o.engine.GET("/api/arduino", o.getAllArduinoConfigsCallback)
	o.engine.GET("/api/arduino/:Id", o.getArduinoConfigByIDCallback)
	o.engine.POST("/api/arduino/:Id/set_id", o.setArduinoIDCallback)
	o.engine.POST("/api/arduino/:Id/:Stripe/setup", o.setArduinoStripeSetupCallback)
	o.engine.POST("/api/arduino/:Id/:Stripe/setup/save", o.saveArduinoStripeSetupCallback)
	o.engine.POST("/api/arduino/:Id/:Stripe/config", o.setArduinoStripeConfigCallback)
	o.engine.POST("/api/arduino/:Id/:Stripe/config/palette", o.setArduinoStripePaletteConfigCallback)
	o.engine.POST("/api/arduino/:Id/:Stripe/config/save", o.saveArduinoStripeConfigCallback)
	o.engine.GET("/api/object", o.getAllObjectConfigsCallback)
	o.engine.GET("/api/object/:Id", o.getObjectConfigByIDCallback)
	//	o.engine.POST("/api/object/:Id/:Stripe/setup", o.setObjectStripeSetupCallback)
	//	o.engine.POST("/api/object/:Id/:Stripe/setup/save", o.saveObjectStripeSetupCallback)
	//  o.engine.POST("/api/object/:Id", o.setObjectConfigCallback)
	o.engine.POST("/api/object/:Id/stripe", o.setObjectStripeConfigCallback)
	o.engine.POST("/api/object/:Id/stripe/:StripeName/palette", o.setObjectStripePaletteConfigCallback)
	//	o.engine.POST("/api/object/:Id/stripe/:StripeName/save", o.saveObjectStripeConfigCallback)
}

func (o *apiServer) registerWebEndpoints() {
	o.engine.Static("/assets", "./assets")
	o.engine.StaticFile("/", "./html/index.html")
}

func (o *apiServer) getCallbackArduino(c *gin.Context) (*hummelapi.HummelArduino, error) {
	id, err := strconv.Atoi(c.Param("Id"))
	if err != nil {
		return nil, fmt.Errorf("could not read arduino id: %s", err)
	}

	return o.getArduino(uint8(id))
}

func (o *apiServer) getCallbackObject(c *gin.Context) (*hummelapi.HummelObject, error) {
	id := c.Param("Id")
	return o.getObject(id)
}

func (o *apiServer) getObject(objectID string) (*hummelapi.HummelObject, error) {
	for _, ko := range o.knownObjects.GetObjects() {
		if ko.ControlObject.ID == objectID {
			return ko, nil
		}
	}
	return nil, fmt.Errorf("object with id %d not found", objectID)
}

func (o *apiServer) getCallbackArdoinoAndStripe(c *gin.Context) (*hummelapi.HummelArduino, *hummelapi.HummelArduinoLedStripe, error) {
	arduinoID, err := strconv.Atoi(c.Param("Id"))
	if err != nil {
		return nil, nil, fmt.Errorf("could not read arduino id: %s", err)
	}

	stripeID := c.Param("Stripe")

	return o.getArdoinoAndStripe(uint8(arduinoID), stripeID)
}

func (o *apiServer) getCallbackObjectAndStripe(c *gin.Context) (*hummelapi.HummelObject, *hummelapi.HummelControlObjectLEDStripe, error) {
	objectID := c.Param("Id")
	stripeID := c.Param("StripeName")

	return o.getObjectAndStripe(objectID, stripeID)
}

func (o *apiServer) getArdoinoAndStripe(arduinoID uint8, stripeID string) (*hummelapi.HummelArduino, *hummelapi.HummelArduinoLedStripe, error) {
	a, err := o.getArduino(arduinoID)
	if err != nil {
		return nil, nil, err
	}

	switch stripeID {
	case "circle":
		return a, a.CircleStripe, nil
	case "radial1":
		return a, a.RadialStripes[0], nil
	case "radial2":
		return a, a.RadialStripes[1], nil
	case "radial3":
		return a, a.RadialStripes[2], nil
	case "radial4":
		return a, a.RadialStripes[3], nil
	default:
		return nil, nil, fmt.Errorf("stripe %s not suported", stripeID)
	}
}

func (o *apiServer) getObjectAndStripe(objectID string, stripeName string) (*hummelapi.HummelObject, *hummelapi.HummelControlObjectLEDStripe, error) {
	obj, err := o.getObject(objectID)
	if err != nil {
		return nil, nil, err
	}
	for _, s := range obj.ControlObject.LEDConfig.CircleStripes {
		if s.StripeName == stripeName {
			return obj, s, nil
		}
	}
	for _, s := range obj.ControlObject.LEDConfig.RadialStripes {
		if s.StripeName == stripeName {
			return obj, s, nil
		}
	}
	return nil, nil, fmt.Errorf("stripe %s not found in object %s", stripeName, objectID)
}

func (o *apiServer) getArduino(arduinoID uint8) (*hummelapi.HummelArduino, error) {
	for _, a := range o.arduinos {
		if a.GetID() == arduinoID {
			return a, nil
		}
	}
	return nil, fmt.Errorf("arduino with id %d not found", arduinoID)
}

func (o *apiServer) getArduinoConfigByIDCallback(c *gin.Context) {
	a, err := o.getCallbackArduino(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	arduinoConfig, err := a.GetConfig()
	if err != nil {
		fmt.Printf("failed to read config: %s\n", err)
	}
	c.JSON(http.StatusOK, arduinoConfig)
}
func (o *apiServer) setArduinoIDCallback(c *gin.Context) {
	a, err := o.getCallbackArduino(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	var arduinoConfig hummelapi.HummelArduinoConfig
	if err := c.BindJSON(&arduinoConfig); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if arduinoConfig.ID == nil {
		fmt.Printf("arduino ID not set")
		c.String(http.StatusBadRequest, "")
		return
	}
	err = a.SetID(*arduinoConfig.ID)
	if err != nil {
		fmt.Printf("failed to read config: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) getAllConfigsCallback(c *gin.Context) {
	var configs []*hummelapi.HummelArduinoConfig
	for _, a := range o.arduinos {
		arduinoConfig, err := a.GetConfig()
		if err != nil {
			fmt.Printf("failed to read config: %s\n", err)
			c.String(http.StatusServiceUnavailable, "")
			return
		}
		configs = append(configs, arduinoConfig)
	}
	// TBD missing the object configs
	c.JSON(http.StatusOK, configs)
	return
}
func (o *apiServer) getAllArduinoConfigsCallback(c *gin.Context) {
	var configs []*hummelapi.HummelArduinoConfig
	for _, a := range o.arduinos {
		arduinoConfig, err := a.GetConfig()
		if err != nil {
			fmt.Printf("failed to read config: %s\n", err)
			c.String(http.StatusServiceUnavailable, "")
			return
		}
		configs = append(configs, arduinoConfig)
	}
	c.JSON(http.StatusOK, configs)
	return
}

func (o *apiServer) getAllObjectConfigsCallback(c *gin.Context) {
	var configs []*hummelapi.HummelControlObject
	for _, ko := range o.knownObjects.GetObjects() {
		configs = append(configs, &ko.ControlObject)
	}
	c.JSON(http.StatusOK, configs)
	return
}

func (o *apiServer) getObjectConfigByIDCallback(c *gin.Context) {
	a, err := o.getCallbackObject(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	c.JSON(http.StatusOK, a)
	return
}

func (o *apiServer) setArduinoStripeSetupCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	var config hummelapi.HummelArduinoLedStripePinConfig
	if err := c.BindJSON(&config); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if err := s.SetSetup(*config.LedPin, *config.VirtualLen,
		*config.SubStripes[0].NumLEDs, *config.SubStripes[0].Offset,
		*config.SubStripes[1].NumLEDs, *config.SubStripes[1].Offset,
		*config.SubStripes[2].NumLEDs, *config.SubStripes[2].Offset,
		*config.SubStripes[3].NumLEDs, *config.SubStripes[3].Offset,
	); err != nil {
		fmt.Printf("failed to set setup: %s\n", err)
		c.String(http.StatusBadRequest, "failed to set setup")
		return

	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) saveArduinoStripeSetupCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	if err := s.SaveSetup(); err != nil {
		fmt.Printf("failed to save setup: %s\n", err)
		c.String(http.StatusBadRequest, "failed to save setup")
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoStripeConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	var baseConfig hummelapi.HummelArduinoLedStripeBaseConfig
	if err := c.BindJSON(&baseConfig); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if err := s.SetConfig(*baseConfig.MovementSpeed, *baseConfig.MovementDirection, *baseConfig.Brightness); err != nil {
		fmt.Printf("failed to set config: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setObjectStripeConfigCallback(c *gin.Context) {
	obj, err := o.getCallbackObject(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	body, _ := c.GetRawData()
	var ledConfig hummelapi.HummelControlObjectLEDConfig
	if err := json.Unmarshal(body, &ledConfig); err != nil {
//	if err := c.BindJSON(&ledConfig); err != nil {
		fmt.Printf("%s\n", err)
		c.String(http.StatusBadRequest, "")
		return
	}

	var errorString string
	for _, circle := range ledConfig.CircleStripes {
		_, s, err := o.getArdoinoAndStripe(*circle.ArduinoID, *circle.Config.StripeID)
		if err != nil {
			errorString += fmt.Sprintf("failed to get stripe for %d/%s: %s\n",circle.ArduinoID, circle.Config.StripeID, err)
			continue
		}
		if err := s.SetConfig(*circle.Config.Base.MovementSpeed, *circle.Config.Base.MovementDirection, *circle.Config.Base.Brightness); err != nil {
			errorString += fmt.Sprintf("failed to set config for %d/%s: %s\n",circle.ArduinoID, circle.Config.StripeID, err)
		}
		if circle.Config.Palette != nil {
			if err := s.SetConfig(*circle.Config.Base.MovementSpeed, *circle.Config.Base.MovementDirection, *circle.Config.Base.Brightness); err != nil {
				errorString += fmt.Sprintf("failed to set palette for %d/%s: %s\n",circle.ArduinoID, circle.Config.StripeID, err)
			}
		}
	}
	for _, radial := range ledConfig.RadialStripes {
		radObj, err := obj.ControlObject.LEDConfig.GetRadialStripeByName(radial.StripeName)
		if err != nil {
			errorString += fmt.Sprintf("failed to find stripe in known objects %s: %s\n",radial.StripeName, err)
			continue
		}
		if err := radObj.Fill(radial); err != nil {
			errorString += fmt.Sprintf("failed to fill missing objects %s: %s\n",radial.StripeName, err)
			continue
		}
		_, s, err := o.getArdoinoAndStripe(*radObj.ArduinoID, *radObj.Config.StripeID)
		if err != nil {
			errorString += fmt.Sprintf("failed to get stripe for %d/%s: %s\n",radial.ArduinoID, radial.Config.StripeID, err)
			continue
		}
		if err := s.SetConfig(*radial.Config.Base.MovementSpeed, *radial.Config.Base.MovementDirection, *radial.Config.Base.Brightness); err != nil {
			errorString += fmt.Sprintf("failed to set config for %d/%s: %s\n",radial.ArduinoID, radial.Config.StripeID, err)
		}
		if radial.Config.Palette != nil {
			if err := s.SetPaletteCHSV(radial.Config.Palette); err != nil {
				errorString += fmt.Sprintf("failed to set palette for %d/%s: %s\n",radial.ArduinoID, radial.Config.StripeID, err)
			}
		}
		radObj.Config = radial.Config
	}

	if errorString != "" {
		c.JSON(http.StatusExpectationFailed, errorString)
	} else {
		c.JSON(http.StatusOK, "{}")
	}
}


func (o *apiServer) saveArduinoStripeConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	if err := s.SaveConfig(); err != nil {
		fmt.Printf("failed to save config: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoStripePaletteConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	var paletteConfig hummelapi.HummelArduinoLedStripePaletteConfig
	if err := c.BindJSON(&paletteConfig); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if err := s.SetPaletteCHSV(&paletteConfig); err != nil {
		fmt.Printf("failed to set palette config: %s\n", err)
		c.String(http.StatusBadRequest, "failed to set palette config")
		return
	}

	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setObjectStripePaletteConfigCallback(c *gin.Context) {
	_, so, err := o.getCallbackObjectAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	_, s, err := o.getArdoinoAndStripe(*so.ArduinoID, *so.Config.StripeID)

	var paletteConfig hummelapi.HummelArduinoLedStripePaletteConfig
	if err := c.BindJSON(&paletteConfig); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if err := s.SetPaletteCHSV(&paletteConfig); err != nil {
		fmt.Printf("failed to set palette config: %s\n", err)
		c.String(http.StatusBadRequest, "failed to set palette config")
		return
	}

	c.JSON(http.StatusOK, "{}")
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
				// check the OSX device files
				matches, err = filepath.Glob("/dev/tty.usbserial*")
				if err != nil {
					// check the linux device files
					matches, err = filepath.Glob("/dev/ttyUSB*")
					if err != nil {
						// try again in 10 sec
						time.Sleep(time.Second * 10)
						continue
					}
				}
			}

			for _, devFile := range matches {
				alreadyAdded := false
				for _, arduino := range o.arduinos {
					if arduino.GetDevFile() == devFile {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					fmt.Printf("trying to connect arduino connected via dev-file %s\n", devFile)
					arduino, err := hummelapi.NewHummelArduino(devFile)
					if err != nil {
						fmt.Printf("failed to get arduino: %s\n", err)
					} else {
						o.knownObjects.UpdateArduino(arduino)
						o.arduinos = append(o.arduinos, arduino)
					}
				}
			}
			var ardus []*hummelapi.HummelArduino

			for _, arduino := range o.arduinos {
				found := false
				for _, devFile := range matches {
					if arduino.GetDevFile() == devFile {
						found = true
						break
					}
				}
				if !found {
					fmt.Printf("trying to remove arduino connected via dev-file %s\n", arduino.GetDevFile())
					arduino.Close()
					// remove device
				} else {
					ardus = append(ardus, arduino)
				}
			}
			o.arduinos = ardus
		case <-o.stop_:
			return
		}
	}
}
