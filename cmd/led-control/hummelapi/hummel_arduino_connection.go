package hummelapi

import (
	"fmt"
	"github.com/goiiot/libserial"
	"time"
)

/*

	Structure of the connection
    ---------------------------

	- Open serial connection (and wait till arduino is ready)
	- After the connection is established the HummelArduinoConnection will read out the ID of the device (used to uniquely identify the devices)
	  This is also the mechanism to detect if its a device we are interested in
	- Now the device is ready to accept commands

	Command mechanism
    -----------------

	1. Send StartCommand signal [2]byte{hummelCommandProtocolId,hummelCommandProtocolId}
    2. Send actual comamand [1+opt]byte{command,opt data...}, some commands also have a response from the controller
	3. Send EndCommand signal [1]byte{hummelCommandProtocolIdEnd}


*/

type (
	HummelArduinoConnection struct {
		devFile string
		port    *libserial.SerialPort

		id uint8

		responseChan chan *HummelCommandResponse

		stop bool
	}
)

func NewHummelArduinoConnection(devFile string) (*HummelArduinoConnection, error) {
	conn, err := libserial.Open(devFile, libserial.WithReadTimeout(time.Second*5))
	if err != nil {
		return nil, fmt.Errorf("failed to opern serial: %s", err)
	}
	fmt.Printf("opened serial device %s\n", devFile)

	fmt.Printf("waiting for 10 sec for the device to come up again\n")
	// wait for the arduino reset
	time.Sleep(time.Second * 10)

	o := &HummelArduinoConnection{
		devFile: devFile,
		port:    conn,

		responseChan: make(chan *HummelCommandResponse),

		stop: false,
	}

	fmt.Printf("try to get the device id of the device\n")
	// fixme disabled for now so I can test if the other things work
	id, err := o.getId()
	if err != nil {
		o.Close()
		return nil, fmt.Errorf("failed to read get ID: %s\n", err)
	}
	o.id = id

	// start the read handler
	go o.readHandler()

	fmt.Printf("new device with ID %d added\n", o.id)
	return o, nil
}

func (o *HummelArduinoConnection) Close() {
	o.stop = true
	o.port.Close()
}

func (o *HummelArduinoConnection) clearRead() {
}

func (o *HummelArduinoConnection) readHandler() {
	clientMarkerFound := 0
	for {
		var buf []byte
		n, err := o.port.Read(buf)
		if err != nil {
			// error
			if o.stop {
				return
			}
		}
		for i := 0; i < n; i++ {
			if clientMarkerFound == 2 {
				castHummelCommand(buf, i)
				// now we are actually at the stage to read the length and the rest of the response

				hummelCmd, err := castHummelCommand(buf, i)
				if err != nil {
					fmt.Printf("failed to read command: %s", err)
					clientMarkerFound = 0
					break
				}
				select {
				case o.responseChan <- hummelCmd:
				case <-time.After(time.Second):
					fmt.Printf("no one is listening for response: %s", hummelCmd)
				}
				clientMarkerFound = 0
				break
			}
			if (0xff & buf[i]) == hummelCommandProtocolIdConsuming {
				clientMarkerFound++
			} else {
				clientMarkerFound = 0
			}
		}
	}
}

func (o *HummelArduinoConnection) WaitRepsonse(cmd *HummelCommandResponse, timeout time.Duration) (*HummelCommandResponse, error) {
	select {
	case response := <-o.responseChan:
		if !cmd.IsEqual(response) {
			return nil, fmt.Errorf("unexpected command response received, expected (%s), but got (%s)", cmd, response)
		}
		return response, nil
	case <-time.After(timeout):
		return nil, fmt.Errorf("no response received within the timeout")
	}
}

func (o *HummelArduinoConnection) HummelCommand(cmdType byte, cmdCode byte, data []byte) (*HummelCommandResponse, error) {
	cmd := newHummelCommand(cmdType, cmdCode, data)
	if _, err := o.write(cmd.GetCmdBytes()); err != nil {
		return nil, err
	}

	response, err := o.WaitRepsonse(cmd, time.Second)
	if err != nil {
		return nil, err
	}
	return response, nil
}

func (o *HummelArduinoConnection) GetId() uint8 {
	return o.id
}

func (o *HummelArduinoConnection) getId() (uint8, error) {
	response, err := o.HummelCommand(hummelCommandTypeGlobal, hummelCommandCodeGlobalGetId, nil)
	if err != nil {
		return 0, err
	}

	if len(response.data) != 1 {
		return 0, fmt.Errorf("expected one data byte but got: %d", len(response.data))
	}

	return response.data[0], nil
}

func (o *HummelArduinoConnection) GetDevFile() string {
	return o.devFile
}

func (o *HummelArduinoConnection) write(data []byte) (int, error) {
	fmt.Printf("try to write %d bytes: %x\n", len(data), data)
	n, err := o.port.Write(data)
	if err != nil {
		fmt.Printf("failed to write: %s\n", err)
	}
	return n, err
}

func (o *HummelArduinoConnection) read(numBytes int) ([]byte, error) {
	cnt := 0
	buf := []byte{}
	for {
		readBuf := []byte{48}
		n, err := o.port.Read(readBuf)
		if err != nil {
			return nil, fmt.Errorf("failed to read (already read %d, %X): %s", len(buf), buf, err)
		}
		if n == 0 {
			return readBuf, fmt.Errorf("nothing more to read")
		}

		buf = append(buf, readBuf...)
		cnt += n
		if cnt > numBytes {
			return buf, fmt.Errorf("expected to read %d, but got %d", cnt, n)
		} else if cnt == numBytes {
			return buf, nil
		}
		// not enough read yet, continue
	}
}
