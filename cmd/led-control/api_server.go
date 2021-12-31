package main

import (
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
		arduinos []*hummelapi.HummelArduino

		engine *gin.Engine
		stop_  chan struct{}
	}
)

func newApiServer() (*apiServer, error) {
	o := &apiServer{
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
		o.engine.Run("localhost:8080")
	}()

	wg.Wait()
}

func (o *apiServer) registerRestAPIEndpoints() {
	o.engine.GET("/api/config", o.getAllConfigsCallback)
	o.engine.GET("/api/ado/:Id/config", o.getConfigByIdCallback)
	o.engine.POST("/api/ado/:Id/set_id", o.setIdCallback)
	o.engine.POST("/api/ado/:Id/:Stripe/pin/led_pin", o.setPinConfigLedPinCallback)
	o.engine.POST("/api/ado/:Id/:Stripe/pin/num_leds", o.setPinConfigNumLEDsCallback)
	o.engine.POST("/api/ado/:Id/:Stripe/pin/save", o.savePinConfigCallback)
	o.engine.POST("/api/ado/:Id/:Stripe/base/movement/direction", o.setBaseConfigMovementDirectionCallback)
	o.engine.POST("/api/ado/:Id/:Stripe/base/movement/speed", o.setBaseConfigMovementSpeedCallback)
	o.engine.POST("/api/ado/:Id/:Stripe/base/brightness", o.setBaseConfigBrightnessCallback)
	o.engine.POST("/api/ado/:Id/:Stripe/palette", o.setPaletteConfigCallback)
	o.engine.POST("/api/ado/:Id/:Stripe/save", o.saveConfigCallback)

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
	for _, a := range o.arduinos {
		if a.GetID() == uint8(id) {
			return a, nil
		}
	}
	return nil, fmt.Errorf("arduino with id %d not found", id)
}

func (o *apiServer) getCallbackArdoinoAndStripe(c *gin.Context) (*hummelapi.HummelArduino, *hummelapi.HummelArduinoLedStripe, error) {
	a, err := o.getCallbackArduino(c)
	if err != nil {
		return nil, nil, err
	}

	stripeID := c.Param("Stripe")

	switch stripeID {
	case "circle":
		return a, &a.CircleStripe, nil
	case "radial1":
		return a, &a.RadialStripes[0], nil
	case "radial2":
		return a, &a.RadialStripes[1], nil
	case "radial3":
		return a, &a.RadialStripes[2], nil
	case "radial4":
		return a, &a.RadialStripes[3], nil
	default:
		return nil, nil, fmt.Errorf("stripe %s not suported", stripeID)
	}

}

func (o *apiServer) getConfigByIdCallback(c *gin.Context) {
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
func (o *apiServer) setIdCallback(c *gin.Context) {
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

	err = a.SetID(arduinoConfig.ID)
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
	c.JSON(http.StatusOK, configs)
	return
}

func (o *apiServer) setPinConfigNumLEDsCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	var pinConfig hummelapi.HummelArduinoLedStripePinConfig
	if err := c.BindJSON(&pinConfig); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if err := s.SetNumLeds(pinConfig.NumLEDs); err != nil {
		fmt.Printf("failed to set num leds: %s\n", err)
		c.String(http.StatusBadRequest, "failed to set num leds")
		return

	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) savePinConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	if err := s.SavePinConfig(); err != nil {
		fmt.Printf("failed to save pin config: %s\n", err)
		c.String(http.StatusBadRequest, "failed to save pin config")
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setBaseConfigMovementDirectionCallback(c *gin.Context) {
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

	if err := s.SetMovementDirection(baseConfig.MovementDirection); err != nil {
		fmt.Printf("failed to set movement direction: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setBaseConfigMovementSpeedCallback(c *gin.Context) {
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

	if err := s.SetMovementSpeed(baseConfig.MovementSpeed); err != nil {
		fmt.Printf("failed to set movement speed: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setBaseConfigBrightnessCallback(c *gin.Context) {
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

	if err := s.SetBrightness(baseConfig.Brightness); err != nil {
		fmt.Printf("failed to set brightness: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) saveConfigCallback(c *gin.Context) {
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

func (o *apiServer) setPaletteConfigCallback(c *gin.Context) {
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

func (o *apiServer) setPinConfigLedPinCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	var pinConfig hummelapi.HummelArduinoLedStripePinConfig
	if err := c.BindJSON(&pinConfig); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if err := s.SetLedPin(pinConfig.LedPin); err != nil {
		fmt.Printf("failed to set pin led: %s\n", err)
		c.String(http.StatusBadRequest, "failed to set pin led")
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
			// check the OSX device files
			matches, err := filepath.Glob("/dev/tty.usbserial*")
			if err != nil {
				// check the linux device files
				matches, err = filepath.Glob("/dev/ttyUSB*")
				if err != nil {
					// try again in 10 sec
					time.Sleep(time.Second * 10)
					continue
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
