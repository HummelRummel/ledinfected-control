package hummelapi

import (
	"fmt"
	"time"

	"github.com/Lobaro/slip"
	"go.bug.st/serial"
)

/*

	Structure of the connection
    ---------------------------

	- Open serial connection (and wait till arduino is ready)
	- After the connection is established the LEDInfectedArduinoConnection will read out the ID of the device (used to uniquely identify the devices)
	  This is also the mechanism to detect if its a device we are interested in
	- Now the device is ready to accept commands

	Command mechanism
    -----------------

	1. Send StartCommand signal [2]byte{hummelCommandProtocolId,hummelCommandProtocolId}
    2. Send actual comamand [1+opt]byte{command,opt data...}, some commands also have a response from the controller
	3. Send EndCommand signal [1]byte{hummelCommandProtocolIdEnd}


*/

type (
	LEDInfectedArduinoConnection struct {
		devFile string

		port serial.Port

		arduinoID  uint8
		numStripes uint8

		responseChan chan *LEDInfectedResponse

		stop bool
	}
)

func NewLEDInfectedArduinoConnection(devFile string) (*LEDInfectedArduinoConnection, error) {
	port, err := serial.Open(devFile, &serial.Mode{})
	if err != nil {
		return nil, fmt.Errorf("failed to opern serial: %s", err)
	}
	fmt.Printf("opened serial device %s\n", devFile)

	o := &LEDInfectedArduinoConnection{
		devFile: devFile,
		port:    port,

		responseChan: make(chan *LEDInfectedResponse),

		stop: false,
	}

	// start the read handler
	go o.readHandler()

	fmt.Printf("waiting for 10 sec for the device to come up again\n")
	// wait for the arduino reset
	time.Sleep(time.Second * 10)

	fmt.Printf("try to get the device arduinoID of the device\n")
	globalSetup, err := o.globalGetSetup()
	if err != nil {
		time.Sleep(time.Second * 18)
		o.Close()
		return nil, fmt.Errorf("failed to read get ID: %s\n", err)
	}
	o.arduinoID = globalSetup.ID
	o.numStripes = globalSetup.NumStripes

	fmt.Printf("new device with ID %d added\n", o.arduinoID)
	return o, nil
}

func (o *LEDInfectedArduinoConnection) Close() {
	o.stop = true
	o.port.Close()
}

func (o *LEDInfectedArduinoConnection) readHandler() {
	reader := slip.NewReader(o.port)
	for {
		if o.stop {
			return
		}
		buf, _, err := reader.ReadPacket()
		if err != nil {
			// error
			if o.stop {
				return
			}
		}

		ledInfectedResponse, err := castLEDInfectedResponse(buf)
		if err != nil {
			fmt.Printf("could not cast response: %s\n", err)
			continue
		}

		select {
		case o.responseChan <- ledInfectedResponse:
		case <-time.After(time.Second):
			fmt.Printf("no one is listening for response: %s\n", ledInfectedResponse)
		}
	}
}

func (o *LEDInfectedArduinoConnection) WaitRepsonse(cmd *LEDInfectedCommand, timeout time.Duration) (*LEDInfectedResponse, error) {
	select {
	case response := <-o.responseChan:
		if !cmd.IsResponse(response) {
			return response, returnError(response, fmt.Sprintf("response for wrong command (%d, expected %d)", response.rspCmdID, cmd.cmdID))
		}
		if response.rspCode != ledInfectedResponseCodeSuccess {
			return response, returnError(response, "response not success")
		}
		return response, nil
	case <-time.After(timeout):
		return nil, fmt.Errorf("no response received within the timeout")
	}
}

func returnError(response *LEDInfectedResponse, msg string) error {
	switch response.rspCode {
	case 0x01:
		return fmt.Errorf("%s (%d): LED_INFECTED_RESPONSE_CODE_UNKOWN_CMD_CODE", msg, response.rspCode)
	case 0x02:
		return fmt.Errorf("%s (%d): LED_INFECTED_RESPONSE_CODE_INVALID_DATA_LENGTH", msg, response.rspCode)
	case 0x03:
		return fmt.Errorf("%s (%d): LED_INFECTED_RESPONSE_CODE_INVALID_CMD_TYPE", msg, response.rspCode)
	case 0x04:
		return fmt.Errorf("%s (%d): LED_INFECTED_RESPONSE_CODE_INVALID_STRIPE", msg, response.rspCode)
	case 0x05:
		return fmt.Errorf("%s (%d): LED_INFECTED_RESPONSE_CODE_INVALID_LEN", msg, response.rspCode)
	case 0xFF:
		return fmt.Errorf("%s (%d): LED_INFECTED_RESPONSE_CODE_ERROR", msg, response.rspCode)
	default:
		return fmt.Errorf("%s (%d): UNKOWN", msg, response.rspCode)
	}
	return nil
}

func (o *LEDInfectedArduinoConnection) sendInfectedCommand(cmdType byte, cmdCode byte, data []byte) (*LEDInfectedResponse, error) {
	cmd, err := newLEDInfectedCommand(cmdType, cmdCode, data)
	if err != nil {
		return nil, err
	}
	buf := cmd.ToBytes()

	writer := slip.NewWriter(o.port)
	if err := writer.WritePacket(buf); err != nil {
		return nil, err
	}

	response, err := o.WaitRepsonse(cmd, time.Second)
	if err != nil {
		return response, err
	}
	return response, nil
}

func (o *LEDInfectedArduinoConnection) GlobalGetSetup() LEDInfectedArduinoConfigGlobalSetup {
	return LEDInfectedArduinoConfigGlobalSetup{ID: o.arduinoID, NumStripes: o.numStripes, DevFile: o.devFile}
}

func (o *LEDInfectedArduinoConnection) SetArduinoID(newID uint8) error {
	_, err := o.sendInfectedCommand(ledInfectedCommandTypeGlobal, ledInfectedCommandCodeGlobalSetSetup, []byte{newID})
	return err
}

func (o *LEDInfectedArduinoConnection) GlobalSync(stripeTimestamps []uint8) error {
	if len(stripeTimestamps) != int(o.numStripes) {
		return fmt.Errorf("cannot sync, expected timestamps for %d stripes, got %d", o.numStripes, len(stripeTimestamps))
	}
	_, err := o.sendInfectedCommand(ledInfectedCommandTypeGlobal, ledInfectedCommandCodeGlobalSync, stripeTimestamps)
	return err
}

func (o *LEDInfectedArduinoConnection) GlobalSetupSave() error {
	_, err := o.sendInfectedCommand(ledInfectedCommandTypeGlobal, ledInfectedCommandCodeGlobalSetupSave, nil)
	return err
}

func (o *LEDInfectedArduinoConnection) globalGetSetup() (*LEDInfectedArduinoConfigGlobalSetup, error) {
	response, err := o.sendInfectedCommand(ledInfectedCommandTypeGlobal, ledInfectedCommandCodeGlobalGetSetup, nil)
	if err != nil {
		return nil, err
	}

	if response.rspDataLen != 2 {
		return nil, fmt.Errorf("expected 2 data bytes but got: %d", response.rspDataLen)
	}

	return &LEDInfectedArduinoConfigGlobalSetup{
		ID:         response.rspData[0],
		NumStripes: response.rspData[1],
		DevFile:    o.devFile,
	}, nil
}

func (o *LEDInfectedArduinoConnection) StripeSetSetup(stripeID uint8, setup *LEDInfectedArduinoConfigStripeSetup) error {
	_, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeSetSetup, setup.getBytes())
	return err
}

func (o *LEDInfectedArduinoConnection) StripeGetSetup(stripeID uint8) (*LEDInfectedArduinoConfigStripeSetup, error) {
	response, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeGetSetup, nil)
	if err != nil {
		return nil, err
	}
	if response.rspDataLen != 15 {
		return nil, fmt.Errorf("expected 14 data bytes but got: %d", response.rspDataLen)
	}
	return castConfigStripeSetup(response.rspData)
}

func (o *LEDInfectedArduinoConnection) StripeSetConfig(stripeMask uint8, config *LEDInfectedArduinoConfigStripeConfig) error {
	_, err := o.sendInfectedCommand(stripeMask, ledInfectedCommandCodeStripeSetConfig, config.getBytes())
	return err
}

func (o *LEDInfectedArduinoConnection) StripeGetConfig(stripeID uint8) (*LEDInfectedArduinoConfigStripeConfig, error) {
	response, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeGetConfig, nil)
	if err != nil {
		return nil, err
	}
	if response.rspDataLen != 3 {
		return nil, fmt.Errorf("expected 3 data bytes but got: %d", response.rspDataLen)
	}
	return castConfigStripeConfig(response.rspData)
}

func (o *LEDInfectedArduinoConnection) StripeSetPalette(stripeMask uint8, palette *LEDInfectedArduinoConfigStripePalette) error {
	_, err := o.sendInfectedCommand(stripeMask, ledInfectedCommandCodeStripeSetPalette, palette.getBytes())
	return err
}

func (o *LEDInfectedArduinoConnection) StripeGetPalette(stripeID uint8) (*LEDInfectedArduinoConfigStripePalette, error) {
	response, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeGetPalette, nil)
	if err != nil {
		return nil, err
	}
	if response.rspDataLen != 48 {
		return nil, fmt.Errorf("expected 48 data bytes but got: %d", response.rspDataLen)
	}
	return castConfigStripePalatte(response.rspData)
}

func (o *LEDInfectedArduinoConnection) StripeSetupSave(stripeMask uint8) error {
	_, err := o.sendInfectedCommand(stripeMask, ledInfectedCommandCodeStripeSaveSetup, nil)
	return err
}

func (o *LEDInfectedArduinoConnection) StripeSave(stripeMask uint8) error {
	_, err := o.sendInfectedCommand(stripeMask, ledInfectedCommandCodeStripeSave, nil)
	return err
}
