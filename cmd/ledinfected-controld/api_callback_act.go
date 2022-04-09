package main

import (
	"fmt"
	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/hummelapi"
	"github.com/gin-gonic/gin"
	"net/http"
)

func (o *apiServer) getAllActsCallback(c *gin.Context) {
	c.JSON(http.StatusOK, o.Acts)
	return
}

func (o *apiServer) getActCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	c.JSON(http.StatusOK, a)
	return
}

func (o *apiServer) getActStatusCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	c.JSON(http.StatusOK, a.Status)
	return
}

func (o *apiServer) startActCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	if o.ActiveAct != nil {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("another act (%s) is already active", o.ActiveAct.ActID)))
		return
	}

	o.ActiveAct = a
	if err := o.ActiveAct.Start(); err != nil {
		c.String(http.StatusBadRequest, jsonError(err))
		return
	}
	c.JSON(http.StatusOK, a.Status)
	return
}

func (o *apiServer) stopActCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	if o.ActiveAct == nil {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("no act is running")))
		return
	}

	if o.ActiveAct.ActID != a.ActID {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("act %s is currently not runnig", o.ActiveAct.ActID)))
		return
	}

	if err := o.ActiveAct.Stop(); err != nil {
		c.String(http.StatusBadRequest, jsonError(err))
		return
	}
	c.JSON(http.StatusOK, a.Status)
	return
}

func (o *apiServer) getAllActTriggersCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	c.JSON(http.StatusOK, a.Triggers)
	return
}

func (o *apiServer) getActTriggerCallback(c *gin.Context) {
	_, t, err := o.getCallbackActTrigger(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}

	c.JSON(http.StatusOK, t)
	return
}


func (o *apiServer) triggerActTriggerCallback(c *gin.Context) {
	_, t, err := o.getCallbackActTrigger(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}

	t.Trigger()
	c.JSON(http.StatusOK, t)
	return
}

////////////////////////////////////////////////////////
// helper functions
////////////////////////////////////////////////////////

func (o *apiServer) getCallbackAct(c *gin.Context) (*hummelapi.LEDInfectedAct, error) {
	id := c.Param("ActId")
	return o.getAct(id)
}

func (o *apiServer) getCallbackActTrigger(c *gin.Context) (*hummelapi.LEDInfectedAct, *hummelapi.LEDInfectedActTrigger, error) {
	actID := c.Param("ActId")
	triggerID := c.Param("TriggerId")
	a, err := o.getAct(actID)
	if err != nil {
		return nil, nil, err
	}
	for _, t := range a.Triggers {
		if t.ActTriggerID == triggerID {
			return a, t, nil
		}
	}
	return nil, nil, fmt.Errorf("trigger %s not found", triggerID)
}

func (o *apiServer) getAct(actID string) (*hummelapi.LEDInfectedAct, error) {
	for _, a := range o.Acts {
		if a.ActID == actID {
			return a, nil
		}
	}
	return nil, fmt.Errorf("act with id %s not found", actID)
}
