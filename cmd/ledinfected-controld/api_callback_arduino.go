package main

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"

	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/hummelapi"
)

func (o *apiServer) getAllArduinosCallback(c *gin.Context) {
	c.JSON(http.StatusOK, o.Arduinos)
	return
}

func (o *apiServer) getArduinoByIDCallback(c *gin.Context) {
	a, err := o.getCallbackArduino(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}

	c.JSON(http.StatusOK, a)
}

func (o *apiServer) setArduinoIDCallback(c *gin.Context) {
	a, err := o.getCallbackArduino(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}
	type stripeConfig struct {
		ID *uint8 `json:"id"`
	}
	var arduinoConfig stripeConfig
	if err := c.BindJSON(&arduinoConfig); err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}

	if arduinoConfig.ID == nil {
		c.String(http.StatusBadRequest, "arduino Index not set")
		return
	}
	err = a.SetArduinoID(*arduinoConfig.ID)
	if err != nil {
		c.JSON(http.StatusExpectationFailed, fmt.Sprintf("failed to read config: %s\n", err))
		return
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoBPMCallback(c *gin.Context) {
	a, err := o.getCallbackArduino(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}
	type bpmConfig struct {
		BPM *uint8 `json:"bpm"`
	}
	var config bpmConfig
	if err := c.BindJSON(&config); err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}

	if config.BPM == nil {
		c.String(http.StatusBadRequest, "bpm not set")
		return
	}
	err = a.SetArduinoBPM(*config.BPM)
	if err != nil {
		c.JSON(http.StatusExpectationFailed, fmt.Sprintf("failed to set bpm config: %s\n", err))
		return
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoStripeSetupCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}
	data := &hummelapi.LEDInfectedArduinoConfigStripeSetup{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}

	s.SetSetup(data)
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) saveArduinoStripeSetupCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	if err := s.SaveSetup(); err != nil {
		c.String(http.StatusBadRequest, "failed to save setup: %s", err)
		return
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoStripeConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}
	data := &hummelapi.LEDInfectedArduinoConfigStripeConfig{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}

	s.SetConfig(data)
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoStripePaletteConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}
	data := &hummelapi.LEDInfectedArduinoConfigStripePalette{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	s.SetPalette(data)
	c.JSON(http.StatusOK, "{}")
}

// fixme todo split it up into config and palette
func (o *apiServer) saveArduinoStripeConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	if err := s.Save(); err != nil {
		c.JSON(http.StatusExpectationFailed, fmt.Sprintf("failed to save config: %s", err))
		return
	}
	c.JSON(http.StatusOK, "{}")
}

// fixme todo split it up into config and palette
func (o *apiServer) syncCallback(c *gin.Context) {
	var sumErr error
	wg := sync.WaitGroup{}
	for _, a := range o.Arduinos {
		fmt.Printf("sync arduino %d\n", a.GetID())
		wg.Add(1)
		go func(ard *hummelapi.LEDInfectedArduino) {
			if err := ard.GlobalSync(); err != nil {
				sumErr = err
			}
			defer wg.Done()
		}(a)
	}
	wg.Wait()
	if sumErr != nil {
		c.JSON(http.StatusBadRequest, sumErr.Error())
	} else {
		c.JSON(http.StatusOK, "{}")
	}
}
