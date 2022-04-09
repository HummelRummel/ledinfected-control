package hummelapi

import "fmt"

type (
	LEDInfectedActTrigger struct {
		ActTriggerID string `json:"act_trigger_id"`
		Active       bool   `json:"active"`

		notifyChans []chan struct{}
	}
)

func (o *LEDInfectedActTrigger) RegisterCallback() <-chan struct{} {
	notifyChan := make(chan struct{})
	o.notifyChans = append(o.notifyChans, notifyChan)
	return notifyChan
}

func (o *LEDInfectedActTrigger) DeregisterCallback(notifierChan <-chan struct{}) error {
	for i, mnc := range o.notifyChans {
		if mnc == notifierChan {
			o.notifyChans = append(o.notifyChans[:i], o.notifyChans[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("notifier channel not found")
}

func (o *LEDInfectedActTrigger) Trigger() {
	for _, c := range o.notifyChans {
		select {
		case c <- struct{}{}:
		default:
			fmt.Printf("notification failed\n")
		}
	}
}
