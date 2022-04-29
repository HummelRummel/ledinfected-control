package hummelapi

import "fmt"

const LedInfectedInputTypeTrigger = 1
const LedInfectedInputTypeButton = 1

type (
	LEDInfectedArduinoInput struct {
		ArduinoInputID uint8 `json:"arduino_input_id"`
		InputType      uint8 `json:"input_type"`

		inputForwardCallbacks []func(value uint8)
		parentArduino         *LEDInfectedArduino
		inputChan             <-chan *LEDInfectedResponse
		stop                  chan struct{}
	}
)

func newLEDInfectedArduinoInput(arduino *LEDInfectedArduino, inputID uint8) (*LEDInfectedArduinoInput, error) {
	o := &LEDInfectedArduinoInput{
		ArduinoInputID: inputID,
		InputType:      LedInfectedInputTypeTrigger,
		parentArduino:  arduino,
		stop:           make(chan struct{}),
	}

	inputChan, err := arduino.connection.RegisterInput(inputID)
	if err != nil {
		return nil, err
	}
	o.inputChan = inputChan

	go o.Run()

	return o, nil
}

func (o *LEDInfectedArduinoInput) RegisterInputCallback(callback func(value uint8)) {
	o.inputForwardCallbacks = append(o.inputForwardCallbacks, callback)
}

func (o *LEDInfectedArduinoInput) Run() {
	for {
		select {
		case newIn := <-o.inputChan:
			fmt.Println("new data: ", newIn)
			value := o.getValue(newIn)
			for _, callback := range o.inputForwardCallbacks {
				callback(value)
			}
		case <-o.stop:
			return
		}
	}
}

func (o *LEDInfectedArduinoInput) getValue(resp *LEDInfectedResponse) uint8 {
	if len(resp.rspData) != 0 {
		return resp.rspData[0]
	}
	return 1
}

func (o *LEDInfectedArduinoInput) Stop() {
	close(o.stop)
}
