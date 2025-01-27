package main

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/hummelapi"
)

func (o *apiServer) getCallbackArduino(c *gin.Context) (*hummelapi.LEDInfectedArduino, error) {
	id, err := strconv.Atoi(c.Param("ArduinoId"))
	if err != nil {
		return nil, fmt.Errorf("could not read arduino id: %s", err)
	}

	return o.getArduino(uint8(id))
}

func (o *apiServer) getCallbackArdoinoAndStripe(c *gin.Context) (*hummelapi.LEDInfectedArduino, *hummelapi.LEDInfectedArduinoStripe, error) {
	arduinoID, err := strconv.Atoi(c.Param("ArduinoId"))
	if err != nil {
		return nil, nil, fmt.Errorf("could not read arduino id: %s", err)
	}

	stripeID, err := strconv.Atoi(c.Param("StripeId"))
	if err != nil {
		return nil, nil, fmt.Errorf("could not read stripe id: %s", err)
	}

	return o.getArduinoAndStripe(uint8(arduinoID), uint8(stripeID))
}

func (o *apiServer) getArduino(arduinoID uint8) (*hummelapi.LEDInfectedArduino, error) {
	for _, a := range o.Arduinos {
		if a.GetID() == arduinoID {
			return a, nil
		}
	}
	return nil, fmt.Errorf("arduino with id %d not found", arduinoID)
}

func (o *apiServer) getArduinoAndStripe(arduinoID uint8, stripeID uint8) (*hummelapi.LEDInfectedArduino, *hummelapi.LEDInfectedArduinoStripe, error) {
	a, err := o.getArduino(arduinoID)
	if err != nil {
		return nil, nil, err
	}

	for _, s := range a.Stripes {
		if s.StripeID == stripeID {
			return a, s, nil
		}
	}
	return nil, nil, fmt.Errorf("stripe %d not found in arduino %d", stripeID, arduinoID)
}

func (o *apiServer) getCallbackAbstract(c *gin.Context) (*hummelapi.LEDInfectedAbstract, error) {
	id := c.Param("AbstractId")
	return o.getAbstract(id)
}

func (o *apiServer) getCallbackPreset(c *gin.Context) (*hummelapi.LEDInfectedPreset, error) {
	id := c.Param("PresetId")
	return o.getPreset(id)
}

func (o *apiServer) getCallbackAbstractAndStripe(c *gin.Context) (*hummelapi.LEDInfectedAbstract, *hummelapi.LEDInfectedAbstractStripe, error) {
	objectID := c.Param("AbstractId")
	stripeID := c.Param("StripeId")

	return o.getObjectAndStripe(objectID, stripeID)
}

func (o *apiServer) getAbstract(abstractID string) (*hummelapi.LEDInfectedAbstract, error) {
	for _, a := range o.Abstracts {
		if a.AbstractID == abstractID {
			return a, nil
		}
	}
	return nil, fmt.Errorf("abstract with id %d not found", abstractID)
}

func (o *apiServer) getPreset(presetID string) (*hummelapi.LEDInfectedPreset, error) {
	for _, p := range o.Presets {
		if p.PresetID == presetID {
			return p, nil
		}
	}
	return nil, fmt.Errorf("preset with id %d not found", presetID)
}

func (o *apiServer) getObjectAndStripe(abstractID string, stripeID string) (*hummelapi.LEDInfectedAbstract, *hummelapi.LEDInfectedAbstractStripe, error) {
	a, err := o.getAbstract(abstractID)
	if err != nil {
		return nil, nil, err
	}

	for _, s := range a.Stripes {
		if s.StripeID == stripeID {
			return a, s, nil
		}
	}
	return nil, nil, fmt.Errorf("stripe %s not found in object %s", stripeID, abstractID)
}
