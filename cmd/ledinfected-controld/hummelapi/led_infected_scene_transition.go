package hummelapi

import (
	"fmt"
	"time"
)

type (
	LEDInfectedSceneTransition struct {
		Trigger *LEDInfectedSceneTrigger `json:"trigger"`
		SceneID string                   `json:"scene_id"`

		timer       *time.Timer
		endTime     time.Time
		actTrigger  *LEDInfectedActTrigger
		triggerChan <-chan struct{}
		stop        chan struct{}
		act         *LEDInfectedAct
		nextScene   *LEDInfectedScene
	}
)

func (o *LEDInfectedSceneTransition) Run() error {
	if o.actTrigger != nil {
		fmt.Printf("SETUP: %s trigger for scene %s\n", *o.Trigger.ActTriggerID, o.SceneID)
		o.triggerChan = o.actTrigger.RegisterCallback()
	} else {
		if o.Trigger.TimeoutS != nil {
			timeout := time.Duration(*o.Trigger.TimeoutS) * time.Second
			if timeout == 0 {
				timeout = time.Millisecond * 200
			}
			fmt.Printf("SETUP: %d sec timer for scene %s\n", *o.Trigger.TimeoutS, o.SceneID)
			o.timer.Reset(timeout)
			o.endTime = time.Now().Add(timeout)
		}
	}

	switchScene := func() {
		if err := o.act.disableScene(); err != nil {
			o.act.Status.appendError(fmt.Errorf("WARNING: failed to disable scene %s: %s", o.act.Status.ActiveScene.SceneID, err))
		}
		o.act.Status.ActiveScene = o.nextScene
		if err := o.act.enableScene(); err != nil {
			o.act.Status.appendError(fmt.Errorf("WARNING: failed to disable scene %s: %s", o.act.Status.ActiveScene.SceneID, err))
		}
	}
	doRun := func() {
		select {
		case <-o.triggerChan:
			fmt.Printf("HAPPEN: %s trigger for scene %s\n", *o.Trigger.ActTriggerID, o.SceneID)
			switchScene()
		case <-o.timer.C:
			fmt.Printf("HAPPEN: %d sec timer for scene %s\n", *o.Trigger.TimeoutS, o.SceneID)
			switchScene()
		case <-o.stop:
			fmt.Printf("stop transition for scene %s\n", o.SceneID)
		}
	}

	go doRun()
	return nil
}

func (o *LEDInfectedSceneTransition) UpdateTimer() {
	if o.Trigger.TimeoutS != nil {
		remainingInt := (o.endTime.Sub(time.Now())/time.Second) + 1
		if remainingInt < 0 {
			remainingInt = time.Duration(*o.Trigger.TimeoutS)
		}
		remainingUint := uint32(remainingInt)
		o.Trigger.RemainingS = &remainingUint
	}
}

func (o *LEDInfectedSceneTransition) Stop() error {
	if o.actTrigger != nil {
		fmt.Printf("STOP: %s trigger for scene %s\n", *o.Trigger.ActTriggerID, o.SceneID)
		o.actTrigger.DeregisterCallback(o.triggerChan)
		o.triggerChan = nil
	}
	if o.Trigger.TimeoutS != nil {
		fmt.Printf("STOP: %d sec timer for scene %s\n", *o.Trigger.TimeoutS, o.SceneID)
	}
	o.timer.Stop()
	select {
	case <-o.timer.C:
	default:
	}

	select {
	case o.stop <- struct{}{}:
	case <-time.After(time.Millisecond * 200):
	}
	return nil
}
