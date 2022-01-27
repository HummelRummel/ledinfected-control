package hummelapi

import "fmt"

/*
    LEDInfectedCommand protocol
    ----------------------

	The controlling node sends commands, with the message structure defined below and the sending protocol Index
	The receiving node, replaces the sending protocol arduinoID the consuming protocol arduinoID and its response data and sends it back.


	Message Structure
    -----------------

// OUTDATED comment
 	Byte(s) | Value    | Description
  	--------|----------|---------------------------
  	  1+2   | ProtoId  | Sending or consuming protocol Index twice to start the message
      3+4   | LenData  | Length of the data of the message (including the cmd, the cmdId and optional data)
      5     | CmdId    | Running int to arduinoID the command response
      6     | Cmd      | Command for the client (Type | Cmd)
      7+    | Data     | Optional

*/

const (

	//////////////////////////////////////////////////
	// command type field
	//////////////////////////////////////////////////
	ledInfectedCommandTypeGlobal = 0x80
	// the stripe types are calculated (ledInfectedCommandTypeIndex[i] = 1 < index)

	ledInfectedCommandCodeGlobalSync      = 0xcc
	ledInfectedCommandCodeGlobalGetSetup  = 0x0e
	ledInfectedCommandCodeGlobalSetSetup  = 0xe0
	ledInfectedCommandCodeGlobalSetupSave = 0xfe

	ledInfectedCommandCodeStripeGetConfig  = 0x01
	ledInfectedCommandCodeStripeSetConfig  = 0x10
	ledInfectedCommandCodeStripeGetPalette = 0x02
	ledInfectedCommandCodeStripeSetPalette = 0x20
	ledInfectedCommandCodeStripeGetSetup   = 0x0d
	ledInfectedCommandCodeStripeSetSetup   = 0xd0
	ledInfectedCommandCodeStripeSaveSetup  = 0xfd
	ledInfectedCommandCodeStripeSave       = 0xff

	ledInfectedResponseCodeSuccess        = 0xbb
	ledInfectedResponseCodeUnknownCmdCode = 0x01
	ledInfectedResponseCodeInvalidDataLen = 0x01
	ledInfectedResponseCodeError          = 0xff
)

func ledInfectedCommandTypeIndex(index uint8) uint8 {
	return 1 << index
}

type (
	LEDInfectedCommand struct {
		cmdType    uint8
		cmdCode    uint8
		cmdID      uint8
		cmdDataLen uint8
		cmdData    []byte
	}

	LEDInfectedResponse struct {
		rspCode    uint8
		rspCmdID   uint8
		rspDataLen uint8
		rspData    []byte
	}
)

var nextCmdID = uint8(0)

func newLEDInfectedCommand(cmdType byte, cmdCode byte, data []byte) (*LEDInfectedCommand, error) {
	nextCmdID++
	if len(data) > 60 {
		return nil, fmt.Errorf("only 64 len data is allowed, with 4 bytes header this leaves a max of 60 (%d)", len(data))
	}
	return &LEDInfectedCommand{
		cmdType:    cmdType,
		cmdCode:    cmdCode,
		cmdID:      nextCmdID,
		cmdDataLen: uint8(len(data)),
		cmdData:    data,
	}, nil
}

func castLEDInfectedResponse(buf []byte) (*LEDInfectedResponse, error) {
	if len(buf) < 3 {
		return nil, fmt.Errorf("package too small for a response (%d)", len(buf))
	}
	var data []byte
	if buf[2] > 0 {
		data = buf[3:]
	}
	if len(data) != int(buf[2]) {
		return nil, fmt.Errorf("unexpected data len")
	}
	return &LEDInfectedResponse{
		rspCode:    buf[0],
		rspCmdID:   buf[1],
		rspDataLen: buf[2],
		rspData:    data,
	}, nil
}

func (o *LEDInfectedCommand) IsResponse(other *LEDInfectedResponse) bool {
	return o.cmdID == other.rspCmdID
}

func (o *LEDInfectedCommand) ToBytes() []byte {
	var cmdBytes []byte
	cmdBytes = append(cmdBytes, o.cmdType)
	cmdBytes = append(cmdBytes, o.cmdCode)
	cmdBytes = append(cmdBytes, o.cmdID)
	cmdBytes = append(cmdBytes, o.cmdDataLen)
	if o.cmdDataLen > 0 {
		cmdBytes = append(cmdBytes, o.cmdData...)
	}
	return cmdBytes
}
