package hummelapi

import (
	"fmt"
	"sync"
)

type (
	LEDInfectedActTrigger struct {
		ActTriggerID string `json:"act_trigger_id"`
		Active       bool   `json:"active"`

		LinkedInput     *LEDInfectedActInput `json:"linked_input"`
		notifyChans     []chan uint8
		notifyChansLock sync.Mutex
	}
)

func (o *LEDInfectedActTrigger) RegisterCallback() <-chan uint8 {
	o.notifyChansLock.Lock()
	defer o.notifyChansLock.Unlock()
	notifyChan := make(chan uint8)
	o.notifyChans = append(o.notifyChans, notifyChan)
	return notifyChan
}

func (o *LEDInfectedActTrigger) DeregisterCallback(notifierChan <-chan uint8) error {
	o.notifyChansLock.Lock()
	defer o.notifyChansLock.Unlock()
	for i, mnc := range o.notifyChans {
		if mnc == notifierChan {
			o.notifyChans = append(o.notifyChans[:i], o.notifyChans[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("notifier channel not found")
}

func (o *LEDInfectedActTrigger) TriggerCallback(value uint8) {
	fmt.Printf("triggering %s: %d\n", o.ActTriggerID, value)
	o.notifyChansLock.Lock()
	defer o.notifyChansLock.Unlock()
	for _, c := range o.notifyChans {
		select {
		case c <- value:
		default:
			fmt.Printf("notification failed\n")
		}
	}
}
