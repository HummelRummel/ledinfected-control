package main

import (
	"fmt"
	"github.com/HummelRummel/ledinfected-controld/cmd/ledinfected-controld/hummelapi"
	"github.com/gin-gonic/gin"
	"net/http"
)

func (o *apiServer) getAllActsCallback(c *gin.Context) {
	o.updateTimer()
	c.JSON(http.StatusOK, o.Acts)
	return
}

func (o *apiServer) getActCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	a.UpdateTimer()
	c.JSON(http.StatusOK, a)
	return
}

func (o *apiServer) updateActCallback(c *gin.Context) {
	data := &hummelapi.LEDInfectedAct{}
	err := c.BindJSON(data)
	if err != nil {
		c.String(http.StatusBadRequest, "")
		return
	}

	if o.Acts, err = hummelapi.UpdateAct(o.Acts, data); err != nil {
		c.String(http.StatusBadRequest, jsonError(err))
		return
	}
	c.JSON(http.StatusOK, "{}")
	return
}

func (o *apiServer) getActStatusCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	a.UpdateTimer()
	c.JSON(http.StatusOK, a.Status)
	return
}

func (o *apiServer) startActCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	if o.LiveAct != nil {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("another act (%s) is already active", o.LiveAct.ActID)))
		return
	}

	o.LiveAct = a
	if err := o.LiveAct.Start(); err != nil {
		fmt.Printf("ERROR start: %s\n", err)
		c.String(http.StatusBadRequest, jsonError(err))
		return
	}
	a.UpdateTimer()
	c.JSON(http.StatusOK, a.Status)
	return
}

func (o *apiServer) stopActCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	if o.LiveAct == nil {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("no act is running")))
		return
	}

	if o.LiveAct.ActID != a.ActID {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("act %s is currently not runnig", o.LiveAct.ActID)))
		return
	}

	if err := o.LiveAct.Stop(); err != nil {
		c.String(http.StatusBadRequest, jsonError(err))
		return
	}
	o.LiveAct = nil
	a.UpdateTimer()
	c.JSON(http.StatusOK, a.Status)
	return
}

func (o *apiServer) pauseActCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	if o.LiveAct == nil {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("no act is running")))
		return
	}

	if o.LiveAct.ActID != a.ActID {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("act %s is currently not runnig", o.LiveAct.ActID)))
		return
	}

	if err := o.LiveAct.Pause(); err != nil {
		c.String(http.StatusBadRequest, jsonError(err))
		return
	}
	a.UpdateTimer()
	c.JSON(http.StatusOK, a.Status)
	return
}

func (o *apiServer) resumeActCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}
	if o.LiveAct == nil {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("no act is running")))
		return
	}

	if o.LiveAct.ActID != a.ActID {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("act %s is currently not runnig", o.LiveAct.ActID)))
		return
	}

	if err := o.LiveAct.Resume(); err != nil {
		c.String(http.StatusBadRequest, jsonError(err))
		return
	}
	a.UpdateTimer()
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

	t.TriggerCallback(1)
	c.JSON(http.StatusOK, t)
	return
}

func (o *apiServer) postActUpdateSceneCallback(c *gin.Context) {
	a, err := o.getCallbackAct(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}

	sceneConfig := &hummelapi.LEDInfectedScene{}
	if err := c.BindJSON(sceneConfig); err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}

	a.UpdateScene(sceneConfig)
	if _, err := hummelapi.UpdateAct(o.Acts, a); err != nil {
		c.String(http.StatusBadRequest, jsonError(err))
		return
	}

	c.JSON(http.StatusOK, "{}")
	return
}

func (o *apiServer) postJumpToScene(c *gin.Context) {
	a, s, err := o.getCallbackActScene(c)
	if err != nil {
		c.String(http.StatusNotFound, jsonError(err))
		return
	}

	if a.Status == nil || a.Status.State == "NOT_LIVE" {
		c.String(http.StatusBadRequest, jsonError(fmt.Errorf("act not live")))
		return
	}

	a.JumpScene(s)

	c.JSON(http.StatusOK, "{}")
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

func (o *apiServer) getCallbackActScene(c *gin.Context) (*hummelapi.LEDInfectedAct, *hummelapi.LEDInfectedScene, error) {
	actID := c.Param("ActId")
	sceneID := c.Param("SceneId")
	a, err := o.getAct(actID)
	if err != nil {
		return nil, nil, err
	}
	for _, s := range a.Scenes {
		if s.SceneID == sceneID {
			return a, s, nil
		}
	}
	return nil, nil, fmt.Errorf("scene %s not foundin act %s", sceneID, actID)
}

func (o *apiServer) getAct(actID string) (*hummelapi.LEDInfectedAct, error) {
	for _, a := range o.Acts {
		if a.ActID == actID {
			return a, nil
		}
	}
	return nil, fmt.Errorf("act with id %s not found", actID)
}
