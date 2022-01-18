package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/nbmoa/led-control/cmd/led-control/hummelapi"
	"net/http"
)

func (o *apiServer) getAllAbstractsCallback(c *gin.Context) {
	c.JSON(http.StatusOK, o.Abstracts)
	return
}

func (o *apiServer) getAbstractByIDCallback(c *gin.Context) {
	a, err := o.getCallbackAbstract(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	c.JSON(http.StatusOK, a)
	return
}

func (o *apiServer) setAbstractSetupCallback(c *gin.Context) {
	a, err := o.getCallbackAbstract(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}
	data := &hummelapi.LEDInfectedAbstractGlobalSetup{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}
	a.SetSetup(data)
	c.JSON(http.StatusOK, a)
	return
}


func (o *apiServer) saveAbstractCallback(c *gin.Context) {
	a, err := o.getCallbackAbstract(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}
	if err := a.Save(); err != nil {
		c.String(http.StatusExpectationFailed, err.Error())
		return
	}
	c.JSON(http.StatusOK, a)
	return
}

func (o *apiServer) setAbstractStripeSetupCallback(c *gin.Context) {
	_, s, err := o.getCallbackAbstractAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	data := &hummelapi.LEDInfectedAbstractStripeSetup{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	s.SetSetup(data)
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setAbstractStripeConfigCallback(c *gin.Context) {
	_, s, err := o.getCallbackAbstractAndStripe(c)
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

func (o *apiServer) setAbstractStripePaletteCallback(c *gin.Context) {
	_, s, err := o.getCallbackAbstractAndStripe(c)
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

func (o *apiServer) saveAbstractStripeCallback(c *gin.Context) {
	_, s, err := o.getCallbackAbstractAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}

	if err := s.Save(); err != nil {
		fmt.Printf("failed to save config: %s\n", err)
	}
	c.JSON(http.StatusOK, "{}")
}
