package main

import (
	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/hummelapi"
	"github.com/gin-gonic/gin"
	"net/http"
)

func (o *apiServer) getAllPresetsCallback(c *gin.Context) {
	c.JSON(http.StatusOK, o.Presets)
	return
}

func (o *apiServer) updatePresetCallback(c *gin.Context) {
	newPreset := &hummelapi.LEDInfectedPreset{}
	if err := c.BindJSON(newPreset); err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	if err := hummelapi.UpdatePreset(newPreset); err != nil {
		c.String(http.StatusExpectationFailed, err.Error())
		return
	}
	o.Presets = hummelapi.GetAllPresets()
	c.JSON(http.StatusOK, "{}")
	return
}
