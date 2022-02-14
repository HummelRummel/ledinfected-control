package hummelapi

import (
	"fmt"
	"sync"
	"time"

	"github.com/Lobaro/slip"
	"go.bug.st/serial"
)

/*

	Structure of the connection
    ---------------------------

	- Open serial connection (and wait till arduino is ready)
	- After the connection is established the LEDInfectedArduinoConnection will read out the Index of the device (used to uniquely identify the devices)
	  This is also the mechanism to detect if its a device we are interested in
	- Now the device is ready to accept commands

	Command mechanism
    -----------------

	1. Send StartCommand signal [2]byte{hummelCommandProtocolId,hummelCommandProtocolId}
    2. Send actual comamand [1+opt]byte{command,opt data...}, some commands also have a response from the controller
	3. Send EndCommand signal [1]byte{hummelCommandProtocolIdEnd}
*/

const (
	baudRate = 19200

	neededArduinoMajorVersion = 0
)

type (
	LEDInfectedArduinoConnection struct {
		devFile string

		port serial.Port

		arduinoID  uint8
		numStripes uint8

		responseChan chan *LEDInfectedResponse
		writer       *slip.Writer

		serialLock sync.Mutex

		stop bool
	}
)

func NewLEDInfectedArduinoConnection(devFile string) (*LEDInfectedArduinoConnection, error) {
	port, err := serial.Open(devFile, &serial.Mode{})
	mode := &serial.Mode{
		BaudRate: baudRate,
		Parity:   serial.NoParity,
		DataBits: 8,
		StopBits: serial.OneStopBit,
	}
	if err := port.SetMode(mode); err != nil {
		return nil, fmt.Errorf("failed to set mode for serial port serial: %s", err)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to opern serial: %s", err)
	}
	fmt.Printf("opened serial device %s\n", devFile)

	o := &LEDInfectedArduinoConnection{
		devFile: devFile,
		port:    port,
		writer:  slip.NewWriter(port),

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
		o.Close()
		time.Sleep(time.Second * 18)
		return nil, fmt.Errorf("failed to read get Index: %s\n", err)
	}
	o.arduinoID = globalSetup.ID
	o.numStripes = globalSetup.NumStripes

	fmt.Printf("new device with Index %d added\n", o.arduinoID)
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
			fmt.Printf("failed to read: %s\n", err)
			time.Sleep(time.Second)
			continue
		}

		ledInfectedResponse, err := castLEDInfectedResponse(buf)
		if err != nil {
			fmt.Printf("could not cast response: %s\n", err)
			continue
		}

		fmt.Printf("RESPONSE: %s\n", ledInfectedResponse)
		select {
		case o.responseChan <- ledInfectedResponse:
		case <-time.After(time.Second):
			fmt.Printf("no one is listening for response: %s\n", ledInfectedResponse)
		}
	}
}

func (o *LEDInfectedArduinoConnection) WaitRepsonse(cmd *LEDInfectedCommand, timeout time.Duration) (*LEDInfectedResponse, error) {
	for {
		select {
		case response := <-o.responseChan:
			if err := response.Check(); err != nil {
				return nil, fmt.Errorf("response with invalid checksum received: %s", err)
			}
			if !cmd.IsResponse(response) {
				fmt.Printf("response for wrong command (%s, expected cmdID %d)\n", response, cmd.cmdID)
				continue
			}
			if response.rspCode != ledInfectedResponseCodeSuccess {
				return nil, fmt.Errorf("response not success: %s", response.getRspString())
			}
			return response, nil
		case <-time.After(timeout):
			return nil, fmt.Errorf("no response received within the timeout")
		}
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

func (o *LEDInfectedArduinoConnection) sendInfectedCommand(cmdType byte, cmdCode byte, data []byte, retries int) (*LEDInfectedResponse, error) {
	o.serialLock.Lock()
	defer o.serialLock.Unlock()
	lastError := ""
	for i := 0; i <= retries; i++ {
		cmd, err := newLEDInfectedCommand(cmdType, cmdCode, data)
		if err != nil {
			return nil, fmt.Errorf("invalid infected command: %s", err)
		}
		buf := cmd.ToBytes()
		fmt.Printf("Cmd: %X\n", buf)
		if err := o.writer.WritePacket(buf); err != nil {
			lastError = fmt.Sprintf("failed to write command: %s", err)
			continue
		}

		response, err := o.WaitRepsonse(cmd, time.Second)
		if err != nil {
			fmt.Printf("invalid response: %s\n", err)
			lastError = fmt.Sprintf("invalid response: %s", err)
			continue
		}
		return response, nil
	}
	return nil, fmt.Errorf("%s", lastError)
}

func (o *LEDInfectedArduinoConnection) GlobalGetSetup() LEDInfectedArduinoConfigGlobalSetup {
	return LEDInfectedArduinoConfigGlobalSetup{ID: o.arduinoID, NumStripes: o.numStripes, DevFile: o.devFile}
}

func (o *LEDInfectedArduinoConnection) SetArduinoID(newID uint8) error {
	_, err := o.sendInfectedCommand(ledInfectedCommandTypeGlobal, ledInfectedCommandCodeGlobalSetSetup, []byte{newID}, 5)
	return err
}

func (o *LEDInfectedArduinoConnection) GlobalSync() error {
	_, err := o.sendInfectedCommand(ledInfectedCommandTypeGlobal, ledInfectedCommandCodeGlobalSync, nil, 0)
	return err
}

func (o *LEDInfectedArduinoConnection) GlobalSetupSave() error {
	_, err := o.sendInfectedCommand(ledInfectedCommandTypeGlobal, ledInfectedCommandCodeGlobalSetupSave, nil, 0)
	return err
}

func (o *LEDInfectedArduinoConnection) globalGetSetup() (*LEDInfectedArduinoConfigGlobalSetup, error) {
	response, err := o.sendInfectedCommand(ledInfectedCommandTypeGlobal, ledInfectedCommandCodeGlobalGetSetup, nil, 5)
	if err != nil {
		return nil, err
	}

	if response.rspDataLen < 4 {
		return nil, fmt.Errorf("invalid arduino version, expects 4 global setup message size to be 4, received %d", response.rspDataLen)
	}

	setup := &LEDInfectedArduinoConfigGlobalSetup{
		ID:         response.rspData[0],
		NumStripes: response.rspData[1],
		DevFile:    o.devFile,
		Version: LEDInfectedArduinoVersion{
			Major: response.rspData[2],
			Minor: response.rspData[3],
		},
	}

	if setup.Version.Major != neededArduinoMajorVersion {
		return nil , fmt.Errorf("invalid arduino version, needed %d.xx, but arduino has %d.%d", neededArduinoMajorVersion, setup.Version.Major, setup.Version.Minor)
	}
	return setup, nil
}

func (o *LEDInfectedArduinoConnection) StripeSetSetup(stripeID uint8, setup *LEDInfectedArduinoConfigStripeSetup) error {
	_, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeSetSetup, setup.getBytes(), 5)
	return err
}

func (o *LEDInfectedArduinoConnection) StripeGetSetup(stripeID uint8) (*LEDInfectedArduinoConfigStripeSetup, error) {
	response, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeGetSetup, nil, 5)
	if err != nil {
		return nil, err
	}
	if response.rspDataLen != 18 {
		return nil, fmt.Errorf("expected 16 data bytes but got: %d", response.rspDataLen)
	}
	return castConfigStripeSetup(response.rspData)
}

func (o *LEDInfectedArduinoConnection) StripeSetConfig(stripeMask uint8, config *LEDInfectedArduinoConfigStripeConfig) error {
	_, err := o.sendInfectedCommand(stripeMask, ledInfectedCommandCodeStripeSetConfig, config.getBytes(), 5)
	return err
}

func (o *LEDInfectedArduinoConnection) StripeGetConfig(stripeID uint8) (*LEDInfectedArduinoConfigStripeConfig, error) {
	response, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeGetConfig, nil, 5)
	if err != nil {
		return nil, err
	}
	if response.rspDataLen != 5 {
		return nil, fmt.Errorf("expected 4 data bytes but got: %d", response.rspDataLen)
	}
	return castConfigStripeConfig(response.rspData)
}

func (o *LEDInfectedArduinoConnection) StripeSetPalette(stripeMask uint8, palette *LEDInfectedArduinoConfigStripePalette) error {
	_, err := o.sendInfectedCommand(stripeMask, ledInfectedCommandCodeStripeSetPalette, palette.getBytes(), 20)
	return err
}

func (o *LEDInfectedArduinoConnection) StripeGetPalette(stripeID uint8) (*LEDInfectedArduinoConfigStripePalette, error) {
	response, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeGetPalette, nil, 5)
	if err != nil {
		return nil, err
	}
	if response.rspDataLen != 48 {
		return nil, fmt.Errorf("expected 48 data bytes but got: %d", response.rspDataLen)
	}
	return castConfigStripePalatte(response.rspData)
}

func (o *LEDInfectedArduinoConnection) StripeSetupSave(stripeID uint8) error {
	_, err := o.sendInfectedCommand(1<<stripeID, ledInfectedCommandCodeStripeSaveSetup, nil, 0)
	return err
}

func (o *LEDInfectedArduinoConnection) StripeSave(stripeMask uint8) error {
	_, err := o.sendInfectedCommand(stripeMask, ledInfectedCommandCodeStripeSave, nil, 0)
	return err
}
