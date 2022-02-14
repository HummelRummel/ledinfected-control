package hummelapi

import (
	"fmt"
	"time"
)

type (
	LEDInfectedArduino struct {
		connection *LEDInfectedArduinoConnection

		Global *LEDInfectedArduinoConfigGlobalSetup `json:"global"`

		Stripes []*LEDInfectedArduinoStripe `json:"stripes"`
	}
)

func NewLEDInfectedArduino(devFile string) (*LEDInfectedArduino, error) {
	fmt.Printf("MOA: newArduino on %s\n", devFile)
	connection, err := NewLEDInfectedArduinoConnection(devFile)
	if err != nil {
		return nil, err
	}
	o := &LEDInfectedArduino{
		connection: connection,
	}
	fmt.Printf("MOA: newArduino connection established\n")

	//time.Sleep(time.Millisecond*1000)
	setup, err := connection.globalGetSetup()
	if err != nil {
		return nil, fmt.Errorf("failed to get setup of arduino connected to %s: %s", devFile, err)
		time.Sleep(time.Second*10)
		o.connection.Close()
	}
	fmt.Printf("MOA: newArduino setup: %s\n", setup)

	o.Global = setup


	for i := 0; i < int(setup.NumStripes); i++ {
		fmt.Printf("MOA: get stripe[%d]\n", i)
		stripe, err := newLEDInfectedArduinoStripe(o, uint8(i))
		if err != nil {
			o.connection.Close()
			return nil, err
		}
		fmt.Printf("MOA: get stripe[%d] done\n", i)
		o.Stripes = append(o.Stripes, stripe)
	}

	return o, nil
}

func (o *LEDInfectedArduino) Close() {
	o.connection.Close()
}

func (o *LEDInfectedArduino) GlobalGetSetup() LEDInfectedArduinoConfigGlobalSetup {
	return o.connection.GlobalGetSetup()
}

func (o *LEDInfectedArduino) SetArduinoID(id uint8) error {
	return o.connection.SetArduinoID(id)
}

func (o *LEDInfectedArduino) GetID() uint8 {
	return o.connection.arduinoID
}

func (o *LEDInfectedArduino) GetDevFile() string {
	return o.connection.devFile
}

func (o *LEDInfectedArduino) GlobalSync() error {
	return o.connection.GlobalSync()
}

func (o *LEDInfectedArduino) GlobalSetupSave() error {
	return o.connection.GlobalSetupSave()
}

func (o *LEDInfectedArduino) GetStripe(id uint8) (*LEDInfectedArduinoStripe, error) {
	if int(id) < len(o.Stripes) {
		return o.Stripes[id], nil
	}
	return nil, fmt.Errorf("arduinoID out of bound (%d, %d)", id, len(o.Stripes))
}
