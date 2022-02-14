package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/hummelapi"
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

func (o *apiServer) setAbstractStripeConfigByIDCallback(c *gin.Context) {
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

func (o *apiServer) setAbstractStripeConfigMultiCallback(c *gin.Context) {
	a, err := o.getCallbackAbstract(c)
	if err != nil {
		c.String(http.StatusNotFound, "")
		return
	}
	type multiSelect struct {
		StripeIDs []string                                        `json:"stripe_ids"`
		Config    *hummelapi.LEDInfectedArduinoConfigStripeConfig `json:"config"`
	}
	data := &multiSelect{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	a.SetConfig(data.Config, data.StripeIDs...)
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setAbstractStripePaletteByIDCallback(c *gin.Context) {
	_, s, err := o.getCallbackAbstractAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, "%s", err)
		return
	}

	data := &hummelapi.LEDInfectedArduinoConfigStripePalette{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, "%s", err)
		return
	}
	s.SetPalette(data)
	c.String(http.StatusBadRequest, "%s", err)

	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) setAbstractStripePaletteMultiCallback(c *gin.Context) {
	a, err := o.getCallbackAbstract(c)
	if err != nil {
		c.String(http.StatusNotFound, "%s", err)
		return
	}
	type multiSelect struct {
		StripeIDs []string                                         `json:"stripe_ids"`
		Palette   *hummelapi.LEDInfectedArduinoConfigStripePalette `json:"palette"`
	}
	data := &multiSelect{}
	if err := c.BindJSON(data); err != nil {
		c.String(http.StatusBadRequest, "%s", err)
		return
	}

	if err := a.SetPalette(data.Palette, data.StripeIDs...); err != nil {
		c.String(http.StatusBadRequest, "%s", err)
		return
	}
	c.JSON(http.StatusOK, "{}")
}

func (o *apiServer) saveAbstractStripeCallback(c *gin.Context) {
	_, s, err := o.getCallbackAbstractAndStripe(c)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}

	if err := s.Save(); err != nil {
		c.String(http.StatusExpectationFailed, fmt.Sprintf("failed to save config: %s", err))
		return
	}
	c.JSON(http.StatusOK, "{}")
}
