package main

import (
	"fmt"
	"net/http"

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
		c.String(http.StatusNotFound, "")
		return
	}
	type stripeConfig struct {
		ID *uint8 `json:"id"`
	}
	var arduinoConfig stripeConfig
	if err := c.BindJSON(&arduinoConfig); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if arduinoConfig.ID == nil {
		fmt.Printf("arduino Index not set\n")
		c.String(http.StatusBadRequest, "")
		return
	}
	err = a.SetArduinoID(*arduinoConfig.ID)
	if err != nil {
		fmt.Printf("failed to read config: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoStripeSetupCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	data := &hummelapi.LEDInfectedArduinoConfigStripeSetup{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, "")
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
		fmt.Printf("failed to save setup: %s\n", err)
		c.String(http.StatusBadRequest, "failed to save setup: %s", err)
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoStripeConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	data := &hummelapi.LEDInfectedArduinoConfigStripeConfig{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	s.SetConfig(data)
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setArduinoStripePaletteConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackArdoinoAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	data := &hummelapi.LEDInfectedArduinoConfigStripePalette{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, "")
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
		fmt.Printf("failed to save config: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}
